import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { getFormation, getFormationModules } from '../services/formationService'
import { getStoredUser } from '../services/authService'
import { enrollInFormation, getMyFormations, unenrollFromFormation } from '../services/enrollmentService'
import { Modal, Button } from 'react-bootstrap'

const niveauConfig = {
  debutant: { cls: 'sh-badge-green' },
  intermediaire: { cls: 'sh-badge-amber' },
  avance: { cls: 'sh-badge-red' },
}

function FormationDetail() {
  const user = getStoredUser()
  const userId = user?.id || null
  const userRole = user?.role || ''
  const canFollowFormation = !user || user.role === 'apprenant'
  const { id } = useParams()
  const navigate = useNavigate()
  const [formation, setFormation] = useState(null)
  const [modules, setModules] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isAlreadyEnrolled, setIsAlreadyEnrolled] = useState(false)
  const [checkingEnrollment, setCheckingEnrollment] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [unfollowLoading, setUnfollowLoading] = useState(false)
  const [followError, setFollowError] = useState('')
  const [followSuccess, setFollowSuccess] = useState('')
  const [showUnfollowConfirm, setShowUnfollowConfirm] = useState(false)

  const refreshCurrentPage = () => {
    // Force une actualisation pour recharger l'etat depuis l'API.
    globalThis.location.reload()
  }

  const niveauKey = (formation?.niveau || '').toLowerCase().normalize('NFD').replaceAll(/\p{Diacritic}/gu, '')

  useEffect(() => {
    let active = true

    const loadDetail = async () => {
      try {
        setLoading(true)
        setError('')

        const [formationData, modulesData] = await Promise.all([
          getFormation(id),
          getFormationModules(id),
        ])

        if (active) {
          setFormation(formationData)
          setModules(modulesData)
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.message || 'Impossible de charger la formation.')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadDetail()

    return () => {
      active = false
    }
  }, [id])

  useEffect(() => {
    if (userRole !== 'apprenant') {
      setIsAlreadyEnrolled(false)
      return
    }

    let active = true

    const checkEnrollment = async () => {
      try {
        setCheckingEnrollment(true)
        const enrollments = await getMyFormations()
        const alreadyEnrolled = enrollments.some((item) => String(item?.formation?.id) === String(id))

        if (active) {
          setIsAlreadyEnrolled(alreadyEnrolled)
        }
      } catch {
        if (active) {
          setIsAlreadyEnrolled(false)
        }
      } finally {
        if (active) {
          setCheckingEnrollment(false)
        }
      }
    }

    checkEnrollment()

    return () => {
      active = false
    }
  }, [id, userId, userRole])

  if (loading) {
    return (
        <div className="container py-5 text-center">
          Chargement de la formation...
        </div>
    )
  }

  if (error || !formation) {
    return (
        <div className="container py-5 text-center">
          <h2 className="sh-section-title mb-3">Formation introuvable</h2>
          {error && <p className="mb-4 text-muted">{error}</p>}
          <Link to="/formations" className="sh-btn sh-btn--outline">
            Retour aux formations
          </Link>
        </div>
    )
  }

  const handleSuivre = () => {
    if (user?.role === 'formateur') {
      return
    }

    if (user) {
      const follow = async () => {
        try {
          setFollowError('')
          setFollowLoading(true)
          await enrollInFormation(formation.id)
          setIsAlreadyEnrolled(true)
          setFollowSuccess('Inscription reussie. Actualisation en cours...')
          globalThis.setTimeout(() => {
            refreshCurrentPage()
          }, 1200)
        } catch (followRequestError) {
          if (followRequestError?.status === 409) {
            setIsAlreadyEnrolled(true)
            setFollowSuccess('Cette formation est deja suivie. Actualisation en cours...')
            globalThis.setTimeout(() => {
              refreshCurrentPage()
            }, 1200)
            return
          }

          setFollowError(followRequestError?.message || 'Impossible de suivre cette formation pour le moment.')
        } finally {
          setFollowLoading(false)
        }
      }

      follow()
      return
    }

    navigate('/')
  }

  const handleNePlusSuivre = () => {
    if (!user || user.role !== 'apprenant') {
      return
    }

    setShowUnfollowConfirm(true)
  }

  const confirmerNePlusSuivre = async () => {
    try {
      setFollowError('')
      setFollowSuccess('')
      setUnfollowLoading(true)
      await unenrollFromFormation(formation.id)
      setIsAlreadyEnrolled(false)
      setShowUnfollowConfirm(false)
      setFollowSuccess('Desinscription reussie. Actualisation en cours...')
      globalThis.setTimeout(() => {
        refreshCurrentPage()
      }, 1200)
    } catch (unfollowRequestError) {
      setFollowError(unfollowRequestError?.message || 'Impossible de se desinscrire pour le moment.')
    } finally {
      setUnfollowLoading(false)
    }
  }

  return (
      <div>
        {/* En-tête */}
        <section className="sh-section--dark py-5">
          <div className="container">
            <Link
                to="/formations"
                className="small mb-3 d-inline-block"
                style={{ color: 'var(--brand-soft)', textDecoration: 'none' }}
            >
              <i className="bi bi-arrow-left me-1" aria-hidden="true" />
              Retour aux formations
            </Link>
            <div className="d-flex align-items-center gap-2 mb-3">
            <span className="sh-cat-tag" style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--brand-soft)' }}>
              {formation.categorie}
            </span>
                <span className={`sh-badge ${niveauConfig[niveauKey]?.cls || 'sh-badge-green'}`}>
                  {formation.niveau}
                </span>
            </div>
            <h1 className="sh-section-title--light mb-3">{formation.titre}</h1>
            <p className="sh-section-sub--light mb-4">{formation.description}</p>
            <div className="d-flex gap-4 flex-wrap" style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14 }}>
              <span><i className="bi bi-person-badge-fill me-1" aria-hidden="true" />Formateur : <strong style={{ color: '#fff' }}>{formation.formateur?.nom || 'SkillHub'}</strong></span>
              <span><i className="bi bi-people-fill me-1" aria-hidden="true" />{formation.apprenants ?? 0} apprenants</span>
              <span><i className="bi bi-eye-fill me-1" aria-hidden="true" />{formation.vues ?? 0} vues</span>
            </div>
          </div>
        </section>

        {/* Contenu principal */}
        <section className="sh-section">
          <div className="container">
            <div className="row g-5">

              {/* Liste des modules */}
              <div className="col-lg-8">
                <h2 className="sh-section-title mb-4">Contenu de la formation</h2>
                <div className="d-flex flex-column gap-3">
                  {modules.map(module => (
                      <div
                          key={module.id || module.ordre}
                          className="d-flex align-items-center gap-3 p-3 rounded-3"
                          style={{
                            background: 'var(--bg-white)',
                            border: '1px solid var(--brand-border)',
                          }}
                      >
                        <div
                            className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                            style={{
                              width: 36, height: 36,
                              background: 'var(--brand-ice)',
                              color: 'var(--brand-main)',
                              fontSize: 13, fontWeight: 700,
                            }}
                        >
                          {module.ordre}
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--brand-deep)' }}>
                      Module {module.ordre} — {module.titre}
                    </span>
                      </div>
                  ))}
                </div>
              </div>

              {/* Carte d'action */}
              <div className="col-lg-4">
                <div
                    className="p-4 rounded-4 sticky-top"
                    style={{
                      background: 'var(--bg-white)',
                      border: '1.5px solid var(--brand-border)',
                      boxShadow: 'var(--shadow-md)',
                      top: 90,
                    }}
                >
                  <div className="text-center mb-4">
                  <span
                      className="d-inline-block px-3 py-1 rounded-pill mb-2"
                      style={{ background: 'var(--brand-ice)', color: 'var(--brand-main)', fontSize: 13, fontWeight: 700 }}
                  >
                    100% Gratuit
                  </span>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      Accès immédiat à tous les modules
                    </p>
                  </div>

                  <div className="d-flex flex-column gap-2 mb-4" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    <div className="d-flex justify-content-between">
                      <span>Niveau</span>
                      <strong style={{ color: 'var(--brand-deep)' }}>{formation.niveau}</strong>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span>Modules</span>
                      <strong style={{ color: 'var(--brand-deep)' }}>{modules.length} modules</strong>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span>Apprenants</span>
                      <strong style={{ color: 'var(--brand-deep)' }}>{formation.apprenants ?? 0}</strong>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span>Formateur</span>
                      <strong style={{ color: 'var(--brand-deep)' }}>{formation.formateur?.nom || 'SkillHub'}</strong>
                    </div>
                  </div>

                  {canFollowFormation && (
                    <>
                      {user?.role === 'apprenant' && checkingEnrollment && (
                        <p className="text-center mt-2 mb-0" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                          Vérification de votre inscription...
                        </p>
                      )}

                      {user?.role === 'apprenant' && !checkingEnrollment && isAlreadyEnrolled && (
                        <>
                          <div
                            className="text-center w-100"
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: 'var(--green-text)',
                              background: 'var(--green-bg)',
                              borderRadius: '999px',
                              padding: '10px 14px',
                            }}
                          >
                            Deja suivie
                          </div>
                          <button
                            className="sh-btn sh-btn--outline w-100 mt-2"
                            onClick={handleNePlusSuivre}
                            disabled={unfollowLoading}
                          >
                            {unfollowLoading ? 'Desinscription...' : 'Ne plus suivre'}
                          </button>
                        </>
                      )}

                      {(!user || (user?.role === 'apprenant' && !checkingEnrollment && !isAlreadyEnrolled)) && (
                        <button className="sh-btn sh-btn--primary w-100" onClick={handleSuivre} disabled={followLoading}>
                          {followLoading ? 'Inscription...' : user ? 'Suivre la formation' : 'Se connecter pour suivre'}
                        </button>
                      )}

                      {followError && (
                        <p className="text-center mt-2 mb-0" style={{ fontSize: 11, color: 'var(--red-text)' }}>
                          {followError}
                        </p>
                      )}

                      {followSuccess && (
                        <p className="text-center mt-2 mb-0" style={{ fontSize: 11, color: 'var(--green-text)' }}>
                          {followSuccess}
                        </p>
                      )}

                      {!user && (
                        <p className="text-center mt-2" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          Vous devez être connecté pour accéder à la formation
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>

            </div>
          </div>
        </section>

        <Modal show={showUnfollowConfirm} onHide={() => setShowUnfollowConfirm(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>Confirmation</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            Etes-vous sur de vouloir ne plus suivre cette formation ?
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setShowUnfollowConfirm(false)} disabled={unfollowLoading}>
              Annuler
            </Button>
            <Button variant="danger" onClick={confirmerNePlusSuivre} disabled={unfollowLoading}>
              {unfollowLoading ? 'Desinscription...' : 'Confirmer'}
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
  )
}

export default FormationDetail
