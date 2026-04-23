import { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { Link, Navigate, useParams } from 'react-router-dom'
import { getFormation } from '../services/formationService'

function SuiviFormation({ user }) {
  const { id } = useParams()
  const [formation, setFormation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [moduleActif, setModuleActif] = useState(0)
  const [modulesTermines, setModulesTermines] = useState([])

  useEffect(() => {
    if (!user) {
      return
    }

    let active = true

    const loadFormation = async () => {
      try {
        setLoading(true)
        setError('')
        const data = await getFormation(id)

        if (!active) return

        setFormation(data)
        setModuleActif(0)
        setModulesTermines([])
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

    loadFormation()

    return () => {
      active = false
    }
  }, [id, user])

  if (!user) return <Navigate to="/" />

  if (loading) {
    return <div className="container py-5 text-center">Chargement de la formation...</div>
  }

  const modules = Array.isArray(formation?.modules) ? formation.modules : []

  if (error || !formation || modules.length === 0) {
    return (
      <div className="container py-5 text-center">
        <h2 className="sh-section-title mb-3">Formation introuvable</h2>
        {error && <p className="mb-4 text-muted">{error}</p>}
        <Link to="/dashboard/apprenant" className="sh-btn sh-btn--outline">
          Retour au dashboard
        </Link>
      </div>
    )
  }

  const moduleCourant = modules[moduleActif] || modules[0]

  const progression = modules.length === 0 ? 0 : Math.round((modulesTermines.length / modules.length) * 100)

  const toggleTermine = (ordre) => {
    setModulesTermines((prev) =>
      prev.includes(ordre) ? prev.filter((item) => item !== ordre) : [...prev, ordre]
    )
  }

  return (
    <div>
      <section className="sh-section--dark py-4">
        <div className="container">
          <Link to="/dashboard/apprenant" className="small mb-3 d-inline-block" style={{ color: 'var(--brand-soft)', textDecoration: 'none' }}>
            <i className="bi bi-arrow-left me-1" aria-hidden="true" />
            Retour au dashboard
          </Link>
          <h1 className="sh-section-title--light mb-2">{formation.titre}</h1>
          <p className="sh-section-sub--light mb-3">{formation.description}</p>

          <div style={{ maxWidth: 400 }}>
            <div className="d-flex justify-content-between mb-1">
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>Progression globale</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{progression}%</span>
            </div>
            <div style={{ height: 8, background: 'rgba(255,255,255,0.15)', borderRadius: 999 }}>
              <div
                style={{
                  height: '100%',
                  width: `${progression}%`,
                  background: progression === 100 ? '#4ade80' : 'var(--brand-soft)',
                  borderRadius: 999,
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="sh-section">
        <div className="container">
          <div className="row g-4">
            <div className="col-lg-4">
              <h2 className="sh-section-title mb-3" style={{ fontSize: 18 }}>Modules</h2>
              <div className="d-flex flex-column gap-2">
                {modules.map((module, index) => {
                  const estTermine = modulesTermines.includes(module.ordre)
                  const estActif = moduleActif === index

                  return (
                    <div
                      key={module.id || module.ordre}
                      onClick={() => setModuleActif(index)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '12px 16px', borderRadius: 'var(--radius-md)',
                        border: `1.5px solid ${estActif ? 'var(--brand-main)' : 'var(--brand-border)'}`,
                        background: estActif ? 'var(--brand-ice)' : 'var(--bg-white)',
                        cursor: 'pointer', transition: 'all 0.2s',
                      }}
                    >
                      <div
                        style={{
                          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: 700,
                          background: estTermine ? 'var(--green-bg)' : estActif ? 'var(--brand-main)' : 'var(--brand-border)',
                          color: estTermine ? 'var(--green-text)' : estActif ? '#fff' : 'var(--text-muted)',
                        }}
                      >
                        {estTermine ? <i className="bi bi-check-lg" aria-hidden="true" /> : module.ordre}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: estActif ? 600 : 400, color: estActif ? 'var(--brand-deep)' : 'var(--text-secondary)' }}>
                        {module.titre}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="col-lg-8">
              <div className="p-4 rounded-4" style={{ background: 'var(--bg-white)', border: '1px solid var(--brand-border)', boxShadow: 'var(--shadow-sm)' }}>
                <div className="d-flex align-items-center gap-3 mb-4 pb-3" style={{ borderBottom: '1px solid var(--brand-border)' }}>
                  <div
                    style={{
                      width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'var(--brand-ice)', color: 'var(--brand-main)', fontSize: 15, fontWeight: 700,
                    }}
                  >
                    {moduleCourant.ordre}
                  </div>
                  <div>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 2 }}>
                      Module {moduleCourant.ordre} / {modules.length}
                    </p>
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--brand-deep)', margin: 0 }}>
                      {moduleCourant.titre}
                    </h3>
                  </div>
                </div>

                <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 32 }}>
                  {moduleCourant.contenu}
                </p>

                <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
                  <div className="d-flex gap-2">
                    <button className="sh-btn sh-btn--outline" style={{ fontSize: 13 }} disabled={moduleActif === 0} onClick={() => setModuleActif((prev) => prev - 1)}>
                      <i className="bi bi-arrow-left me-1" aria-hidden="true" />
                      Précédent
                    </button>
                    <button className="sh-btn sh-btn--outline" style={{ fontSize: 13 }} disabled={moduleActif === modules.length - 1} onClick={() => setModuleActif((prev) => prev + 1)}>
                      Suivant
                      <i className="bi bi-arrow-right ms-1" aria-hidden="true" />
                    </button>
                  </div>

                  <button
                    className="sh-btn"
                    style={{
                      fontSize: 13,
                      background: modulesTermines.includes(moduleCourant.ordre) ? 'var(--green-bg)' : 'var(--brand-main)',
                      color: modulesTermines.includes(moduleCourant.ordre) ? 'var(--green-text)' : '#fff',
                      borderRadius: 999,
                    }}
                    onClick={() => toggleTermine(moduleCourant.ordre)}
                  >
                    {modulesTermines.includes(moduleCourant.ordre) ? (
                      <>
                        <i className="bi bi-check-circle-fill me-1" aria-hidden="true" />
                        Terminé
                      </>
                    ) : 'Marquer comme terminé'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

SuiviFormation.propTypes = {
  user: PropTypes.shape({
    role: PropTypes.string,
  }),
}

export default SuiviFormation

