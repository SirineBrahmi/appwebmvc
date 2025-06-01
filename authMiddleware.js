const jwt = require('jsonwebtoken');

// Middleware d'authentification
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Token d\'authentification manquant' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Token invalide ou expiré' });
    }
    req.user = user;
    next();
  });
};

// Middleware d'autorisation
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user?.role) {
      return res.status(403).json({ message: 'Informations de rôle manquantes' });
    }

    const rolesArray = [...allowedRoles];
    if (!rolesArray.includes(req.user.role)) {
      return res.status(403).json({
        message: `Votre rôle (${req.user.role}) n'a pas les permissions nécessaires`
      });
    }
    next();
  };
};

module.exports = {
  authenticateToken,
  authorizeRoles
};