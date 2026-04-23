package com.example.authserver.dto;

import lombok.Data;

/**
 * Payload JSON de la requête POST /api/auth/login.
 *
 * <p>Le mot de passe ne figure PAS dans ce payload.
 * Seule la preuve HMAC est transmise.</p>
 *
 * <h2>Champs</h2>
 * <ul>
 *   <li>{@code email} - identifiant de l'utilisateur</li>
 *   <li>{@code nonce} - UUID aléatoire généré par le client (anti-rejeu)</li>
 *   <li>{@code timestamp} - epoch en secondes au moment de la signature</li>
 *   <li>{@code hmac} - HMAC-SHA256 encodé en hex de {@code "email:nonce:timestamp"} avec le password comme clé</li>
 * </ul>
 */
@Data
public class LoginRequest {
    private String email;
    private String nonce;
    private long timestamp;
    private String hmac;
}
