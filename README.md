# SkillHub — Plateforme de formation en ligne

Architecture microservices : Laravel (API) + Spring Boot (Auth SSO) + React (Frontend)

---

## Architecture
┌─────────────────┐        ┌──────────────────────┐
│  React Frontend │──────▶│   Laravel API :8000  │
│    :5173        │        │                      │
└─────────────────┘        └──────────┬───────────┘
│ appel HTTP
┌──────────▼───────────┐
│  Auth Service :8080   │
│  Spring Boot (HMAC)   │
└──────────┬───────────┘
│
┌──────────▼───────────┐
│     MySQL :3306       │
│  skillhub_db + authdb │
└──────────────────────┘

## Services

| Service | Technologie | Port |
|---------|-------------|------|
| Frontend | React + Vite + Nginx | 5173 |
| API Backend | Laravel 13 + PHP 8.3 | 8000 |
| Auth Service | Spring Boot 3 + Java 21 | 8080 |
| Base de données | MySQL 8.0 | 3306 |
| Logs | MongoDB 7.0 | 27017 |

---

## Prérequis

- Docker Desktop
- Git

---

## Installation et lancement

### 1. Cloner le projet

```bash
git clone https://github.com/Mahery23/skillhub-examen.git
cd skillhub-examen
```

### 2. Configurer les variables d'environnement

```bash
cp .env.example .env
```

Editer `.env` et remplir les valeurs :
- `JWT_SECRET` — même valeur dans `JWT_SECRET` et `APP_JWT_SECRET`
- `APP_MASTER_KEY` — clé AES-GCM, minimum 32 caractères
- `MYSQL_ROOT_PASSWORD`, `MYSQL_PASSWORD` — mots de passe MySQL
- `MONGODB_PASSWORD` — mot de passe MongoDB

### 3. Lancer tous les services

```bash
docker compose up --build
```

### 4. Vérifier que tout fonctionne

| URL | Description |
|-----|-------------|
| http://localhost:5173 | Frontend React |
| http://localhost:8000/api/health | Health check Laravel |
| http://localhost:8080/actuator/health | Health check Auth Service |

---

## Flux d'authentification SSO (HMAC)

Le mot de passe ne circule **jamais** sur le réseau.

Client → GET  /api/challenge?email=...     → nonce
Client calcule : HMAC-SHA256(password, email:nonce:timestamp)
Client → POST /api/login { email, nonce, timestamp, hmac }
Laravel → POST auth-service/api/auth/login
Auth Service vérifie le HMAC → émet un JWT
JWT retourné au client (contient email, role, name)
Client utilise le JWT dans Authorization: Bearer <token>


---

## Structure du projet
skillhub-examen/
├── backend/          # Laravel 13 — API REST
├── frontend/         # React + Vite — Interface utilisateur
├── auth-service/     # Spring Boot — Microservice authentification
├── docker-compose.yml
├── .env.example
├── sonar-project.properties
└── .github/
└── workflows/
└── ci.yml    # Pipeline CI/CD GitHub Actions

---

## CI/CD

Le pipeline GitHub Actions effectue à chaque push :

1. **Auth Service** — build Maven, tests JUnit, analyse SonarCloud
2. **Backend Laravel** — install Composer, tests PHPUnit, analyse SonarCloud
3. **Frontend React** — install npm, tests Vitest, analyse SonarCloud
4. **Docker** — build des 3 images
5. **Docker Hub** — push des images (sur `main` uniquement)

---

## Variables d'environnement importantes

| Variable | Description |
|----------|-------------|
| `JWT_SECRET` | Secret JWT partagé Laravel ↔ Spring Boot |
| `APP_MASTER_KEY` | Clé AES-GCM chiffrement mots de passe (min 32 chars) |
| `AUTH_SERVICE_URL` | URL du auth-service (`http://auth-service:8080` en Docker) |
| `APP_JWT_SECRET` | Même valeur que `JWT_SECRET` (lu par Spring Boot) |

---

## Sécurité

- Mots de passe chiffrés en **AES-256-GCM** (jamais en clair en base)
- Authentification par **HMAC-SHA256** (le mot de passe ne transite pas)
- Protection **anti-rejeu** par nonce + fenêtre de timestamp (±60s)
- JWT **HS256** partagé entre Laravel et Spring Boot
- API **stateless** (pas de session)