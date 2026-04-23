package com.example.authserver.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Service
public class JwtService {

    private final SecretKey key;
    private final long expirationMs;

    public JwtService(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.expiration-ms}") long expirationMs) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMs = expirationMs;
    }

    /**
     * Génère un JWT avec email, rôle et nom.
     */
    public String generateToken(String email, String role, String name) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .subject(email)
                .claim("role", role)
                .claim("name", name)
                .issuedAt(new Date(now))
                .expiration(new Date(now + expirationMs))
                .signWith(key)
                .compact();
    }

    /**
     * Garde la compatibilité avec l'ancienne signature (sans rôle/nom).
     */
    public String generateToken(String email) {
        return generateToken(email, "", "");
    }

    /**
     * Extrait l'email (subject) d'un token JWT valide.
     */
    public String extractEmail(String token) {
        return getClaims(token).getSubject();
    }

    /**
     * Extrait le rôle du token JWT.
     */
    public String extractRole(String token) {
        return getClaims(token).get("role", String.class);
    }

    /**
     * Extrait le nom du token JWT.
     */
    public String extractName(String token) {
        return getClaims(token).get("name", String.class);
    }

    /**
     * Calcule le timestamp d'expiration en secondes.
     */
    public long computeExpiresAt() {
        return (System.currentTimeMillis() + expirationMs) / 1000L;
    }

    /**
     * Vérifie si un token JWT est valide.
     */
    public boolean isTokenValid(String token) {
        try {
            extractEmail(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Parse et retourne les claims du token.
     */
    private Claims getClaims(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}