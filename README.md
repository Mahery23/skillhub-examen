# SkillHub — Plateforme de formation en ligne

Architecture microservices : Laravel (API) + Spring Boot (Auth SSO) + React (Frontend)

---

# SkillHub — Plateforme de formation en ligne

Lien du repository : https://github.com/Mahery23/skillhub-examen

---

## Architecture microservices
┌─────────────────┐        ┌──────────────────────┐
│  React Frontend │──────▶│   Laravel API :8000   │
│    :5173        │        │  (formations, modules,│
└─────────────────┘        │   inscriptions...)    │
└──────────┬────────────┘
│ HTTP REST
┌──────────▼────────────┐
│  Auth Service :8080    │
│  Spring Boot           │
│  (HMAC + JWT + AES)    │
└──────────┬────────────┘
│
┌─────────────────▼──────────────────┐
│           MySQL :3306               │
│  skillhub_db (Laravel)              │
│  authdb      (Spring Boot)          │
└────────────────────────────────────┘


**Pourquoi cette architecture ?**
Séparer l'authentification dans un microservice dédié permet de l'isoler, de la sécuriser indépendamment, et de la réutiliser par d'autres services sans dupliquer la logique de sécurité.

---

## Système d'authentification SSO (HMAC + JWT)

Le mot de passe ne circule **jamais** sur le réseau. Le protocole fonctionne en 3 étapes :

Client  →  GET  /api/challenge?email=...
←  { nonce: "uuid" }
Client calcule localement :
message = email:nonce:timestamp
hmac    = HMAC-SHA256(password, message)
Client  →  POST /api/login { email, nonce, timestamp, hmac }
←  { accessToken: "JWT...", expiresAt: 1234567890 }


**Côté Laravel :**
- `AuthController.php` transmet la requête au auth-service via HTTP REST
- Le middleware `VerifySpringJWT.php` valide le JWT Spring Boot sur chaque route protégée
- Le JWT contient : `email`, `role`, `name` — injectés dans la requête via `$request->attributes`

**Côté Spring Boot :**
- Les mots de passe sont chiffrés en **AES-256-GCM** avec la `APP_MASTER_KEY`
- Le nonce est stocké en base pour éviter les attaques par rejeu
- La fenêtre de validité du timestamp est de ±60 secondes
- Le JWT est signé en **HS256** avec le `JWT_SECRET` partagé avec Laravel

---

## Règle métier — Limite d'inscriptions (Question 1)

**Problème identifié :** des apprenants s'inscrivaient à un nombre illimité de formations sans les suivre, saturant les ressources.

**Solution implémentée :** un apprenant ne peut pas s'inscrire à plus de **5 formations simultanément**.

**Endpoint modifié :** `POST /api/formations/{id}/inscription`

**Comportement :**
- Si l'apprenant a < 5 inscriptions actives → inscription acceptée → `HTTP 201`
- Si l'apprenant a déjà 5 inscriptions → refus → `HTTP 400` avec message explicite

**Test correspondant :**
Tests\Feature\EnrollmentTest::test_apprenant_cannot_enroll_in_more_than_5_formations

---

## Installation et lancement

### Prérequis
- Docker Desktop
- Git

### 1. Cloner le projet
```bash
git clone https://github.com/Mahery23/skillhub-examen.git
cd skillhub-examen
```

### 2. Configurer les variables d'environnement
```bash
cp .env.example .env
```

Éditer `.env` et remplir :
- `JWT_SECRET` — même valeur que `APP_JWT_SECRET`
- `APP_MASTER_KEY` — minimum 32 caractères
- `MYSQL_ROOT_PASSWORD`, `MYSQL_PASSWORD`
- `MONGODB_PASSWORD`

### 3. Lancer la stack complète
```bash
docker compose up --build
```

### 4. Vérifier
| URL | Résultat attendu |
|-----|-----------------|
| http://localhost:5173 | Frontend React |
| http://localhost:8000/api/health | `{"status":"ok"}` |
| http://localhost:8080/actuator/health | `{"status":"UP"}` |

---

## Outils

### Docker
Conteneurise chaque service dans une image isolée. Le `docker-compose.yml` orchestre les 5 services (frontend, api, auth-service, MySQL, MongoDB) avec leurs dépendances et healthchecks.

### GitHub Actions
Pipeline CI/CD automatisé sur chaque push vers `main` et `dev` :
- **Job 1** — Spring Boot : `mvn verify` + SonarCloud
- **Job 2** — Laravel : `composer install` + lint + `php artisan test` + React + SonarCloud
- **Job 3** — Build + push des images Docker vers Docker Hub

### SonarCloud
Analyse la qualité du code des deux projets (Laravel + Spring Boot) à chaque pipeline :
- Couverture de code (JaCoCo pour Java, pcov pour PHP)
- Détection de bugs, code smells, vulnérabilités
- Rapport disponible sur [sonarcloud.io](https://sonarcloud.io/organizations/mahery23)

---

## Variables d'environnement

Voir `.env.example` à la racine du projet pour la liste complète.

| Variable | Description |
|----------|-------------|
| `JWT_SECRET` | Secret JWT partagé Laravel ↔ Spring Boot |
| `APP_MASTER_KEY` | Clé AES-GCM chiffrement mots de passe (min 32 chars) |
| `AUTH_SERVICE_URL` | URL du auth-service (`http://auth-service:8080` en Docker) |
| `APP_JWT_SECRET` | Même valeur que `JWT_SECRET` (lu par Spring Boot) |
| `MYSQL_ROOT_PASSWORD` | Mot de passe root MySQL |
| `MYSQL_PASSWORD` | Mot de passe utilisateur MySQL |
| `MONGODB_PASSWORD` | Mot de passe MongoDB |

---

## Analyse qualité SonarCloud — après feature limite-inscription

### Plan d'amélioration (sans modification du code)

1. **Extraire `resolveUserId()` dans un Service dédié** (`EnrollmentService`) pour respecter le principe de responsabilité unique et améliorer la testabilité
2. **Compléter les tests** de `EnrollmentTest` pour couvrir `destroy` et `mesFormations` et atteindre un meilleur coverage
3. **Normaliser `utilisateur_id`** : créer une migration pour passer `utilisateur_id` en `string` dans la table `enrollments`, alignée avec l'identifiant SSO (email)
4. **Spring Boot** : supprimer l'avertissement `MySQL8Dialect deprecated` en retirant `spring.jpa.database-platform` du `application.properties`
