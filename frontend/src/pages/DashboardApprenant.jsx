import { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { Link, Navigate } from 'react-router-dom'
import { Modal, Button } from 'react-bootstrap'
import { getMyFormations, unenrollFromFormation } from '../services/enrollmentService'
import { mapApiError } from '../services/apiErrorMapper'

const niveauConfig = {
  debutant: { cls: 'sh-badge-green', label: 'Débutant' },
  intermediaire: { cls: 'sh-badge-amber', label: 'Intermédiaire' },
  avance: { cls: 'sh-badge-red', label: 'Avancé' },
}

const normalizeNiveau = (niveau = '') => niveau.toLowerCase().normalize('NFD').replaceAll(/\p{Diacritic}/gu, '')

const formatDescription = (item = {}) => item?.formation?.description || ''

function DashboardApprenant({ user }) {
  const [formations, setFormations] = useState([])
  const [showConfirm, setShowConfirm] = useState(false)
  const [enrollmentToRemove, setEnrollmentToRemove] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (user?.role !== 'apprenant') {
      return
    }

    let active = true

    const loadFormations = async () => {
      try {
        setLoading(true)
        setError('')
        const data = await getMyFormations()

        if (active) {
          setFormations(data)
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
  }, [user])

  if (!user) return <Navigate to="/" />
  if (user.role !== 'apprenant') return <Navigate to="/dashboard/formateur" />

  const demanderDesinscription = (item) => {
    setEnrollmentToRemove(item)
    setShowConfirm(true)
    setActionError('')
  }

  const confirmerDesinscription = async () => {
    if (!enrollmentToRemove?.formation?.id) {
      return
    }

    try {
      setIsSubmitting(true)
      setActionError('')
      await unenrollFromFormation(enrollmentToRemove.formation.id)
      setFormations(prev => prev.filter(item => item.formation?.id !== enrollmentToRemove.formation.id))
      setShowConfirm(false)
      setEnrollmentToRemove(null)
    } catch (unfollowError) {
      setActionError(mapApiError(unfollowError, 'dashboard-action'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const progressionColor = (progression) => {
    if (progression >= 80) return 'var(--green-text)'
    if (progression >= 40) return 'var(--amber-text)'
    return 'var(--red-text)'
  }

  const stats = {
    total: formations.length,
    completed: formations.filter(item => (item.progression ?? 0) >= 100).length,
    average: formations.length > 0
      ? Math.round(formations.reduce((acc, item) => acc + (item.progression ?? 0), 0) / formations.length)
      : 0,
  }

  let content

  if (loading) {
    content = <div className="text-center py-5">Chargement de vos formations...</div>
  } else if (error) {
    content = <div className="alert alert-warning">{error}</div>
  } else if (formations.length === 0) {
    content = (
        <div className="text-center py-5">
          <p className="fs-5 fw-semibold" style={{ color: 'var(--brand-deep)' }}>
            Vous ne suivez aucune formation
          </p>
          <p className="small mt-2 mb-4" style={{ color: 'var(--text-secondary)' }}>
            Explorez le catalogue et inscrivez-vous à votre première formation.
          </p>
          <Link to="/formations" className="sh-btn sh-btn--primary">
            Voir les formations
          </Link>
        </div>
    )
  } else {
    content = (
        <div className="row g-4">
          {formations.map((item) => {
            const formation = item.formation || {}
            const niveauKey = normalizeNiveau(formation.niveau)
            const progress = item.progression ?? 0
            let progressBackground = 'var(--brand-main)'

            if (progress >= 80) {
              progressBackground = 'var(--green-text)'
            } else if (progress >= 40) {
              progressBackground = '#f59e0b'
            }

            return (
                <div className="col-md-4" key={item.enrollment_id || formation.id}>
                  <div className="sh-formation-card">
                    <div className="sh-formation-card-top">
                      <span className="sh-cat-tag">{formation.categorie || 'Formation'}</span>
                      <span className={`sh-badge ${niveauConfig[niveauKey]?.cls || 'sh-badge-green'}`}>
                        {niveauConfig[niveauKey]?.label || formation.niveau || 'Niveau'}
                      </span>
                    </div>
                    <h6 className="sh-formation-title">{formation.titre || 'Formation'}</h6>
                    <p className="sh-formation-desc">{formatDescription(item) || 'Formation suivie sur SkillHub.'}</p>
                    <p className="small mb-2" style={{ color: 'var(--text-muted)' }}>
                      Formateur : {formation.formateur?.nom || 'SkillHub'}
                    </p>

                    <div className="mb-2">
                      <div className="d-flex justify-content-between mb-1">
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Progression</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: progressionColor(progress) }}>
                          {progress}%
                        </span>
                      </div>
                      <div style={{ height: 6, background: 'var(--brand-border)', borderRadius: 999 }}>
                        <div style={{
                          height: '100%',
                          width: `${progress}%`,
                          background: progressBackground,
                          borderRadius: 999,
                          transition: 'width 0.3s ease',
                        }} />
                      </div>
                    </div>

                    <div className="d-flex gap-2 mt-2">
                      <Link
                          to={`/formation/${formation.id}`}
                          className="sh-btn sh-btn--outline flex-fill"
                          style={{ fontSize: 12, padding: '7px 10px' }}
                      >
                        Voir le détail
                      </Link>
                      <button
                          className="sh-btn flex-fill"
                          style={{ fontSize: 12, padding: '7px 10px', background: 'var(--red-bg)', color: 'var(--red-text)', borderRadius: '999px' }}
                          onClick={() => demanderDesinscription(item)}
                      >
                        Ne plus suivre
                      </button>
                    </div>
                  </div>
                </div>
            )
          })}
        </div>
    )
  }

  return (
      <div>
        {/* En-tête */}
        <section className="sh-section--dark py-5">
          <div className="container">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
              <div>
                <h1 className="sh-section-title--light mb-1">
                  Bonjour, {user.nom || user.email}
                </h1>
                <p className="sh-section-sub--light">
                  Suivez vos formations et gérez vos inscriptions
                </p>
              </div>
              <Link to="/formations" className="sh-btn sh-btn--white">
                Découvrir des formations
              </Link>
            </div>
          </div>
        </section>

        {/* Stats rapides */}
        <section className="py-4" style={{ background: 'var(--brand-mid)' }}>
          <div className="container">
            <div className="row g-3 text-center">
              <div className="col-4">
                <div style={{ fontSize: 26, fontWeight: 700, color: '#fff' }}>
                  {stats.total}
                </div>
                <div style={{ fontSize: 12, color: 'var(--brand-soft)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                  Formations suivies
                </div>
              </div>
              <div className="col-4">
                <div style={{ fontSize: 26, fontWeight: 700, color: '#fff' }}>
                  {stats.completed}
                </div>
                <div style={{ fontSize: 12, color: 'var(--brand-soft)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                  Terminées
                </div>
              </div>
              <div className="col-4">
                <div style={{ fontSize: 26, fontWeight: 700, color: '#fff' }}>
                  {stats.average}%
                </div>
                <div style={{ fontSize: 12, color: 'var(--brand-soft)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                  Progression moyenne
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Liste des formations */}
        <section className="sh-section">
          <div className="container">
            <h2 className="sh-section-title mb-4">Mes formations</h2>

            {content}
          </div>
        </section>

        {/* Modal confirmation désinscription */}
        <Modal show={showConfirm} onHide={() => setShowConfirm(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>Confirmer la désinscription</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p>Êtes-vous sûr de vouloir vous désinscrire de cette formation ? Votre progression sera perdue.</p>
            {actionError && <div className="alert alert-danger mt-3 mb-0 py-2">{actionError}</div>}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setShowConfirm(false)}>
              Annuler
            </Button>
            <Button variant="danger" onClick={confirmerDesinscription} disabled={isSubmitting}>
              {isSubmitting ? 'Traitement...' : 'Se désinscrire'}
            </Button>
          </Modal.Footer>
        </Modal>

      </div>
  )
}

export default DashboardApprenant

DashboardApprenant.propTypes = {
  user: PropTypes.shape({
    role: PropTypes.string,
    nom: PropTypes.string,
    email: PropTypes.string,
  }),
}
