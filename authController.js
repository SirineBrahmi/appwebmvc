const jwt = require('jsonwebtoken');
const { sha256 } = require('js-sha256');
const userModel = require('../models/userModel');
const admin = require('../firebase'); // Utiliser firebase.js

const login = async (req, res) => {
  const { email, password } = req.body;

  console.log('Requête de connexion reçue:', { email, password: '****' });

  if (!email || !password) {
    console.error('Champs manquants:', { email, password: '****' });
    return res.status(400).json({ message: 'Email et mot de passe requis' });
  }

  try {
    // Utiliser userModel pour récupérer l’utilisateur
    const userData = await userModel.getUserByEmail(email);
    if (!userData) {
      console.error('Aucun utilisateur trouvé pour email:', email);
      return res.status(401).json({ message: 'Utilisateur non trouvé' });
    }

    const { role, uid, motDePasse, status, resetPasswordNeeded } = userData;
    let userId = uid || (role === 'admin' ? userData.id : null);

    console.log(`${role.charAt(0).toUpperCase() + role.slice(1)} trouvé:`, { id: userId, email });

    // Vérifications
    if (!motDePasse) {
      console.error(`Champ motDePasse manquant pour ${role}:`, email);
      return res.status(500).json({ message: `Erreur : mot de passe non défini pour cet ${role}` });
    }

    const isPasswordValid = role === 'admin' ? motDePasse === password : motDePasse === sha256(password);
    if (!isPasswordValid) {
      console.error(`Mot de passe ${role} incorrect pour:`, email);
      return res.status(401).json({ message: `Mot de passe ${role} incorrect` });
    }

    if (role === 'admin' && resetPasswordNeeded) {
      console.error('Réinitialisation requise pour admin:', email);
      return res.status(403).json({ message: 'Veuillez réinitialiser votre mot de passe' });
    }

    if (role !== 'admin' && status !== 'active') {
      console.error(`Compte ${role} non activé:`, email);
      return res.status(403).json({ message: `Compte ${role} non activé` });
    }

    // Vérifier JWT_SECRET
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET non défini');
      return res.status(500).json({ message: 'Erreur serveur : JWT_SECRET non défini' });
    }

    // Générer un token JWT
    console.log('Génération du token JWT pour:', { userId, email, role });
    const jwtToken = jwt.sign({ uid: userId, email, role }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    // Générer un token personnalisé Firebase
    const customToken = await admin.auth().createCustomToken(userId, { role });

    // Supprimer le mot de passe des données renvoyées
    delete userData.motDePasse;
    console.log('Connexion réussie pour:', { userId, email, role });

    res.json({ token: jwtToken, customToken, role, userData });
  } catch (err) {
    console.error('Erreur serveur lors de la connexion:', err);
    res.status(500).json({ message: 'Erreur serveur lors de la connexion', error: err.message });
  }
};

module.exports = { login };