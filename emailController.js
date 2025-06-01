const sendEmail = require('../utils/sendEmail');

exports.sendEmail = async (req, res) => {
  try {
    const { to, subject, html } = req.body;
    
    if (!to || !subject || !html) {
      return res.status(400).json({ 
        message: 'Destinataire (to), sujet (subject) et contenu (html) sont requis' 
      });
    }

    await sendEmail(to, subject, html);
    res.status(200).json({ message: 'Email envoyé avec succès' });
  } catch (error) {
    console.error('Erreur dans emailController:', error);
    res.status(500).json({ 
      message: "Échec d'envoi d'email",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};