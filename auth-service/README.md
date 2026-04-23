# TP5 - Evolution fonctionnelle et deploiement Docker

## Note pedagogique importante

Ce mecanisme est **pedagogique**.

- Le serveur stocke les mots de passe avec un **chiffrement reversible (AES-GCM)**.
- La **Master Key** est injectee via variable d'environnement et ne doit jamais etre dans le code.
- **En industrie**, on eviterait le chiffrement reversible. On prefererait :
  - Un hash non reversible et adaptatif (argon2id, bcrypt)
  - Un protocole de type **SRP** (Secure Remote Password)
- **Risque** : si la Master Key est compromise, tous les mots de passe stockes peuvent etre dechiffres.

---

## Nouveautes TP5 par rapport a TP4

| Fonctionnalite | TP4 | TP5 |
|---|---|---|
| Changement de mot de passe | Non | Oui |
| Regles de complexite mot de passe | Non | Oui |
| Conteneurisation Docker | Non | Oui |
| Build Docker dans CI/CD | Non | Oui |
| Interface JavaFX changement MDP | Non | Oui |

---

## Principe du protocole

Ce serveur implemente une authentification forte par preuve HMAC.
**Le mot de passe ne circule jamais sur le reseau** (ni en clair, ni hache).

### Flux d'authentification

```
Client                                    Serveur
  |                                           |
  | POST /api/auth/login                      |
  | { email, nonce, timestamp, hmac }         |
  | ---------------------------------------->|
  |                                           | 1. Email existe ?
  |                                           | 2. Timestamp dans +/-60s ?
  |                                           | 3. Nonce deja vu ? (anti-rejeu)
  |                                           | 4. HMAC valide ? (temps constant)
  |                                           | 5. Emet JWT
  | { accessToken, expiresAt }               |
  | <----------------------------------------|
```

---

## Changement de mot de passe

### Endpoint

```http
PUT /api/auth/change-password
Authorization: Bearer eyJhbGci...
Content-Type: application/json

{
  "oldPassword": "AncienMotDePasse1!",
  "newPassword": "NouveauMotDePasse1!",
  "confirmPassword": "NouveauMotDePasse1!"
}
```

### Regles de complexite du nouveau mot de passe

- Minimum **12 caracteres**
- Au moins une **majuscule**
- Au moins une **minuscule**
- Au moins un **chiffre**
- Au moins un **caractere special** (!@#$%^&*...)

### Logique serveur

1. Verifier que l'utilisateur existe
2. Verifier que l'ancien mot de passe est correct
3. Verifier que newPassword == confirmPassword
4. Verifier la force du nouveau mot de passe
5. Chiffrer le nouveau mot de passe avec la Master Key
6. Mettre a jour la base de donnees

---

## Docker

### Pourquoi Docker ?

Docker permet de lancer l'application dans un conteneur isole.
Peu importe l'ordinateur, ca marche toujours pareil.

### Builder l'image

```bash
docker build -t authserver-tp5 .
```

### Lancer le conteneur

```bash
docker run -p 8080:8080 -e APP_MASTER_KEY=votre_cle_32_caracteres authserver-tp5
```

### Lancer en arriere-plan

```bash
docker run -d -p 8080:8080 -e APP_MASTER_KEY=votre_cle_32_caracteres authserver-tp5
```

### Voir les conteneurs actifs

```bash
docker ps
```

### Arreter un conteneur

```bash
docker stop <id_du_conteneur>
```

---

## Stack technique

- **Java 21** + **Spring Boot 3.2**
- **H2** (base en memoire)
- **JJWT 0.12.3** pour les JWT
- **AES-128/GCM** pour le chiffrement reversible des mots de passe
- **JavaFX 21** pour l'interface utilisateur
- **Docker** pour la conteneurisation

---

## Demarrage rapide

### Option 1 — Avec Docker (recommande)

```bash
docker run -p 8080:8080 -e APP_MASTER_KEY=0123456789abcdef0123456789abcdef authserver-tp5
```

### Option 2 — Avec IntelliJ

```bash
set APP_MASTER_KEY=0123456789abcdef0123456789abcdef
```
Puis lance `AuthserverApplication` depuis IntelliJ.

Un utilisateur de test est cree automatiquement :
- Email : `alice@example.com`
- Password : `password123`

### Lancer l'interface JavaFX

Dans le panneau Maven d'IntelliJ :
```
Plugins -> javafx -> javafx:run
```

---

## API

### Inscription
```http
POST /api/users/register
Content-Type: application/json

{ "email": "user@example.com", "password": "monmotdepasse" }
```

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "nonce": "uuid-aleatoire",
  "timestamp": 1711234567,
  "hmac": "a3f1c2..."
}
```

### Profil connecte
```http
GET /api/me
Authorization: Bearer eyJhbGci...
```

### Changer le mot de passe
```http
PUT /api/auth/change-password
Authorization: Bearer eyJhbGci...
Content-Type: application/json

{
  "oldPassword": "AncienMDP1!",
  "newPassword": "NouveauMDP1!",
  "confirmPassword": "NouveauMDP1!"
}
```

---

## CI/CD GitHub Actions

La pipeline se declenche automatiquement sur chaque push vers `main`.

Elle effectue :
1. Checkout du code
2. Installation JDK 21
3. Build Maven + tests JUnit
4. Analyse SonarCloud
5. Build image Docker

### Secrets GitHub requis

| Secret | Description |
|---|---|
| `SONAR_TOKEN` | Token d'authentification SonarCloud |

---

## Lancer les tests

```bash
set APP_MASTER_KEY=test_master_key_for_ci_only_32chars
```

Puis dans IntelliJ : clic droit sur le dossier test → **Run 'All Tests'**

---

## Tags Git

| Tag | Description |
|---|---|
| `v5.0-start` | Structure de base TP5 |
| `v5.1-change-password` | Endpoint changement mot de passe |
| `v5.2-docker` | Dockerfile + conteneurisation |
| `v5.3-tests` | Tests JUnit changement mot de passe |
| `v5-tp5` | Tag final |

---

## Avantages du protocole

- Aucun mot de passe ne circule sur le reseau
- Le timestamp limite la fenetre d'attaque a **60 secondes**
- Le nonce empeche la **reutilisation** d'une requete interceptee
- La comparaison en **temps constant** previent les timing attacks
- La Master Key n'est jamais dans le code source
- Le changement de mot de passe verifie la force du nouveau mot de passe
- **Sans stockage du nonce en base, le nonce ne sert a rien contre le rejeu**
