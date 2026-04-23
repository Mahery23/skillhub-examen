package com.example.authserver;

import com.example.authserver.service.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Tests unitaires pour {@link JwtService}.
 */
class JwtServiceTest {

    private JwtService jwtService;

    @BeforeEach
    void setUp() {
        // Secret de 64 chars (512 bits) pour HS256
        jwtService = new JwtService(
            "c2VjcmV0LWtleS10cDMtYXV0aHNlcnZlci1zdXBlci1sb25nLXN0cmluZy0yNTZiaXRz",
            900_000L
        );
    }

    @Test
    @DisplayName("generateToken() produit un token JWT non nul")
    void generateToken_returnsNonNull() {
        String token = jwtService.generateToken("alice@example.com");
        assertThat(token).isNotNull().contains(".");
    }

    @Test
    @DisplayName("extractEmail() retourne l'email du token")
    void extractEmail_returnsCorrectEmail() {
        String token = jwtService.generateToken("alice@example.com");
        assertThat(jwtService.extractEmail(token)).isEqualTo("alice@example.com");
    }

    @Test
    @DisplayName("isTokenValid() retourne true pour un token valide")
    void isTokenValid_trueForValidToken() {
        String token = jwtService.generateToken("alice@example.com");
        assertThat(jwtService.isTokenValid(token)).isTrue();
    }

    @Test
    @DisplayName("isTokenValid() retourne false pour un token falsifié")
    void isTokenValid_falseForTamperedToken() {
        assertThat(jwtService.isTokenValid("not.a.jwt")).isFalse();
    }

    @Test
    @DisplayName("computeExpiresAt() retourne un epoch dans le futur")
    void computeExpiresAt_isInFuture() {
        long expiresAt = jwtService.computeExpiresAt();
        assertThat(expiresAt).isGreaterThan(Instant.now().getEpochSecond());
    }
}
