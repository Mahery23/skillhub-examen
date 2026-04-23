/* eslint-disable react/prop-types */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getFormations } from '../services/formationService'

const CATEGORIES = ["Toutes", "Développement web", "Backend", "DevOps", "Design", "Data", "Marketing"]
const NIVEAUX = ["Tous", "Débutant", "Intermédiaire", "Avancé"]

const niveauConfig = {
  debutant: { cls: 'sh-badge-green' },
  intermediaire: { cls: 'sh-badge-amber' },
  avance: { cls: 'sh-badge-red' },
}

function Formations() {
  const [formations, setFormations] = useState([])
  const [recherche, setRecherche] = useState('')
  const [categorie, setCategorie] = useState('Toutes')
  const [niveau, setNiveau] = useState('Tous')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    const loadFormations = async () => {
      try {
        setLoading(true)
        setError('')
        const data = await getFormations()

        if (active) {
          setFormations(data)
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.message || 'Impossible de charger les formations.')
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
  }, [])

  const formationsFiltrees = formations.filter(f => {
    const description = f.description || f.mini_description || ''
    const formateurNom = f.formateur?.nom || ''
    const matchRecherche = f.titre.toLowerCase().includes(recherche.toLowerCase()) ||
        description.toLowerCase().includes(recherche.toLowerCase()) ||
        formateurNom.toLowerCase().includes(recherche.toLowerCase())
    const matchCategorie = categorie === 'Toutes' || f.categorie === categorie
    const matchNiveau = niveau === 'Tous' || f.niveau === niveau
    return matchRecherche && matchCategorie && matchNiveau
  })

  const resetFiltres = () => {
    setRecherche('')
    setCategorie('Toutes')
    setNiveau('Tous')
  }

  const statusMessage = loading ? (
      <div className="text-center py-4">Chargement des formations...</div>
  ) : error ? (
      <div className="alert alert-warning">{error}</div>
  ) : null

  return (
      <div>
        {/* En-tête */}
        <section className="sh-section--dark py-5">
          <div className="container text-center">
            <h1 className="sh-section-title--light mb-2">Toutes les formations</h1>
            <p className="sh-section-sub--light">
              {formations.length} formations disponibles — gratuites et accessibles à tous
            </p>
          </div>
        </section>

        {/* Filtres */}
        <section className="py-4 bg-white border-bottom">
          <div className="container">
            <div className="row g-3 align-items-end">

              {/* Recherche */}
              <div className="col-md-4">
                <label htmlFor="formation-search" className="form-label small fw-semibold" style={{ color: 'var(--text-secondary)' }}>
                  Recherche
                </label>
                <input
                    id="formation-search"
                    type="text"
                    className="form-control"
                    placeholder="Rechercher une formation..."
                    value={recherche}
                    onChange={e => setRecherche(e.target.value)}
                />
              </div>

              {/* Catégorie */}
              <div className="col-md-3">
                <label htmlFor="formation-categorie" className="form-label small fw-semibold" style={{ color: 'var(--text-secondary)' }}>
                  Catégorie
                </label>
                <select
                    id="formation-categorie"
                    className="form-select"
                    value={categorie}
                    onChange={e => setCategorie(e.target.value)}
                >
                  {CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Niveau */}
              <div className="col-md-3">
                <label htmlFor="formation-niveau" className="form-label small fw-semibold" style={{ color: 'var(--text-secondary)' }}>
                  Niveau
                </label>
                <select
                    id="formation-niveau"
                    className="form-select"
                    value={niveau}
                    onChange={e => setNiveau(e.target.value)}
                >
                  {NIVEAUX.map(n => (
                      <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>

              {/* Reset */}
              <div className="col-md-2">
                <button
                    className="btn btn-outline-secondary w-100"
                    onClick={resetFiltres}
                >
                  Réinitialiser
                </button>
              </div>

            </div>
          </div>
        </section>

        {/* Résultats */}
        <section className="sh-section">
          <div className="container">

            {statusMessage}

            {/* Compteur résultats */}
            <p className="mb-4 small" style={{ color: 'var(--text-secondary)' }}>
              {formationsFiltrees.length} formation{formationsFiltrees.length > 1 ? 's' : ''} trouvée{formationsFiltrees.length > 1 ? 's' : ''}
            </p>

            {/* Grille formations */}
            {formationsFiltrees.length > 0 ? (
                <div className="row g-4">
                  {formationsFiltrees.map(f => (
                      <div className="col-md-4" key={f.id}>
                        <div className="sh-formation-card">
                          <div className="sh-formation-card-top">
                            <span className="sh-cat-tag">{f.categorie}</span>
                            <span className={`sh-badge ${niveauConfig[(f.niveau || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')]?.cls || 'sh-badge-green'}`}>{f.niveau}</span>
                          </div>
                          <h6 className="sh-formation-title">{f.titre}</h6>
                          <p className="sh-formation-desc">{f.description || f.mini_description || ''}</p>
                          <p className="small" style={{ color: 'var(--text-muted)' }}>
                            Par {f.formateur?.nom || 'SkillHub'}
                          </p>
                          <div className="sh-formation-meta">
                            <span><i className="bi bi-people-fill me-1" aria-hidden="true" />{f.apprenants ?? 0} apprenants</span>
                            <span><i className="bi bi-eye-fill me-1" aria-hidden="true" />{f.vues ?? 0} vues</span>
                          </div>
                          <Link to={`/formation/${f.id}`} className="sh-btn sh-btn--card-cta">
                            Voir le détail
                          </Link>
                        </div>
                      </div>
                  ))}
                </div>
            ) : (
                /* Aucun résultat */
                <div className="text-center py-5">
                  <p className="fs-5 fw-semibold" style={{ color: 'var(--brand-deep)' }}>
                    Aucune formation trouvée
                  </p>
                  <p className="small mt-2" style={{ color: 'var(--text-secondary)' }}>
                    Essayez d'autres mots-clés ou réinitialisez les filtres.
                  </p>
                  <button className="sh-btn sh-btn--outline mt-3" onClick={resetFiltres}>
                    Réinitialiser les filtres
                  </button>
                </div>
            )}

          </div>
        </section>
      </div>
  )
}

export default Formations