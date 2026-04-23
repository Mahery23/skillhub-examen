# ═══════════════════════════════════════════
# Stage 1 — builder
# Rôle : compiler le projet Spring Boot en JAR
# ═══════════════════════════════════════════
FROM maven:3.9-eclipse-temurin-21-alpine AS builder

WORKDIR /app

# On copie pom.xml EN PREMIER pour profiter du cache Docker
# Si les dépendances n'ont pas changé, Maven ne les retélécharge pas
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copie du code source
COPY src ./src

# Compilation et packaging (on saute les tests — ils tournent en CI)
RUN mvn package -DskipTests -B


# ═══════════════════════════════════════════
# Stage 2 — runtime
# Image légère sans Maven ni code source
# ═══════════════════════════════════════════
FROM eclipse-temurin:21-jre-alpine AS runtime

WORKDIR /app

# On récupère uniquement le JAR compilé depuis le builder
COPY --from=builder /app/target/*.jar app.jar

# curl est nécessaire pour le healthcheck Docker
RUN apk add --no-cache curl

# Spring Boot écoute sur le port 8080
EXPOSE 8080

# Variables d'environnement injectées par docker-compose
# (APP_MASTER_KEY, JWT_SECRET, DB_URL, DB_USERNAME, DB_PASSWORD)
ENV APP_ENV=production

ENTRYPOINT ["java", "-jar", "app.jar"]