package com.example.authserver.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * Réponse JSON du serveur en cas d'authentification réussie.
 */
@Data
@AllArgsConstructor
public class LoginResponse {

    /** JWT access token à utiliser dans le header Authorization: Bearer {token}. */
    private String accessToken;

    /** Timestamp epoch (secondes) d'expiration du token. */
    private long expiresAt;
}
