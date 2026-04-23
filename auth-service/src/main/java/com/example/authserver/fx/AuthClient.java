package com.example.authserver.fx;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Instant;
import java.util.UUID;

/**
 * Client HTTP qui communique avec le serveur Spring Boot sur localhost:8080.
 * Calcule le HMAC côté client avant chaque login.
 */
public class AuthClient {

    private static final String BASE_URL = "http://localhost:8080";
    private static final HttpClient client = HttpClient.newHttpClient();
    private static final ObjectMapper mapper = new ObjectMapper();

    /**
     * Inscrit un nouvel utilisateur.
     * @return true si succès (201), false sinon
     */
    public static boolean register(String email, String password) throws Exception {
        String body = mapper.writeValueAsString(
            mapper.createObjectNode()
                .put("email", email)
                .put("password", password)
        );

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(BASE_URL + "/api/users/register"))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(body))
            .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        return response.statusCode() == 201;
    }

    /**
     * Authentifie un utilisateur via HMAC et retourne le token JWT.
     * Le mot de passe n'est jamais envoyé sur le réseau.
     *
     * @return JsonNode avec accessToken et expiresAt, ou null si échec
     */
    public static JsonNode login(String email, String password) throws Exception {
        String nonce = UUID.randomUUID().toString();
        long timestamp = Instant.now().getEpochSecond();
        String message = email + ":" + nonce + ":" + timestamp;
        String hmac = HmacUtil.compute(password, message);

        String body = mapper.writeValueAsString(
            mapper.createObjectNode()
                .put("email", email)
                .put("nonce", nonce)
                .put("timestamp", timestamp)
                .put("hmac", hmac)
        );

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(BASE_URL + "/api/auth/login"))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(body))
            .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() == 200) {
            return mapper.readTree(response.body());
        }
        return null;
    }

    /**
     * Récupère le profil de l'utilisateur connecté via son JWT.
     * @return JsonNode avec id et email, ou null si token invalide
     */
    public static JsonNode getMe(String token) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(BASE_URL + "/api/me"))
            .header("Authorization", "Bearer " + token)
            .GET()
            .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() == 200) {
            return mapper.readTree(response.body());
        }
        return null;
    }

    /**
     * Change le mot de passe de l'utilisateur authentifie.
     *
     * @param token          JWT de l'utilisateur
     * @param oldPassword    ancien mot de passe
     * @param newPassword    nouveau mot de passe
     * @param confirmPassword confirmation du nouveau mot de passe
     * @return true si succes, false sinon
     */
    public static boolean changePassword(String token,
                                         String oldPassword,
                                         String newPassword,
                                         String confirmPassword) throws Exception {
        String body = mapper.writeValueAsString(
                mapper.createObjectNode()
                        .put("oldPassword", oldPassword)
                        .put("newPassword", newPassword)
                        .put("confirmPassword", confirmPassword)
        );

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(BASE_URL + "/api/auth/change-password"))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + token)
                .PUT(HttpRequest.BodyPublishers.ofString(body))
                .build();

        HttpResponse<String> response = client.send(request,
                HttpResponse.BodyHandlers.ofString());
        return response.statusCode() == 200;
    }
}
