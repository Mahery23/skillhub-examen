# ═══════════════════════════════════════════
# Stage 1 — builder
# Rôle : compiler le code React en fichiers statiques
# ═══════════════════════════════════════════
FROM node:20-alpine AS builder

WORKDIR /app

# On copie package.json EN PREMIER (avant le reste du code)
# Même astuce que pour Laravel : si les dépendances n'ont pas changé,
# Docker réutilise son cache → build beaucoup plus rapide
COPY package*.json ./

# Installation des dépendances
RUN npm ci

# Copie du reste du code source
COPY . .

# Reçoit la variable au moment du build
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Compilation du projet React
# Vite génère le résultat dans le dossier dist/
RUN npm run build


# ═══════════════════════════════════════════
# Stage 2 — runtime
# Rôle : servir les fichiers statiques avec nginx
# Node.js n'est PAS présent dans cette image finale
# ═══════════════════════════════════════════
FROM nginx:1.27-alpine AS runtime

# On copie uniquement le dossier dist/ généré par le builder
# vers le dossier que nginx sert par défaut
COPY --from=builder /app/dist /usr/share/nginx/html

# Configuration nginx personnalisée
# Nécessaire pour que React Router fonctionne correctement
COPY nginx.conf /etc/nginx/conf.d/default.conf

# nginx écoute sur le port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]