import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('./apiClient', () => ({
  apiRequest: vi.fn(),
}))

// Mock de crypto.subtle pour le calcul HMAC en environnement de test
const mockHmacCompute = vi.fn().mockResolvedValue(new Uint8Array(32).buffer)
Object.defineProperty(globalThis, 'crypto', {
  value: {
    subtle: {
      importKey: vi.fn().mockResolvedValue('mock-key'),
      sign: vi.fn().mockResolvedValue(new Uint8Array(32).buffer),
    },
  },
  writable: true,
})

import { apiRequest } from './apiClient'
import {
  login,
  register,
  logout,
  getStoredUser,
  getStoredToken,
  getProfile,
} from './authService'

// JWT fictif mais conforme au regex (3 segments base64url séparés par '.')
// Le payload contient { sub, role, name } encodés en base64
const JWT_PAYLOAD = btoa(JSON.stringify({ sub: 'jean@test.com', role: 'formateur', name: 'Jean Dupont' }))
const VALID_JWT = `aaaa.${JWT_PAYLOAD}.cccc`
const TOKEN_KEY = 'skillhub_token'
const USER_KEY = 'skillhub_user'

beforeEach(() => {
  apiRequest.mockReset()
  window.localStorage.clear()
})

describe('login', () => {
  it('sauvegarde le token et l utilisateur normalise apres un login reussi', async () => {
    // Mock : challenge puis login
    apiRequest
      .mockResolvedValueOnce({ nonce: 'test-nonce-123' })
      .mockResolvedValueOnce({ accessToken: VALID_JWT, expiresAt: 9999999999 })

    const session = await login({ email: 'jean@test.com', password: 'Password123!' })

    expect(session.token).toBe(VALID_JWT)
    expect(session.user.role).toBe('formateur')
    expect(localStorage.getItem(TOKEN_KEY)).toBe(VALID_JWT)
  })

  it('accepte aussi access_token a la place de token', async () => {
    const payload = btoa(JSON.stringify({ sub: 'a@b.com', role: 'apprenant', name: 'A' }))
    const jwt = `aaaa.${payload}.cccc`
    apiRequest
      .mockResolvedValueOnce({ nonce: 'nonce-xyz' })
      .mockResolvedValueOnce({ accessToken: jwt })

    const session = await login({ email: 'a@b.com', password: 'x' })
    expect(session.token).toBe(jwt)
  })

  it('rejette la reponse si aucun token n est fourni', async () => {
    apiRequest
      .mockResolvedValueOnce({ nonce: 'nonce-xyz' })
      .mockResolvedValueOnce({ user: { id: 1 } }) // pas de token

    await expect(login({ email: 'a@b.com', password: 'x' }))
      .rejects.toThrow('Token JWT manquant dans la reponse login.')
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
  })

  it('ne persiste PAS le token s il est mal forme (protection jssecurity:S8475)', async () => {
    apiRequest
      .mockResolvedValueOnce({ nonce: 'nonce-xyz' })
      .mockResolvedValueOnce({ accessToken: 'not-a-valid-jwt' })

    await login({ email: 'a@b.com', password: 'x' })
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
  })

  it('rejette un role non autorise et bascule sur "apprenant"', async () => {
    const payload = btoa(JSON.stringify({ sub: 'a@b.com', role: 'admin_godmode', name: 'A' }))
    const jwt = `aaaa.${payload}.cccc`
    apiRequest
      .mockResolvedValueOnce({ nonce: 'nonce-xyz' })
      .mockResolvedValueOnce({ accessToken: jwt })

    const session = await login({ email: 'a@b.com', password: 'x' })
    expect(session.user.role).toBe('apprenant')
  })

  it('tronque les champs string au-dela de 255 caracteres', async () => {
    const huge = 'a'.repeat(500)
    const payload = btoa(JSON.stringify({ sub: 'a@b.com', role: 'apprenant', name: huge }))
    const jwt = `aaaa.${payload}.cccc`
    apiRequest
      .mockResolvedValueOnce({ nonce: 'nonce-xyz' })
      .mockResolvedValueOnce({ accessToken: jwt })

    const session = await login({ email: 'a@b.com', password: 'x' })
    expect(session.user.name.length).toBeLessThanOrEqual(255)
  })

  it('supprime les caracteres de controle des champs string', async () => {
    const payload = btoa(JSON.stringify({ sub: 'a@b.com', role: 'apprenant', name: 'Jean\u0000\u001F' }))
    const jwt = `aaaa.${payload}.cccc`
    apiRequest
      .mockResolvedValueOnce({ nonce: 'nonce-xyz' })
      .mockResolvedValueOnce({ accessToken: jwt })

    const session = await login({ email: 'a@b.com', password: 'x' })
    expect(session.user.name).toBe('Jean')
  })

  it('propage les erreurs remontees par apiRequest', async () => {
    const err = new Error('Unauthorized')
    err.status = 401
    apiRequest.mockRejectedValueOnce(err)

    await expect(login({ email: 'a@b.com', password: 'x' })).rejects.toThrow('Unauthorized')
  })
})

describe('register', () => {
  it('sauvegarde la session apres une inscription reussie (sans token)', async () => {
    // Register ne retourne pas de token — juste un message
    apiRequest.mockResolvedValueOnce({ message: 'Utilisateur créé avec succès.' })

    const session = await register({
      prenom: 'Alice',
      nom: 'Martin',
      contact: '+261340000000',
      email: 'alice@test.com',
      password: 'Password123!',
      role: 'apprenant',
    })

    expect(session.user.name).toBe('Alice Martin')
    // Pas de token après register — c'est normal dans le flux SSO
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
  })

  it('construit le champ name depuis prenom+nom en fallback si API ne le renvoie pas', async () => {
    apiRequest.mockResolvedValueOnce({ message: 'ok' })

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

  it('propage les erreurs du serveur', async () => {
    const err = new Error('Erreur serveur')
    err.status = 500
    apiRequest.mockRejectedValueOnce(err)

    await expect(
      register({ prenom: 'A', nom: 'B', contact: 'c', email: 'e', password: 'p', role: 'apprenant' })
    ).rejects.toThrow('Erreur serveur')
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
    localStorage.setItem(USER_KEY, JSON.stringify({ id: 7, email: 'eve@test.com', role: 'formateur' }))
    const user = getStoredUser()
    expect(user).toMatchObject({ id: 7, email: 'eve@test.com', role: 'formateur' })
  })

  it('nettoie la session si le JSON stocke est corrompu', () => {
    localStorage.setItem(TOKEN_KEY, VALID_JWT)
    localStorage.setItem(USER_KEY, '{ ceci n est pas du JSON }')
    expect(getStoredUser()).toBeNull()
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
  })

  it('rejette un role inconnu et le remplace par apprenant', () => {
    localStorage.setItem(USER_KEY, JSON.stringify({ id: 1, role: 'hacker' }))
    expect(getStoredUser().role).toBe('apprenant')
  })
})

describe('getProfile', () => {
  it('retourne null si aucun token n est stocke', async () => {
    const user = await getProfile()
    expect(user).toBeNull()
    expect(apiRequest).not.toHaveBeenCalled()
  })

  it('appelle /api/profile avec le Bearer token et normalise la reponse', async () => {
    localStorage.setItem(TOKEN_KEY, VALID_JWT)
    apiRequest.mockResolvedValueOnce({
      user: { id: 5, email: 'max@test.com', role: 'formateur' },
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