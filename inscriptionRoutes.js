const express = require('express');
const router = express.Router();

// Importez les fonctions directement depuis le contrôleur
const {
  getAllInscriptions,
  updateInscriptionStatus
} = require('../controllers/inscriptionController');

// Middleware (vérifiez que le chemin est correct)
const { authenticateToken } = require('../middleware/authMiddleware');

// Route GET
router.get('/',
  authenticateToken,
  (req, res, next) => {
    console.log('Middleware authenticateToken passé');
    next();
  },
  (req, res) => {
    getAllInscriptions(req, res).catch(err => {
      console.error('Error in GET /:', err);
      res.status(500).json({ message: 'Server Error' });
    });
  }
);

// Route PUT
router.put('/:userId/:inscriptionId',
  authenticateToken,
  (req, res, next) => {
    console.log('Middleware authenticateToken passé pour PUT');
    next();
  },
  (req, res) => {
    updateInscriptionStatus(req, res).catch(err => {
      console.error('Error in PUT /:userId/:inscriptionId:', err);
      res.status(500).json({ message: 'Server Error' });
    });
  }
);

module.exports = router;