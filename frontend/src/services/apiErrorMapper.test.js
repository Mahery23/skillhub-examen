import { describe, it, expect } from 'vitest'
import { mapApiError, mapValidationErrors } from './apiErrorMapper'

// ---------------------------------------------------------------------------
// Tests du service qui transforme les erreurs API (HTTP + reseau) en messages
// lisibles pour l'utilisateur. Pas de dependance externe : fonctions pures.
// ---------------------------------------------------------------------------

describe('mapApiError - erreurs reseau', () => {
  it('detecte une erreur reseau via status=0', () => {
    const msg = mapApiError({ status: 0, message: 'network down' })
    expect(msg).toBe('Impossible de joindre le serveur. Vérifiez que le backend est démarré.')
  })

  it('detecte une erreur reseau via message "failed to fetch"', () => {
    const msg = mapApiError({ message: 'Failed to fetch' })
    expect(msg).toBe('Impossible de joindre le serveur. Vérifiez que le backend est démarré.')
  })

  it('detecte une erreur reseau contenant "network" dans le message', () => {
    const msg = mapApiError({ message: 'NetworkError when attempting to fetch' })
    expect(msg).toBe('Impossible de joindre le serveur. Vérifiez que le backend est démarré.')
  })
})

describe('mapApiError - statuts HTTP', () => {
  it('renvoie un message specifique pour 401 en contexte login', () => {
    expect(mapApiError({ status: 401 }, 'login')).toBe('Email ou mot de passe incorrect.')
  })

  it('renvoie un message specifique pour 401 en contexte register', () => {
    expect(mapApiError({ status: 401 }, 'register')).toBe(
      "Session invalide pendant l'inscription. Veuillez réessayer.",
    )
  })

  it('renvoie un message generique pour 401 sans contexte', () => {
    expect(mapApiError({ status: 401 })).toBe('Session expirée. Veuillez vous reconnecter.')
  })

  it('renvoie "Accès refusé" pour 403', () => {
    expect(mapApiError({ status: 403 })).toBe('Accès refusé pour ce compte.')
  })

  it('renvoie un message specifique pour 422 en contexte register', () => {
    expect(mapApiError({ status: 422 }, 'register')).toBe(
      'Inscription invalide. Vérifiez les champs du formulaire.',
    )
  })

  it('renvoie un message specifique pour 422 en contexte login', () => {
    expect(mapApiError({ status: 422 }, 'login')).toBe(
      'Connexion invalide. Vérifiez votre email et mot de passe.',
    )
  })

  it('renvoie un message generique pour 422 sans contexte', () => {
    expect(mapApiError({ status: 422 })).toBe('Données invalides. Vérifiez votre saisie.')
  })

  it('detecte un conflit 409', () => {
    expect(mapApiError({ status: 409 })).toBe('Conflit détecté: cette action a déjà été effectuée.')
  })

  it('detecte le rate limiting 429', () => {
    expect(mapApiError({ status: 429 })).toBe('Trop de tentatives. Réessayez dans quelques instants.')
  })

  it('renvoie un message serveur pour 500+', () => {
    expect(mapApiError({ status: 500 })).toBe('Erreur serveur. Réessayez plus tard.')
    expect(mapApiError({ status: 503 })).toBe('Erreur serveur. Réessayez plus tard.')
  })

  it('retombe sur error.message si le statut n est pas gere', () => {
    expect(mapApiError({ status: 418, message: 'Je suis une theiere' })).toBe('Je suis une theiere')
  })

  it('retombe sur un message par defaut si tout est vide', () => {
    expect(mapApiError({})).toBe('Une erreur est survenue.')
  })
})

describe('mapValidationErrors', () => {
  it('retourne un tableau vide pour une entree nulle ou non objet', () => {
    expect(mapValidationErrors(null)).toEqual([])
    expect(mapValidationErrors(undefined)).toEqual([])
    expect(mapValidationErrors('string')).toEqual([])
  })

  it('aplatit un objet de type Laravel validator (array de messages par champ)', () => {
    const details = {
      email: ['Email requis.', 'Email invalide.'],
      password: ['Mot de passe trop court.'],
    }
    const result = mapValidationErrors(details)
    expect(result).toEqual([
      'email: Email requis.',
      'email: Email invalide.',
      'password: Mot de passe trop court.',
    ])
  })

  it('gere les valeurs string (pas de tableau)', () => {
    const details = { email: 'Email requis.' }
    expect(mapValidationErrors(details)).toEqual(['email: Email requis.'])
  })

  it('ignore les valeurs de type inattendu (ni array ni string)', () => {
    const details = { email: { nested: true } }
    expect(mapValidationErrors(details)).toEqual([])
  })
})
