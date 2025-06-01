const nodemailer = require('nodemailer');
require('dotenv').config();

// Configuration du transporteur SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Envoie un email
 * @param {string} to - Destinataire
 * @param {string} subject - Sujet de l'email
 * @param {string} text - Contenu textuel de l'email
 * @param {string} [html] - Contenu HTML de l'email (optionnel)
 * @returns {Promise<Object>} - Informations sur l'email envoyé
 */
const sendEmail = async (to, subject, text, html) => {
  try {
    const mailOptions = {
      from: `"Plateforme de Formations" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html: html || `<p>${text}</p><p>Cordialement,<br>L'équipe de la plateforme</p>`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email envoyé à ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email:', error);
    throw new Error(`Échec de l'envoi de l'email: ${error.message}`);
  }
};

module.exports = sendEmail;