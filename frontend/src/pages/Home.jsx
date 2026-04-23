import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PropTypes from 'prop-types'
import { getFormations } from '../services/formationService'

const niveauConfig = {
    debutant: { label: 'Débutant', cls: 'sh-badge-green' },
    intermediaire: { label: 'Intermédiaire', cls: 'sh-badge-amber' },
    avance: { label: 'Avancé', cls: 'sh-badge-red' },
}

const temoignages = [
    { initiales: 'AM', nom: 'Alicia Martin',   role: 'Apprenante – Développement web', texte: 'SkillHub m\'a permis de me reconvertir en quelques mois. Les formations sont claires et très bien structurées.' },
    { initiales: 'KD', nom: 'Karim Diallo',    role: 'Formateur – Data & IA',          texte: 'En tant que formateur, j\'apprécie la simplicité de la plateforme. Je crée mes modules en quelques minutes.' },
    { initiales: 'SL', nom: 'Sophie Lefèvre',  role: 'Apprenante – Design UI/UX',      texte: 'Une communauté bienveillante et des formateurs à l\'écoute. Je recommande SkillHub à 100%.' },
]

const stats = [
    { valeur: '120+', label: 'Formations' },
    { valeur: '4 800', label: 'Apprenants' },
    { valeur: '60', label: 'Formateurs' },
    { valeur: '5', label: 'Catégories' },
]

const valeurs = [
    { icon: 'bi bi-universal-access-circle', titre: 'Accessibilité', desc: 'Toutes les formations sont gratuites et accessibles à tous, sans exception.' },
    { icon: 'bi bi-people-fill',             titre: 'Communauté',    desc: 'Un espace collaboratif où chacun peut apprendre et partager ses compétences.' },
    { icon: 'bi bi-award-fill',              titre: 'Excellence',    desc: 'Des contenus de qualité créés par des formateurs passionnés et experts.' },
]

const normalizeFormationsPayload = (payload) => {
    if (Array.isArray(payload)) return payload
    if (Array.isArray(payload?.data)) return payload.data
    return []
}

function Home(props) {
    const user = props?.user || null
    const onOpenLogin = props?.onOpenLogin || (() => {})
    const onOpenRegister = props?.onOpenRegister || (() => {})
    const userRole = user?.role || ''
    const dashboardPath = userRole === 'formateur' ? '/dashboard/formateur' : '/dashboard/apprenant'
    const [formationsUne, setFormationsUne] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        let active = true

        const loadFormations = async () => {
            try {
                setLoading(true)
                setError('')
                const payload = await getFormations()
                const formations = normalizeFormationsPayload(payload)

                if (active) {
                    setFormationsUne(formations.slice(0, 3))
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

    const formatDescription = (formation) => formation?.mini_description || formation?.description || ''

    let featuredFormationsContent
    let heroActionsContent
    let ctaActionsContent

    if (loading) {
        featuredFormationsContent = <div className="text-center py-4">Chargement des formations...</div>
    } else if (error) {
        featuredFormationsContent = <div className="alert alert-warning mb-0">{error}</div>
    } else if (formationsUne.length === 0) {
        featuredFormationsContent = <div className="text-center py-4">Aucune formation disponible pour le moment.</div>
    } else {
        featuredFormationsContent = (
            <div className="row g-4">
                {formationsUne.map((formation) => {
                    const badgeKey = (formation.niveau || '').toLowerCase().normalize('NFD').replaceAll(/\p{Diacritic}/gu, '')

                    return (
                        <div className="col-md-4" key={formation.id}>
                            <div className="sh-formation-card">
                                <div className="sh-formation-card-top">
                                    <span className="sh-cat-tag">{formation.categorie}</span>
                                    <span className={`sh-badge ${niveauConfig[badgeKey]?.cls || 'sh-badge-green'}`}>
                                        {niveauConfig[badgeKey]?.label || formation.niveau}
                                    </span>
                                </div>
                                <h6 className="sh-formation-title">{formation.titre}</h6>
                                <p className="sh-formation-desc">{formatDescription(formation)}</p>
                                <div className="sh-formation-meta">
                                    <span><i className="bi bi-people-fill me-1" aria-hidden="true" />{formation.apprenants ?? 0} apprenants</span>
                                    <span><i className="bi bi-eye-fill me-1" aria-hidden="true" />{formation.vues ?? 0} vues</span>
                                </div>
                                <Link to={`/formation/${formation.id}`} className="sh-btn sh-btn--card-cta">
                                    Voir le détail
                                </Link>
                            </div>
                        </div>
                    )
                })}
            </div>
        )
    }

    if (user) {
        heroActionsContent = (
            <Link to={dashboardPath} className="sh-btn sh-btn--primary">
                Mon dashboard
            </Link>
        )

        ctaActionsContent = (
            <Link to={dashboardPath} className="sh-btn sh-btn--white">
                Mon dashboard
            </Link>
        )
    } else {
        heroActionsContent = (
            <>
                <button className="sh-btn sh-btn--primary" onClick={() => onOpenRegister('apprenant')}>
                    Commencer gratuitement
                </button>
                <button className="sh-btn sh-btn--ghost" onClick={onOpenLogin}>
                    Se connecter
                </button>
            </>
        )

        ctaActionsContent = (
            <>
                <button className="sh-btn sh-btn--white" onClick={() => onOpenRegister('apprenant')}>
                    Commencer gratuitement
                </button>
                <Link to="/formations" className="sh-btn sh-btn--ghost-white">
                    Voir les formations
                </Link>
            </>
        )
    }

    return (
        <div className="sh-home">

            {/* ── HERO ── */}
            <section className="sh-hero">
                <div className="sh-hero-glow sh-hero-glow--left" />
                <div className="sh-hero-glow sh-hero-glow--right" />
                <div className="container position-relative">
                    <div className="row align-items-center g-5">
                        <div className="col-lg-6">
                            <div className="sh-hero-tag mb-3">Plateforme e-learning gratuite</div>
                            <h1 className="sh-hero-title">
                                Apprenez.<br />
                                Progressez.<br />
                                <span className="sh-hero-title--accent">Réussissez.</span>
                            </h1>
                            <p className="sh-hero-sub">
                                SkillHub met en relation formateurs experts et apprenants motivés autour de formations structurées, accessibles à tous et entièrement gratuites.
                            </p>
                            <div className="sh-hero-actions">
                                {heroActionsContent}
                                <Link to="/formations" className="sh-btn sh-btn--outline">
                                    Voir les formations
                                </Link>
                            </div>
                        </div>
                        <div className="col-lg-6 d-none d-lg-block">
                            <div className="sh-hero-visual">
                                <div className="sh-hero-card sh-hero-card--1">
                                    <div className="sh-hero-card-dot sh-hero-card-dot--green" />
                                    <div className="sh-hero-card-line" style={{ width: '60%' }} />
                                    <div className="sh-hero-card-line sh-hero-card-line--thin" style={{ width: '80%' }} />
                                    <div className="sh-hero-card-line sh-hero-card-line--thin" style={{ width: '45%' }} />
                                    <div className="sh-hero-card-badge">Débutant</div>
                                </div>
                                <div className="sh-hero-card sh-hero-card--2">
                                    <div className="sh-hero-card-dot sh-hero-card-dot--amber" />
                                    <div className="sh-hero-card-line" style={{ width: '70%' }} />
                                    <div className="sh-hero-card-line sh-hero-card-line--thin" style={{ width: '55%' }} />
                                    <div className="sh-hero-card-badge sh-hero-card-badge--amber">Intermédiaire</div>
                                </div>
                                <div className="sh-hero-card sh-hero-card--3">
                                    <div className="sh-hero-card-dot sh-hero-card-dot--purple" />
                                    <div className="sh-hero-card-line" style={{ width: '50%' }} />
                                    <div className="sh-hero-card-line sh-hero-card-line--thin" style={{ width: '75%' }} />
                                    <div className="sh-hero-card-badge sh-hero-card-badge--purple">Avancé</div>
                                </div>
                                <div className="sh-hero-stat-pill sh-hero-stat-pill--1">
                                    <span className="sh-hero-stat-pill-num">4 800</span>
                                    <span className="sh-hero-stat-pill-lbl">apprenants</span>
                                </div>
                                <div className="sh-hero-stat-pill sh-hero-stat-pill--2">
                                    <span className="sh-hero-stat-pill-num">120+</span>
                                    <span className="sh-hero-stat-pill-lbl">formations</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── STATS ── */}
            <section className="sh-stats-band">
                <div className="container">
                    <div className="sh-stats-grid">
                        {stats.map(s => (
                            <div className="sh-stat" key={s.label}>
                                <div className="sh-stat-num">{s.valeur}</div>
                                <div className="sh-stat-lbl">{s.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── RÔLES (si non connecté) ── */}
            {!user && (
                <section className="sh-section">
                    <div className="container">
                        <div className="sh-section-head">
                            <h2 className="sh-section-title">Choisissez votre rôle</h2>
                            <p className="sh-section-sub">Inscrivez-vous en tant qu'apprenant ou formateur</p>
                        </div>
                        <div className="row g-4">
                            <div className="col-md-6">
                                <div className="sh-role-card sh-role-card--apprenant">
                                    <div className="sh-role-icon"><i className="bi bi-mortarboard-fill" aria-hidden="true" /></div>
                                    <h5 className="sh-role-title">Je suis apprenant</h5>
                                    <p className="sh-role-desc">Accédez gratuitement à toutes les formations et suivez votre progression module par module.</p>
                                    <button className="sh-btn sh-btn--primary mt-3" onClick={() => onOpenRegister('apprenant')}>
                                        M'inscrire comme apprenant
                                    </button>
                                </div>
                            </div>
                            <div className="col-md-6">
                                <div className="sh-role-card sh-role-card--formateur">
                                    <div className="sh-role-icon"><i className="bi bi-easel2-fill" aria-hidden="true" /></div>
                                    <h5 className="sh-role-title">Je suis formateur</h5>
                                    <p className="sh-role-desc">Créez vos formations, gérez vos modules et partagez votre expertise avec votre communauté.</p>
                                    <button className="sh-btn sh-btn--outline-dark mt-3" onClick={() => onOpenRegister('formateur')}>
                                        M'inscrire comme formateur
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* ── COMMENT ÇA MARCHE ── */}
            <section className="sh-section sh-section--dark">
                <div className="container">
                    <div className="sh-section-head sh-section-head--light">
                        <h2 className="sh-section-title--light">Comment ça marche ?</h2>
                        <p className="sh-section-sub--light">Rejoignez SkillHub en quelques étapes simples</p>
                    </div>
                    <div className="row g-4">
                        {[
                            { n: '01', titre: 'Créez un compte', desc: 'Inscrivez-vous en tant qu\'apprenant ou formateur en quelques secondes.' },
                            { n: '02', titre: 'Explorez le catalogue', desc: 'Filtrez par niveau, catégorie ou mot-clé pour trouver la formation idéale.' },
                            { n: '03', titre: 'Rejoignez une formation', desc: 'Inscrivez-vous en un clic, c\'est entièrement gratuit.' },
                            { n: '04', titre: 'Apprenez à votre rythme', desc: 'Suivez les modules, consultez votre progression dans votre dashboard.' },
                        ].map(step => (
                            <div className="col-md-3" key={step.n}>
                                <div className="sh-step">
                                    <div className="sh-step-num">{step.n}</div>
                                    <h6 className="sh-step-title">{step.titre}</h6>
                                    <p className="sh-step-desc">{step.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── FORMATIONS À LA UNE ── */}
            <section className="sh-section">
                <div className="container">
                    <div className="sh-section-head">
                        <div>
                            <h2 className="sh-section-title">Formations à la une</h2>
                            <p className="sh-section-sub">Les formations les plus suivies du moment</p>
                        </div>
                        <Link to="/formations" className="sh-link-more">
                            Voir toutes
                            <i className="bi bi-arrow-right ms-1" aria-hidden="true" />
                        </Link>
                    </div>
                    {featuredFormationsContent}
                </div>
            </section>

            {/* ── NOS VALEURS ── */}
            <section className="sh-section sh-section--soft">
                <div className="container">
                    <div className="sh-section-head">
                        <h2 className="sh-section-title">Nos valeurs</h2>
                        <p className="sh-section-sub">Ce qui nous anime au quotidien</p>
                    </div>
                    <div className="row g-4">
                        {valeurs.map(v => (
                            <div className="col-md-4" key={v.titre}>
                                <div className="sh-valeur-card">
                                    <div className="sh-valeur-icon"><i className={v.icon} aria-hidden="true" /></div>
                                    <h6 className="sh-valeur-title">{v.titre}</h6>
                                    <p className="sh-valeur-desc">{v.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── TÉMOIGNAGES ── */}
            <section className="sh-section">
                <div className="container">
                    <div className="sh-section-head">
                        <h2 className="sh-section-title">Ce que disent nos apprenants</h2>
                        <p className="sh-section-sub">Ils ont rejoint SkillHub et partagent leur expérience</p>
                    </div>
                    <div className="row g-4">
                        {temoignages.map(t => (
                            <div className="col-md-4" key={t.nom}>
                                <div className="sh-temoignage-card">
                                    <div className="sh-temoignage-stars" aria-label="5 étoiles">
                                        <i className="bi bi-star-fill" aria-hidden="true" />
                                        <i className="bi bi-star-fill" aria-hidden="true" />
                                        <i className="bi bi-star-fill" aria-hidden="true" />
                                        <i className="bi bi-star-fill" aria-hidden="true" />
                                        <i className="bi bi-star-fill" aria-hidden="true" />
                                    </div>
                                    <p className="sh-temoignage-texte">"{t.texte}"</p>
                                    <div className="sh-temoignage-author">
                                        <div className="sh-avatar">{t.initiales}</div>
                                        <div>
                                            <div className="sh-author-name">{t.nom}</div>
                                            <div className="sh-author-role">{t.role}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CTA FINAL ── */}
            <section className="sh-cta-band">
                <div className="container text-center">
                    <h2 className="sh-cta-title">Prêt à commencer ?</h2>
                    <p className="sh-cta-sub">Rejoignez des milliers d'apprenants et formateurs sur SkillHub — c'est gratuit.</p>
                    <div className="sh-cta-actions">
                        {ctaActionsContent}
                    </div>
                </div>
            </section>

        </div>
    )
}

export default Home

Home.propTypes = {
    user: PropTypes.shape({
        role: PropTypes.string,
    }),
    onOpenLogin: PropTypes.func,
    onOpenRegister: PropTypes.func,
}

