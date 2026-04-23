import { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { Modal, Button, Form } from 'react-bootstrap'
import { mapApiError, mapValidationErrors } from '../services/apiErrorMapper'
import { validateRegisterInput } from '../services/validationService'

const getFieldValue = (formData, key) => {
    const value = formData.get(key)
    return typeof value === 'string' ? value : ''
}

function RegisterModal({ show, onHide, onRegister, defaultRole = 'apprenant' }) {
    const [role, setRole] = useState(defaultRole)
    const [error, setError] = useState('')
    const [fieldErrors, setFieldErrors] = useState([])
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        if (show) {
            setRole(defaultRole)
            setError('')
            setFieldErrors([])
        }
    }, [defaultRole, show])

    const handleSubmit = async (event) => {
        event.preventDefault()
        setError('')
        setFieldErrors([])

        const formData = new FormData(event.currentTarget)
        const prenom = getFieldValue(formData, 'prenom').trim()
        const nom = getFieldValue(formData, 'nom').trim()
        const contact = getFieldValue(formData, 'contact').trim()
        const email = getFieldValue(formData, 'email').trim().toLowerCase()
        const password = getFieldValue(formData, 'password')
        const clientErrors = validateRegisterInput({ prenom, nom, contact, email, password, role })

        if (clientErrors.length > 0) {
            setFieldErrors(clientErrors)
            return
        }

        setIsLoading(true)

        try {
            await onRegister({ prenom, nom, contact, email, password, role })
        } catch (submitError) {
            setError(mapApiError(submitError, 'register'))
            setFieldErrors(mapValidationErrors(submitError.details))
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Modal show={show} onHide={onHide} centered>
            <Modal.Header closeButton>
                <Modal.Title>Créer un compte</Modal.Title>
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
                        <Form.Label>Prénom</Form.Label>
                        <Form.Control
                            name="prenom"
                            type="text"
                            placeholder="Votre prénom"
                            minLength={2}
                            maxLength={80}
                            required
                        />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Nom</Form.Label>
                        <Form.Control
                            name="nom"
                            type="text"
                            placeholder="Votre nom"
                            minLength={2}
                            maxLength={80}
                            required
                        />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Téléphone</Form.Label>
                        <Form.Control
                            name="contact"
                            type="tel"
                            placeholder="06 12 34 56 78"
                            maxLength={30}
                            required
                        />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Email</Form.Label>
                        <Form.Control name="email" type="email" placeholder="votre@email.com" maxLength={120} required />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Mot de passe</Form.Label>
                        <Form.Control name="password" type="password" placeholder="********" minLength={8} maxLength={64} required />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Je suis</Form.Label>
                        <Form.Select name="role" value={role} onChange={(event) => setRole(event.target.value)}>
                            <option value="apprenant">Apprenant</option>
                            <option value="formateur">Formateur</option>
                        </Form.Select>
                    </Form.Group>
                    <Button variant="primary" className="w-100" type="submit" disabled={isLoading}>
                        {isLoading ? 'Inscription...' : "S'inscrire"}
                    </Button>
                </Form>
            </Modal.Body>
        </Modal>
    )
}

RegisterModal.propTypes = {
    show: PropTypes.bool.isRequired,
    onHide: PropTypes.func.isRequired,
    onRegister: PropTypes.func.isRequired,
    defaultRole: PropTypes.oneOf(['apprenant', 'formateur']),
}

export default RegisterModal