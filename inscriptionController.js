const firebase = require('../firebase');

const getAllInscriptions = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      console.log('Access denied: Admin role required', req.user);
      return res.status(403).json({ 
        message: 'Accès refusé: droits administrateur requis' 
      });
    }

    const db = firebase.database();
    console.log('Fetching inscriptions from Firebase');
    const snapshot = await db.ref('inscriptions').once('value');
    const inscriptions = snapshot.val() || {};
    console.log('Firebase inscriptions:', inscriptions);

    const formattedInscriptions = [];
    Object.entries(inscriptions).forEach(([userId, userInscriptions]) => {
      Object.entries(userInscriptions || {}).forEach(([inscriptionId, inscriptionData]) => {
        if (inscriptionData.formationId && inscriptionData.statut && inscriptionData.dateInscription) {
          formattedInscriptions.push({
            ...inscriptionData,
            id: inscriptionId,
            userId: userId
          });
        } else {
          console.warn(`Skipping incomplete inscription: ${userId}/${inscriptionId}`, inscriptionData);
        }
      });
    });

    console.log('Formatted inscriptions:', formattedInscriptions);
    res.status(200).json(formattedInscriptions);
  } catch (error) {
    console.error('Error fetching inscriptions:', error.stack);
    res.status(500).json({
      message: 'Erreur lors de la récupération des inscriptions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const updateInscriptionStatus = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Accès refusé: droits administrateur requis' 
      });
    }

    const { userId, inscriptionId } = req.params;
    const { statut } = req.body;

    if (!userId || !inscriptionId || !statut) {
      return res.status(400).json({ 
        message: 'Paramètres manquants: userId, inscriptionId ou statut' 
      });
    }

    const db = firebase.database();
    const inscriptionRef = db.ref(`inscriptions/${userId}/${inscriptionId}`);

    const snapshot = await inscriptionRef.once('value');
    if (!snapshot.exists()) {
      return res.status(404).json({ 
        message: 'Inscription non trouvée' 
      });
    }

    await inscriptionRef.update({ statut });
    
    res.status(200).json({ 
      message: 'Statut mis à jour avec succès',
      inscriptionId,
      newStatus: statut
    });
  } catch (error) {
    console.error('Error updating inscription status:', error.stack);
    res.status(500).json({
      message: 'Erreur lors de la mise à jour du statut',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports.getAllInscriptions = getAllInscriptions;
module.exports.updateInscriptionStatus = updateInscriptionStatus;