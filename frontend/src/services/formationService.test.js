import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('./apiClient', () => ({
  apiRequest: vi.fn(),
}))

import { apiRequest } from './apiClient'
import { getFormations, getFormation, getFormationModules } from './formationService'

// ---------------------------------------------------------------------------
// Tests du service formationService (lecture publique des formations).
// On verifie :
//   - Construction correcte de la query string (filtres)
//   - Normalisation des reponses API (array direct, cle "data", absent)
//   - Gestion des differents formats de reponse pour la detail / modules
// ---------------------------------------------------------------------------

beforeEach(() => {
  apiRequest.mockReset()
})

describe('getFormations', () => {
  it('appelle /api/formations sans query string quand aucun filtre', async () => {
    apiRequest.mockResolvedValueOnce([])
    await getFormations()
    expect(apiRequest).toHaveBeenCalledWith('/api/formations')
  })

  it('ajoute les filtres recherche / categorie / niveau a la query string', async () => {
    apiRequest.mockResolvedValueOnce([])
    await getFormations({ recherche: 'react', categorie: 'Dev Web', niveau: 'Intermédiaire' })
    expect(apiRequest).toHaveBeenCalledWith(
      expect.stringContaining('/api/formations?'),
    )
    const [url] = apiRequest.mock.calls[0]
    expect(url).toContain('search=react')
    expect(url).toContain('categorie=Dev+Web')
    expect(url).toContain('niveau=Interm')
  })

  it('ignore "Toutes" comme categorie et "Tous" comme niveau (valeurs par defaut du filtre)', async () => {
    apiRequest.mockResolvedValueOnce([])
    await getFormations({ categorie: 'Toutes', niveau: 'Tous' })
    expect(apiRequest).toHaveBeenCalledWith('/api/formations')
  })

  it('retourne le payload directement quand l API renvoie un tableau', async () => {
    const data = [{ id: 1 }, { id: 2 }]
    apiRequest.mockResolvedValueOnce(data)
    const result = await getFormations()
    expect(result).toEqual(data)
  })

  it('extrait payload.data quand l API utilise une enveloppe', async () => {
    const data = [{ id: 3 }]
    apiRequest.mockResolvedValueOnce({ data })
    const result = await getFormations()
    expect(result).toEqual(data)
  })

  it('retourne un tableau vide pour un format inattendu', async () => {
    apiRequest.mockResolvedValueOnce({ unexpected: true })
    expect(await getFormations()).toEqual([])
  })
})

describe('getFormation', () => {
  it('retourne payload.formation quand present', async () => {
    const formation = { id: 5, titre: 'React' }
    apiRequest.mockResolvedValueOnce({ formation })
    expect(await getFormation(5)).toEqual(formation)
  })

  it('retourne le payload directement si pas d enveloppe formation', async () => {
    const payload = { id: 5, titre: 'React' }
    apiRequest.mockResolvedValueOnce(payload)
    expect(await getFormation(5)).toEqual(payload)
  })

  it('retourne null si payload vide', async () => {
    apiRequest.mockResolvedValueOnce(null)
    expect(await getFormation(5)).toBeNull()
  })
})

describe('getFormationModules', () => {
  it('retourne les modules si present dans l enveloppe', async () => {
    apiRequest.mockResolvedValueOnce({ modules: [{ id: 1 }] })
    expect(await getFormationModules(1)).toEqual([{ id: 1 }])
  })

  it('retourne un tableau vide pour une reponse inattendue', async () => {
    apiRequest.mockResolvedValueOnce({ other: true })
    expect(await getFormationModules(1)).toEqual([])
  })
})
