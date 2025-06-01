import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDatabase, ref, get, query, orderByChild, equalTo } from 'firebase/database';
import axios from 'axios';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './LoginPage.css';
import { db } from '../firebase';

const LoginPage = () => {
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resetPasswordMode, setResetPasswordMode] = useState(false);
  const [currentQuote, setCurrentQuote] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [footerData, setFooterData] = useState(null);
  const navigate = useNavigate();

  const einsteinQuotes = [
    { quote: "L'imagination est plus importante que le savoir.", author: "Albert Einstein" },
    { quote: "La vie, c'est comme une bicyclette, il faut avancer pour ne pas perdre l'équilibre.", author: "Albert Einstein" },
    { quote: "La logique vous conduira d'un point A à un point B. L'imagination vous conduira partout.", author: "Albert Einstein" },
    { quote: "La folie, c'est de faire toujours la même chose et de s'attendre à un résultat différent.", author: "Albert Einstein" },
    { quote: "Tout le monde est un génie. Mais si vous jugez un poisson sur sa capacité à grimper à un arbre, il passera sa vie à croire qu'il est stupide.", author: "Albert Einstein" }
  ];

  useEffect(() => {
    let interval;
    if (isAutoPlaying) {
      interval = setInterval(() => {
        setCurrentQuote((prev) => (prev + 1) % einsteinQuotes.length);
      }, 7000);
    }
    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  useEffect(() => {
    const fetchFooterData = async () => {
      try {
        console.log('Récupération des données du footer depuis Firebase');
        const footerRef = ref(getDatabase(), 'footerSettings');
        const snapshot = await get(footerRef);
        if (snapshot.exists()) {
          setFooterData(snapshot.val());
          console.log('Données du footer récupérées:', snapshot.val());
        } else {
          console.warn('Aucune donnée de footer trouvée');
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des données du footer:', error);
      }
    };
    fetchFooterData();
  }, []);

  const determineUserType = async (email) => {
    console.log('Détermination du type d’utilisateur pour email:', email);
    try {
      const adminRef = ref(db, 'utilisateurs/admin');
      const adminSnap = await get(adminRef);
      if (adminSnap.exists() && adminSnap.val().email === email) {
        console.log('Utilisateur trouvé: admin');
        return 'admin';
      }

      const formateursRef = query(ref(db, 'utilisateurs/formateurs'), orderByChild('email'), equalTo(email));
      const formateursSnap = await get(formateursRef);
      if (formateursSnap.exists()) {
        console.log('Utilisateur trouvé: formateur');
        return 'formateur';
      }

      const etudiantsRef = query(ref(db, 'utilisateurs/etudiants'), orderByChild('email'), equalTo(email));
      const etudiantsSnap = await get(etudiantsRef);
      if (etudiantsSnap.exists()) {
        console.log('Utilisateur trouvé: etudiant');
        return 'etudiant';
      }

      console.warn('Aucun utilisateur trouvé pour email:', email);
      return null;
    } catch (error) {
      console.error('Erreur lors de la détermination du type d’utilisateur:', error);
      return null;
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    console.log('Soumission du formulaire avec:', { email: credentials.email, password: '****' });

    if (!navigator.onLine) {
      console.error('Pas de connexion Internet');
      setError('Pas de connexion Internet détectée');
      setIsLoading(false);
      return;
    }

    if (resetPasswordMode) {
      await handleResetPassword();
      return;
    }

    if (!credentials.email || !credentials.password) {
      console.error('Champs manquants:', credentials);
      setError('Veuillez remplir tous les champs');
      setIsLoading(false);
      return;
    }

    try {
      const email = credentials.email.trim().toLowerCase();
      const userType = await determineUserType(email);
      console.log('Type d’utilisateur déterminé:', userType);
      if (!userType) {
        throw new Error('Utilisateur non trouvé');
      }

      console.log('Envoi de la requête au backend:', { email, password: '****' });
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        email,
        password: credentials.password,
      }, {
        timeout: 5000,
        headers: { 'Content-Type': 'application/json' }
      });

      console.log('Réponse du backend:', response.data);

      localStorage.setItem('authToken', response.data.token);
      localStorage.setItem('role', response.data.role);

      const userData = response.data.userData;
      if (userType === 'admin') {
        const adminData = {
          uid: userData.id,
          email,
          nom: userData.nom,
          prenom: userData.prenom,
          adresse: userData.adresse,
          age: userData.age,
          numTel: userData.numTel,
        };
        localStorage.setItem('admin', JSON.stringify(adminData));
        navigate('/admin/dashboard');
      } else if (userType === 'formateur') {
        const formateurData = {
          uid: userData.id || userData.uid,
          email,
          nom: userData.nom,
          prenom: userData.prenom,
          status: userData.status,
        };
        localStorage.setItem('formateur', JSON.stringify(formateurData));
        navigate('/formateur/dashboard');
      } else if (userType === 'etudiant') {
        const etudiantData = {
          uid: userData.id || userData.uid,
          email,
          nom: userData.nom,
          prenom: userData.prenom,
          niveau: userData.niveau,
          status: userData.status,
        };
        localStorage.setItem('etudiant', JSON.stringify(etudiantData));
        navigate('/etudiant/dashboard/espace-personnel');
      }
      setSuccess('Connexion réussie ! Redirection...');
    } catch (err) {
      console.error('Erreur de connexion:', err);
      let errorMessage = 'Erreur lors de la connexion';
      if (err.response) {
        errorMessage = err.response.data?.message || `Erreur ${err.response.status}: ${err.response.statusText}`;
        console.error('Détails de l’erreur:', err.response.data);
      } else if (err.request) {
        errorMessage = 'Aucun serveur trouvé à http://localhost:5000. Vérifiez que le backend est en cours d’exécution.';
      } else {
        errorMessage = err.message;
      }
      console.error('Message d’erreur:', errorMessage);
      setError(errorMessage);
      localStorage.removeItem('authToken');
      localStorage.removeItem('role');
      localStorage.removeItem('admin');
      localStorage.removeItem('formateur');
      localStorage.removeItem('etudiant');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setError('');
    setSuccess('');
    setIsLoading(false);
    console.warn('Tentative de réinitialisation de mot de passe');
    setError('Réinitialisation non disponible dans ce mode. Contactez l’administrateur.');
  };

  const toggleResetPasswordMode = () => {
    setResetPasswordMode(!resetPasswordMode);
    setError('');
    setSuccess('');
    console.log('Mode réinitialisation:', !resetPasswordMode);
  };

  const goToPrevQuote = () => {
    setIsAutoPlaying(false);
    setCurrentQuote((prev) => (prev - 1 + einsteinQuotes.length) % einsteinQuotes.length);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const goToNextQuote = () => {
    setIsAutoPlaying(false);
    setCurrentQuote((prev) => (prev + 1) % einsteinQuotes.length);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const goToQuote = (index) => {
    setIsAutoPlaying(false);
    setCurrentQuote(index);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  return (
    <div className="page-container">
      <div className="login-container">
        <div className="login-background" style={{ backgroundImage: `url(${process.env.PUBLIC_URL}/images/einstein-background.jpg)` }} />
        <div className="quote-carousel-container">
          <div className="quote-carousel" onMouseEnter={() => setIsAutoPlaying(false)} onMouseLeave={() => setIsAutoPlaying(true)}>
            <div className="carousel-content">
              <button onClick={goToPrevQuote} className="carousel-button" aria-label="Citation précédente">
                <ChevronLeft className="carousel-icon" />
              </button>
              <div className="quote-wrapper">
                <div className="quote-slider">
                  {einsteinQuotes.map((quoteObj, index) => (
                    <div key={index} className={`quote-slide ${currentQuote === index ? 'active' : ''}`}>
                      <p className="quote-text">"{quoteObj.quote}"</p>
                      <p className="quote-author">— {quoteObj.author}</p>
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={goToNextQuote} className="carousel-button" aria-label="Citation suivante">
                <ChevronRight className="carousel-icon" />
              </button>
            </div>
            <div className="carousel-indicators">
              {einsteinQuotes.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToQuote(index)}
                  className={`indicator ${currentQuote === index ? 'active' : ''}`}
                  aria-label={`Aller à la citation ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="login-main-content">
          <div className="login-card">
            <div className="login-header">
              <img src={`${process.env.PUBLIC_URL}/images/logo1.jpg`} alt="Logo" className="login-logo" />
              <h2>{resetPasswordMode ? 'Réinitialisation du mot de passe' : 'Connexion à IEFP'}</h2>
              <p>
                {resetPasswordMode
                  ? 'Entrez votre email pour réinitialiser votre mot de passe'
                  : 'Connectez-vous avec vos identifiants'}
              </p>
            </div>
            <form onSubmit={handleSubmit} className="login-form">
              {error && <div className="error-message">{error}</div>}
              {success && <div className="success-message">{success}</div>}
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={credentials.email}
                  onChange={handleChange}
                  placeholder="exemple@email.com"
                  disabled={isLoading}
                  autoComplete="username"
                />
              </div>
              {!resetPasswordMode && (
                <div className="form-group">
                  <label>Mot de passe</label>
                  <input
                    type="password"
                    name="password"
                    value={credentials.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    disabled={isLoading}
                    autoComplete="current-password"
                  />
                </div>
              )}
              <button type="submit" disabled={isLoading}>
                {isLoading
                  ? (resetPasswordMode ? 'Envoi en cours...' : 'Connexion en cours...')
                  : (resetPasswordMode ? 'Réinitialiser le mot de passe' : 'Se connecter')}
              </button>
              <p className="toggle-mode" onClick={toggleResetPasswordMode}>
                {resetPasswordMode ? 'Retour à la connexion' : 'Mot de passe oublié ?'}
              </p>
              {!resetPasswordMode && (
                <div className="register-links">
                  Vous n'avez pas de compte ?{' '}
                  <a href="/etudiant-register">S'inscrire comme étudiant</a>
                  {' ou '}
                  <a href="/formateur-register">S'inscrire comme formateur</a>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
      <footer className="center-footer">
        <div className="footer-content">
          <div className="footer-section">
            <div className="footer-column">
              <h3>Contact</h3>
              <div className="contact-item">
                <i className="fas fa-phone-alt"></i>
                <div>
                  <a href={`tel:${footerData?.contacts?.phone1 || '+212522123456'}`}>
                    {footerData?.contacts?.phone1 || '+212 522 123 456'}
                  </a>
                  <span className="separator"> / </span>
                  <a href={`tel:${footerData?.contacts?.phone2 || '+212522654321'}`}>
                    {footerData?.contacts?.phone2 || '+212 522 654 321'}
                  </a>
                </div>
              </div>
              <div className="contact-item">
                <i className="fas fa-envelope"></i>
                <a href={`mailto:${footerData?.contacts?.email || 'contact@iefp.ma'}`}>
                  {footerData?.contacts?.email || 'contact@iefp.ma'}
                </a>
              </div>
              <div className="contact-item">
                <i className="fas fa-map-marker-alt"></i>
                <span>{footerData?.contacts?.address || '123 Avenue Mohammed V, Casablanca'}</span>
              </div>
            </div>
            <div className="footer-column">
              <h3>Réseaux sociaux</h3>
              <div className="social-links">
                {footerData?.socialLinks?.length > 0 ? (
                  footerData.socialLinks.map((link, index) => (
                    <a key={index} href={link.url} target="_blank" rel="noopener noreferrer">
                      <i className={`fab fa-${link.name.toLowerCase()}`}></i> {link.name}
                    </a>
                  ))
                ) : (
                  <>
                    <a href="https://facebook.com" target="_blank" rel="noopener noreferrer">
                      <i className="fab fa-facebook-f"></i> Facebook
                    </a>
                    <a href="https://instagram.com" target="_blank" rel="noopener noreferrer">
                      <i className="fab fa-instagram"></i> Instagram
                    </a>
                    <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer">
                      <i className="fab fa-linkedin-in"></i> LinkedIn
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p>© {new Date().getFullYear()} {footerData?.copyright || 'Centre de Formation IEFP - Tous droits réservés'}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LoginPage;