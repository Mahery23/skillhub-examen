package com.example.authserver.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

/**
 * Service de génération et validation des JWT access tokens.
 *
 * <h2>Format du token</h2>
 * <ul>
 *   <li>Algorithm : HS256</li>
 *   <li>Claim {@code sub} : email de l'utilisateur</li>
 *   <li>Claim {@code iat} : date d'émission</li>
 *   <li>Claim {@code exp} : date d'expiration (iat + 15 minutes)</li>
 * </ul>
 */
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
     * Génère un JWT access token pour un utilisateur.
     *
     * @param email l'email de l'utilisateur (subject du token)
     * @return le JWT signé
     */
    public String generateToken(String email) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .subject(email)
                .issuedAt(new Date(now))
                .expiration(new Date(now + expirationMs))
                .signWith(key)
                .compact();
    }

    /**
     * Extrait l'email (subject) d'un token JWT valide.
     *
     * @param token le JWT
     * @return l'email extrait
     * @throws io.jsonwebtoken.JwtException si le token est invalide ou expiré
     */
    public String extractEmail(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
        return claims.getSubject();
    }

    /**
     * Calcule le timestamp epoch (en secondes) d'expiration d'un token.
     *
     * @return epoch secondes de l'expiration
     */
    public long computeExpiresAt() {
        return (System.currentTimeMillis() + expirationMs) / 1000L;
    }

    /**
     * Vérifie si un token JWT est valide (signature + expiration).
     *
     * @param token le JWT à valider
     * @return {@code true} si le token est valide
     */
    public boolean isTokenValid(String token) {
        try {
            extractEmail(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}
