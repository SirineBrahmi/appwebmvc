const express = require('express');
const router = express.Router();
const emailController = require('../controllers/emailController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

// Protéger la route avec authentification et autorisation admin
router.post('/send', 
  authenticateToken,
  authorizeRoles(['admin']),
  emailController.sendEmail
);

module.exports = router;