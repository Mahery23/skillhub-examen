import { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { Modal, Button, Form } from 'react-bootstrap'
import { mapApiError, mapValidationErrors } from '../services/apiErrorMapper'
import { validateLoginInput } from '../services/validationService'

const getFieldValue = (formData, key) => {
    const value = formData.get(key)
    return typeof value === 'string' ? value : ''
}

function LoginModal({ show, onHide, onLogin }) {
    const [error, setError] = useState('')
    const [fieldErrors, setFieldErrors] = useState([])
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        if (show) {
            setError('')
            setFieldErrors([])
        }
    }, [show])

    const handleSubmit = async (event) => {
        event.preventDefault()
        setError('')
        setFieldErrors([])

        const formData = new FormData(event.currentTarget)
        const email = getFieldValue(formData, 'email').trim().toLowerCase()
        const password = getFieldValue(formData, 'password')
        const clientErrors = validateLoginInput({ email, password })

        if (clientErrors.length > 0) {
            setFieldErrors(clientErrors)
            return
        }

        setIsLoading(true)

        try {
            await onLogin({ email, password })
        } catch (submitError) {
            setError(mapApiError(submitError, 'login'))
            setFieldErrors(mapValidationErrors(submitError.details))
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Modal show={show} onHide={onHide} centered>
            <Modal.Header closeButton>
                <Modal.Title>Se connecter</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form onSubmit={handleSubmit}>
                    {error && <div className="alert alert-danger py-2">{error}</div>}
                    {fieldErrors.length > 0 && (
                        <div className="alert alert-danger py-2">
                            <ul className="mb-0 ps-3">
                                {fieldErrors.map((item) => (
                                    <li key={item}>{item}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                    <Form.Group className="mb-3">
                        <Form.Label>Email</Form.Label>
                        <Form.Control name="email" type="email" placeholder="votre@email.com" maxLength={120} required />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Mot de passe</Form.Label>
                        <Form.Control name="password" type="password" placeholder="********" minLength={8} maxLength={64} required />
                    </Form.Group>
                    <Button variant="primary" className="w-100" type="submit" disabled={isLoading}>
                        {isLoading ? 'Connexion...' : 'Se connecter'}
                    </Button>
                </Form>
            </Modal.Body>
        </Modal>
    )
}

export default LoginModal

LoginModal.propTypes = {
    show: PropTypes.bool.isRequired,
    onHide: PropTypes.func.isRequired,
    onLogin: PropTypes.func.isRequired,
}
