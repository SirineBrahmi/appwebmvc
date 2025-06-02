const admin = require('firebase-admin');
const db = admin.database();
const sendEmail = require('../utils/sendEmail');

class AdminFormationsModel {
  static async getAllFormations() {
    try {
      const formationsSnapshot = await db.ref('formations').once('value');
      const formateursSnapshot = await db.ref('utilisateurs/formateurs').once('value');
      const categoriesSnapshot = await db.ref('categories').once('value');

      const formations = formationsSnapshot.val() || {};
      const formateurs = formateursSnapshot.val() || {};
      const categories = categoriesSnapshot.val() || {};

      return Object.keys(formations).map(id => {
        const formation = formations[id];
        const formateur = formation.formateurId ? formateurs[formation.formateurId] : null;
        const categorie = formation.categorieId ? categories[formation.categorieId] : null;

        return {
          id,
          ...formation,
          formateur: formateur ? {
            nom: `${formateur.prenom} ${formateur.nom}`,
            email: formateur.email
          } : null,
          categorie: categorie ? categorie.nom : 'Non spécifiée'
        };
      });
    } catch (error) {
      console.error('Error in getAllFormations:', error);
      throw new Error(`Erreur lors de la récupération des formations: ${error.message}`);
    }
  }

  static async getAllCategories() {
    try {
      const snapshot = await db.ref('categories').once('value');
      return snapshot.val() || {};
    } catch (error) {
      console.error('Error in getAllCategories:', error);
      throw new Error(`Erreur lors de la récupération des catégories: ${error.message}`);
    }
  }

  static async addCategory(nom) {
    try {
      const newCategoryRef = db.ref('categories').push();
      await newCategoryRef.set({
        nom,
        dateCreation: new Date().toISOString()
      });
      return newCategoryRef.key;
    } catch (error) {
      console.error('Error in addCategory:', error);
      throw new Error(`Erreur lors de l'ajout de la catégorie: ${error.message}`);
    }
  }

  static async updateCategory(categoryId, nom) {
    try {
      await db.ref(`categories/${categoryId}`).update({ 
        nom,
        dateMaj: new Date().toISOString() 
      });
    } catch (error) {
      console.error('Error in updateCategory:', error);
      throw new Error(`Erreur lors de la mise à jour de la catégorie: ${error.message}`);
    }
  }

  static async deleteCategory(categoryId) {
    try {
      const formationsSnapshot = await db.ref('formations')
        .orderByChild('categorieId')
        .equalTo(categoryId)
        .once('value');

      if (formationsSnapshot.exists()) {
        throw new Error('Impossible de supprimer cette catégorie car elle est utilisée par des formations');
      }

      await db.ref(`categories/${categoryId}`).remove();
    } catch (error) {
      console.error('Error in deleteCategory:', error);
      throw new Error(`Erreur lors de la suppression de la catégorie: ${error.message}`);
    }
  }

  static async updateFormationStatus(formationId, newStatus) {
    try {
      const formationSnapshot = await db.ref(`formations/${formationId}`).once('value');
      if (!formationSnapshot.exists()) {
        throw new Error('Formation non trouvée');
      }

      const formation = formationSnapshot.val();
      
      // Récupérer les infos du formateur
      const formateurSnapshot = await db.ref(`utilisateurs/formateurs/${formation.formateurId}`).once('value');
      const formateur = formateurSnapshot.val();
      
      if (!formateur) {
        throw new Error('Formateur non trouvé');
      }

      // Mettre à jour le statut
      await db.ref(`formations/${formationId}`).update({ 
        statut: newStatus,
        dateMaj: new Date().toISOString()
      });

      if (newStatus === 'validée' || newStatus === 'publiée') {
        await db.ref(`categories/${formation.categorieId}/formations/${formationId}`).update({
          ...formation,
          statut: newStatus,
          dateMaj: new Date().toISOString()
        });
      }

      // Envoyer l'email de notification
      const emailSubject = `Mise à jour du statut de votre formation`;
      const emailHtml = `
        <p>Bonjour ${formateur.prenom},</p>
        <p>Le statut de votre formation <strong>"${formation.intitule}"</strong> a été modifié à <strong>"${newStatus}"</strong>.</p>
        <p>Date de mise à jour : ${new Date().toLocaleString()}</p>
        ${newStatus === 'validée' ? '<p>Félicitations ! Votre formation a été approuvée.</p>' : ''}
        <p>Cordialement,</p>
        <p>L'équipe de la plateforme</p>
      `;

      await sendEmail(formateur.email, emailSubject, emailHtml);

      return formation;
    } catch (error) {
      console.error('Error in updateFormationStatus:', error);
      throw new Error(`Erreur lors de la mise à jour du statut: ${error.message}`);
    }
  }

  static async updateFormation(formationId, updates) {
    try {
      const formationSnapshot = await db.ref(`formations/${formationId}`).once('value');
      const formation = formationSnapshot.val();
      
      await db.ref(`formations/${formationId}`).update({
        ...updates,
        dateMaj: new Date().toISOString()
      });

      if (updates.statut) {
        // Récupérer les infos du formateur si le statut change
        const formateurSnapshot = await db.ref(`utilisateurs/formateurs/${formation.formateurId}`).once('value');
        const formateur = formateurSnapshot.val();

        if (formateur) {
          const emailSubject = `Mise à jour du statut de votre formation`;
          const emailHtml = `
            <p>Bonjour ${formateur.prenom},</p>
            <p>Le statut de votre formation <strong>"${formation.intitule}"</strong> a été modifié à <strong>"${updates.statut}"</strong>.</p>
            <p>Date de mise à jour : ${new Date().toLocaleString()}</p>
            ${updates.statut === 'validée' ? '<p>Félicitations ! Votre formation a été approuvée.</p>' : ''}
            <p>Cordialement,</p>
            <p>L'équipe de la plateforme</p>
          `;

          await sendEmail(formateur.email, emailSubject, emailHtml);
        }

        if (updates.statut === 'validée' || updates.statut === 'publiée') {
          await db.ref(`categories/${formation.categorieId}/formations/${formationId}`).update({
            ...formation,
            ...updates,
            dateMaj: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error('Error in updateFormation:', error);
      throw new Error(`Erreur lors de la mise à jour de la formation: ${error.message}`);
    }
  }
}

module.exports = AdminFormationsModel;
