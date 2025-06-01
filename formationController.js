const AdminFormationsModel = require('../models/AdminFormationsModel');

const getAllFormations = async (req, res) => {
  try {
    console.log('Fetching formations for:', req.user);
    const formations = await AdminFormationsModel.getAllFormations();
    res.status(200).json(formations);
  } catch (error) {
    console.error('Error in getAllFormations:', error.stack);
    res.status(500).json({
      message: 'Erreur serveur lors de la récupération des formations',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

const getAllCategories = async (req, res) => {
  try {
    console.log('Fetching categories for:', req.user);
    const categories = await AdminFormationsModel.getAllCategories();
    res.status(200).json(categories);
  } catch (error) {
    console.error('Error in getAllCategories:', error.stack);
    res.status(500).json({
      message: 'Erreur serveur lors de la récupération des catégories',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

const addCategory = async (req, res) => {
  try {
    const { categoryName } = req.body;
    if (!categoryName) {
      return res.status(400).json({ message: 'Nom de catégorie requis' });
    }
    console.log('Adding category:', categoryName); // Debug log
    const categoryId = await AdminFormationsModel.addCategory(categoryName);
    res.status(201).json({ message: 'Catégorie ajoutée', categoryId });
  } catch (error) {
    console.error('Error in addCategory:', error.stack);
    res.status(500).json({
      message: 'Erreur serveur lors de l’ajout de la catégorie',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

const updateCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { categoryName } = req.body;
    if (!categoryId || !categoryName) {
      return res.status(400).json({ message: 'Paramètres invalides' });
    }
    console.log('Updating category:', categoryId, categoryName); // Debug log
    await AdminFormationsModel.updateCategory(categoryId, categoryName);
    res.status(200).json({ message: 'Catégorie mise à jour' });
  } catch (error) {
    console.error('Error in updateCategory:', error.stack);
    res.status(500).json({
      message: 'Erreur serveur lors de la mise à jour de la catégorie',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    if (!categoryId) {
      return res.status(400).json({ message: 'ID de catégorie requis' });
    }
    console.log('Deleting category:', categoryId); // Debug log
    await AdminFormationsModel.deleteCategory(categoryId);
    res.status(200).json({ message: 'Catégorie supprimée' });
  } catch (error) {
    console.error('Error in deleteCategory:', error.stack);
    res.status(500).json({
      message: 'Erreur serveur lors de la suppression de la catégorie',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

const updateFormationStatus = async (req, res) => {
  try {
    const { formationId } = req.params;
    const { newStatus } = req.body;
    if (!formationId || !newStatus) {
      return res.status(400).json({ message: 'Paramètres invalides' });
    }
    console.log('Updating formation status:', formationId, newStatus); // Debug log
    await AdminFormationsModel.updateFormationStatus(formationId, newStatus);
    res.status(200).json({ message: 'Statut de la formation mis à jour' });
  } catch (error) {
    console.error('Error in updateFormationStatus:', error.stack);
    res.status(500).json({
      message: 'Erreur serveur lors de la mise à jour du statut',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

const updateFormation = async (req, res) => {
  try {
    const { formationId } = req.params;
    const updates = req.body;
    if (!formationId || !updates) {
      return res.status(400).json({ message: 'Paramètres invalides' });
    }
    console.log('Updating formation:', formationId, updates); // Debug log
    await AdminFormationsModel.updateFormation(formationId, updates);
    res.status(200).json({ message: 'Formation mise à jour' });
  } catch (error) {
    console.error('Error in updateFormation:', error.stack);
    res.status(500).json({
      message: 'Erreur serveur lors de la mise à jour de la formation',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

module.exports = {
  getAllFormations,
  getAllCategories,
  addCategory, // Now defined
  updateCategory,
  deleteCategory,
  updateFormationStatus,
  updateFormation,
};