const admin = require('../firebase');

const getDashboardData = async (req, res) => {
  try {
    const db = admin.database();

    // Récupérer les formations
    const formationsSnapshot = await db.ref('formations').once('value');
    let totalFormations = 0;
    let activeFormations = 0;
    let pendingFormations = 0;
    const formationsList = [];

    if (formationsSnapshot.exists()) {
      formationsSnapshot.forEach((formation) => {
        totalFormations++;
        const formationData = formation.val();
        if (formationData.statut === 'publiée') {
          activeFormations++;
        } else if (formationData.statut === 'en_attente' || formationData.etape === 'en_attente') {
          pendingFormations++;
        }
        formationsList.push({
          id: formation.key,
          intitule: formationData.intitule || formationData.specialite || formationData.titre || 'Sans titre',
          ...formationData,
          category: formationData.categorie || 'Non spécifiée',
        });
      });
    }

    const recentFormations = formationsList
      .sort((a, b) => new Date(b.dateCreation || 0) - new Date(a.dateCreation || 0))
      .slice(0, 5);

    const formationTitles = {};
    formationsList.forEach((formation) => {
      formationTitles[formation.id] = formation.intitule;
    });

    // Récupérer les utilisateurs
    const usersSnapshot = await db.ref('utilisateurs').once('value');
    let totalStudents = 0;
    let totalFormateurs = 0;

    if (usersSnapshot.exists()) {
      const etudiantsData = usersSnapshot.child('etudiants');
      const formateursData = usersSnapshot.child('formateurs');
      if (etudiantsData.exists()) {
        totalStudents = Object.keys(etudiantsData.val() || {}).length;
      }
      if (formateursData.exists()) {
        totalFormateurs = Object.keys(formateursData.val() || {}).length;
      }
    }

    // Récupérer les inscriptions
    const inscriptionsSnapshot = await db.ref('inscriptions').once('value');
    const inscriptionsList = [];

    if (inscriptionsSnapshot.exists()) {
      inscriptionsSnapshot.forEach((student) => {
        student.forEach((inscription) => {
          const inscriptionData = inscription.val();
          const etudiantData = inscriptionData.etudiant || {};
          inscriptionsList.push({
            id: inscription.key,
            studentId: student.key,
            ...inscriptionData,
            etudiant: {
              nom: etudiantData.nom || 'Nom inconnu',
              prenom: etudiantData.prenom || 'Prénom inconnu',
              ...etudiantData,
            },
            formationTitre: formationTitles[inscriptionData.formationId] || 'Inconnu',
            dateInscription: inscriptionData.dateInscription
              ? new Date(inscriptionData.dateInscription)
              : new Date(),
          });
        });
      });
    }

    const recentInscriptions = inscriptionsList
      .sort((a, b) => b.dateInscription - a.dateInscription)
      .slice(0, 5);

    res.json({
      totalFormations,
      activeFormations,
      pendingFormations,
      totalStudents,
      totalFormateurs,
      pendingInscriptions: inscriptionsList.filter((i) => i.statut === 'en_attente').length,
      recentFormations,
      recentInscriptions,
    });
  } catch (err) {
    console.error('Erreur lors de la récupération des données:', err.stack);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

module.exports = { getDashboardData };