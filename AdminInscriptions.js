import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { userAPI, inscriptionAPI, formationAPI } from '../components/services/api';

const AdminInscriptions = () => {
  const [inscriptions, setInscriptions] = useState({});
  const [users, setUsers] = useState({});
  const [formations, setFormations] = useState({});
  const [formationsWithPlaces, setFormationsWithPlaces] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedInscription, setSelectedInscription] = useState(null);
  const [filter, setFilter] = useState('all');
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch formations
      const formationsResponse = await formationAPI.getAll();
      console.log('AdminInscriptions - Formations response:', formationsResponse);
      
      // Convert response to map
      const formationMap = {};
      if (typeof formationsResponse === 'object' && formationsResponse !== null) {
        Object.values(formationsResponse).forEach(formation => {
          if (formation.id) {
            formationMap[formation.id] = formation;
          } else {
            console.warn('AdminInscriptions - Skipping formation with missing id:', formation);
          }
        });
      }
      setFormations(formationMap);
      console.log('AdminInscriptions - Formations fetched:', Object.keys(formationMap));

      // Fetch users
      const usersResponse = await userAPI.getAll();
      const userMap = {};
      usersResponse.forEach((user) => {
        userMap[user.uid] = user;
      });
      setUsers(userMap);
      console.log('AdminInscriptions - Users fetched:', Object.keys(userMap));

      // Fetch inscriptions
      const inscriptionsResponse = await inscriptionAPI.getAll();
      console.log('AdminInscriptions - Inscriptions API response:', inscriptionsResponse);
      const inscriptionsMap = {};
      inscriptionsResponse.forEach((inscription) => {
        if (!inscriptionsMap[inscription.userId]) {
          inscriptionsMap[inscription.userId] = {};
        }
        inscriptionsMap[inscription.userId][inscription.id] = inscription;
        if (!formationMap[inscription.formationId]) {
          console.warn(`AdminInscriptions - Inscription references missing formation: ${inscription.formationId}`);
        }
      });
      if (Object.keys(inscriptionsMap).length === 0) {
        console.warn('AdminInscriptions - No inscriptions returned from API');
        setError('Aucune inscription trouvée dans la base de données.');
      }
      setInscriptions(inscriptionsMap);
    } catch (err) {
      console.error('AdminInscriptions - Error fetching data:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
      });
      let errorMessage = 'Erreur lors du chargement des données';
      if (err.response?.status === 404) {
        errorMessage = 'Endpoint des inscriptions non trouvé. Vérifiez la configuration du serveur.';
      } else if (err.response?.status === 403) {
        errorMessage = 'Accès refusé. Vérifiez vos droits administrateur.';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (Object.keys(formations).length && Object.keys(inscriptions).length) {
      console.log('AdminInscriptions - Updating formations with places', {
        formationIds: Object.keys(formations),
        inscriptionCount: Object.values(inscriptions).reduce((sum, userIns) => sum + Object.keys(userIns).length, 0),
      });
      const formationsWithRemainingPlaces = {};
      
      // Initialize with all formations
      Object.values(formations).forEach(formation => {
        formationsWithRemainingPlaces[formation.id] = {
          ...formation,
          inscriptionsCount: 0,
          remainingPlaces: parseInt(formation.places, 10) || 20,
        };
      });

      // Count validated inscriptions
      Object.values(inscriptions).forEach(userInscriptions => {
        Object.values(userInscriptions).forEach(inscription => {
          const formationId = inscription.formationId;
          if (formationId && inscription.statut === 'validé' && formationsWithRemainingPlaces[formationId]) {
            formationsWithRemainingPlaces[formationId].inscriptionsCount += 1;
            formationsWithRemainingPlaces[formationId].remainingPlaces -= 1;
          }
        });
      });

      setFormationsWithPlaces(formationsWithRemainingPlaces);
      console.log('AdminInscriptions - Formations with places updated:', formationsWithRemainingPlaces);
    }
  }, [formations, inscriptions]);

  const refreshData = () => {
    console.log('AdminInscriptions - Refreshing data');
    fetchData();
  };

  const getFormationTitle = (formationId) => {
    if (!formationId || !formations[formationId]) {
      console.warn(`AdminInscriptions - getFormationTitle: Formation not found for ID ${formationId}`);
      return 'Formation non trouvée';
    }
    const formation = formations[formationId];
    const title = formation.intitule || formation.categorie || 'Titre non disponible';
    console.log(`AdminInscriptions - getFormationTitle: ${formationId} -> ${title}`);
    return title;
  };

  const getRemainingPlaces = (formationId) => {
    if (!formationId || !formationsWithPlaces[formationId]) {
      console.warn(`AdminInscriptions - getRemainingPlaces: No data for formation ${formationId}`);
      return 'N/A';
    }
    const places = formationsWithPlaces[formationId].remainingPlaces;
    console.log(`AdminInscriptions - getRemainingPlaces: ${formationId} -> ${places}`);
    return places >= 0 ? places : '0';
  };

  const isFormationFull = (formationId) => {
    if (!formationId || !formationsWithPlaces[formationId]) {
      console.warn(`AdminInscriptions - isFormationFull: No data for formation ${formationId}`);
      return false;
    }
    const isFull = formationsWithPlaces[formationId].remainingPlaces <= 0;
    console.log(`AdminInscriptions - isFormationFull: ${formationId} -> ${isFull}`);
    return isFull;
  };

  const getStudentInfo = (userId, inscriptionData) => {
    const user = users[userId] || {};
    return {
      nom: inscriptionData.etudiant?.nom || user.nom || 'Non spécifié',
      prenom: inscriptionData.etudiant?.prenom || user.prenom || 'Non spécifié',
      email: inscriptionData.etudiant?.email || user.email || 'Non spécifié',
    };
  };

  const handleStatusChange = async (userId, inscriptionId, newStatus, formationId) => {
    console.log(`AdminInscriptions - handleStatusChange: ${userId}/${inscriptionId} -> ${newStatus}, formation: ${formationId}`);
    if (newStatus === 'validé' && isFormationFull(formationId) && 
        (!selectedInscription || selectedInscription.data.statut !== 'validé')) {
      alert('Impossible de valider cette inscription : la formation est complète.');
      return;
    }

    if (!window.confirm(`Confirmez-vous le changement de statut à "${newStatus}" ?`)) {
      return;
    }

    setIsUpdating(true);
    try {
      await inscriptionAPI.updateStatus(userId, inscriptionId, newStatus);
      console.log('AdminInscriptions - Status updated via API');

      setInscriptions((prev) => {
        const updated = { ...prev };
        if (!updated[userId]) updated[userId] = {};
        updated[userId][inscriptionId] = {
          ...updated[userId][inscriptionId],
          statut: newStatus,
        };
        return updated;
      });

      if (
        selectedInscription &&
        selectedInscription.userId === userId &&
        selectedInscription.inscriptionId === inscriptionId
      ) {
        setSelectedInscription({
          ...selectedInscription,
          data: { ...selectedInscription.data, statut: newStatus },
        });
      }

      alert(`Statut modifié en "${newStatus}" avec succès`);
    } catch (error) {
      console.error('AdminInscriptions - Error updating status:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      setError(`Erreur lors de la mise à jour : ${error.response?.data?.message || error.message}`);
      if (error.isUnauthorized && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const prepareInscriptionsData = useCallback(() => {
    console.log('AdminInscriptions - Preparing inscriptions data');
    if (!Object.keys(inscriptions).length) {
      console.warn('AdminInscriptions - prepareInscriptionsData: No inscriptions data');
      return [];
    }

    const flattenedInscriptions = [];
    Object.entries(inscriptions).forEach(([userId, userInscriptions]) => {
      Object.entries(userInscriptions || {}).forEach(([inscriptionId, inscriptionData]) => {
        if (!inscriptionData?.formationId || !inscriptionData?.statut || !inscriptionData?.dateInscription) {
          console.warn(`AdminInscriptions - Skipping incomplete inscription: ${userId}/${inscriptionId}`, inscriptionData);
          return;
        }
        if (filter === 'all' || inscriptionData.statut === filter) {
          flattenedInscriptions.push({
            userId,
            inscriptionId,
            data: inscriptionData,
          });
        }
      });
    });

    const sorted = flattenedInscriptions.sort(
      (a, b) => new Date(b.data.dateInscription) - new Date(a.data.dateInscription)
    );
    console.log('AdminInscriptions - Prepared inscriptions:', sorted);
    return sorted;
  }, [inscriptions, filter]);

  const handleShowDetails = (inscription) => {
    console.log('AdminInscriptions - Showing details for inscription:', inscription);
    setSelectedInscription(inscription);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Non spécifiée';
    const options = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    };
    const formatted = new Date(dateString).toLocaleDateString('fr-FR', options);
    console.log(`AdminInscriptions - formatDate: ${dateString} -> ${formatted}`);
    return formatted;
  };

  const closeDetails = () => {
    console.log('AdminInscriptions - Closing details modal');
    setSelectedInscription(null);
  };

  const inscriptionsData = prepareInscriptionsData();

  return (
    <Container>
      <Header>
        <h2>Gestion des Inscriptions</h2>
        <FilterContainer>
          <FilterLabel>Filtrer par statut :</FilterLabel>
          <FilterSelect value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">Tous</option>
            <option value="en attente">En attente</option>
            <option value="validé">Validé</option>
            <option value="refusé">Refusé</option>
          </FilterSelect>
          <RefreshButton onClick={refreshData} disabled={loading || isUpdating}>
            🔄 Actualiser
          </RefreshButton>
        </FilterContainer>
      </Header>

      {loading ? (
        <LoadingIndicator>Chargement des inscriptions...</LoadingIndicator>
      ) : error ? (
        <ErrorMessage>
          {error}
          <RetryButton onClick={refreshData}>Réessayer</RetryButton>
        </ErrorMessage>
      ) : !inscriptionsData.length ? (
        <EmptyMessage>
          Aucune inscription {filter !== 'all' ? `avec le statut "${filter}"` : ''} trouvée.
        </EmptyMessage>
      ) : (
        <InscriptionsTable>
          <thead>
            <tr>
              <th>Étudiant</th>
              <th>Formation</th>
              <th>Places Restantes</th>
              <th>Date d'inscription</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {inscriptionsData.map((inscription) => {
              const student = getStudentInfo(inscription.userId, inscription.data);
              return (
                <TableRow
                  key={`${inscription.userId}-${inscription.inscriptionId}`}
                  status={inscription.data.statut}
                  full={isFormationFull(inscription.data.formationId) && inscription.data.statut !== 'validé'}
                >
                  <td>{`${student.prenom} ${student.nom}`}</td>
                  <td>{getFormationTitle(inscription.data.formationId)}</td>
                  <td>
                    <PlacesBadge full={isFormationFull(inscription.data.formationId)}>
                      {getRemainingPlaces(inscription.data.formationId)}
                    </PlacesBadge>
                  </td>
                  <td>{formatDate(inscription.data.dateInscription)}</td>
                  <td>
                    <StatusBadge status={inscription.data.statut}>
                      {inscription.data.statut || 'Non défini'}
                    </StatusBadge>
                  </td>
                  <td>
                    <ButtonGroup>
                      <ActionButton onClick={() => handleShowDetails(inscription)} disabled={isUpdating}>
                        👁️ Détails
                      </ActionButton>
                      {inscription.data.statut === 'en attente' && (
                        <>
                          <ActionButton
                            success
                            disabled={isFormationFull(inscription.data.formationId) || isUpdating}
                            onClick={() =>
                              handleStatusChange(
                                inscription.userId,
                                inscription.inscriptionId,
                                'validé',
                                inscription.data.formationId
                              )
                            }
                          >
                            ✓ Valider
                          </ActionButton>
                          <ActionButton
                            danger
                            disabled={isUpdating}
                            onClick={() =>
                              handleStatusChange(
                                inscription.userId,
                                inscription.inscriptionId,
                                'refusé',
                                inscription.data.formationId
                              )
                            }
                          >
                            ✕ Refuser
                          </ActionButton>
                        </>
                      )}
                      {inscription.data.statut === 'validé' && (
                        <ActionButton
                          danger
                          disabled={isUpdating}
                          onClick={() =>
                            handleStatusChange(
                              inscription.userId,
                              inscription.inscriptionId,
                              'refusé',
                              inscription.data.formationId
                            )
                          }
                        >
                          ✕ Annuler
                        </ActionButton>
                      )}
                      {inscription.data.statut === 'refusé' && (
                        <ActionButton
                          success
                          disabled={isFormationFull(inscription.data.formationId) || isUpdating}
                          onClick={() =>
                            handleStatusChange(
                              inscription.userId,
                              inscription.inscriptionId,
                              'validé',
                              inscription.data.formationId
                            )
                          }
                        >
                          ✓ Valider
                        </ActionButton>
                      )}
                    </ButtonGroup>
                  </td>
                </TableRow>
              );
            })}
          </tbody>
        </InscriptionsTable>
      )}

      {selectedInscription && (
        <DetailModal>
          <ModalContent>
            <ModalHeader>
              <h3>Détails de l'Inscription</h3>
              <CloseButton onClick={closeDetails} disabled={isUpdating}>✕</CloseButton>
            </ModalHeader>
            <ModalBody>
              <DetailSection>
                <SectionTitle>Informations de l'étudiant</SectionTitle>
                <DetailRow>
                  <DetailLabel>Nom :</DetailLabel>
                  <DetailValue>
                    {getStudentInfo(selectedInscription.userId, selectedInscription.data).nom}
                  </DetailValue>
                </DetailRow>
                <DetailRow>
                  <DetailLabel>Prénom :</DetailLabel>
                  <DetailValue>
                    {getStudentInfo(selectedInscription.userId, selectedInscription.data).prenom}
                  </DetailValue>
                </DetailRow>
                <DetailRow>
                  <DetailLabel>Email :</DetailLabel>
                  <DetailValue>
                    {getStudentInfo(selectedInscription.userId, selectedInscription.data).email}
                  </DetailValue>
                </DetailRow>
              </DetailSection>
              <DetailSection>
                <SectionTitle>Informations de la formation</SectionTitle>
                <DetailRow>
                  <DetailLabel>Formation :</DetailLabel>
                  <DetailValue>{getFormationTitle(selectedInscription.data.formationId)}</DetailValue>
                </DetailRow>
                <DetailRow>
                  <DetailLabel>Places restantes :</DetailLabel>
                  <DetailValue>
                    <PlacesBadge full={isFormationFull(selectedInscription.data.formationId)}>
                      {getRemainingPlaces(selectedInscription.data.formationId)}
                    </PlacesBadge>
                  </DetailValue>
                </DetailRow>
              </DetailSection>
              <DetailSection>
                <SectionTitle>Détails de l'inscription</SectionTitle>
                <DetailRow>
                  <DetailLabel>Date d'inscription :</DetailLabel>
                  <DetailValue>{formatDate(selectedInscription.data.dateInscription)}</DetailValue>
                </DetailRow>
                <DetailRow>
                  <DetailLabel>Statut actuel :</DetailLabel>
                  <DetailValue>
                    <StatusBadge status={selectedInscription.data.statut}>
                      {selectedInscription.data.statut || 'Non défini'}
                    </StatusBadge>
                  </DetailValue>
                </DetailRow>
                {selectedInscription.data.profil && (
                  <DetailRow>
                    <DetailLabel>Profil :</DetailLabel>
                    <DetailValue>{selectedInscription.data.profil}</DetailValue>
                  </DetailRow>
                )}
              </DetailSection>
              {selectedInscription.data.documents && (
                <DetailSection>
                  <SectionTitle>Documents fournis</SectionTitle>
                  {Object.entries(selectedInscription.data.documents).map(([docType, docUrl]) => (
                    <DocumentItem key={docType}>
                      <DocumentLabel>{docType} :</DocumentLabel>
                      <DocumentPreview>
                        {docUrl.match(/\.(jpg|png|jpeg)$/i) ? (
                          <img src={docUrl} alt={docType} width="100" />
                        ) : (
                          <DocumentLink href={docUrl} target="_blank" rel="noopener noreferrer">
                            Voir le document
                          </DocumentLink>
                        )}
                      </DocumentPreview>
                    </DocumentItem>
                  ))}
                </DetailSection>
              )}
            </ModalBody>
            <ModalFooter>
              <ButtonGroup>
                {selectedInscription.data.statut === 'en attente' && (
                  <>
                    <ActionButton
                      success
                      disabled={isFormationFull(selectedInscription.data.formationId) || isUpdating}
                      onClick={() =>
                        handleStatusChange(
                          selectedInscription.userId,
                          selectedInscription.inscriptionId,
                          'validé',
                          selectedInscription.data.formationId
                        )
                      }
                    >
                      ✓ Valider
                    </ActionButton>
                    <ActionButton
                      danger
                      disabled={isUpdating}
                      onClick={() =>
                        handleStatusChange(
                          selectedInscription.userId,
                          selectedInscription.inscriptionId,
                          'refusé',
                          selectedInscription.data.formationId
                        )
                      }
                    >
                      ✕ Refuser
                    </ActionButton>
                  </>
                )}
                {selectedInscription.data.statut === 'validé' && (
                  <ActionButton
                    danger
                    disabled={isUpdating}
                    onClick={() =>
                      handleStatusChange(
                        selectedInscription.userId,
                        selectedInscription.inscriptionId,
                        'refusé',
                        selectedInscription.data.formationId
                      )
                    }
                  >
                    ✕ Annuler
                  </ActionButton>
                )}
                {selectedInscription.data.statut === 'refusé' && (
                  <ActionButton
                    success
                    disabled={isFormationFull(selectedInscription.data.formationId) || isUpdating}
                    onClick={() =>
                      handleStatusChange(
                        selectedInscription.userId,
                        selectedInscription.inscriptionId,
                        'validé',
                        selectedInscription.data.formationId
                      )
                    }
                  >
                    ✓ Valider
                  </ActionButton>
                )}
                <ActionButton onClick={closeDetails} disabled={isUpdating}>
                  Fermer
                </ActionButton>
              </ButtonGroup>
            </ModalFooter>
          </ModalContent>
        </DetailModal>
      )}
    </Container>
  );
};

// Styled Components
const Container = styled.div`
  background: linear-gradient(135deg, rgb(227, 236, 239), rgb(227, 242, 244));
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  min-height: 100vh;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  flex-wrap: wrap;

  h2 {
    margin: 0;
    font-size: 1.8rem;
    font-weight: 700;
    letter-spacing: 0.5px;
    background: linear-gradient(90deg, #00acc1, #4caf50);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
`;

const FilterContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
`;

const FilterLabel = styled.span`
  font-weight: 500;
  color: #263238;
`;

const FilterSelect = styled.select`
  padding: 8px 15px;
  border: 2px solid #00acc1;
  border-radius: 8px;
  font-size: 1rem;
  background: #ffffff;
  cursor: pointer;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: #4caf50;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
`;

const RefreshButton = styled.button`
  background: rgb(195, 224, 252);
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  cursor: ${(props) => (props.disabled ? 'not-allowed' : 'pointer')};
  display: flex;
  align-items: center;
  color: rgb(17, 16, 16);
  font-weight: 500;
  transition: all 0.3s ease;
  opacity: ${(props) => (props.disabled ? 0.6 : 1)};

  &:hover:not(:disabled) {
    background: rgb(146, 141, 137);
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }
`;

const RetryButton = styled.button`
  background: #00acc1;
  color: #ffffff;
  border: none;
  padding: 8px 15px;
  border-radius: 8px;
  cursor: pointer;
  margin-left: 10px;
  font-weight: 500;

  &:hover {
    background: #00838f;
  }
`;

const LoadingIndicator = styled.div`
  text-align: center;
  padding: 30px;
  font-size: 1.2rem;
  font-weight: 500;
  color: #263238;
`;

const ErrorMessage = styled.div`
  background: #ffebee;
  color: #d32f2f;
  padding: 15px;
  border-radius: 8px;
  margin: 15px 0;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const EmptyMessage = styled.div`
  text-align: center;
  padding: 40px;
  font-size: 1.1rem;
  font-weight: 500;
  color: #263238;
`;

const InscriptionsTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 15px;
  background: #ffffff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);

  th {
    background-color: rgb(86, 195, 241);
    padding: 15px 20px;
    text-align: left;
    color: #ffffff;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  td {
    padding: 15px 20px;
    color: #263238;
    border-bottom: 1px solid #e0e0e0;
  }
`;

const TableRow = styled.tr`
  transition: all 0.3s ease;
  background-color: ${(props) => {
    if (props.full && props.status === 'en attente') return '#e0e0e0';
    if (props.status === 'en attente') return '#e8f5e9';
    if (props.status === 'validé') return '#e8f5e9';
    if (props.status === 'refusé') return '#ffebee';
    return '#ffffff';
  }};

  &:hover {
    background-color: ${(props) => {
      if (props.full && props.status === 'en attente') return '#e0e0e0';
      if (props.status === 'en attente') return '#c8e6c9';
      if (props.status === 'validé') return '#c8e6c9';
      if (props.status === 'refusé') return '#ffcdd2';
      return '#f5f5f5';
    }};
    transform: translateY(-2px);
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
`;

const StatusBadge = styled.span`
  display: inline-block;
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 0.9rem;
  background-color: ${({ status }) => 
    status === 'en attente' ? '#fff3e0' : 
    status === 'validé' ? '#e8f5e9' : 
    status === 'refusé' ? '#ffebee' : 
    '#e0e0e0'};
  color: ${({ status }) => 
    status === 'en attente' ? '#e65100' : 
    status === 'validé' ? '#2e7d32' : 
    status === 'refusé' ? '#c62828' : 
    '#424242'};
`;

const PlacesBadge = styled.span`
  display: inline-block;
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 0.9rem;
  font-weight: bold;
  background-color: ${({ full }) => (full ? '#d32f2f' : '#00acc1')};
  color: #ffffff;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
`;

const ActionButton = styled.button`
  background: ${({ success, danger, disabled }) => {
    if (disabled) return '#e0e0e0';
    if (success) return '#4caf50';
    if (danger) return '#d32f2f';
    return '#00acc1';
  }};
  color: #ffffff;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: ${(props) => (props.disabled ? 'not-allowed' : 'pointer')};
  font-size: 0.9rem;
  &:hover:not(:disabled) {
    opacity: 0.9;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.15);
  }
`;

const DetailModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: #ffffff;
  border-radius: 12px;
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;

  h3 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: bold;
    color: #00acc1;
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: ${(props) => props.disabled ? 'not-allowed' : 'pointer'};
  color: #263238;
  &:hover:not(:disabled) {
    color: #00acc1;
  }
`;

const ModalBody = styled.div`
  padding: 20px;
  overflow-y: auto;
  max-height: calc(90vh - 130px);
`;

const DetailSection = styled.div`
  margin-bottom: 30px;
`;

const SectionTitle = styled.h4`
  margin-bottom: 15px;
  padding-bottom: 5px;
  border-bottom: 2px solid #e0e0e0;
  background: linear-gradient(90deg, #00acc1, #4caf50);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  font-weight: bold;
`;

const DetailRow = styled.div`
  display: flex;
  margin-bottom: 12px;
  align-items: center;
`;

const DetailLabel = styled.label`
  font-weight: 600;
  min-width: 150px;
  color: #263238;
`;

const DetailValue = styled.span`
  color: #263238;
  font-weight: normal;
`;

const DocumentItem = styled.div`
  margin-bottom: 20px;
`;

const DocumentLabel = styled.div`
  margin-bottom: 8px;
  font-weight: 500;
`;

const DocumentPreview = styled.div`
  max-width: 300px;

  img {
    max-width: 100%;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 5px;
  }
`;

const DocumentLink = styled.a`
  display: inline-block;
  padding: 8px 16px;
  background: rgb(116, 194, 251);
  color: #ffffff;
  text-decoration: none;
  border-radius: 8px;
  font-weight: 500;
  
  &:hover {
    background: #00838f;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.15);
  }
`;

const ModalFooter = styled.div`
  padding: 20px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  justify-content: flex-end;
`;

export default AdminInscriptions;