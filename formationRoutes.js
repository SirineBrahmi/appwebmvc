const express = require('express');
const router = express.Router();
const formationController = require('../controllers/formationController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

// Routes pour les formations
router.get('/',
  authenticateToken,
  authorizeRoles('admin'),
  formationController.getAllFormations
);

router.put('/:formationId/status',
  authenticateToken,
  authorizeRoles('admin'),
  formationController.updateFormationStatus
);

// Routes pour les catégories
router.get('/categories',
  authenticateToken,
  authorizeRoles('admin'),
  formationController.getAllCategories
);

router.post('/categories',
  authenticateToken,
  authorizeRoles('admin'),
  formationController.addCategory
);

router.put('/categories/:categoryId',
  authenticateToken,
  authorizeRoles('admin'),
  formationController.updateCategory
);

router.delete('/categories/:categoryId',
  authenticateToken,
  authorizeRoles('admin'),
  formationController.deleteCategory
);

module.exports = router;