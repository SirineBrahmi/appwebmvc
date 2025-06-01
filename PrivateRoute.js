import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

const PrivateRoute = ({ children, requiredRole }) => {
  const location = useLocation();
  const token = localStorage.getItem('authToken'); // Changed from 'token' to 'authToken'
  const role = localStorage.getItem('role');

  console.log('PrivateRoute check:', {
    token: token ? 'exists' : 'null',
    role,
    requiredRole,
  });

  let isAuthenticated = false;

  // Vérifier si le token et le rôle existent
  if (token && role) {
    try {
      // Décoder le token pour vérifier sa validité
      const decoded = jwtDecode(token);
      const currentTime = Date.now() / 1000; // Temps actuel en secondes

      // Vérifier si le token est expiré
      if (decoded.exp < currentTime) {
        console.log('Token expired, clearing localStorage');
        localStorage.removeItem('authToken'); // Updated
        localStorage.removeItem('role');
        localStorage.removeItem('admin');
        localStorage.removeItem('formateur');
        localStorage.removeItem('etudiant');
      } else if (decoded.role === requiredRole) {
        // Vérifier si le rôle dans le token correspond au requiredRole
        isAuthenticated = true;
        console.log(`User authenticated with role: ${decoded.role}`);
      } else {
        console.log(`Role mismatch: token role (${decoded.role}) != required role (${requiredRole})`);
      }
    } catch (error) {
      console.error('Invalid token:', error);
      localStorage.removeItem('authToken'); // Updated
      localStorage.removeItem('role');
      localStorage.removeItem('admin');
      localStorage.removeItem('formateur');
      localStorage.removeItem('etudiant');
    }
  }

  // Si authentifié avec le bon rôle, rendre les enfants
  if (isAuthenticated) {
    return children;
  }

  // Si connecté avec un autre rôle, rediriger vers le tableau de bord correspondant
  if (token && role) {
    console.log(`Redirecting to dashboard for role: ${role}`);
    if (role === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    } else if (role === 'formateur') {
      return <Navigate to="/formateur/dashboard" replace />;
    } else if (role === 'etudiant') {
      return <Navigate to="/etudiant/espace-personnel" replace />;
    }
  }

  // Sinon, rediriger vers la page de connexion appropriée
  console.log(`User not authenticated, redirecting to login for role: ${requiredRole}`);
  const redirectPath =
    requiredRole === 'admin'
      ? '/login'
      : requiredRole === 'formateur'
      ? '/formateur-login'
      : '/etudiant-login';
  return <Navigate to={redirectPath} state={{ from: location }} replace />;
};

export default PrivateRoute;