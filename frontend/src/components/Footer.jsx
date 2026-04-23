import { Link } from 'react-router-dom'

function Footer() {
    const socialLinks = [
        { label: 'X (Twitter)', icon: 'bi bi-twitter-x', href: '#' },
        { label: 'LinkedIn', icon: 'bi bi-linkedin', href: '#' },
        { label: 'Instagram', icon: 'bi bi-instagram', href: '#' },
    ]

    return (
        <footer className="py-5 home-footer" style={{ background: '#26215C' }}>
            <div className="container">
                <div className="row g-4 mb-4">
                    <div className="col-md-5">
                        <div className="fw-semibold fs-5 text-white mb-2">SkillHub</div>
                        <p style={{ fontSize: 13, color: '#AFA9EC' }}>
                            La plateforme collaborative qui met en relation formateurs et apprenants autour de formations en ligne de qualité.
                        </p>
                        <div className="d-flex gap-2 mt-3">
                            {socialLinks.map((item) => (
                                <a
                                    key={item.label}
                                    href={item.href}
                                    aria-label={item.label}
                                    className="d-inline-flex align-items-center justify-content-center rounded-2"
                                    style={{
                                        width: 32,
                                        height: 32,
                                        background: '#3C3489',
                                        color: '#AFA9EC',
                                        textDecoration: 'none',
                                    }}
                                >
                                    <i className={item.icon} aria-hidden="true" />
                                </a>
                            ))}
                        </div>
                    </div>
                    <div className="col-md-2">
                        <div className="fw-semibold mb-2" style={{ color: '#EEEDFE', fontSize: 13 }}>Plateforme</div>
                        {[
                            { label: 'Formations', to: '/formations' },
                            { label: "S'inscrire", to: '/' },
                            { label: 'Se connecter', to: '/' },
                        ].map(l => (
                            <div key={l.label}>
                                <Link to={l.to} style={{ fontSize: 13, color: '#AFA9EC', textDecoration: 'none', display: 'block', marginBottom: 4 }}>
                                    {l.label}
                                </Link>
                            </div>
                        ))}
                    </div>
                    <div className="col-md-2">
                        <div className="fw-semibold mb-2" style={{ color: '#EEEDFE', fontSize: 13 }}>À propos</div>
                        {['Notre mission', 'Contact'].map(l => (
                            <div key={l}>
                                <span style={{ fontSize: 13, color: '#AFA9EC', display: 'block', marginBottom: 4, cursor: 'pointer' }}>{l}</span>
                            </div>
                        ))}
                    </div>
                    <div className="col-md-2">
                        <div className="fw-semibold mb-2" style={{ color: '#EEEDFE', fontSize: 13 }}>Légal</div>
                        {['Mentions légales', 'Politique RGPD', 'CGU'].map(l => (
                            <div key={l}>
                                <span style={{ fontSize: 13, color: '#AFA9EC', display: 'block', marginBottom: 4, cursor: 'pointer' }}>{l}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <hr style={{ borderColor: '#3C3489' }} />
                <div className="d-flex justify-content-between flex-wrap gap-2">
                    <span style={{ fontSize: 12, color: '#7F77DD' }}>© 2026 SkillHub. Tous droits réservés.</span>
                    <span style={{ fontSize: 12, color: '#7F77DD' }}>Fait avec passion par des étudiants</span>
                </div>
            </div>
        </footer>
    )
}

export default Footer