import { describe, it, expect, beforeEach, vi } from 'vitest'

// On mock le client HTTP avant d'importer authService, sinon authService
// capture la vraie fonction au moment du chargement.
vi.mock('./apiClient', () => ({
  apiRequest: vi.fn(),
}))

import { apiRequest } from './apiClient'
import {
  login,
  register,
  logout,
  getStoredUser,
  getStoredToken,
  getProfile,
} from './authService'

// ---------------------------------------------------------------------------
// Tests du service d'authentification.
// Points critiques valides ici :
//   - Sanitization des donnees AVANT ecriture dans localStorage (Sonar S8475)
//   - Rejet d'un token JWT malforme
//   - Normalisation du role (allowlist : admin / formateur / apprenant)
//   - Persistance de session (skillhub_token + skillhub_user)
//   - Nettoyage de session au logout
//   - Gestion defensive si le JSON stocke est corrompu
// ---------------------------------------------------------------------------

// JWT fictif mais conforme au regex (3 segments base64url separes par '.').
const VALID_JWT = 'aaaa.bbbb.cccc'
const TOKEN_KEY = 'skillhub_token'
const USER_KEY = 'skillhub_user'

beforeEach(() => {
  apiRequest.mockReset()
  window.localStorage.clear()
})

describe('login', () => {
  it('sauvegarde le token et l utilisateur normalise apres un login reussi', async () => {
    apiRequest.mockResolvedValueOnce({
      token: VALID_JWT,
      user: {
        id: 42,
        prenom: 'Jean',
        nom: 'Dupont',
        email: 'jean@test.com',
        role: 'formateur',
      },
    })

    const session = await login({ email: 'jean@test.com', password: 'Password123!' })

    expect(apiRequest).toHaveBeenCalledWith('/api/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'jean@test.com', password: 'Password123!' }),
    })
    expect(session.token).toBe(VALID_JWT)
    expect(session.user.role).toBe('formateur')
    expect(localStorage.getItem(TOKEN_KEY)).toBe(VALID_JWT)
    expect(JSON.parse(localStorage.getItem(USER_KEY))).toMatchObject({
      id: 42,
      email: 'jean@test.com',
      role: 'formateur',
    })
  })

  it('accepte aussi access_token a la place de token', async () => {
    apiRequest.mockResolvedValueOnce({
      access_token: VALID_JWT,
      user: { id: 1, email: 'a@b.com', role: 'apprenant' },
    })

    const session = await login({ email: 'a@b.com', password: 'x' })
    expect(session.token).toBe(VALID_JWT)
  })

  it('rejette la reponse si aucun token n est fourni', async () => {
    apiRequest.mockResolvedValueOnce({ user: { id: 1, email: 'a@b.com' } })

    await expect(login({ email: 'a@b.com', password: 'x' })).rejects.toThrow(
      'Token JWT manquant dans la reponse login.',
    )
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
  })

  it('ne persiste PAS le token s il est mal forme (protection jssecurity:S8475)', async () => {
    apiRequest.mockResolvedValueOnce({
      token: 'not-a-valid-jwt',
      user: { id: 1, email: 'a@b.com', role: 'apprenant' },
    })

    await login({ email: 'a@b.com', password: 'x' })

    // Le token invalide n est pas ecrit dans le localStorage : le sanitize
    // retourne null, la branche "if (safeToken)" ne s execute pas.
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
  })

  it('rejette un role non autorise et bascule sur "apprenant"', async () => {
    apiRequest.mockResolvedValueOnce({
      token: VALID_JWT,
      user: { id: 1, email: 'a@b.com', role: 'admin_godmode' },
    })

    const session = await login({ email: 'a@b.com', password: 'x' })
    expect(session.user.role).toBe('apprenant')
  })

  it('tronque les champs string au-dela de 255 caracteres', async () => {
    const huge = 'a'.repeat(500)
    apiRequest.mockResolvedValueOnce({
      token: VALID_JWT,
      user: { id: 1, prenom: huge, email: 'a@b.com', role: 'apprenant' },
    })

    const session = await login({ email: 'a@b.com', password: 'x' })
    expect(session.user.prenom.length).toBeLessThanOrEqual(255)
  })

  it('supprime les caracteres de controle des champs string', async () => {
    apiRequest.mockResolvedValueOnce({
      token: VALID_JWT,
      user: {
        id: 1,
        prenom: 'Jean\u0000\u001F',
        email: 'a@b.com',
        role: 'apprenant',
      },
    })

    const session = await login({ email: 'a@b.com', password: 'x' })
    expect(session.user.prenom).toBe('Jean')
  })

  it('propage les erreurs remontees par apiRequest', async () => {
    const err = new Error('Unauthorized')
    err.status = 401
    apiRequest.mockRejectedValueOnce(err)

    await expect(login({ email: 'a@b.com', password: 'x' })).rejects.toThrow('Unauthorized')
  })
})

describe('register', () => {
  it('sauvegarde la session apres une inscription reussie', async () => {
    apiRequest.mockResolvedValueOnce({
      token: VALID_JWT,
      user: {
        id: 10,
        prenom: 'Alice',
        nom: 'Martin',
        email: 'alice@test.com',
        role: 'apprenant',
      },
    })

    const session = await register({
      prenom: 'Alice',
      nom: 'Martin',
      contact: '+261340000000',
      email: 'alice@test.com',
      password: 'Password123!',
      role: 'apprenant',
    })

    expect(session.user.name).toBe('Alice Martin')
    expect(localStorage.getItem(TOKEN_KEY)).toBe(VALID_JWT)
  })

  it('construit le champ name depuis prenom+nom en fallback si API ne le renvoie pas', async () => {
    apiRequest.mockResolvedValueOnce({
      token: VALID_JWT,
      user: { id: 1, email: 'a@b.com', role: 'apprenant' },
    })

    const session = await register({
      prenom: 'Bob',
      nom: 'Leponge',
      contact: '0340000000',
      email: 'a@b.com',
      password: 'Password123!',
      role: 'apprenant',
    })

    expect(session.user.name).toBe('Bob Leponge')
  })

  it('rejette si aucun token n est fourni', async () => {
    apiRequest.mockResolvedValueOnce({ user: { id: 1 } })
    await expect(
      register({
        prenom: 'A', nom: 'B', contact: 'c', email: 'e', password: 'p', role: 'apprenant',
      }),
    ).rejects.toThrow('Token JWT manquant dans la reponse register.')
  })
})

describe('logout', () => {
  it('efface le token et l utilisateur du localStorage', () => {
    localStorage.setItem(TOKEN_KEY, VALID_JWT)
    localStorage.setItem(USER_KEY, JSON.stringify({ id: 1 }))

    logout()

    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
    expect(localStorage.getItem(USER_KEY)).toBeNull()
  })
})

describe('getStoredToken', () => {
  it('retourne le token quand il est present', () => {
    localStorage.setItem(TOKEN_KEY, VALID_JWT)
    expect(getStoredToken()).toBe(VALID_JWT)
  })

  it('retourne null quand aucun token n est stocke', () => {
    expect(getStoredToken()).toBeNull()
  })
})

describe('getStoredUser', () => {
  it('retourne null si rien n est stocke', () => {
    expect(getStoredUser()).toBeNull()
  })

  it('retourne un user normalise a partir du JSON stocke', () => {
    localStorage.setItem(USER_KEY, JSON.stringify({ id: 7, prenom: 'Eve', email: 'eve@test.com', role: 'formateur' }))
    const user = getStoredUser()
    expect(user).toMatchObject({ id: 7, email: 'eve@test.com', role: 'formateur' })
  })

  it("nettoie la session si le JSON stocke est corrompu (defense en profondeur)", () => {
    localStorage.setItem(TOKEN_KEY, VALID_JWT)
    localStorage.setItem(USER_KEY, '{ ceci n est pas du JSON }')

    expect(getStoredUser()).toBeNull()
    // clearSession est appele dans le catch : token aussi doit etre efface.
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
  })

  it('rejette un role inconnu et le remplace par apprenant', () => {
    localStorage.setItem(USER_KEY, JSON.stringify({ id: 1, role: 'hacker' }))
    expect(getStoredUser().role).toBe('apprenant')
  })
})

describe('getProfile', () => {
  it('retourne null si aucun token n est stocke (pas d appel reseau)', async () => {
    const user = await getProfile()
    expect(user).toBeNull()
    expect(apiRequest).not.toHaveBeenCalled()
  })

  it('appelle /api/profile avec le Bearer token et normalise la reponse', async () => {
    localStorage.setItem(TOKEN_KEY, VALID_JWT)
    apiRequest.mockResolvedValueOnce({
      user: { id: 5, prenom: 'Max', email: 'max@test.com', role: 'formateur' },
    })

    const user = await getProfile()

    expect(apiRequest).toHaveBeenCalledWith('/api/profile', {
      headers: { Authorization: `Bearer ${VALID_JWT}` },
    })
    expect(user).toMatchObject({ id: 5, email: 'max@test.com', role: 'formateur' })
  })

  it('supporte une reponse sans enveloppe user (payload direct)', async () => {
    localStorage.setItem(TOKEN_KEY, VALID_JWT)
    apiRequest.mockResolvedValueOnce({ id: 9, email: 'y@z.com', role: 'apprenant' })

    const user = await getProfile()
    expect(user.id).toBe(9)
  })
})
