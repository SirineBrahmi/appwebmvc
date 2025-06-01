import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { db } from '../firebase';
import { ref, onValue, push, set } from 'firebase/database';

const FeedbackContent = () => {
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newFeedback, setNewFeedback] = useState({
    formationId: '',
    rating: 5,
    feedbackText: ''
  });
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [formations, setFormations] = useState({});

  useEffect(() => {
    // Récupérer l'étudiant depuis le localStorage
    const currentStudent = JSON.parse(localStorage.getItem('etudiant'));
    if (currentStudent?.uid) {
      setStudentId(currentStudent.uid);
      fetchEnrolledCourses(currentStudent.uid);
      fetchFeedbacks(currentStudent.uid);
      fetchAllFormations();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchAllFormations = () => {
    const formationsRef = ref(db, 'categories');
    onValue(formationsRef, (snapshot) => {
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
  };

  const fetchEnrolledCourses = (studentUid) => {
    const inscriptionsRef = ref(db, 'inscriptions/' + studentUid);
    onValue(inscriptionsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const courses = Object.values(data)
          .filter(inscription => inscription.statut === 'validé')
          .map(inscription => ({
            formationId: inscription.formationId,
            formationName: inscription.formationId // Temporaire, sera remplacé par le vrai nom
          }));
        setEnrolledCourses(courses);
      }
      setLoading(false);
    });
  };

  const fetchFeedbacks = (studentUid) => {
    const feedbacksRef = ref(db, 'feedbacks');
    onValue(feedbacksRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const studentFeedbacks = Object.entries(data)
          .filter(([key, value]) => value.idEtudiant === studentUid)
          .map(([key, value]) => ({
            id: key,
            ...value,
            formationName: formations[value.formationId]?.intitule || value.formationId
          }));
        setFeedbacks(studentFeedbacks);
      }
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewFeedback(prev => ({
      ...prev,
      [name]: name === 'rating' ? parseInt(value) : value
    }));
  };

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    if (!newFeedback.formationId || !newFeedback.feedbackText) {
      alert('Veuillez sélectionner une formation et écrire un commentaire');
      return;
    }

    try {
      const feedbacksRef = ref(db, 'feedbacks');
      const newFeedbackRef = push(feedbacksRef);
      await set(newFeedbackRef, {
        ...newFeedback,
        idEtudiant: studentId,
        date: new Date().toISOString(),
        formationName: formations[newFeedback.formationId]?.intitule || newFeedback.formationId
      });
      
      setNewFeedback({
        formationId: '',
        rating: 5,
        feedbackText: ''
      });
      setShowFeedbackForm(false);
      alert('Feedback soumis avec succès!');
    } catch (error) {
      console.error("Erreur lors de l'envoi du feedback:", error);
      alert("Une erreur s'est produite lors de l'envoi du feedback");
    }
  };

  if (loading) {
    return <Loading>Chargement des données...</Loading>;
  }

  return (
    <ContentCard>
      <h2>Mes Feedbacks</h2>
      
      <Button onClick={() => setShowFeedbackForm(true)}>
        Donner un nouveau feedback
      </Button>
      
      {showFeedbackForm && (
        <FeedbackForm onSubmit={handleSubmitFeedback}>
          <FormGroup>
            <label>Formation:</label>
            <select
              name="formationId"
              value={newFeedback.formationId}
              onChange={handleInputChange}
              required
            >
              <option value="">Sélectionnez une formation</option>
              {enrolledCourses.map(course => (
                <option key={course.formationId} value={course.formationId}>
                  {formations[course.formationId]?.intitule || `Formation ${course.formationId}`}
                </option>
              ))}
            </select>
          </FormGroup>
          
          <FormGroup>
            <label>Note:</label>
            <RatingInput>
              {[1, 2, 3, 4, 5].map(star => (
                <Star 
                  key={star}
                  active={star <= newFeedback.rating}
                  onClick={() => setNewFeedback(prev => ({...prev, rating: star}))}
                >
                  ★
                </Star>
              ))}
            </RatingInput>
          </FormGroup>
          
          <FormGroup>
            <label>Commentaire:</label>
            <textarea
              name="feedbackText"
              value={newFeedback.feedbackText}
              onChange={handleInputChange}
              required
              rows="4"
            />
          </FormGroup>
          
          <Button type="submit">Envoyer</Button>
          <Button secondary onClick={() => setShowFeedbackForm(false)}>
            Annuler
          </Button>
        </FeedbackForm>
      )}
      
      <FeedbacksList>
        {feedbacks.map(feedback => (
          <FeedbackItem key={feedback.id}>
            <FeedbackHeader>
              <span>Formation: {feedback.formationName}</span>
              <Rating>
                {Array(feedback.rating).fill('★').join('')}
              </Rating>
            </FeedbackHeader>
            <FeedbackText>{feedback.feedbackText}</FeedbackText>
            <FeedbackDate>
              {new Date(feedback.date).toLocaleDateString()}
            </FeedbackDate>
          </FeedbackItem>
        ))}
        
        {feedbacks.length === 0 && (
          <NoFeedback>Aucun feedback donné pour le moment</NoFeedback>
        )}
      </FeedbacksList>
    </ContentCard>
  );
};

// Styles
const ContentCard = styled.div`
  background: white;
  border-radius: 10px;
  padding: 25px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  
  h2 {
    color: #1e3b70;
    border-bottom: 2px solid #dba632;
    padding-bottom: 10px;
    margin-top: 0;
  }
`;

const Button = styled.button`
  background-color: ${props => props.secondary ? '#6c757d' : '#1e3b70'};
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  margin: 10px 5px;
  font-weight: bold;
  
  &:hover {
    background-color: ${props => props.secondary ? '#5a6268' : '#dba632'};
  }
`;

const FeedbackForm = styled.form`
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin: 20px 0;
`;

const FormGroup = styled.div`
  margin-bottom: 15px;
  
  label {
    display: block;
    margin-bottom: 5px;
    font-weight: bold;
    color: #495057;
  }
  
  select, textarea {
    width: 100%;
    padding: 8px;
    border: 1px solid #ced4da;
    border-radius: 4px;
    background-color: white;
    color: #495057;
  }
  
  textarea {
    resize: vertical;
  }
`;

const RatingInput = styled.div`
  display: flex;
  gap: 5px;
`;

const Star = styled.span`
  font-size: 24px;
  color: ${props => props.active ? '#ffc107' : '#e4e5e9'};
  cursor: pointer;
`;

const FeedbacksList = styled.div`
  margin-top: 30px;
`;

const FeedbackItem = styled.div`
  background: white;
  border-radius: 8px;
  border: 1px solid #e9ecef;
  padding: 15px;
  margin-bottom: 15px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
`;

const FeedbackHeader = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
`;

const Rating = styled.div`
  color: #ffc107;
  font-size: 18px;
`;

const FeedbackText = styled.p`
  color: #495057;
  margin: 10px 0;
`;

const FeedbackDate = styled.div`
  font-size: 12px;
  color: #6c757d;
  text-align: right;
`;

const NoFeedback = styled.div`
  text-align: center;
  padding: 20px;
  color: #6c757d;
`;

const Loading = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
`;

export default FeedbackContent;