import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Nettoyage du DOM rendu par React Testing Library entre chaque test
// pour garantir l'isolation et éviter les fuites d'état entre cas de test.
afterEach(() => {
  cleanup()
})

// On réinitialise le localStorage avant chaque test car plusieurs services
// (authService en particulier) y écrivent / y lisent des données.
// Sans ça, un test pourrait voir le token d'un test précédent.
beforeEach(() => {
  window.localStorage.clear()
  window.sessionStorage.clear()
  vi.restoreAllMocks()
})
