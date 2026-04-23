import { describe, it, expect } from 'vitest'
import {
  validateLoginInput,
  validateRegisterInput,
  validateFormationInput,
  validateModuleInput,
} from './validationService'

// ---------------------------------------------------------------------------
// Tests du service de validation des formulaires cote client.
// Ce service ne fait AUCUN appel reseau : ce sont des fonctions pures qui
// retournent un tableau d'erreurs (vide = formulaire valide). C'est le
// scenario ideal pour des tests unitaires rapides et nombreux.
// ---------------------------------------------------------------------------

describe('validationService.validateLoginInput', () => {
  it('ne retourne aucune erreur pour un email et un mot de passe valides', () => {
    const errors = validateLoginInput({ email: 'user@test.com', password: 'anything' })
    expect(errors).toEqual([])
  })

  it('signale un email manquant', () => {
    const errors = validateLoginInput({ email: '', password: 'pwd' })
    expect(errors).toContain('Email obligatoire.')
  })

  it('signale un email mal forme', () => {
    const errors = validateLoginInput({ email: 'pas-un-email', password: 'pwd' })
    expect(errors).toContain('Format email invalide.')
  })

  it('signale un email trop long (>120)', () => {
    const longEmail = `${'a'.repeat(115)}@test.com`
    const errors = validateLoginInput({ email: longEmail, password: 'pwd' })
    expect(errors).toContain('Email trop long (max 120 caractères).')
  })

  it('signale un mot de passe manquant', () => {
    const errors = validateLoginInput({ email: 'user@test.com', password: '' })
    expect(errors).toContain('Mot de passe obligatoire.')
  })

  it("trim l'email avant de le valider", () => {
    const errors = validateLoginInput({ email: '  user@test.com  ', password: 'pwd' })
    expect(errors).toEqual([])
  })
})

describe('validationService.validateRegisterInput', () => {
  const validPayload = {
    prenom: 'Jean',
    nom: 'Dupont',
    contact: '+261340000000',
    email: 'jean@test.com',
    password: 'Password123!',
    role: 'apprenant',
  }

  it('accepte un payload complet et valide', () => {
    expect(validateRegisterInput(validPayload)).toEqual([])
  })

  it('rejette un prenom trop court', () => {
    const errors = validateRegisterInput({ ...validPayload, prenom: 'J' })
    expect(errors).toContain('Le prénom doit contenir entre 2 et 80 caractères.')
  })

  it('rejette un prenom avec des caracteres interdits', () => {
    const errors = validateRegisterInput({ ...validPayload, prenom: 'Jean<script>' })
    expect(errors).toContain('Le prénom contient des caractères non autorisés.')
  })

  it('accepte un prenom avec accents et apostrophe', () => {
    const errors = validateRegisterInput({ ...validPayload, prenom: "Éloïse d'Artagnan" })
    expect(errors).toEqual([])
  })

  it('rejette un nom vide', () => {
    const errors = validateRegisterInput({ ...validPayload, nom: '   ' })
    expect(errors).toContain('Nom obligatoire.')
  })

  it('rejette un contact invalide', () => {
    const errors = validateRegisterInput({ ...validPayload, contact: 'abc' })
    expect(errors).toContain('Numéro de téléphone invalide.')
  })

  it('rejette un mot de passe trop court', () => {
    const errors = validateRegisterInput({ ...validPayload, password: 'Aa1!' })
    expect(errors).toContain('Le mot de passe doit contenir entre 8 et 64 caractères.')
  })

  it('rejette un mot de passe sans majuscule ni minuscule', () => {
    const errors = validateRegisterInput({ ...validPayload, password: '12345678!' })
    expect(errors).toContain('Le mot de passe doit contenir une minuscule et une majuscule.')
  })

  it('rejette un mot de passe sans chiffre', () => {
    const errors = validateRegisterInput({ ...validPayload, password: 'Password!!' })
    expect(errors).toContain('Le mot de passe doit contenir au moins un chiffre.')
  })

  it('rejette un mot de passe sans caractere special', () => {
    const errors = validateRegisterInput({ ...validPayload, password: 'Password123' })
    expect(errors).toContain('Le mot de passe doit contenir au moins un caractère spécial.')
  })

  it("rejette un mot de passe contenant des espaces", () => {
    const errors = validateRegisterInput({ ...validPayload, password: 'Pass word1!' })
    expect(errors).toContain("Le mot de passe ne doit pas contenir d'espace.")
  })

  it('rejette un role non autorise (ex: admin)', () => {
    const errors = validateRegisterInput({ ...validPayload, role: 'admin' })
    expect(errors).toContain('Rôle invalide.')
  })

  it('accepte le role formateur', () => {
    const errors = validateRegisterInput({ ...validPayload, role: 'formateur' })
    expect(errors).toEqual([])
  })
})

describe('validationService.validateFormationInput', () => {
  const validFormation = {
    titre: 'Introduction a React',
    description: 'Une description detaillee qui fait plus de vingt caracteres pour etre valide.',
  }

  it('accepte un titre et une description valides', () => {
    expect(validateFormationInput(validFormation)).toEqual([])
  })

  it('rejette un titre trop court', () => {
    const errors = validateFormationInput({ ...validFormation, titre: 'Hi' })
    expect(errors).toContain('Le titre doit contenir entre 3 et 120 caractères.')
  })

  it('rejette un titre avec des caracteres dangereux (XSS)', () => {
    const errors = validateFormationInput({ ...validFormation, titre: 'React <script>' })
    // Selon le regex, les caracteres interdits declenchent les deux messages :
    // "caracteres non autorises" (via TEXT_REGEX) ou (via hasUnsafeCharacters).
    // On verifie au minimum qu'il y a une erreur.
    expect(errors.length).toBeGreaterThan(0)
  })

  it('rejette une description trop courte', () => {
    const errors = validateFormationInput({ ...validFormation, description: 'Trop court' })
    expect(errors).toContain('La description doit contenir entre 20 et 2000 caractères.')
  })

  it('rejette une description avec des caracteres dangereux', () => {
    const errors = validateFormationInput({
      ...validFormation,
      description: `Description contenant ${'x'.repeat(20)} <script>`,
    })
    expect(errors).toContain('La description contient des caractères non autorisés.')
  })
})

describe('validationService.validateModuleInput', () => {
  const validModule = {
    titre: 'Module 1',
    contenu: "Un contenu pedagogique qui fait au moins vingt caracteres pour etre accepte.",
    ordre: 1,
  }

  it('accepte un module complet et valide', () => {
    expect(validateModuleInput(validModule)).toEqual([])
  })

  it('rejette un ordre manquant ou non numerique', () => {
    const errors = validateModuleInput({ ...validModule, ordre: 'abc' })
    expect(errors).toContain('Position du module invalide.')
  })

  it("rejette un ordre inferieur a 1", () => {
    const errors = validateModuleInput({ ...validModule, ordre: 0 })
    expect(errors).toContain('Position du module invalide.')
  })

  it('rejette un titre de module trop court', () => {
    const errors = validateModuleInput({ ...validModule, titre: 'X' })
    expect(errors).toContain('Le titre du module doit contenir entre 3 et 120 caractères.')
  })

  it('rejette un contenu de module trop court', () => {
    const errors = validateModuleInput({ ...validModule, contenu: 'Court' })
    expect(errors).toContain('Le contenu du module doit contenir entre 20 et 5000 caractères.')
  })
})
