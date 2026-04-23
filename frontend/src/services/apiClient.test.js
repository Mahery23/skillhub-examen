import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// On force VITE_API_BASE_URL avant l'import du module, car il evalue sa
// constante API_BASE_URL au chargement (top-level).
vi.stubEnv('VITE_API_BASE_URL', 'http://api.test')

// Import DYNAMIQUE apres le stubEnv : garantit que le module lit la bonne
// valeur de base URL.
const { apiRequest, parseJson } = await import('./apiClient')

// ---------------------------------------------------------------------------
// Tests du client HTTP central (apiClient).
// On mock la fonction globale `fetch` pour simuler les reponses de l API.
// Points couverts :
//   - Succes 200 avec JSON
//   - Erreur HTTP (4xx, 5xx) => throw avec le message et le status
//   - Erreur 401 => purge du localStorage (auto logout)
//   - Erreur reseau => throw avec status=0
//   - Redirection suspecte => throw
//   - parseJson tolere body vide et JSON invalide
// ---------------------------------------------------------------------------

const makeResponse = ({ status = 200, body = {}, redirected = false } = {}) => ({
  status,
  ok: status >= 200 && status < 300,
  redirected,
  text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
})

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
  window.localStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('apiRequest - succes', () => {
  it('construit l URL absolue a partir du path relatif', async () => {
    fetch.mockResolvedValueOnce(makeResponse({ body: { ok: true } }))

    const result = await apiRequest('/api/ping')

    expect(fetch).toHaveBeenCalledWith(
      'http://api.test/api/ping',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Accept: 'application/json',
        }),
      }),
    )
    expect(result).toEqual({ ok: true })
  })

  it('accepte un path sans slash initial', async () => {
    fetch.mockResolvedValueOnce(makeResponse({ body: {} }))
    await apiRequest('api/users')
    expect(fetch).toHaveBeenCalledWith('http://api.test/api/users', expect.any(Object))
  })

  it('fusionne les customHeaders fournis avec les defaults', async () => {
    fetch.mockResolvedValueOnce(makeResponse({ body: {} }))

    await apiRequest('/api/x', { headers: { Authorization: 'Bearer ABC' } })

    const [, options] = fetch.mock.calls[0]
    expect(options.headers.Authorization).toBe('Bearer ABC')
    expect(options.headers['Content-Type']).toBe('application/json')
  })

  it('retourne un objet vide pour un body vide', async () => {
    fetch.mockResolvedValueOnce(makeResponse({ body: '' }))
    const result = await apiRequest('/api/x')
    expect(result).toEqual({})
  })
})

describe('apiRequest - erreurs HTTP', () => {
  it('throw avec message et status sur 400', async () => {
    fetch.mockResolvedValueOnce(makeResponse({
      status: 400,
      body: { message: 'Champs invalides' },
    }))

    await expect(apiRequest('/api/x')).rejects.toMatchObject({
      status: 400,
      message: 'Champs invalides',
    })
  })

  it('throw avec message par defaut si body sans message', async () => {
    fetch.mockResolvedValueOnce(makeResponse({ status: 500, body: {} }))
    await expect(apiRequest('/api/x')).rejects.toThrow('Une erreur est survenue.')
  })

  it('attache error.details si le body contient un objet errors', async () => {
    fetch.mockResolvedValueOnce(makeResponse({
      status: 422,
      body: { message: 'Validation', errors: { email: ['Obligatoire'] } },
    }))

    try {
      await apiRequest('/api/x')
      expect.fail('aurait du throw')
    } catch (err) {
      expect(err.details).toEqual({ email: ['Obligatoire'] })
    }
  })

  it('nettoie le localStorage sur 401 (auto logout)', async () => {
    localStorage.setItem('skillhub_token', 'abc')
    localStorage.setItem('skillhub_user', '{}')

    fetch.mockResolvedValueOnce(makeResponse({ status: 401, body: {} }))

    await expect(apiRequest('/api/x')).rejects.toThrow()
    expect(localStorage.getItem('skillhub_token')).toBeNull()
    expect(localStorage.getItem('skillhub_user')).toBeNull()
  })
})

describe('apiRequest - erreurs reseau & redirection', () => {
  it('throw avec status=0 quand fetch leve une exception (DNS, offline...)', async () => {
    fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    try {
      await apiRequest('/api/x')
      expect.fail('aurait du throw')
    } catch (err) {
      expect(err.status).toBe(0)
      expect(err.message).toBe('Failed to fetch')
    }
  })

  it('throw si la reponse est redirigee (risque de session)', async () => {
    fetch.mockResolvedValueOnce(makeResponse({ status: 200, redirected: true, body: {} }))
    await expect(apiRequest('/api/x')).rejects.toThrow(/Redirection/)
  })
})

describe('parseJson', () => {
  it('retourne {} pour un body vide', async () => {
    const result = await parseJson({ text: async () => '' })
    expect(result).toEqual({})
  })

  it('retourne {} si le texte n est pas un JSON valide (pas de crash)', async () => {
    const result = await parseJson({ text: async () => '<html>' })
    expect(result).toEqual({})
  })

  it('parse un JSON valide', async () => {
    const result = await parseJson({ text: async () => '{"a":1}' })
    expect(result).toEqual({ a: 1 })
  })
})
