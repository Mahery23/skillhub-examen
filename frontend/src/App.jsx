import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Home from './pages/Home'
import Formations from './pages/Formations'
import FormationDetail from './pages/FormationDetail'
import DashboardFormateur from './pages/DashboardFormateur'
import DashboardApprenant from './pages/DashboardApprenant'
import SuiviFormation from './pages/SuiviFormation'
import LoginModal from './modals/LoginModal'
import RegisterModal from './modals/RegisterModal'
import {
    getStoredUser,
    getProfile,
    login as loginUser,
    logout as logoutUser,
    register as registerUser,
} from './services/authService'

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000
const LAST_ACTIVITY_KEY = 'skillhub_last_activity'

function AppContent() {
    const navigate = useNavigate()
    const [user, setUser] = useState(() => getStoredUser() || null)
    const [showLogin, setShowLogin] = useState(false)
    const [showRegister, setShowRegister] = useState(false)
    const [preferredRole, setPreferredRole] = useState('apprenant')

    const markActivity = () => {
        localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()))
    }

    useEffect(() => {
        let active = true

        const verifySession = async () => {
            const storedUser = getStoredUser()

            if (!storedUser) {
                return
            }

            const lastActivityRaw = localStorage.getItem(LAST_ACTIVITY_KEY)
            const lastActivity = Number(lastActivityRaw || 0)
            const isInactiveTooLong = !lastActivity || (Date.now() - lastActivity > INACTIVITY_TIMEOUT_MS)

            if (isInactiveTooLong) {
                logoutUser()
                localStorage.removeItem(LAST_ACTIVITY_KEY)
                if (active) {
                    setUser(null)
                }
                return
            }

            try {
                const freshUser = await getProfile()

                if (active) {
                    setUser(freshUser || null)
                }
            } catch {
                if (active) {
                    setUser(null)
                }
            }
        }

        verifySession()

        return () => {
            active = false
        }
    }, [])

    useEffect(() => {
        if (!user) {
            localStorage.removeItem(LAST_ACTIVITY_KEY)
            return
        }

        markActivity()

        const events = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart']
        const onActivity = () => markActivity()

        events.forEach((eventName) => globalThis.addEventListener(eventName, onActivity, { passive: true }))

        const intervalId = globalThis.setInterval(() => {
            const lastActivity = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || 0)

            if (lastActivity && Date.now() - lastActivity > INACTIVITY_TIMEOUT_MS) {
                logoutUser()
                localStorage.removeItem(LAST_ACTIVITY_KEY)
                setUser(null)
                navigate('/')
            }
        }, 30 * 1000)

        return () => {
            events.forEach((eventName) => globalThis.removeEventListener(eventName, onActivity))
            globalThis.clearInterval(intervalId)
        }
    }, [navigate, user])

    const redirectAfterAuth = (loggedUser) => {
        if (loggedUser?.role === 'formateur') {
            navigate('/dashboard/formateur')
            return
        }

        navigate('/dashboard/apprenant')
    }

    const handleLogin = async (credentials) => {
        const session = await loginUser(credentials)
        setUser(session.user)
        markActivity()
        setShowLogin(false)
        redirectAfterAuth(session.user)
    }

    const handleRegister = async (payload) => {
        const session = await registerUser(payload)
        setUser(session.user)
        markActivity()
        setShowRegister(false)
        redirectAfterAuth(session.user)
    }

    const handleLogout = () => {
        logoutUser()
        localStorage.removeItem(LAST_ACTIVITY_KEY)
        setUser(null)
        navigate('/')
    }

    const openRegister = (role = 'apprenant') => {
        setPreferredRole(role)
        setShowRegister(true)
    }

    return (
        <>
            <Navbar
                user={user}
                onOpenLogin={() => setShowLogin(true)}
                onOpenRegister={openRegister}
                onLogout={handleLogout}
            />
            <Routes>
                <Route path="/" element={<Home user={user} onOpenLogin={() => setShowLogin(true)} onOpenRegister={openRegister} />} />
                <Route path="/formations" element={<Formations />} />
                <Route path="/formation/:id" element={<FormationDetail user={user} onOpenLogin={() => setShowLogin(true)} />} />
                <Route path="/dashboard/formateur" element={<DashboardFormateur user={user} />} />
                <Route path="/dashboard/apprenant" element={<DashboardApprenant user={user} />} />
                <Route path="/apprendre/:id" element={<SuiviFormation user={user} />} />
            </Routes>
            <Footer />

            <LoginModal show={showLogin} onHide={() => setShowLogin(false)} onLogin={handleLogin} />
            <RegisterModal show={showRegister} onHide={() => setShowRegister(false)} onRegister={handleRegister} defaultRole={preferredRole} />
        </>
    )
}

function App() {
    return (
        <BrowserRouter>
            <AppContent />
        </BrowserRouter>
    )
}

export default App