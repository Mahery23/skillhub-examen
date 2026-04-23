import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('./apiClient', () => ({ apiRequest: vi.fn() }))
vi.mock('./authService', () => ({ getStoredToken: vi.fn() }))

import { apiRequest } from './apiClient'
import { getStoredToken } from './authService'
import {
  getFormationModules,
  createModule,
  updateModule,
  deleteModule,
} from './moduleService'

// ---------------------------------------------------------------------------
// Tests du service moduleService (CRUD des modules, cote formateur).
// Points couverts :
//   - Lecture publique (pas de header auth)
//   - CRUD qui exige un token (lance une erreur sinon)
//   - Extraction de payload.module ou lancement d'erreur propre
// ---------------------------------------------------------------------------

beforeEach(() => {
  apiRequest.mockReset()
  getStoredToken.mockReset()
})

describe('getFormationModules (lecture publique)', () => {
  it('ne requiert PAS de token et retourne les modules', async () => {
    apiRequest.mockResolvedValueOnce({ modules: [{ id: 1 }, { id: 2 }] })
    const result = await getFormationModules(10)
    expect(result).toEqual([{ id: 1 }, { id: 2 }])
    expect(getStoredToken).not.toHaveBeenCalled()
  })

  it('retourne un tableau vide pour un payload sans modules', async () => {
    apiRequest.mockResolvedValueOnce({})
    expect(await getFormationModules(10)).toEqual([])
  })
})

describe('createModule', () => {
  it('POST le body et retourne le module cree', async () => {
    getStoredToken.mockReturnValueOnce('t')
    apiRequest.mockResolvedValueOnce({ module: { id: 1, titre: 'M1' } })

    const data = { titre: 'M1', contenu: 'contenu long', ordre: 1 }
    const result = await createModule(10, data)

    expect(apiRequest).toHaveBeenCalledWith('/api/formations/10/modules', {
      method: 'POST',
      headers: { Authorization: 'Bearer t' },
      body: JSON.stringify(data),
    })
    expect(result).toEqual({ id: 1, titre: 'M1' })
  })

  it("lance une erreur si l API repond sans champ module", async () => {
    getStoredToken.mockReturnValueOnce('t')
    apiRequest.mockResolvedValueOnce({ message: 'Echec metier' })

    await expect(createModule(10, {})).rejects.toThrow('Echec metier')
  })

  it('refuse la creation sans token', async () => {
    getStoredToken.mockReturnValueOnce(null)
    await expect(createModule(10, {})).rejects.toThrow('Utilisateur non connecté.')
  })
})

describe('updateModule', () => {
  it('PUT /api/modules/:id avec body et Authorization', async () => {
    getStoredToken.mockReturnValueOnce('t')
    apiRequest.mockResolvedValueOnce({ module: { id: 5 } })

    const data = { titre: 'New' }
    await updateModule(5, data)

    expect(apiRequest).toHaveBeenCalledWith('/api/modules/5', {
      method: 'PUT',
      headers: { Authorization: 'Bearer t' },
      body: JSON.stringify(data),
    })
  })

  it("lance une erreur si l API ne renvoie pas le module", async () => {
    getStoredToken.mockReturnValueOnce('t')
    apiRequest.mockResolvedValueOnce({})
    await expect(updateModule(5, {})).rejects.toThrow('Erreur lors de la modification du module.')
  })
})

describe('deleteModule', () => {
  it('DELETE /api/modules/:id avec Authorization', async () => {
    getStoredToken.mockReturnValueOnce('t')
    apiRequest.mockResolvedValueOnce({ message: 'ok' })

    const result = await deleteModule(5)

    expect(apiRequest).toHaveBeenCalledWith('/api/modules/5', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer t' },
    })
    expect(result).toEqual({ message: 'ok' })
  })

  it('refuse la suppression sans token', async () => {
    getStoredToken.mockReturnValueOnce(null)
    await expect(deleteModule(5)).rejects.toThrow('Utilisateur non connecté.')
  })
})
