const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/authMiddleware'); // Correction ici

router.get('/', authenticateToken, userController.getAllUsers);
router.post('/', authenticateToken, userController.createUser);
router.put('/:role/:uid', authenticateToken, userController.updateUser);
router.delete('/:role/:uid', authenticateToken, userController.deleteUser);
router.post('/toggle-status', authenticateToken, userController.toggleUserStatus);

module.exports = router;