/* eslint-disable react/prop-types */

import { Link, NavLink } from 'react-router-dom'
import PropTypes from 'prop-types'

function Navbar(props) {
    const user = props?.user || null
    const onOpenLogin = props?.onOpenLogin || (() => {})
    const onOpenRegister = props?.onOpenRegister || (() => {})
    const onLogout = props?.onLogout || (() => {})
    const profilePath = user?.role === 'formateur' ? '/dashboard/formateur' : '/dashboard/apprenant'

    return (
        <nav className="navbar navbar-expand-lg sticky-top skillhub-navbar">
            <div className="container">
                <Link className="navbar-brand fw-semibold skillhub-brand" to="/">SkillHub</Link>
                <div className="d-flex gap-2 ms-auto align-items-center">
                    <NavLink
                        className={({ isActive }) => `nav-link skillhub-nav-link ${isActive ? 'active' : ''}`}
                        to="/formations"
                    >
                        Formations
                    </NavLink>

                    {user ? (
                        <>
                            <Link className="btn btn-sm skillhub-btn-secondary" to={profilePath}>
                                Dashboard
                            </Link>
                            <span className="small" style={{ color: 'var(--text-secondary)' }}>
                                {user.name || user.nom || user.email}
                            </span>
                            <button className="btn btn-sm skillhub-btn-ghost" onClick={onLogout}>
                                Se deconnecter
                            </button>
                        </>
                    ) : (
                        <>
                            <button className="btn btn-sm skillhub-btn-ghost" onClick={onOpenLogin}>Se connecter</button>
                            <button className="btn btn-sm skillhub-btn-primary" onClick={() => onOpenRegister('apprenant')}>S'inscrire</button>
                        </>
                    )}
                </div>
            </div>
        </nav>
    )
}

Navbar.propTypes = {
    user: PropTypes.shape({
        role: PropTypes.string,
        name: PropTypes.string,
        nom: PropTypes.string,
        email: PropTypes.string,
    }),
    onOpenLogin: PropTypes.func.isRequired,
    onOpenRegister: PropTypes.func.isRequired,
    onLogout: PropTypes.func.isRequired,
}

export default Navbar

