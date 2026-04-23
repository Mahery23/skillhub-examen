import { describe, it, expect } from 'vitest'

// Test de vérification que l'environnement Vitest + jsdom est correctement
// configuré. Si ce test passe, cela garantit que :
//   - Vitest s'exécute
//   - L'environnement jsdom expose `window`, `document`, `localStorage`
//   - Les helpers globaux (describe/it/expect) sont accessibles
describe('Environnement de test Vitest', () => {
  it('expose jsdom avec window et document', () => {
    expect(typeof window).toBe('object')
    expect(typeof document).toBe('object')
  })

  it('expose un localStorage fonctionnel et isolé entre tests', () => {
    window.localStorage.setItem('foo', 'bar')
    expect(window.localStorage.getItem('foo')).toBe('bar')
  })

  it('ne conserve pas le localStorage du test précédent (isolation)', () => {
    expect(window.localStorage.getItem('foo')).toBeNull()
  })
})
