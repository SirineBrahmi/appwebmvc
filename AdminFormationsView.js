import React from 'react';
import '../AdminFormationsView.css'; // Import du fichier CSS

const AdminFormationsView = ({ controller }) => {
  const { state, model } = controller;
  const formationsFiltrées = controller.getFilteredFormations();

  return (
    <div className="admin-formations-container">
      <div className="admin-header">
        <h2>Gestion des Formations</h2>
      </div>

      {model.error && <div className="error-message">{model.error}</div>}
      {model.success && <div className="success-message">{model.success}</div>}

      <div className="categories-section">
        <h2>Gestion des Catégories</h2>
        <form onSubmit={(e) => controller.handleAddCategory(e)} className="category-form">
          <div className="form-group">
            <label htmlFor="newCategoryName">Nouvelle catégorie*</label>
            <input
              type="text"
              id="newCategoryName"
              value={state.newCategoryName}
              onChange={(e) => controller.setNewCategoryName(e.target.value)}
              placeholder="Ex: Développement Web"
              required
            />
          </div>
          <button type="submit" className="add-category-btn">
            Ajouter
          </button>
        </form>

        <div className="categories-list">
          <h3>Catégories existantes</h3>
          {Object.keys(model.categories).length > 0 ? (
            <ul>
              {Object.keys(model.categories).map((categoryId) => (
                <li key={categoryId} className="category-item">
                  {state.editCategoryId === categoryId ? (
                    <div className="edit-category-form">
                      <input
                        type="text"
                        value={state.editCategoryName}
                        onChange={(e) => controller.setEditCategoryName(e.target.value)}
                        placeholder="Nouveau nom"
                        required
                      />
                      <button
                        className="save-btn"
                        onClick={() => controller.handleEditCategory(categoryId)}
                      >
                        Enregistrer
                      </button>
                      <button
                        className="cancel-btn"
                        onClick={() => controller.handleCancelEditCategory()}
                      >
                        Annuler
                      </button>
                    </div>
                  ) : (
                    <div className="category-details">
                      <span>{model.categories[categoryId].nom}</span>
                      <div className="category-actions">
                        <button
                          className="edit-btn"
                          onClick={() => {
                            controller.setEditCategoryId(categoryId);
                            controller.setEditCategoryName(model.categories[categoryId].nom);
                          }}
                        >
                          Modifier
                        </button>
                        <button
                          className="delete-btn"
                          onClick={() => controller.handleDeleteCategory(categoryId)}
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p>Aucune catégorie disponible. Ajoutez-en une ci-dessus.</p>
          )}
        </div>
      </div>

      <div className="filters-container">
        <div className="filter-group">
          <label htmlFor="filtre-statut">Filtrer par statut :</label>
          <select
            id="filtre-statut"
            value={state.filtreStatut}
            onChange={(e) => controller.setFiltreStatut(e.target.value)}
          >
            <option value="tous">Tous</option>
            <option value="en_attente">En attente</option>
            <option value="pré-validée">Pré-validée</option>
            <option value="validée">Validée</option>
            <option value="publiée">Publiée</option>
            <option value="archivée">Archivée</option>
            <option value="refusée">Refusée</option>
          </select>
        </div>

        <button
          className="refresh-btn"
          onClick={() => controller.fetchData()}
          disabled={model.loading}
        >
          {model.loading ? <span className="spinner"></span> : 'Actualiser'}
        </button>
      </div>

      {model.loading ? (
        <div className="loading-overlay">
          <span className="spinner"></span>
          <p>Chargement en cours...</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="formations-table">
            <thead>
              <tr>
                <th>Intitulé</th>
                <th>Formateur</th>
                <th>Catégorie</th>
                <th>Statut</th>
                <th>Dates</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {formationsFiltrées.map((formation) => {
                const formateur = formation.formateurId ? model.formateurs[formation.formateurId] : null;
                return (
                  <tr key={formation.id}>
                    <td>
                      <div className="formation-title" onClick={() => controller.openFormationModal(formation)}>
                        {formation.intitule}
                      </div>
                    </td>
                    <td>
                      {formateur ? (
                        <div className="formateur-info" onClick={() => controller.openFileModal(formateur)}>
                          {formateur.photoURL && (
                            <img
                              src={formateur.photoURL}
                              alt={`${formateur.prenom} ${formateur.nom}`}
                              className="formateur-avatar"
                            />
                          )}
                          <div>
                            <div className="formateur-name">
                              {formateur.prenom} {formateur.nom}
                            </div>
                            <div className="formateur-email">
                              {formateur.email}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="not-applicable">Non attribué</div>
                      )}
                    </td>
                    <td>
                      {formation.categorie ? (
                        <span className="categorie-badge">{formation.categorie}</span>
                      ) : (
                        <span className="not-applicable">Non spécifiée</span>
                      )}
                    </td>
                    <td>
                      <span className={`status-badge ${formation.statut.replace(' ', '-')}`}>
                        {formation.statut}
                      </span>
                    </td>
                    <td>
                      {formation.dateDebut && formation.dateFin ? (
                        <div className="dates-container">
                          <div>{new Date(formation.dateDebut).toLocaleDateString()}</div>
                          <div>au</div>
                          <div>{new Date(formation.dateFin).toLocaleDateString()}</div>
                        </div>
                      ) : (
                        <span className="not-applicable">Non définies</span>
                      )}
                    </td>
                    <td className="actions-cell">
                      <div className="actions-container">
                        {formation.statut === 'en_attente' && (
                          <>
                            <button
                              className="action-btn approve-btn"
                              onClick={() => controller.handleStatusChange(formation.id, 'pré-validée', formation.formateurId, formation.intitule)}
                            >
                              Pré-valider
                            </button>
                            <button
                              className="action-btn reject-btn"
                              onClick={() => controller.handleStatusChange(formation.id, 'refusée', formation.formateurId, formation.intitule)}
                            >
                              Refuser
                            </button>
                          </>
                        )}
                        {formation.statut === 'pré-validée' && (
                          <>
                            <button
                              className="action-btn approve-btn"
                              onClick={() => controller.handleStatusChange(formation.id, 'validée', formation.formateurId, formation.intitule)}
                            >
                              Valider
                            </button>
                            <button
                              className="action-btn modify-btn"
                              onClick={() => controller.openFormationModal(formation)}
                            >
                              Modifier
                            </button>
                          </>
                        )}
                        {formation.statut === 'validée' && (
                          <button
                            className="action-btn approve-btn"
                            onClick={() => controller.navigateToPublish(formation.id)}
                          >
                            Publier
                          </button>
                        )}
                        {formation.statut === 'publiée' && (
                          <button
                            className="action-btn archive-btn"
                            onClick={() => controller.handleStatusChange(formation.id, 'archivée', formation.formateurId, formation.intitule)}
                          >
                            Archiver
                          </button>
                        )}
                        <button
                          className="action-btn details-btn"
                          onClick={() => controller.openFormationModal(formation)}
                        >
                          Détails
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {state.formateurDetail && (
        <div className="modal-overlay">
          <div className="formateur-modal">
            <div className="modal-header">
              <h3>Détails du formateur</h3>
              <button className="close-btn" onClick={() => controller.closeFormateurModal()}>
                ×
              </button>
            </div>
            <div className="modal-content">
              <div className="formateur-photo-section">
                {state.formateurDetail.photoURL && (
                  <img
                    src={state.formateurDetail.photoURL}
                    alt={`${state.formateurDetail.prenom} ${state.formateurDetail.nom}`}
                    className="formateur-photo"
                  />
                )}
                <div className="documents-section">
                  <h4>Documents</h4>
                  <div className="documents-list">
                    {state.selectedFiles.map((file, index) => (
                      <a
                        key={index}
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="document-link"
                      >
                        <span>{file.type}</span>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
              <div className="formateur-details">
                <div className="details-grid">
                  <div className="detail-item">
                    <label>Nom complet</label>
                    <p>{state.formateurDetail.prenom} {state.formateurDetail.nom}</p>
                  </div>
                  <div className="detail-item">
                    <label>Email</label>
                    <a href={`mailto:${state.formateurDetail.email}`}>{state.formateurDetail.email}</a>
                  </div>
                  <div className="detail-item">
                    <label>Téléphone</label>
                    <a href={`tel:${state.formateurDetail.numTel}`}>{state.formateurDetail.numTel}</a>
                  </div>
                  <div className="detail-item">
                    <label>Date de naissance</label>
                    <p>{state.formateurDetail.dateNaissance}</p>
                  </div>
                  <div className="detail-item">
                    <label>Diplôme</label>
                    <p>{state.formateurDetail.diplome || 'Non spécifié'}</p>
                  </div>
                  <div className="detail-item">
                    <label>Spécialité</label>
                    <p>{state.formateurDetail.specialite}</p>
                  </div>
                  <div className="detail-item">
                    <label>Expérience</label>
                    <p>{state.formateurDetail.experience}</p>
                  </div>
                  <div className="detail-item">
                    <label>Ville</label>
                    <p>{state.formateurDetail.ville}</p>
                  </div>
                </div>
                <div className="biography-section">
                  <label>Biographie</label>
                  <div className="biography-text">
                    {state.formateurDetail.biographie || 'Aucune biographie fournie.'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {state.formationDetail && (
        <div className="modal-overlay">
          <div className="formation-modal">
            <div className="modal-header">
              <h3>Détails de la formation</h3>
              <button className="close-btn" onClick={() => controller.closeFormationModal()}>
                ×
              </button>
            </div>
            <div className="modal-content">
              <div className="formation-details">
                <div className="details-grid">
                  <div className="detail-item">
                    <label>Intitulé*</label>
                    <input
                      value={state.formationDetail.intitule || ''}
                      onChange={(e) =>
                        controller.setFormationDetail({
                          ...state.formationDetail,
                          intitule: e.target.value,
                          specialite: e.target.value, // Synchroniser avec specialite
                        })
                      }
                      required
                    />
                  </div>
                  <div className="detail-item">
                    <label>Catégorie*</label>
                    <select
                      value={state.formationDetail.categorieId || ''}
                      onChange={(e) =>
                        controller.setFormationDetail({
                          ...state.formationDetail,
                          categorieId: e.target.value,
                          categorie: model.categories[e.target.value]?.nom || 'Non spécifiée',
                        })
                      }
                      required
                    >
                      <option value="">Sélectionnez une catégorie</option>
                      {Object.keys(model.categories).map((categoryId) => (
                        <option key={categoryId} value={categoryId}>
                          {model.categories[categoryId].nom}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="detail-item">
                    <label>Statut</label>
                    <input value={state.formationDetail.statut || ''} readOnly />
                  </div>
                  <div className="detail-item">
                    <label>Date de création</label>
                    <input
                      value={
                        state.formationDetail.dateCreation
                          ? new Date(state.formationDetail.dateCreation).toLocaleDateString()
                          : 'Non spécifiée'
                      }
                      readOnly
                    />
                  </div>
                  <div className="detail-item">
                    <label>Date de début*</label>
                    <input
                      type="date"
                      value={state.formationDetail.dateDebut || ''}
                      onChange={(e) =>
                        controller.setFormationDetail({
                          ...state.formationDetail,
                          dateDebut: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div className="detail-item">
                    <label>Date de fin*</label>
                    <input
                      type="date"
                      value={state.formationDetail.dateFin || ''}
                      onChange={(e) =>
                        controller.setFormationDetail({
                          ...state.formationDetail,
                          dateFin: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div className="detail-item">
                    <label>Durée (heures)*</label>
                    <input
                      type="number"
                      value={state.formationDetail.duree || ''}
                      onChange={(e) =>
                        controller.setFormationDetail({
                          ...state.formationDetail,
                          duree: e.target.value,
                        })
                      }
                      min="1"
                      required
                    />
                  </div>
                  <div className="detail-item">
                    <label>Prix (DT)*</label>
                    <input
                      type="number"
                      value={state.formationDetail.prix || ''}
                      onChange={(e) =>
                        controller.setFormationDetail({
                          ...state.formationDetail,
                          prix: e.target.value,
                        })
                      }
                      min="0"
                      required
                    />
                  </div>
                  <div className="detail-item">
                    <label>Modalité</label>
                    <select
                      value={state.formationDetail.modalite || 'présentiel'}
                      onChange={(e) =>
                        controller.setFormationDetail({
                          ...state.formationDetail,
                          modalite: e.target.value,
                        })
                      }
                    >
                      <option value="présentiel">Présentiel</option>
                      <option value="en_ligne">En ligne</option>
                      <option value="hybride">Hybride</option>
                    </select>
                  </div>
                  <div className="detail-item">
                    <label>Matériel nécessaire</label>
                    <input
                      value={state.formationDetail.materiel || ''}
                      onChange={(e) =>
                        controller.setFormationDetail({
                          ...state.formationDetail,
                          materiel: e.target.value,
                        })
                      }
                      placeholder="Ex: Ordinateur portable, logiciels spécifiques..."
                    />
                  </div>
                  <div className="detail-item">
                    <label>Méthode d'évaluation</label>
                    <input
                      value={state.formationDetail.evaluation || ''}
                      onChange={(e) =>
                        controller.setFormationDetail({
                          ...state.formationDetail,
                          evaluation: e.target.value,
                        })
                      }
                      placeholder="Ex: Projet final, QCM, Examen pratique..."
                    />
                  </div>
                  <div className="detail-item">
                    <label>Certification</label>
                    <input
                      value={state.formationDetail.certification || ''}
                      onChange={(e) =>
                        controller.setFormationDetail({
                          ...state.formationDetail,
                          certification: e.target.value,
                        })
                      }
                      placeholder="Ex: Attestation de réussite, Certificat..."
                    />
                  </div>
                  <div className="detail-item">
                    <label>URL de l'image de présentation</label>
                    <input
                      type="url"
                      value={state.formationDetail.imageUrl || ''}
                      onChange={(e) =>
                        controller.setFormationDetail({
                          ...state.formationDetail,
                          imageUrl: e.target.value,
                        })
                      }
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                </div>
                <div className="description-section">
                  <label>Description*</label>
                  <textarea
                    value={state.formationDetail.description || ''}
                    onChange={(e) =>
                      controller.setFormationDetail({
                        ...state.formationDetail,
                        description: e.target.value,
                      })
                    }
                    rows="5"
                    required
                  />
                </div>
                {state.formationDetail.modules && state.formationDetail.modules.length > 0 && (
                  <div className="modules-section">
                    <label>Modules</label>
                    <div className="modules-list">
                      {state.formationDetail.modules.map((module, index) => (
                        <div key={index} className="module-item">
                          <h4>Module {index + 1}: {module.titre}</h4>
                          <p>
                            <strong>Durée:</strong> {module.duree} heures
                          </p>
                          <p>
                            <strong>Description:</strong> {module.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="form-actions">
                  <button
                    className="save-btn"
                    onClick={() => controller.handleAdminUpdate(state.formationDetail.id, state.formationDetail)}
                  >
                    Enregistrer les modifications
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFormationsView;