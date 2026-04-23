import { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { Link, Navigate } from 'react-router-dom'
import { Modal, Button, Form } from 'react-bootstrap'
import { createFormation, deleteFormation, getMyFormations, updateFormation } from '../services/trainerService'
import { createModule, deleteModule, getFormationModules, updateModule } from '../services/moduleService'
import { mapApiError } from '../services/apiErrorMapper'
import { validateFormationInput, validateModuleInput } from '../services/validationService'

const NIVEAUX = ['Débutant', 'Intermédiaire', 'Avancé']
const CATEGORIES = ['Développement web', 'DevOps', 'Design', 'Data', 'Marketing']

const niveauConfig = {
  debutant: { cls: 'sh-badge-green', label: 'Débutant' },
  intermediaire: { cls: 'sh-badge-amber', label: 'Intermédiaire' },
  avance: { cls: 'sh-badge-red', label: 'Avancé' },
}

const FORM_VIDE = { titre: '', niveau: 'Débutant', categorie: 'Développement web', description: '' }

const normalizeNiveau = (niveau = '') => niveau.toLowerCase().normalize('NFD').replaceAll(/\p{Diacritic}/gu, '')
const sanitizeCategorie = (categorie = '') => (CATEGORIES.includes(categorie) ? categorie : CATEGORIES[0])

const normalizeFormation = (formation = {}) => ({
  id: formation.id ?? null,
  titre: formation.titre || '',
  niveau: formation.niveau || 'Débutant',
  categorie: formation.categorie || '',
  description: formation.description || formation.mini_description || '',
  apprenants: formation.apprenants ?? formation.inscriptions_count ?? 0,
  vues: formation.vues ?? formation.nombre_de_vues ?? 0,
})

// Retourne le libellé du bouton d'enregistrement d'une formation
// en fonction de l'état de sauvegarde et du mode (création vs modification).
const getSaveButtonLabel = (isSaving, isEdit) => {
  if (isSaving) return 'Enregistrement...'
  if (isEdit) return 'Enregistrer'
  return 'Créer'
}

// Retourne le libellé du bouton d'enregistrement d'un module
// (création ou modification, avec état "en cours").
const getModuleSaveButtonLabel = (isSaving, isEdit) => {
  if (isSaving) return isEdit ? 'Modification...' : 'Création...'
  return isEdit ? 'Enregistrer' : 'Ajouter'
}

// Vue vide affichée quand le formateur n'a pas encore de formation.
function EmptyFormationsState({ onCreate }) {
  return (
    <div className="text-center py-5">
      <p className="fs-5 fw-semibold" style={{ color: 'var(--brand-deep)' }}>
        Vous n'avez pas encore de formation
      </p>
      <p className="small mt-2 mb-4" style={{ color: 'var(--text-secondary)' }}>
        Créez votre première formation en cliquant sur le bouton ci-dessous.
      </p>
      <button className="sh-btn sh-btn--primary" onClick={onCreate}>
        + Créer une formation
      </button>
    </div>
  )
}

EmptyFormationsState.propTypes = {
  onCreate: PropTypes.func.isRequired,
}

// Carte d'une formation : affiche titre/catégorie/niveau + actions (voir/modifier/modules/supprimer).
function FormationCard({ formation, onEdit, onOpenModules, onDelete }) {
  const niveauKey = normalizeNiveau(formation.niveau)

  return (
    <div className="col-md-4">
      <div className="sh-formation-card">
        <div className="sh-formation-card-top">
          <span className="sh-cat-tag">{formation.categorie}</span>
          <span className={`sh-badge ${niveauConfig[niveauKey]?.cls || 'sh-badge-green'}`}>
            {niveauConfig[niveauKey]?.label || formation.niveau}
          </span>
        </div>
        <h6 className="sh-formation-title">{formation.titre}</h6>
        <p className="sh-formation-desc">{formation.description}</p>
        <div className="sh-formation-meta">
          <span><i className="bi bi-people-fill me-1" aria-hidden="true" />{formation.apprenants} apprenants</span>
          <span><i className="bi bi-eye-fill me-1" aria-hidden="true" />{formation.vues} vues</span>
        </div>
        <div className="d-flex gap-2 mt-2">
          <Link
            to={`/formation/${formation.id}`}
            className="sh-btn sh-btn--outline flex-fill"
            style={{ fontSize: 12, padding: '7px 10px' }}
          >
            Voir
          </Link>
          <button
            className="sh-btn sh-btn--outline flex-fill"
            style={{ fontSize: 12, padding: '7px 10px' }}
            onClick={() => onEdit(formation)}
          >
            Modifier
          </button>
          <button
            className="sh-btn sh-btn--outline flex-fill"
            style={{ fontSize: 12, padding: '7px 10px' }}
            onClick={() => onOpenModules(formation)}
          >
            Modules
          </button>
          <button
            className="sh-btn flex-fill"
            style={{ fontSize: 12, padding: '7px 10px', background: 'var(--red-bg)', color: 'var(--red-text)', borderRadius: '999px' }}
            onClick={() => onDelete(formation)}
          >
            Supprimer
          </button>
        </div>
      </div>
    </div>
  )
}

FormationCard.propTypes = {
  formation: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    titre: PropTypes.string,
    niveau: PropTypes.string,
    categorie: PropTypes.string,
    description: PropTypes.string,
    apprenants: PropTypes.number,
    vues: PropTypes.number,
  }).isRequired,
  onEdit: PropTypes.func.isRequired,
  onOpenModules: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
}

// Sélectionne la vue appropriée en fonction de l'état :
// chargement, erreur, liste vide, ou grille de formations.
// Extrait du composant parent pour réduire sa complexité cognitive.
function FormationsContent({ loading, error, formations, onCreate, onEdit, onOpenModules, onDelete }) {
  if (loading) {
    return <div className="text-center py-5">Chargement de vos formations...</div>
  }

  if (error) {
    return <div className="alert alert-warning">{error}</div>
  }

  if (formations.length === 0) {
    return <EmptyFormationsState onCreate={onCreate} />
  }

  return (
    <div className="row g-4">
      {formations.map((formation) => (
        <FormationCard
          key={formation.id}
          formation={formation}
          onEdit={onEdit}
          onOpenModules={onOpenModules}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}

FormationsContent.propTypes = {
  loading: PropTypes.bool.isRequired,
  error: PropTypes.string,
  formations: PropTypes.array.isRequired,
  onCreate: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onOpenModules: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
}

function DashboardFormateur({ user }) {
  const userRole = user?.role || ''
  const [formations, setFormations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const [showModuleModal, setShowModuleModal] = useState(false)
  const [showModuleConfirmDelete, setShowModuleConfirmDelete] = useState(false)
  const [formData, setFormData] = useState(FORM_VIDE)
  const [formationEnCours, setFormationEnCours] = useState(null)
  const [formationASupprimer, setFormationASupprimer] = useState(null)
  const [modules, setModules] = useState([])
  const [loadingModules, setLoadingModules] = useState(false)
  const [moduleEnCours, setModuleEnCours] = useState(null)
  const [moduleASupprimer, setModuleASupprimer] = useState(null)
  const [moduleError, setModuleError] = useState('')
  const [selectedFormationForModules, setSelectedFormationForModules] = useState(null)

  useEffect(() => {
    if (userRole !== 'formateur') {
      return
    }

    let active = true

    const loadFormations = async () => {
      try {
        setLoading(true)
        setError('')
        const data = await getMyFormations()

        if (active) {
          setFormations(data.map(normalizeFormation))
        }
      } catch (loadError) {
        if (active) {
          setError(mapApiError(loadError, 'dashboard-load'))
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadFormations()

    return () => {
      active = false
    }
  }, [userRole])

  if (!user) return <Navigate to="/" />
  if (userRole !== 'formateur') return <Navigate to="/dashboard/apprenant" />

  const refreshFormations = async () => {
    const data = await getMyFormations()
    setFormations(data.map(normalizeFormation))
  }

  const ouvrirCreation = () => {
    setFormationEnCours(null)
    setFormData(FORM_VIDE)
    setActionError('')
    setShowModal(true)
  }

  const ouvrirModification = (formation) => {
    setFormationEnCours(formation)
    setFormData({
      titre: formation.titre,
      niveau: formation.niveau,
      categorie: sanitizeCategorie(formation.categorie),
      description: formation.description,
    })
    setActionError('')
    setShowModal(true)
  }

  const sauvegarder = async () => {
    const formationErrors = validateFormationInput(formData)

    if (formationErrors.length > 0) {
      setActionError(formationErrors[0])
      return
    }

    try {
      setIsSaving(true)
      setActionError('')

      if (formationEnCours) {
        await updateFormation(formationEnCours.id, {
          ...formData,
          titre: formData.titre.trim(),
          description: formData.description.trim(),
          categorie: sanitizeCategorie(formData.categorie),
        })
      } else {
        await createFormation({
          ...formData,
          titre: formData.titre.trim(),
          description: formData.description.trim(),
          categorie: sanitizeCategorie(formData.categorie),
        })
      }

      await refreshFormations()
      setShowModal(false)
      setFormationEnCours(null)
      setFormData(FORM_VIDE)
    } catch (saveError) {
      setActionError(mapApiError(saveError, 'dashboard-action'))
    } finally {
      setIsSaving(false)
    }
  }

  const demanderSuppression = (formation) => {
    setFormationASupprimer(formation)
    setActionError('')
    setShowConfirmDelete(true)
  }

  const confirmerSuppression = async () => {
    if (!formationASupprimer?.id) {
      return
    }

    try {
      setIsSaving(true)
      setActionError('')
      await deleteFormation(formationASupprimer.id)
      await refreshFormations()
      setShowConfirmDelete(false)
      setFormationASupprimer(null)
    } catch (deleteError) {
      setActionError(mapApiError(deleteError, 'dashboard-action'))
    } finally {
      setIsSaving(false)
    }
  }

  // Fonctions pour la gestion des modules
  const chargerModules = async (formation) => {
    try {
      setLoadingModules(true)
      setModuleError('')
      const modulesData = await getFormationModules(formation.id)
      setModules(modulesData)
      setSelectedFormationForModules(formation)
    } catch (loadError) {
      setModuleError(mapApiError(loadError, 'module-load'))
    } finally {
      setLoadingModules(false)
    }
  }

  const ouvrirAjoutModule = async (formation) => {
    await chargerModules(formation)
    setModuleEnCours({ titre: '', contenu: '', ordre: (modules?.length ?? 0) + 1 })
    setModuleError('')
    setShowModuleModal(true)
  }

  const ouvrirModificationModule = (module) => {
    setModuleEnCours({ ...module })
    setModuleError('')
    setShowModuleModal(true)
  }

  const sauvegarderModule = async () => {
    const moduleErrors = validateModuleInput(moduleEnCours || {})

    if (moduleErrors.length > 0) {
      setModuleError(moduleErrors[0])
      return
    }

    try {
      setIsSaving(true)
      setModuleError('')

      const data = {
        titre: moduleEnCours.titre.trim(),
        contenu: moduleEnCours.contenu.trim(),
        ordre: Number(moduleEnCours.ordre),
      }

      if (moduleEnCours.id) {
        await updateModule(moduleEnCours.id, data)
      } else {
        await createModule(selectedFormationForModules.id, data)
      }

      await chargerModules(selectedFormationForModules)
      setShowModuleModal(false)
      setModuleEnCours(null)
    } catch (saveError) {
      setModuleError(mapApiError(saveError, 'module-action'))
    } finally {
      setIsSaving(false)
    }
  }

  const demanderSuppressionModule = (module) => {
    setModuleASupprimer(module)
    setModuleError('')
    setShowModuleConfirmDelete(true)
  }

  const confirmerSuppressionModule = async () => {
    if (!moduleASupprimer?.id) {
      return
    }

    try {
      setIsSaving(true)
      setModuleError('')
      await deleteModule(moduleASupprimer.id)
      await chargerModules(selectedFormationForModules)
      setShowModuleConfirmDelete(false)
      setModuleASupprimer(null)
    } catch (deleteError) {
      setModuleError(mapApiError(deleteError, 'module-action'))
    } finally {
      setIsSaving(false)
    }
  }

  const stats = {
    formations: formations.length,
    apprenants: formations.reduce((acc, formation) => acc + (formation.apprenants ?? 0), 0),
    vues: formations.reduce((acc, formation) => acc + (formation.vues ?? 0), 0),
  }

  const saveButtonLabel = getSaveButtonLabel(isSaving, Boolean(formationEnCours))

  return (
    <div>
      <section className="sh-section--dark py-5">
        <div className="container">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
            <div>
              <h1 className="sh-section-title--light mb-1">Bonjour, {user.nom || user.email}</h1>
              <p className="sh-section-sub--light">Gérez vos formations et suivez vos apprenants</p>
            </div>
            <button className="sh-btn sh-btn--white" onClick={ouvrirCreation}>
              + Créer une formation
            </button>
          </div>
        </div>
      </section>

      <section className="py-4" style={{ background: 'var(--brand-mid)' }}>
        <div className="container">
          <div className="row g-3 text-center">
            <div className="col-4">
              <div style={{ fontSize: 26, fontWeight: 700, color: '#fff' }}>{stats.formations}</div>
              <div style={{ fontSize: 12, color: 'var(--brand-soft)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Formations</div>
            </div>
            <div className="col-4">
              <div style={{ fontSize: 26, fontWeight: 700, color: '#fff' }}>{stats.apprenants}</div>
              <div style={{ fontSize: 12, color: 'var(--brand-soft)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Apprenants</div>
            </div>
            <div className="col-4">
              <div style={{ fontSize: 26, fontWeight: 700, color: '#fff' }}>{stats.vues}</div>
              <div style={{ fontSize: 12, color: 'var(--brand-soft)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Vues totales</div>
            </div>
          </div>
        </div>
      </section>

      <section className="sh-section">
        <div className="container">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
            <h2 className="sh-section-title mb-0">Mes formations</h2>
            <button className="sh-btn sh-btn--primary" onClick={ouvrirCreation}>
              + Créer une formation
            </button>
          </div>

          {actionError && <div className="alert alert-danger">{actionError}</div>}
          <FormationsContent
            loading={loading}
            error={error}
            formations={formations}
            onCreate={ouvrirCreation}
            onEdit={ouvrirModification}
            onOpenModules={ouvrirAjoutModule}
            onDelete={demanderSuppression}
          />
        </div>
      </section>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{formationEnCours ? 'Modifier la formation' : 'Créer une formation'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {actionError && <div className="alert alert-danger py-2">{actionError}</div>}
          <Form>
            <Form.Group className="mb-3">
              <label htmlFor="formation-titre" className="form-label">Titre</label>
              <Form.Control
                id="formation-titre"
                type="text"
                placeholder="Titre de la formation"
                value={formData.titre}
                onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
                minLength={3}
                maxLength={120}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <label htmlFor="formation-categorie" className="form-label">Catégorie</label>
              <Form.Select
                id="formation-categorie"
                value={formData.categorie}
                onChange={(e) => setFormData({ ...formData, categorie: e.target.value })}
              >
                {CATEGORIES.map((categorie) => (
                  <option key={categorie} value={categorie}>
                    {categorie}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <label htmlFor="formation-niveau" className="form-label">Niveau</label>
              <Form.Select
                id="formation-niveau"
                value={formData.niveau}
                onChange={(e) => setFormData({ ...formData, niveau: e.target.value })}
              >
                {NIVEAUX.map((niveau) => (
                  <option key={niveau} value={niveau}>
                    {niveau}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <label htmlFor="formation-description" className="form-label">Description</label>
              <Form.Control
                id="formation-description"
                as="textarea"
                rows={3}
                placeholder="Description de la formation"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                minLength={20}
                maxLength={2000}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowModal(false)} disabled={isSaving}>
            Annuler
          </Button>
          <Button
            variant="primary"
            onClick={sauvegarder}
            disabled={isSaving || !formData.titre.trim() || !formData.description.trim()}
          >
            {saveButtonLabel}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showConfirmDelete} onHide={() => setShowConfirmDelete(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirmer la suppression</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Êtes-vous sûr de vouloir supprimer cette formation ? Cette action est irréversible.</p>
          {formationASupprimer && (
            <p className="mb-0 small text-muted">
              Formation : <strong>{formationASupprimer.titre}</strong>
            </p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowConfirmDelete(false)} disabled={isSaving}>
            Annuler
          </Button>
          <Button variant="danger" onClick={confirmerSuppression} disabled={isSaving}>
            {isSaving ? 'Suppression...' : 'Supprimer'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modale de gestion des modules */}
      <Modal show={showModuleModal} onHide={() => setShowModuleModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {selectedFormationForModules ? `Modules de "${selectedFormationForModules.titre}"` : 'Modules'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {moduleError && <div className="alert alert-danger py-2">{moduleError}</div>}

          {loadingModules ? (
            <div className="text-center py-4">Chargement des modules...</div>
          ) : (
            <>
              {/* Liste des modules existants */}
              {modules.length > 0 && (
                <div className="mb-4">
                  <h6 className="mb-3" style={{ color: 'var(--brand-deep)' }}>
                    Modules existants ({modules.length})
                  </h6>
                  <div className="d-flex flex-column gap-2">
                    {[...modules]
                      .sort((a, b) => a.ordre - b.ordre)
                      .map((module) => (
                        <div
                          key={module.id}
                          className="d-flex align-items-center justify-content-between p-3 rounded-3"
                          style={{
                            background: 'var(--bg-white)',
                            border: '1px solid var(--brand-border)',
                          }}
                        >
                          <div className="flex-grow-1">
                            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--brand-deep)' }}>
                              {module.ordre}. {module.titre}
                            </div>
                            <small style={{ color: 'var(--text-secondary)' }}>
                              {module.contenu?.substring(0, 50)}...
                            </small>
                          </div>
                          <div className="d-flex gap-2">
                            <button
                              className="sh-btn sh-btn--outline"
                              style={{ fontSize: 11, padding: '5px 10px' }}
                              onClick={() => ouvrirModificationModule(module)}
                              disabled={isSaving}
                            >
                              <i className="bi bi-pencil-square" aria-hidden="true" />
                            </button>
                            <button
                              className="sh-btn"
                              style={{
                                fontSize: 11,
                                padding: '5px 10px',
                                background: 'var(--red-bg)',
                                color: 'var(--red-text)',
                                borderRadius: '999px',
                              }}
                              onClick={() => demanderSuppressionModule(module)}
                              disabled={isSaving}
                            >
                              <i className="bi bi-trash" aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                  <hr className="my-4" />
                </div>
              )}

              {/* Formulaire d'ajout/modification de module */}
              <div>
                <h6 className="mb-3" style={{ color: 'var(--brand-deep)' }}>
                  {moduleEnCours?.id ? 'Modifier le module' : 'Ajouter un nouveau module'}
                </h6>
                <Form>
                  <Form.Group className="mb-3">
                    <label htmlFor="module-ordre" className="form-label">
                      Position du module
                    </label>
                    <Form.Select
                      id="module-ordre"
                      value={moduleEnCours?.ordre || ''}
                      onChange={(e) => setModuleEnCours({ ...moduleEnCours, ordre: Number.parseInt(e.target.value, 10) })}
                    >
                      <option value="">Sélectionner une position</option>
                      {Array.from({ length: (modules?.length ?? 0) + 1 }, (_, i) => i + 1)
                        .filter((ordre) => !modules?.some(m => m.ordre === ordre && m.id !== moduleEnCours?.id))
                        .map((ordre) => (
                          <option key={ordre} value={ordre}>
                            Position {ordre}
                          </option>
                        ))}
                    </Form.Select>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <label htmlFor="module-titre" className="form-label">
                      Titre du module
                    </label>
                    <Form.Control
                      id="module-titre"
                      type="text"
                      placeholder="Titre du module"
                      value={moduleEnCours?.titre || ''}
                      onChange={(e) => setModuleEnCours({ ...moduleEnCours, titre: e.target.value })}
                      minLength={3}
                      maxLength={120}
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <label htmlFor="module-contenu" className="form-label">
                      Contenu du module
                    </label>
                    <Form.Control
                      id="module-contenu"
                      as="textarea"
                      rows={4}
                      placeholder="Contenu du module (description, objectifs, ressources, etc.)"
                      value={moduleEnCours?.contenu || ''}
                      onChange={(e) => setModuleEnCours({ ...moduleEnCours, contenu: e.target.value })}
                      minLength={20}
                      maxLength={5000}
                    />
                    <small className="text-muted d-block mt-1">
                      {(moduleEnCours?.contenu || '').length} caractères
                    </small>
                  </Form.Group>
                </Form>
              </div>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowModuleModal(false)} disabled={isSaving}>
            Fermer
          </Button>
          <Button
            variant="primary"
            onClick={sauvegarderModule}
            disabled={
              isSaving ||
              !moduleEnCours?.titre?.trim() ||
              !moduleEnCours?.contenu?.trim() ||
              !moduleEnCours?.ordre
            }
          >
            {getModuleSaveButtonLabel(isSaving, Boolean(moduleEnCours?.id))}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Confirmation de suppression de module */}
      <Modal show={showModuleConfirmDelete} onHide={() => setShowModuleConfirmDelete(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirmer la suppression du module</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Êtes-vous sûr de vouloir supprimer ce module ? Cette action est irréversible.</p>
          {moduleASupprimer && (
            <p className="mb-0 small text-muted">
              Module : <strong>{moduleASupprimer.titre}</strong>
            </p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowModuleConfirmDelete(false)} disabled={isSaving}>
            Annuler
          </Button>
          <Button variant="danger" onClick={confirmerSuppressionModule} disabled={isSaving}>
            {isSaving ? 'Suppression...' : 'Supprimer'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}

DashboardFormateur.propTypes = {
  user: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    nom: PropTypes.string,
    email: PropTypes.string,
    role: PropTypes.string,
  }),
}

export default DashboardFormateur

