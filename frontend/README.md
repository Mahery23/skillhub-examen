# Frontend SkillHub (React + Vite)

Application frontend de SkillHub: interface apprenant/formateur, navigation, modales d'authentification et consommation de l'API Laravel.

## Sommaire

- [Stack frontend](#stack-frontend)
- [Structure du dossier](#structure-du-dossier)
- [Prerequis](#prerequis)
- [Installation et lancement](#installation-et-lancement)
- [Configuration environnement](#configuration-environnement)
- [Scripts utiles](#scripts-utiles)
- [Architecture applicative](#architecture-applicative)
- [Pages principales](#pages-principales)
- [Roles et responsabilites](#roles-et-responsabilites)
- [Gestion des modules formateur](#gestion-des-modules-formateur)
- [Services API](#services-api)
- [Validation client](#validation-client)
- [Gestion de session](#gestion-de-session)
- [Conventions equipe](#conventions-equipe)
- [Depannage](#depannage)

## Stack frontend

- React 19
- React Router
- React Bootstrap + Bootstrap 5
- Bootstrap Icons
- Vite 8
- ESLint

## Structure du dossier

```
frontend/
├── src/
│   ├── components/     # Composants globaux (Navbar, Footer)
│   ├── modals/         # Login/Register/ModuleModal
│   ├── pages/          # Pages metier
│   ├── services/       # Clients API + mapping erreurs
│   ├── App.jsx         # Routing principal + session utilisateur
│   └── main.jsx        # Point d'entree React
├── public/
├── index.html
└── vite.config.js
```

## Prerequis

- Node.js 18+
- npm 9+
- Backend SkillHub en cours d'execution

## Installation et lancement

```bash
cd frontend
npm install
npm run dev
```

Build production:

```bash
npm run build
```

Preview build local:

```bash
npm run preview
```

## Configuration environnement

Le frontend lit `VITE_API_BASE_URL` depuis `frontend/.env`.

Exemple:

```dotenv
VITE_API_BASE_URL=http://localhost:8000
```

Important:

- `http://localhost:5173` pour le frontend (Vite)
- `http://localhost:8000` pour le backend (Laravel)

## Scripts utiles

- `npm run dev` : serveur de dev
- `npm run build` : build de production
- `npm run preview` : preview du build
- `npm run lint` : verifications lint

## Architecture applicative

Le routage est centralise dans `src/App.jsx`.

- Gestion de session utilisateur (login/register/logout)
- Redirection post-auth en fonction du role
- Timeout d'inactivite (deconnexion automatique apres delai configure)

Les pages consomment l'API via `src/services/*` et ne parlent pas directement a `fetch`.

## Pages principales

- `/` : accueil
- `/formations` : catalogue
- `/formation/:id` : detail formation
- `/dashboard/formateur` : CRUD formations formateur + gestion des modules
- `/dashboard/apprenant` : suivi des formations apprenant
- `/apprendre/:id` : lecture des modules

## Roles et responsabilites

Cette section clarifie qui fait quoi a la fois dans l'application et dans l'equipe projet.

### Roles applicatifs (dans le frontend)

| Role | Ce que l'utilisateur voit/can faire dans l'UI | Ecrans principaux |
|---|---|---|
| `formateur` | Acceder au dashboard formateur, creer/modifier/supprimer ses formations, gerer ses modules | `/dashboard/formateur`, `/formation/:id` |
| `apprenant` | Parcourir le catalogue, s'inscrire/se desinscrire, suivre sa progression | `/formations`, `/dashboard/apprenant`, `/apprendre/:id` |

## Gestion des modules formateur

Depuis `/dashboard/formateur`, le bouton `Modules` sur chaque carte formation ouvre une modale de gestion complete.

Fonctionnalites disponibles:

- lister les modules d'une formation,
- ajouter un module (titre, contenu, ordre),
- modifier un module existant,
- supprimer un module (avec confirmation).

Composants/frontend concernes:

- `src/pages/DashboardFormateur.jsx` : UI de gestion modules + actions CRUD
- `src/modals/ModuleModal.jsx` : modale reusable de saisie module

### Roles equipe Bloc 03 (organisation du travail)

| Role | Responsabilites cote frontend | Resultat attendu |
|---|---|---|
| **Cloud Architect** | Verifier que les contraintes UI sont compatibles avec l'architecture cible (routes, endpoints, flux) | Cohesion frontend/back dans les diagrammes C4 et le rapport |
| **DevOps Engineer** | Dockeriser le frontend (build multi-stage, Nginx), integrer le build frontend dans CI/CD | `frontend/Dockerfile` fiable + etape build frontend dans pipeline |
| **Tech Lead** | Garantir la coherence UI/API, relire les PR, faire respecter conventions et qualite | PR front relues, conventions respectees, incidents d'integration reduits |

### Regles simples de collaboration

- Toute evolution frontend passe par `feature/*` puis Pull Request vers `develop`.
- Les commits suivent `Conventional Commits` (`feat:`, `fix:`, `docs:`, `ci:`, `docker:`...).
- Avant push: verifier `npm run build` pour eviter les regressions.
- Les changements API attendus doivent etre notes dans la PR (endpoint, payload, erreurs).

## Services API

Fichiers principaux:

- `src/services/apiClient.js` : requetes HTTP, headers communs, gestion erreurs
- `src/services/apiErrorMapper.js` : mapping erreurs API -> messages UX
- `src/services/validationService.js` : regles de validation client (auth, formations, modules)
- `src/services/authService.js` : login, register, profile, logout
- `src/services/formationService.js` : catalogue + detail + modules
- `src/services/trainerService.js` : CRUD formateur
- `src/services/moduleService.js` : CRUD modules formateur (`getFormationModules`, `createModule`, `updateModule`, `deleteModule`)
- `src/services/enrollmentService.js` : inscriptions apprenant

## Validation client

Le frontend applique une validation locale avant les appels API pour ameliorer le feedback utilisateur.

Regles principales en place:

- Authentification: format email, mot de passe avec longueur minimale/maximale et complexite requise.
- Inscription:
  - le prenom est obligatoire,
  - le nom est obligatoire,
  - le telephone est obligatoire (champ `contact`),
  - l'email doit etre valide,
  - le mot de passe doit respecter les regles de securite,
  - le role doit etre explicite et limite aux valeurs attendues (`apprenant` ou `formateur`).
- Dashboard formateur: validation des champs formation (titre, description) et modules (titre, contenu, ordre).

Les messages de validation sont affiches dans les modales/formulaires avant envoi au backend.

Contrat frontend/backend d'inscription:

- Le frontend envoie: `prenom`, `nom`, `contact`, `email`, `password`, `role`.
- Le backend retourne un utilisateur enrichi avec `name`, `prenom`, `nom`, `contact`.

## Gestion de session

- Token JWT stocke en localStorage (`skillhub_token`)
- User stocke en localStorage (`skillhub_user`)
- Timestamp activite utilisateur stocke (`skillhub_last_activity`)
- Deconnexion automatique apres inactivite (voir logique dans `App.jsx`)

## Conventions equipe

- Garder les appels API dans `services/`
- Eviter la logique metier backend directement dans les composants UI
- Utiliser `mapApiError` pour les messages utilisateur
- Ajouter/mettre a jour `PropTypes` sur les composants reusables
- Verifier `npm run build` avant push

## Depannage

### 1) Failed to fetch

- Verifier que le backend tourne
- Verifier `VITE_API_BASE_URL` dans `frontend/.env`
- Verifier la config CORS backend

### 2) 401 Unauthorized

- Verifier token valide
- Se reconnecter si session expiree
- Verifier role (formateur/apprenant) selon la route

### 3) Donnees non affichees dans un dashboard

- Verifier qu'il existe des donnees cote backend (formations/inscriptions)
- Verifier les reponses reseau dans DevTools > Network

---

Pour la vue globale du projet, consultez `../README.md`.
Pour la partie API/backend, consultez `../backend/README.md`.
