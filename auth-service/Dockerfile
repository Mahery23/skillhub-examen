# Etape 1 : Build avec Maven
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# Copier pom.xml et telecharger les dependances (cache Docker)
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copier le code source et builder
COPY src ./src
RUN mvn package -DskipTests -B

# Etape 2 : Image finale legere
FROM eclipse-temurin:21-jre
WORKDIR /app

# Copier le jar genere
COPY --from=build /app/target/authserver-*.jar app.jar

# Exposer le port 8080
EXPOSE 8080

# APP_MASTER_KEY doit etre injectee via -e lors du docker run
ENTRYPOINT ["java", "-jar", "/app/app.jar"]