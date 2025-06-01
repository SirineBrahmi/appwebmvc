import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { userAPI } from './services/api';

const UsersContent = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [studentFilter, setStudentFilter] = useState('all');
  const [teacherFilter, setTeacherFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    nom: '',
    prenom: '',
    motDePasse: '',
    role: 'etudiant',
    numTel: '',
    niveau: '',
    diplome: '',
    cin: '',
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await userAPI.getAll();
      setUsers(response || []); // Adjusted to handle response directly
      console.log('Users fetched:', response);
    } catch (error) {
      console.error('Erreur lors de la récupération des utilisateurs:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      setError(error.response?.data?.message || 'Impossible de charger les utilisateurs. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (uid, role, currentStatus) => {
    try {
      await userAPI.toggleStatus(uid, role, currentStatus);
      fetchUsers();
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
      setError('Erreur lors de la mise à jour du statut.');
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await userAPI.create(newUser);
      setShowCreateModal(false);
      setNewUser({
        email: '',
        nom: '',
        prenom: '',
        motDePasse: '',
        role: 'etudiant',
        numTel: '',
        niveau: '',
        diplome: '',
        cin: '',
      });
      fetchUsers();
    } catch (error) {
      console.error('Erreur lors de la création de l’utilisateur:', error);
      setError('Erreur lors de la création de l’utilisateur.');
    }
  };

  const handleDeleteUser = async (uid, role) => {
    if (window.confirm('Confirmer la suppression ?')) {
      try {
        await userAPI.delete(role, uid);
        fetchUsers();
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        setError('Erreur lors de la suppression de l’utilisateur.');
      }
    }
  };

  const filteredStudents = users
    .filter((user) => user.role === 'etudiant')
    .filter((student) => {
      const matchesFilter =
        studentFilter === 'all' ||
        (studentFilter === 'active' && student.status === 'active') ||
        (studentFilter === 'pending' && student.status === 'pending') ||
        (studentFilter === 'blocked' && student.status === 'blocked');
      const matchesSearch =
        searchTerm === '' ||
        student.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.prenom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesFilter && matchesSearch;
    });

  const filteredTeachers = users
    .filter((user) => user.role === 'formateur')
    .filter((teacher) => {
      const matchesFilter =
        teacherFilter === 'all' ||
        (teacherFilter === 'active' && teacher.status === 'active') ||
        (teacherFilter === 'pending' && teacher.status === 'pending') ||
        (teacherFilter === 'blocked' && teacher.status === 'blocked');
      const matchesSearch =
        searchTerm === '' ||
        teacher.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        teacher.prenom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        teacher.email?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesFilter && matchesSearch;
    });

  return (
    <UsersContainer>
      {loading && <LoadingContainer>Chargement des utilisateurs...</LoadingContainer>}
      {error && <ErrorContainer>{error}</ErrorContainer>}
      {!loading && !error && (
        <>
          <SearchBar>
            <SearchInput
              type="text"
              placeholder="Rechercher par nom, prénom ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </SearchBar>

          {showCreateModal && (
            <Modal>
              <ModalContent>
                <h2>Ajouter un utilisateur</h2>
                <form onSubmit={handleCreateUser}>
                  <FormGroup>
                    <label>Rôle</label>
                    <select
                      value={newUser.role}
                      onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    >
                      <option value="etudiant">Étudiant</option>
                      <option value="formateur">Formateur</option>
                    </select>
                  </FormGroup>
                  <FormGroup>
                    <label>Email</label>
                    <input
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      required
                    />
                  </FormGroup>
                  <FormGroup>
                    <label>Nom</label>
                    <input
                      type="text"
                      value={newUser.nom}
                      onChange={(e) => setNewUser({ ...newUser, nom: e.target.value })}
                      required
                    />
                  </FormGroup>
                  <FormGroup>
                    <label>Prénom</label>
                    <input
                      type="text"
                      value={newUser.prenom}
                      onChange={(e) => setNewUser({ ...newUser, prenom: e.target.value })}
                      required
                    />
                  </FormGroup>
                  <FormGroup>
                    <label>Mot de passe</label>
                    <input
                      type="password"
                      value={newUser.motDePasse}
                      onChange={(e) => setNewUser({ ...newUser, motDePasse: e.target.value })}
                      required
                    />
                  </FormGroup>
                  {newUser.role === 'etudiant' && (
                    <>
                      <FormGroup>
                        <label>Téléphone</label>
                        <input
                          type="tel"
                          value={newUser.numTel}
                          onChange={(e) => setNewUser({ ...newUser, numTel: e.target.value })}
                        />
                      </FormGroup>
                      <FormGroup>
                        <label>Niveau</label>
                        <input
                          type="text"
                          value={newUser.niveau}
                          onChange={(e) => setNewUser({ ...newUser, niveau: e.target.value })}
                        />
                      </FormGroup>
                    </>
                  )}
                  {newUser.role === 'formateur' && (
                    <>
                      <FormGroup>
                        <label>Diplôme</label>
                        <input
                          type="text"
                          value={newUser.diplome}
                          onChange={(e) => setNewUser({ ...newUser, diplome: e.target.value })}
                        />
                      </FormGroup>
                      <FormGroup>
                        <label>CIN</label>
                        <input
                          type="text"
                          value={newUser.cin}
                          onChange={(e) => setNewUser({ ...newUser, cin: e.target.value })}
                        />
                      </FormGroup>
                    </>
                  )}
                  <ModalActions>
                    <button type="submit">Créer</button>
                    <button type="button" onClick={() => setShowCreateModal(false)}>
                      Annuler
                    </button>
                  </ModalActions>
                </form>
              </ModalContent>
            </Modal>
          )}

          <Section>
            <SectionHeader>
              <h2>Étudiants</h2>
              <FilterGroup>
                <FilterLabel>Filtrer :</FilterLabel>
                <FilterSelect
                  value={studentFilter}
                  onChange={(e) => setStudentFilter(e.target.value)}
                >
                  <option value="all">Tous</option>
                  <option value="active">Actifs</option>
                  <option value="pending">En attente</option>
                  <option value="blocked">Bloqués</option>
                </FilterSelect>
              </FilterGroup>
            </SectionHeader>
            <UserTable>
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Prénom</th>
                  <th>Email</th>
                  <th>Téléphone</th>
                  <th>Niveau</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((student) => (
                    <tr key={student.uid || student.id}>
                      <td>{student.nom || '-'}</td>
                      <td>{student.prenom || '-'}</td>
                      <td>{student.email || '-'}</td>
                      <td>{student.numTel || '-'}</td>
                      <td>{student.niveau || '-'}</td>
                      <td>
                        <StatusBadge status={student.status || 'pending'}>
                          {student.status === 'active'
                            ? 'Actif'
                            : student.status === 'blocked'
                            ? 'Bloqué'
                            : 'En attente'}
                        </StatusBadge>
                      </td>
                      <td>
                        <ActionButton
                          onClick={() =>
                            handleToggleStatus(
                              student.uid || student.id,
                              'etudiant',
                              student.status || 'pending'
                            )
                          }
                          status={student.status || 'pending'}
                        >
                          {student.status === 'active'
                            ? 'Bloquer'
                            : student.status === 'blocked'
                            ? 'Activer'
                            : 'Approuver'}
                        </ActionButton>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center' }}>
                      Aucun étudiant trouvé
                    </td>
                  </tr>
                )}
              </tbody>
            </UserTable>
          </Section>

          <Section>
            <SectionHeader>
              <h2>Formateurs</h2>
              <FilterGroup>
                <FilterLabel>Filtrer :</FilterLabel>
                <FilterSelect
                  value={teacherFilter}
                  onChange={(e) => setTeacherFilter(e.target.value)}
                >
                  <option value="all">Tous</option>
                  <option value="active">Actifs</option>
                  <option value="pending">En attente</option>
                  <option value="blocked">Bloqués</option>
                </FilterSelect>
              </FilterGroup>
            </SectionHeader>
            <UserTable>
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Prénom</th>
                  <th>Email</th>
                  <th>Spécialité</th>
                  <th>CIN</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeachers.length > 0 ? (
                  filteredTeachers.map((teacher) => (
                    <tr key={teacher.uid || teacher.id}>
                      <td>{teacher.nom || '-'}</td>
                      <td>{teacher.prenom || '-'}</td>
                      <td>{teacher.email || '-'}</td>
                      <td>{teacher.diplome || 'Non spécifié'}</td>
                      <td>{teacher.cin || 'Non spécifié'}</td>
                      <td>
                        <StatusBadge status={teacher.status || 'pending'}>
                          {teacher.status === 'active'
                            ? 'Actif'
                            : teacher.status === 'blocked'
                            ? 'Bloqué'
                            : 'En attente'}
                        </StatusBadge>
                      </td>
                      <td>
                        <ActionButton
                          onClick={() =>
                            handleToggleStatus(
                              teacher.uid || teacher.id,
                              'formateur',
                              teacher.status || 'pending'
                            )
                          }
                          status={teacher.status || 'pending'}
                        >
                          {teacher.status === 'active'
                            ? 'Bloquer'
                            : teacher.status === 'blocked'
                            ? 'Activer'
                            : 'Approuver'}
                        </ActionButton>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center' }}>
                      Aucun formateur trouvé
                    </td>
                  </tr>
                )}
              </tbody>
            </UserTable>
          </Section>
        </>
      )}
    </UsersContainer>
  );
};

// Styles
const UsersContainer = styled.div`
  padding: 30px;
  background: linear-gradient(135deg, rgb(227, 236, 245), rgb(227, 242, 244));
  min-height: 100vh;
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  font-size: 1.2rem;
  color: #263238;
  font-weight: 500;
`;

const ErrorContainer = styled.div`
  background: #ffebee;
  color: #e74c3c;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
  text-align: center;
`;

const SearchBar = styled.div`
  margin-bottom: 30px;
  display: flex;
  gap: 20px;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 12px 20px;
  border: 2px solid #00acc1;
  border-radius: 8px;
  font-size: 1.1rem;
  background: #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  &:focus {
    outline: none;
    border-color: #4caf50;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }
`;

const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: white;
  padding: 20px;
  border-radius: 8px;
  width: 500px;
  max-width: 90%;
  h2 {
    margin: 0;
  }
`;

const FormGroup = styled.div`
  margin-bottom: 15px;
  label {
    display: block;
    margin-bottom: 5px;
  }
  input,
  select {
    width: 100%;
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
  }
`;

const ModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  button {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  button[type='submit'] {
    background: #4caf50;
    color: white;
  }
  button[type='button'] {
    background: #e74c3c;
    color: white;
  }
`;

const Section = styled.div`
  margin-bottom: 50px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 20px;
  border-bottom: 3px solid transparent;
  background: linear-gradient(90deg, #00acc1, #4caf50);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  h2 {
    margin: 0;
    font-size: 1.8rem;
    font-weight: 700;
    letter-spacing: 0.5px;
  }
`;

const FilterGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
`;

const FilterLabel = styled.label`
  font-size: 1rem;
  color: #263238;
  font-weight: 500;
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
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
`;

const UserTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  th,
  td {
    padding: 15px 20px;
    text-align: left;
    border-bottom: 1px solid #e0e0e0;
    color: #263238;
  }
  th {
    background-color: rgb(86, 153, 165);
    font-weight: 600;
    color: #ffffff;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  tr {
    transition: all 0.3s ease;
  }
  tr:hover {
    background-color: #f1f8ff;
    transform: translateY(-2px);
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  }
`;

const StatusBadge = styled.div`
  display: inline-block;
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 0.9rem;
  font-weight: 500;
  background-color: ${(props) =>
    props.status === 'active'
      ? '#e8f5e9'
      : props.status === 'blocked'
      ? '#ffebee'
      : '#fff3e0'};
  color: ${(props) =>
    props.status === 'active'
      ? '#4caf50'
      : props.status === 'blocked'
      ? '#d32f2f'
      : '#ff9800'};
`;

const ActionButton = styled.button`
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  background-color: ${(props) =>
    props.status === 'active'
      ? '#d32f2f'
      : props.status === 'blocked'
      ? '#4caf50'
      : '#00acc1'};
  color: #ffffff;
  &:hover {
    opacity: 0.9;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.15);
  }
`;

export default UsersContent;