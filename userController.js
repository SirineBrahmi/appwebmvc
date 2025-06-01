const userModel = require('../models/userModel');

const getAllUsers = async (req, res) => {
  try {
    console.log('Fetching all users for:', req.user);
    const users = await userModel.getAllUsers();
    console.log('Users retrieved:', users.length);
    res.status(200).json(users);
  } catch (error) {
    console.error('Error in getAllUsers:', error.stack);
    res.status(500).json({
      message: 'Erreur serveur lors de la récupération des utilisateurs',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

const createUser = async (req, res) => {
  try {
    const { email, nom, prenom, motDePasse, numTel, niveau, diplome, cin, role } = req.body;
    if (!email || !nom || !prenom || !motDePasse || !role) {
      return res.status(400).json({ message: 'Champs requis manquants' });
    }
    const userData = { email, nom, prenom, motDePasse, numTel, niveau, diplome, cin };
    const uid = await userModel.createUser(userData, role);
    res.status(201).json({ message: 'Utilisateur créé', uid });
  } catch (error) {
    console.error('Error in createUser:', error.stack);
    res.status(500).json({
      message: 'Erreur serveur lors de la création de l’utilisateur',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

const updateUser = async (req, res) => {
  try {
    const { role, uid } = req.params;
    const updates = req.body;
    if (!role || !uid || !updates) {
      return res.status(400).json({ message: 'Paramètres invalides' });
    }
    await userModel.updateUser(uid, role, updates);
    res.status(200).json({ message: 'Utilisateur mis à jour' });
  } catch (error) {
    console.error('Error in updateUser:', error.stack);
    res.status(500).json({
      message: 'Erreur serveur lors de la mise à jour de l’utilisateur',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { role, uid } = req.params;
    if (!role || !uid) {
      return res.status(400).json({ message: 'Paramètres invalides' });
    }
    await userModel.deleteUser(uid, role);
    res.status(200).json({ message: 'Utilisateur supprimé' });
  } catch (error) {
    console.error('Error in deleteUser:', error.stack);
    res.status(500).json({
      message: 'Erreur serveur lors de la suppression de l’utilisateur',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

const toggleUserStatus = async (req, res) => {
  try {
    const { uid, role, currentStatus } = req.body;
    if (!uid || !role || !currentStatus) {
      return res.status(400).json({ message: 'Paramètres invalides' });
    }
    await userModel.toggleUserStatus(uid, role, currentStatus);
    res.status(200).json({ message: 'Statut mis à jour' });
  } catch (error) {
    console.error('Error in toggleUserStatus:', error.stack);
    res.status(500).json({
      message: 'Erreur serveur lors de la mise à jour du statut',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

module.exports = {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
};