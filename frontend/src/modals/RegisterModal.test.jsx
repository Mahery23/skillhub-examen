import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RegisterModal from './RegisterModal'

// ---------------------------------------------------------------------------
// Tests du composant RegisterModal.
// On couvre :
//   - Rendu conditionnel
//   - Remplissage du formulaire et transmission correcte au parent
//   - Selection du role par defaut (apprenant / formateur)
//   - Validation client : un mot de passe trop faible ne doit PAS
//     declencher onRegister
//   - Mapping des erreurs serveur (register context)
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
})

const fillValidForm = async (user) => {
  await user.type(screen.getByPlaceholderText('Votre prénom'), 'Alice')
  await user.type(screen.getByPlaceholderText('Votre nom'), 'Martin')
  await user.type(screen.getByPlaceholderText('06 12 34 56 78'), '+261340000000')
  await user.type(screen.getByPlaceholderText('votre@email.com'), 'alice@test.com')
  await user.type(screen.getByPlaceholderText('********'), 'Password123!')
}

describe('RegisterModal', () => {
  it('n affiche rien quand show=false', () => {
    render(<RegisterModal show={false} onHide={() => {}} onRegister={() => {}} />)
    expect(screen.queryByText('Créer un compte')).not.toBeInTheDocument()
  })

  it('affiche le formulaire quand show=true', () => {
    render(<RegisterModal show onHide={() => {}} onRegister={() => {}} />)
    expect(screen.getByText('Créer un compte')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Votre prénom')).toBeInTheDocument()
  })

  it('transmet le payload normalise a onRegister et respecte le role par defaut', async () => {
    const user = userEvent.setup()
    const onRegister = vi.fn().mockResolvedValue({})

    render(<RegisterModal show onHide={() => {}} onRegister={onRegister} defaultRole="formateur" />)

    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: /S'inscrire/i }))

    await waitFor(() => {
      expect(onRegister).toHaveBeenCalledWith({
        prenom: 'Alice',
        nom: 'Martin',
        contact: '+261340000000',
        email: 'alice@test.com',
        password: 'Password123!',
        role: 'formateur',
      })
    })
  })

  it('bloque l envoi quand la validation client echoue (mot de passe faible)', async () => {
    const user = userEvent.setup()
    const onRegister = vi.fn()

    render(<RegisterModal show onHide={() => {}} onRegister={onRegister} />)

    await user.type(screen.getByPlaceholderText('Votre prénom'), 'Al')
    await user.type(screen.getByPlaceholderText('Votre nom'), 'Ma')
    await user.type(screen.getByPlaceholderText('06 12 34 56 78'), '+261340000000')
    await user.type(screen.getByPlaceholderText('votre@email.com'), 'al@test.com')
    // Mot de passe qui respecte le minLength HTML (8) mais pas la policy
    // (pas de majuscule / chiffre / caractere special).
    await user.type(screen.getByPlaceholderText('********'), 'pppppppp')
    await user.click(screen.getByRole('button', { name: /S'inscrire/i }))

    // onRegister ne doit PAS etre appele : la validation client a echoue.
    expect(onRegister).not.toHaveBeenCalled()

    // Au moins une erreur de validation doit s afficher. On cible un
    // message precis du service de validation (pas le label du champ).
    expect(
      await screen.findByText(/une minuscule et une majuscule/i),
    ).toBeInTheDocument()
  })

  it('affiche le message d erreur serveur en contexte register (401)', async () => {
    const user = userEvent.setup()
    const error = new Error('ignored')
    error.status = 401
    const onRegister = vi.fn().mockRejectedValue(error)

    render(<RegisterModal show onHide={() => {}} onRegister={onRegister} />)

    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: /S'inscrire/i }))

    expect(
      await screen.findByText("Session invalide pendant l'inscription. Veuillez réessayer."),
    ).toBeInTheDocument()
  })
})
