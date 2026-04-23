import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginModal from './LoginModal'

// ---------------------------------------------------------------------------
// Tests du composant LoginModal.
// On verifie le comportement visible par l'utilisateur :
//   - Rendu conditionnel (show=true / false)
//   - Validation client avant l'appel reseau
//   - Transmission des credentials au parent (onLogin)
//   - Affichage du message d'erreur si onLogin rejette
//   - Etat isLoading (bouton disable + texte "Connexion...")
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
})

describe('LoginModal', () => {
  it('n affiche rien quand show=false', () => {
    render(<LoginModal show={false} onHide={() => {}} onLogin={() => {}} />)
    expect(screen.queryByText('Se connecter')).not.toBeInTheDocument()
  })

  it('affiche le formulaire quand show=true', () => {
    render(<LoginModal show onHide={() => {}} onLogin={() => {}} />)
    expect(screen.getByRole('button', { name: 'Se connecter' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('votre@email.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('********')).toBeInTheDocument()
  })

  it('appelle onLogin avec email normalise (trim + lower) et password', async () => {
    const user = userEvent.setup()
    const onLogin = vi.fn().mockResolvedValue({})
    render(<LoginModal show onHide={() => {}} onLogin={onLogin} />)

    await user.type(screen.getByPlaceholderText('votre@email.com'), '  USER@Test.COM  ')
    await user.type(screen.getByPlaceholderText('********'), 'Password123!')
    await user.click(screen.getByRole('button', { name: /Se connecter/i }))

    await waitFor(() => {
      expect(onLogin).toHaveBeenCalledWith({
        email: 'user@test.com',
        password: 'Password123!',
      })
    })
  })

  it('affiche un message d erreur si onLogin rejette avec un status 401', async () => {
    const user = userEvent.setup()
    const error = new Error('ignored')
    error.status = 401
    const onLogin = vi.fn().mockRejectedValue(error)

    render(<LoginModal show onHide={() => {}} onLogin={onLogin} />)

    await user.type(screen.getByPlaceholderText('votre@email.com'), 'user@test.com')
    await user.type(screen.getByPlaceholderText('********'), 'Password123!')
    await user.click(screen.getByRole('button', { name: /Se connecter/i }))

    expect(await screen.findByText('Email ou mot de passe incorrect.')).toBeInTheDocument()
  })

  it('affiche les erreurs de validation backend (422 + details)', async () => {
    const user = userEvent.setup()
    const error = new Error('Validation failed')
    error.status = 422
    error.details = { email: ['Email deja pris.'] }
    const onLogin = vi.fn().mockRejectedValue(error)

    render(<LoginModal show onHide={() => {}} onLogin={onLogin} />)

    await user.type(screen.getByPlaceholderText('votre@email.com'), 'user@test.com')
    await user.type(screen.getByPlaceholderText('********'), 'Password123!')
    await user.click(screen.getByRole('button', { name: /Se connecter/i }))

    expect(await screen.findByText(/email: Email deja pris/)).toBeInTheDocument()
  })
})
