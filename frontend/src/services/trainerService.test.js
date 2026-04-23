import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('./apiClient', () => ({ apiRequest: vi.fn() }))
vi.mock('./authService', () => ({
  getStoredToken: vi.fn(),
  getStoredUser: vi.fn(),
}))

import { apiRequest } from './apiClient'
import { getStoredToken, getStoredUser } from './authService'
import {
  getMyFormations,
  createFormation,
  updateFormation,
  deleteFormation,
} from './trainerService'

// ---------------------------------------------------------------------------
// Tests du service trainerService (dashboard formateur).
// Points cles :
//   - Filtrage des formations pour ne garder que celles du formateur connecte
//     (isolation des donnees !)
//   - Normalisation des formations (champs defauts, cast numerique, etc.)
//   - CRUD protege par token
// ---------------------------------------------------------------------------

beforeEach(() => {
  apiRequest.mockReset()
  getStoredToken.mockReset()
  getStoredUser.mockReset()
})

describe('getMyFormations', () => {
  it('retourne toutes les formations normalisees si l utilisateur n est pas identifie', async () => {
    getStoredUser.mockReturnValueOnce(null)
    apiRequest.mockResolvedValueOnce({ data: [{ id: 1, titre: 'A' }] })

    const result = await getMyFormations()
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ id: 1, titre: 'A' })
  })

  it('filtre pour ne garder QUE les formations du formateur connecte', async () => {
    getStoredUser.mockReturnValue({ id: 42 })
    apiRequest.mockResolvedValueOnce({
      data: [
        { id: 1, titre: 'A moi', formateur: { id: 42 } },
        { id: 2, titre: 'Autre', formateur: { id: 99 } },
        { id: 3, titre: 'Autre legacy', formateur_id: 99 },
        { id: 4, titre: 'A moi legacy', formateur_id: 42 },
      ],
    })

    const result = await getMyFormations()
    expect(result).toHaveLength(2)
    const titres = result.map((f) => f.titre)
    expect(titres).toContain('A moi')
    expect(titres).toContain('A moi legacy')
  })

  it('supporte un payload sous forme de tableau direct', async () => {
    getStoredUser.mockReturnValueOnce({ id: 1 })
    apiRequest.mockResolvedValueOnce([
      { id: 5, formateur: { id: 1 } },
    ])
    expect((await getMyFormations()).length).toBe(1)
  })

  it("normalise les champs manquants avec des valeurs par defaut", async () => {
    getStoredUser.mockReturnValueOnce(null)
    apiRequest.mockResolvedValueOnce({ data: [{ id: 1 }] })

    const [formation] = await getMyFormations()
    expect(formation).toMatchObject({
      id: 1,
      titre: '',
      description: '',
      niveau: 'Débutant',
      apprenants: 0,
      vues: 0,
    })
  })

  it('cast formateur_id / apprenants / vues depuis les champs alternatifs', async () => {
    getStoredUser.mockReturnValueOnce(null)
    apiRequest.mockResolvedValueOnce({
      data: [
        { id: 1, inscriptions_count: 10, nombre_de_vues: 200, formateur_id: 5 },
      ],
    })
    const [formation] = await getMyFormations()
    expect(formation.apprenants).toBe(10)
    expect(formation.vues).toBe(200)
    expect(formation.formateur_id).toBe(5)
  })
})

describe('createFormation', () => {
  it('POST /api/formations avec Authorization + body JSON', async () => {
    getStoredToken.mockReturnValueOnce('t')
    apiRequest.mockResolvedValueOnce({ formation: { id: 1, titre: 'X' } })

    const data = { titre: 'X', description: 'Y' }
    const result = await createFormation(data)

    expect(apiRequest).toHaveBeenCalledWith('/api/formations', {
      method: 'POST',
      headers: { Authorization: 'Bearer t' },
      body: JSON.stringify(data),
    })
    expect(result.id).toBe(1)
  })

  it('refuse l appel sans token', async () => {
    getStoredToken.mockReturnValueOnce(null)
    await expect(createFormation({})).rejects.toThrow('Utilisateur non connecté.')
  })
})

describe('updateFormation', () => {
  it('PUT /api/formations/:id avec Authorization', async () => {
    getStoredToken.mockReturnValueOnce('t')
    apiRequest.mockResolvedValueOnce({ formation: { id: 1 } })

    await updateFormation(1, { titre: 'New' })

    expect(apiRequest).toHaveBeenCalledWith('/api/formations/1', {
      method: 'PUT',
      headers: { Authorization: 'Bearer t' },
      body: JSON.stringify({ titre: 'New' }),
    })
  })
})

describe('deleteFormation', () => {
  it('DELETE /api/formations/:id avec Authorization', async () => {
    getStoredToken.mockReturnValueOnce('t')
    apiRequest.mockResolvedValueOnce({ message: 'ok' })

    await deleteFormation(1)

    expect(apiRequest).toHaveBeenCalledWith('/api/formations/1', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer t' },
    })
  })

  it('refuse la suppression sans token', async () => {
    getStoredToken.mockReturnValueOnce(null)
    await expect(deleteFormation(1)).rejects.toThrow('Utilisateur non connecté.')
  })
})
