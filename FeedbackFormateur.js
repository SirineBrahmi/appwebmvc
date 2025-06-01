import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { ref, onValue, query, orderByChild, equalTo } from 'firebase/database';
import { db } from '../firebase';

const FeedbackContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px;
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
    color: #1e3b70;
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
  color: #1e3b70;
`;

const FeedbackMeta = styled.div`
  display: flex;
  justify-content: space-between;
  color: #666;
  font-size: 0.9rem;
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

const Loading = styled.div`
  text-align: center;
  padding: 40px;
`;

const FilterContainer = styled.div`
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
`;

const FilterSelect = styled.select`
  padding: 8px 12px;
  border-radius: 4px;
  border: 1px solid #ced4da;
`;

const FeedbackFormateur = ({ formateurId }) => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [formations, setFormations] = useState({});
  const [etudiants, setEtudiants] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. D'abord, charger les formations du formateur
        const formationsRef = ref(db, 'categories');
        const unsubscribeFormations = onValue(formationsRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            let formateurFormations = {};
            Object.values(data).forEach(category => {
              if (category.formations) {
                Object.entries(category.formations).forEach(([id, formation]) => {
                  if (formation.formateurId === formateurId) {
                    formateurFormations[id] = formation;
                  }
                });
              }
            });
            setFormations(formateurFormations);
            
            // 2. Une fois les formations chargées, charger les feedbacks correspondants
            if (Object.keys(formateurFormations).length > 0) {
              const feedbacksRef = ref(db, 'feedbacks');
              const unsubscribeFeedbacks = onValue(feedbacksRef, (snapshot) => {
                const feedbacksData = snapshot.val();
                if (feedbacksData) {
                  const feedbacksArray = Object.entries(feedbacksData)
                    .filter(([_, feedback]) => formateurFormations[feedback.formationId])
                    .map(([key, value]) => ({
                      id: key,
                      ...value,
                      status: value.status || 'pending',
                      formationName: formateurFormations[value.formationId]?.intitule || value.formationId
                    }));
                  setFeedbacks(feedbacksArray);
                }
                setLoading(false);
              });
              
              return () => unsubscribeFeedbacks();
            } else {
              setLoading(false);
            }
          }
        });

        // 3. Charger les étudiants
        const etudiantsRef = ref(db, 'utilisateurs/etudiants');
        const unsubscribeEtudiants = onValue(etudiantsRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            setEtudiants(data);
          }
        });

        return () => {
          unsubscribeFormations();
          unsubscribeEtudiants();
        };
      } catch (error) {
        console.error("Erreur lors du chargement des données:", error);
        setLoading(false);
      }
    };

    fetchData();
  }, [formateurId]);

  const filteredFeedbacks = feedbacks.filter(feedback => {
    if (filter === 'all') return true;
    if (filter === 'published') return feedback.status === 'published';
    if (filter === 'pending') return feedback.status === 'pending';
    if (filter === 'archived') return feedback.status === 'archived';
    return true;
  });

  if (loading) {
    return <Loading>Chargement des données...</Loading>;
  }

  return (
    <FeedbackContainer>
      <FeedbackHeader>Feedbacks sur mes formations</FeedbackHeader>
      
      <FilterContainer>
        <FilterSelect value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">Tous les feedbacks</option>
          <option value="published">Publiés</option>
          <option value="pending">En attente</option>
          <option value="archived">Archivés</option>
        </FilterSelect>
      </FilterContainer>
      
      {filteredFeedbacks.length > 0 ? (
        <FeedbackList>
          {filteredFeedbacks.map(feedback => {
            const etudiant = etudiants[feedback.idEtudiant];
            
            return (
              <FeedbackItem key={feedback.id} status={feedback.status}>
                <div>
                  <strong>Formation:</strong> {feedback.formationName}
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
              </FeedbackItem>
            );
          })}
        </FeedbackList>
      ) : (
        <p>Aucun feedback disponible pour vos formations.</p>
      )}
    </FeedbackContainer>
  );
};

export default FeedbackFormateur;