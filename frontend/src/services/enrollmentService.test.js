import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('./apiClient', () => ({ apiRequest: vi.fn() }))
vi.mock('./authService', () => ({ getStoredToken: vi.fn() }))

import { apiRequest } from './apiClient'
import { getStoredToken } from './authService'
import {
  getMyFormations,
  enrollInFormation,
  unenrollFromFormation,
} from './enrollmentService'

// ---------------------------------------------------------------------------
// Tests du service d'inscription (cote apprenant). On verifie :
//   - L'ajout du header Authorization Bearer
//   - Le refus si aucun token (securite)
//   - La normalisation de la reponse /apprenant/formations
//   - Les methodes POST / DELETE pour l'inscription / desinscription
// ---------------------------------------------------------------------------

beforeEach(() => {
  apiRequest.mockReset()
  getStoredToken.mockReset()
})

describe('getMyFormations', () => {
  it('refuse l appel si l utilisateur n a pas de token', async () => {
    getStoredToken.mockReturnValueOnce(null)
    await expect(getMyFormations()).rejects.toThrow('Utilisateur non connecté.')
    expect(apiRequest).not.toHaveBeenCalled()
  })

  it("envoie le header Authorization avec le token stocke", async () => {
    getStoredToken.mockReturnValueOnce('my-token')
    apiRequest.mockResolvedValueOnce({ formations: [] })

    await getMyFormations()

    expect(apiRequest).toHaveBeenCalledWith('/api/apprenant/formations', {
      headers: { Authorization: 'Bearer my-token' },
    })
  })

  it('normalise la liste avec enrollment_id / progression / formation', async () => {
    getStoredToken.mockReturnValueOnce('t')
    apiRequest.mockResolvedValueOnce({
      formations: [
        { enrollment_id: 7, progression: 42, formation: { id: 1, titre: 'X' } },
      ],
    })

    const result = await getMyFormations()
    expect(result).toEqual([
      {
        enrollment_id: 7,
        progression: 42,
        date_inscription: null,
        formation: { id: 1, titre: 'X' },
      },
    ])
  })

  it('accepte plusieurs formats de reponse (data / array direct)', async () => {
    getStoredToken.mockReturnValue('t')

    apiRequest.mockResolvedValueOnce({ data: [{ id: 1 }] })
    expect((await getMyFormations())).toHaveLength(1)

    apiRequest.mockResolvedValueOnce([{ id: 1 }, { id: 2 }])
    expect((await getMyFormations())).toHaveLength(2)
  })

  it('retourne un tableau vide quand la reponse est inattendue', async () => {
    getStoredToken.mockReturnValueOnce('t')
    apiRequest.mockResolvedValueOnce({ other: true })
    expect(await getMyFormations()).toEqual([])
  })
})

describe('enrollInFormation', () => {
  it('envoie un POST /api/formations/:id/inscription avec Authorization', async () => {
    getStoredToken.mockReturnValueOnce('t')
    apiRequest.mockResolvedValueOnce({ ok: true })

    await enrollInFormation(42)

    expect(apiRequest).toHaveBeenCalledWith('/api/formations/42/inscription', {
      method: 'POST',
      headers: { Authorization: 'Bearer t' },
    })
  })

  it("echoue si l utilisateur n est pas connecte", async () => {
    getStoredToken.mockReturnValueOnce(null)
    await expect(enrollInFormation(42)).rejects.toThrow('Utilisateur non connecté.')
  })
})

describe('unenrollFromFormation', () => {
  it('envoie un DELETE /api/formations/:id/inscription', async () => {
    getStoredToken.mockReturnValueOnce('t')
    apiRequest.mockResolvedValueOnce({ ok: true })

    await unenrollFromFormation(99)

    expect(apiRequest).toHaveBeenCalledWith('/api/formations/99/inscription', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer t' },
    })
  })

  it('echoue si l utilisateur n est pas connecte', async () => {
    getStoredToken.mockReturnValueOnce(null)
    await expect(unenrollFromFormation(99)).rejects.toThrow('Utilisateur non connecté.')
  })
})
