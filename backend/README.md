# Backend SkillHub (Laravel API)

Backend API de SkillHub: authentification JWT, catalogue de formations, modules, et inscriptions apprenants.

## Sommaire

- [Stack technique](#stack-technique)
- [Structure du backend](#structure-du-backend)
- [Prerequis](#prerequis)
- [Installation rapide](#installation-rapide)
- [Configuration `.env`](#configuration-env)
- [Lancer le projet](#lancer-le-projet)
- [Scripts utiles](#scripts-utiles)
- [Routes API principales](#routes-api-principales)
- [Auth et roles](#auth-et-roles)
- [Roles et responsabilites](#roles-et-responsabilites)
- [Base de donnees et migrations](#base-de-donnees-et-migrations)
- [MongoDB et logs d'activite](#mongodb-et-logs-dactivite)
- [Regle compteur de vues](#regle-compteur-de-vues)
- [Tests et qualite](#tests-et-qualite)
- [Documentation API (OpenAPI)](#documentation-api-openapi)
- [Depannage](#depannage)

## Stack technique

- PHP `^8.3`
- Laravel `^13`
- JWT: `php-open-source-saver/jwt-auth`
- MySQL (donnees applicatives)
- MongoDB (logs d'activite / audit)
- PHPUnit `^12` (tests)

## Structure du backend

Repertoires importants:

- `app/Http/Controllers/Api` : endpoints API (`AuthController`, `FormationController`, `ModuleController`, `EnrollmentController`)
- `app/Http/Middleware/CheckRole.php` : controle des roles (`formateur`, `apprenant`)
- `routes/api.php` : declaration des routes API
- `database/migrations` : schema SQL
- `database/seeders` : donnees de test
- `docs/openapi.yaml` : spec OpenAPI 3.0

## Prerequis

- PHP 8.3+
- Composer 2+
- MySQL 8+ (ou MariaDB compatible)
- MongoDB Community Server (service Windows)
- MongoDB Compass (recommande pour visualiser les logs)
- mongosh (shell MongoDB, utile pour diagnostic)
- Node.js 18+ (pour assets Vite)

## Installation rapide

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan jwt:secret
```

Puis configurer la base dans `.env` et lancer les migrations:

```bash
php artisan migrate
php artisan db:seed
```

## Configuration `.env`

Exemple minimal MySQL:

```dotenv
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=skillhub
DB_USERNAME=root
DB_PASSWORD=

AUTH_GUARD=api
JWT_SECRET=... # genere via php artisan jwt:secret
```

Le projet contient aussi une connexion `mongodb` dans `config/database.php` (base par defaut: `skillhub_logs`).

## Lancer le projet

Mode simple:

```bash
php artisan serve
```

Mode dev complet (serveur + queue + logs + vite):

```bash
composer run dev
```

## Scripts utiles

Scripts declares dans `composer.json`:

- `composer run setup` : installation + `.env` + key + migration + build
- `composer run dev` : environnement dev complet
- `composer run test` : clear config + tests Laravel

## Routes API principales

Les routes sont definies dans `routes/api.php`.

Public:

- `POST /api/register`
- `POST /api/login`
- `GET /api/formations`
- `GET /api/formations/{formation}`
- `GET /api/formations/{formation}/modules`

Payload attendu pour `POST /api/register`:

- `prenom` (obligatoire)
- `nom` (obligatoire)
- `contact` (obligatoire, numero de telephone)
- `email` (obligatoire, unique)
- `password` (obligatoire)
- `role` (obligatoire: `apprenant` ou `formateur`)

Reponse utilisateur (`register`, `login`, `profile`) inclut maintenant:

- `name` (concat `prenom + nom`)
- `prenom`
- `nom`
- `contact`
- `email`, `role`, `date_creation`

Note metier sur `GET /api/formations/{formation}`:

- Incremente le compteur de vues uniquement si le visiteur est eligible.
- Le formateur proprietaire de la formation n'augmente pas ses propres vues.
- Un cooldown de 15 minutes par visiteur est applique pour eviter les increments en rafraichissement rapide.

Protegees JWT:

- `GET /api/profile`
- `POST /api/logout`

Formateur (`check.role:formateur`):

- `POST /api/formations`
- `PUT /api/formations/{formation}`
- `DELETE /api/formations/{formation}`
- `POST /api/formations/{formation}/modules`
- `PUT /api/modules/{module}`
- `DELETE /api/modules/{module}`

Apprenant (`check.role:apprenant`):

- `POST /api/formations/{formation}/inscription`
- `DELETE /api/formations/{formation}/inscription`
- `GET /api/apprenant/formations`

## Auth et roles

- Guard API: `auth:api` avec JWT
- Roles metier:
  - `formateur`: CRUD formations/modules
  - `apprenant`: inscription/suivi formations
- Le middleware `CheckRole` renvoie:
  - `401` si non authentifie
  - `403` si role non autorise

## Roles et responsabilites

Cette section precise les roles metier exposes par l'API et les roles d'organisation Bloc 03.

### Roles applicatifs (dans le backend)

| Role | Capacites API | Endpoints principaux |
|---|---|---|
| `formateur` | CRUD de ses formations + gestion de modules | `POST/PUT/DELETE /api/formations/*`, `POST/PUT/DELETE /api/modules/*` |
| `apprenant` | Inscription/desinscription + consultation de ses formations suivies | `POST/DELETE /api/formations/{formation}/inscription`, `GET /api/apprenant/formations` |

### Roles equipe Bloc 03 (responsabilites projet)

| Role | Responsabilites cote backend/infra | Livrables pilotes |
|---|---|---|
| **Cloud Architect** | Definir architecture cible et contraintes (DB, disponibilite, securite, scalabilite) | Rapport cloud, C4 C1/C2, budget N1/N2 |
| **DevOps Engineer** | Dockeriser backend + bases, automatiser CI/CD, healthchecks et orchestration | `backend/Dockerfile`, `docker-compose.yml`, workflow CI/CD |
| **Tech Lead** | Piloter conventions Git, revues PR, qualite code, securite secrets et gouvernance technique | `CONTRIBUTING.md`, checklist de release, coherence globale |

### Regles de collaboration recommandees

- Chaque tache backend passe par une branche `feature/*` avec Pull Request.
- Les commits suivent `Conventional Commits`.
- Toute PR backend doit mentionner les impacts API (route, payload, codes erreur).
- Les commandes de verification minimales avant merge: `composer run test` et `php artisan optimize:clear`.

## Base de donnees et migrations

Tables principales:

- `users`
- `formations`
- `modules`
- `enrollments`

Note schema `users`:

- `prenom` et `contact` ont ete ajoutes via migration separee.
- Ces colonnes sont `nullable` pour conserver la compatibilite des comptes existants.

Commandes utiles:

```bash
php artisan migrate
php artisan migrate:rollback
php artisan migrate:fresh --seed
```

## MongoDB et logs d'activite

MongoDB est utilise pour stocker des **logs d'activite** applicatifs.

- **Connexion**: definie dans `config/database.php` sous le nom `mongodb`
- **Base par defaut**: `skillhub_logs`
- **Collection**: `activity_logs`

Le service centralise dans `app/Services/ActivityLogService.php` ecrit les evenements sans casser le flux API si MongoDB est indisponible.

Evenements actuellement journalises:

- `user.registered`
- `user.logged_in`
- `user.logged_out`
- `formation.created`
- `formation.updated`
- `formation.deleted`
- `module.created`
- `module.updated`
- `module.deleted`
- `enrollment.created`
- `enrollment.deleted`

### Installation MongoDB sur Windows (pas a pas)

1. Installer MongoDB Community Server
   - Telecharger l'installeur: `https://www.mongodb.com/try/download/community`
   - Pendant l'installation, cocher **Install MongoDB as a Service**
   - Garder le port par defaut `27017`

2. Verifier que le service est demarre

```powershell
Get-Service MongoDB
Get-NetTCPConnection -LocalPort 27017 -State Listen
```

Attendu: `Status = Running` et un listener sur `127.0.0.1:27017`.

3. Configurer le backend (`.env`)

```dotenv
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_HOST=127.0.0.1
MONGODB_PORT=27017
MONGODB_DATABASE=skillhub_logs
MONGODB_USERNAME=
MONGODB_PASSWORD=
MONGODB_AUTH_DATABASE=admin
```

4. Recharger la config Laravel

```bash
php artisan optimize:clear
```

5. Generer au moins 1 log
   - Ex: faire un `POST /api/register` ou `POST /api/login`
   - Ces endpoints ecrivent `user.registered` et `user.logged_in`

### Verifier dans Compass

1. Ouvrir MongoDB Compass
2. Se connecter au serveur local (`mongodb://127.0.0.1:27017`)
3. Ouvrir la base `skillhub_logs`
4. Ouvrir la collection `activity_logs`
5. Filtre: `{}` puis **Refresh**
6. Consulter l'onglet **Documents**

Si la collection n'apparait pas encore, c'est souvent parce qu'aucun evenement n'a ete genere.

### Verification rapide en ligne de commande

```powershell
mongosh "mongodb://127.0.0.1:27017/skillhub_logs" --eval "db.activity_logs.countDocuments()"
mongosh "mongodb://127.0.0.1:27017/skillhub_logs" --eval "db.activity_logs.find().sort({_id:-1}).limit(5)"
```

## Regle compteur de vues

La logique est implementee dans `app/Http/Controllers/Api/FormationController.php`.

Comportement attendu:

- Le formateur proprietaire qui consulte sa propre formation: **pas d'increment**.
- Un autre utilisateur (apprenant, autre formateur): **increment possible**.
- Visiteur non connecte: **increment possible**.
- Cooldown anti-refresh: **1 increment max par visiteur et par formation sur 15 minutes**.

Objectif: conserver un indicateur de consultation plus fiable et limiter les gonflements artificiels du compteur.

## Tests et qualite

Lancer les tests:

```bash
composer run test
```

Formatage/style (si utilise dans votre workflow):

```bash
./vendor/bin/pint
```

## Documentation API (OpenAPI)

La source de verite API est `docs/openapi.yaml`.

Consultez aussi `docs/README.md` pour les details d'usage (Swagger Editor, Swagger UI, Redoc).

## Depannage

### 1) 401 sur routes protegees

- Verifier `Authorization: Bearer <token>`
- Verifier que `JWT_SECRET` est present dans `.env`
- Regenerer si besoin:

```bash
php artisan jwt:secret
```

### 2) Erreurs CORS en local frontend

- Verifier `config/cors.php`
- Vider les caches:

```bash
php artisan optimize:clear
```

### 3) Migrations qui echouent

- Verifier credentials DB
- Verifier que la base existe
- Repartir proprement:

```bash
php artisan migrate:fresh --seed
```

### 4) MongoDB: service actif mais collection vide

- Verifier que le backend utilise bien la bonne DB Mongo:

```bash
php artisan tinker --execute="echo config('database.connections.mongodb.database');"
```

- Vider le cache de config Laravel puis relancer le serveur API:

```bash
php artisan optimize:clear
php artisan serve --host=127.0.0.1 --port=8000
```

- Declencher un evenement (`/api/register`) puis refresh Compass.

### 5) Erreur `Call to undefined method MongoDB\Database::collection()`

Cause: API d'ecriture Mongo non compatible avec la version du package.

Correctif dans `app/Services/ActivityLogService.php`:

- utiliser `DB::connection('mongodb')->table('activity_logs')->insert(...)`
- ne pas utiliser `->collection(...)` dans ce projet

---

Si vous reprenez le projet: commencez par **Installation rapide**, puis validez les endpoints via `docs/openapi.yaml`.
