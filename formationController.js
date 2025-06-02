const AdminFormationsModel = require('../models/AdminFormationsModel');
const sendEmail = require('../utils/sendEmail');

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
    console.log('Adding category:', categoryName);
    const categoryId = await AdminFormationsModel.addCategory(categoryName);
    res.status(201).json({ message: 'Catégorie ajoutée', categoryId });
  } catch (error) {
    console.error('Error in addCategory:', error.stack);
    res.status(500).json({
      message: 'Erreur serveur lors de l ajout de la catégorie',
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
    console.log('Updating category:', categoryId, categoryName);
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
    console.log('Deleting category:', categoryId);
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
    console.log('Updating formation status:', formationId, newStatus);
    
    const updatedFormation = await AdminFormationsModel.updateFormationStatus(formationId, newStatus);
    
    // Envoi d'email de notification
    if (updatedFormation && updatedFormation.formateurId) {
      try {
        const formateurSnapshot = await db.ref(`utilisateurs/formateurs/${updatedFormation.formateurId}`).once('value');
        const formateur = formateurSnapshot.val();
        
        if (formateur && formateur.email) {
          const emailSubject = `Mise à jour du statut de votre formation`;
          const emailHtml = `
            <p>Bonjour ${formateur.prenom || 'Cher formateur'},</p>
            <p>Le statut de votre formation <strong>"${updatedFormation.intitule || 'sans titre'}"</strong> a été modifié à <strong>"${newStatus}"</strong>.</p>
            <p>Date de mise à jour: ${new Date().toLocaleDateString()}</p>
            ${newStatus === 'validée' ? '<p>Félicitations! Votre formation a été approuvée.</p>' : ''}
            <p>Cordialement,</p>
            <p>L'équipe de la plateforme</p>
          `;
          
          await sendEmail(formateur.email, emailSubject, emailHtml);
          console.log(`Email de notification envoyé à ${formateur.email}`);
        }
      } catch (emailError) {
        console.error("Erreur lors de l'envoi de l'email:", emailError);
        // Ne pas bloquer la réponse même si l'email échoue
      }
    }

    res.status(200).json({ 
      message: 'Statut de la formation mis à jour',
      formation: updatedFormation
    });
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
    console.log('Updating formation:', formationId, updates);
    
    await AdminFormationsModel.updateFormation(formationId, updates);
    
    // Envoi d'email si le statut est modifié
    if (updates.statut) {
      try {
        const formationSnapshot = await db.ref(`formations/${formationId}`).once('value');
        const formation = formationSnapshot.val();
        
        if (formation && formation.formateurId) {
          const formateurSnapshot = await db.ref(`utilisateurs/formateurs/${formation.formateurId}`).once('value');
          const formateur = formateurSnapshot.val();
          
          if (formateur && formateur.email) {
            const emailSubject = `Mise à jour du statut de votre formation`;
            const emailHtml = `
              <p>Bonjour ${formateur.prenom || 'Cher formateur'},</p>
              <p>Le statut de votre formation <strong>"${formation.intitule || 'sans titre'}"</strong> a été modifié à <strong>"${updates.statut}"</strong>.</p>
              <p>Date de mise à jour: ${new Date().toLocaleDateString()}</p>
              ${updates.statut === 'validée' ? '<p>Félicitations! Votre formation a été approuvée.</p>' : ''}
              <p>Cordialement,</p>
              <p>L'équipe de la plateforme</p>
            `;
            
            await sendEmail(formateur.email, emailSubject, emailHtml);
            console.log(`Email de notification envoyé à ${formateur.email}`);
          }
        }
      } catch (emailError) {
        console.error("Erreur lors de l'envoi de l'email:", emailError);
        // Ne pas bloquer la réponse même si l'email échoue
      }
    }

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
  addCategory,
  updateCategory,
  deleteCategory,
  updateFormationStatus,
  updateFormation,
};
