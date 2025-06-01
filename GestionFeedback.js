import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { ref, onValue, update } from 'firebase/database';
import { db } from '../firebase';

const FeedbackContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const FeedbackHeader = styled.h2`
  color: #1e3b70;
  border-bottom: 2px solid #dba632;
  padding-bottom: 10px;
`;

const FeedbackList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

const FeedbackItem = styled.div`
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
  border-left: 4px solid ${props => 
    props.status === 'archived' ? '#6c757d' : 
    props.status === 'published' ? '#28a745' : '#dba632'};
`;

const FeedbackText = styled.p`
  margin: 10px 0;
  color: #333;
`;

const FeedbackMeta = styled.div`
  display: flex;
  justify-content: space-between;
  color: #666;
  font-size: 0.9rem;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 15px;
`;

const StatusBadge = styled.span`
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: bold;
  color: white;
  background-color: ${props => 
    props.status === 'archived' ? '#6c757d' : 
    props.status === 'published' ? '#28a745' : '#ffc107'};
`;

const Button = styled.button`
  padding: 5px 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  font-size: 0.8rem;
  
  &.publish {
    background-color: #28a745;
    color: white;
    &:hover {
      background-color: #218838;
    }
  }
  
  &.archive {
    background-color: #6c757d;
    color: white;
    &:hover {
      background-color: #5a6268;
    }
  }
`;

const Loading = styled.div`
  text-align: center;
  padding: 40px;
`;

const GestionFeedback = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [formations, setFormations] = useState({});
  const [etudiants, setEtudiants] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // Charger les feedbacks
      const feedbacksRef = ref(db, 'feedbacks');
      const unsubscribeFeedbacks = onValue(feedbacksRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const feedbacksArray = Object.entries(data).map(([key, value]) => ({
            id: key,
            ...value,
            status: value.status || 'pending' // Par défaut 'pending' si non défini
          }));
          setFeedbacks(feedbacksArray);
        }
      });

      // Charger les formations
      const formationsRef = ref(db, 'categories');
      const unsubscribeFormations = onValue(formationsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          let allFormations = {};
          Object.values(data).forEach(category => {
            if (category.formations) {
              allFormations = {...allFormations, ...category.formations};
            }
          });
          setFormations(allFormations);
        }
      });

      // Charger les étudiants
      const etudiantsRef = ref(db, 'inscriptions');
      const unsubscribeEtudiants = onValue(etudiantsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          let allEtudiants = {};
          Object.values(data).forEach(etudiantInscriptions => {
            Object.values(etudiantInscriptions).forEach(inscription => {
              if (inscription.etudiant) {
                allEtudiants[inscription.etudiant.uid] = inscription.etudiant;
              }
            });
          });
          setEtudiants(allEtudiants);
        }
      });

      setLoading(false);

      return () => {
        unsubscribeFeedbacks();
        unsubscribeFormations();
        unsubscribeEtudiants();
      };
    };

    fetchData();
  }, []);

  const updateFeedbackStatus = (feedbackId, status) => {
    const feedbackRef = ref(db, `feedbacks/${feedbackId}`);
    update(feedbackRef, { status })
      .then(() => {
        setFeedbacks(prevFeedbacks => 
          prevFeedbacks.map(feedback => 
            feedback.id === feedbackId ? {...feedback, status} : feedback
          )
        );
      })
      .catch(error => {
        console.error("Erreur lors de la mise à jour du statut:", error);
      });
  };

  if (loading) {
    return <Loading>Chargement des données...</Loading>;
  }

  return (
    <FeedbackContainer>
      <FeedbackHeader>Gestion des Feedbacks</FeedbackHeader>
      
      {feedbacks.length > 0 ? (
        <FeedbackList>
          {feedbacks.map(feedback => {
            const formation = formations[feedback.formationId];
            const etudiant = etudiants[feedback.idEtudiant];
            
            return (
              <FeedbackItem key={feedback.id} status={feedback.status}>
                <div>
                  <strong>Formation:</strong> {formation?.intitule || feedback.formationId}
                </div>
                <div>
                  <strong>Étudiant:</strong> {etudiant ? `${etudiant.prenom} ${etudiant.nom}` : feedback.idEtudiant}
                </div>
                <div>
                  <strong>Note:</strong> {feedback.rating}/5
                </div>
                <FeedbackText>
                  <strong>Commentaire:</strong> {feedback.feedbackText}
                </FeedbackText>
                <FeedbackMeta>
                  <span>Date: {new Date(feedback.date).toLocaleDateString()}</span>
                  <StatusBadge status={feedback.status}>
                    {feedback.status === 'published' ? 'Publié' : 
                     feedback.status === 'archived' ? 'Archivé' : 'En attente'}
                  </StatusBadge>
                </FeedbackMeta>
                
                <ActionButtons>
                  {feedback.status !== 'published' && (
                    <Button 
                      className="publish" 
                      onClick={() => updateFeedbackStatus(feedback.id, 'published')}
                    >
                      Publier
                    </Button>
                  )}
                  {feedback.status !== 'archived' && (
                    <Button 
                      className="archive" 
                      onClick={() => updateFeedbackStatus(feedback.id, 'archived')}
                    >
                      Archiver
                    </Button>
                  )}
                </ActionButtons>
              </FeedbackItem>
            );
          })}
        </FeedbackList>
      ) : (
        <p>Aucun feedback disponible pour le moment.</p>
      )}
    </FeedbackContainer>
  );
};

export default GestionFeedback;