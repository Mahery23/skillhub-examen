package com.example.authserver;

import com.example.authserver.dto.LoginRequest;
import com.example.authserver.dto.LoginResponse;
import com.example.authserver.dto.MeResponse;
import com.example.authserver.entity.AuthNonce;
import com.example.authserver.entity.User;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Tests des entités et DTOs pour améliorer la couverture de code.
 */
class EntityDtoTest {

    // ─────────────────────────────────────────────────────────────────────────
    // User entity
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    @DisplayName("User : getters et setters fonctionnent correctement")
    void user_gettersSetters() {
        User user = new User();
        user.setId(1L);
        user.setEmail("test@example.com");
        user.setPasswordEncrypted("encrypted");
        user.setCreatedAt(LocalDateTime.now());

        assertThat(user.getId()).isEqualTo(1L);
        assertThat(user.getEmail()).isEqualTo("test@example.com");
        assertThat(user.getPasswordEncrypted()).isEqualTo("encrypted");
        assertThat(user.getCreatedAt()).isNotNull();
    }

    @Test
    @DisplayName("User : constructeur all args fonctionne")
    void user_allArgsConstructor() {
        LocalDateTime now = LocalDateTime.now();
        User user = new User(1L, "alice@example.com", "encrypted", now);

        assertThat(user.getId()).isEqualTo(1L);
        assertThat(user.getEmail()).isEqualTo("alice@example.com");
        assertThat(user.getPasswordEncrypted()).isEqualTo("encrypted");
        assertThat(user.getCreatedAt()).isEqualTo(now);
    }

    @Test
    @DisplayName("User : equals et hashCode fonctionnent")
    void user_equalsAndHashCode() {
        User u1 = new User(1L, "alice@example.com", "encrypted", LocalDateTime.now());
        User u2 = new User(1L, "alice@example.com", "encrypted", u1.getCreatedAt());
        assertThat(u1).isEqualTo(u2);
        assertThat(u1.hashCode()).isEqualTo(u2.hashCode());
    }

    @Test
    @DisplayName("User : toString ne retourne pas null")
    void user_toString() {
        User user = new User();
        user.setEmail("test@example.com");
        assertThat(user.toString()).isNotNull().contains("test@example.com");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AuthNonce entity
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    @DisplayName("AuthNonce : getters et setters fonctionnent correctement")
    void authNonce_gettersSetters() {
        User user = new User();
        user.setEmail("test@example.com");

        AuthNonce nonce = new AuthNonce();
        nonce.setId(1L);
        nonce.setUser(user);
        nonce.setNonce("my-nonce");
        nonce.setConsumed(false);
        nonce.setExpiresAt(LocalDateTime.now().plusMinutes(2));
        nonce.setCreatedAt(LocalDateTime.now());

        assertThat(nonce.getId()).isEqualTo(1L);
        assertThat(nonce.getUser()).isEqualTo(user);
        assertThat(nonce.getNonce()).isEqualTo("my-nonce");
        assertThat(nonce.isConsumed()).isFalse();
        assertThat(nonce.getExpiresAt()).isNotNull();
        assertThat(nonce.getCreatedAt()).isNotNull();
    }

    @Test
    @DisplayName("AuthNonce : constructeur avec arguments fonctionne")
    void authNonce_constructorWithArgs() {
        User user = new User();
        user.setEmail("test@example.com");
        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(2);

        AuthNonce nonce = new AuthNonce(user, "uuid-123", expiresAt);

        assertThat(nonce.getUser()).isEqualTo(user);
        assertThat(nonce.getNonce()).isEqualTo("uuid-123");
        assertThat(nonce.getExpiresAt()).isEqualTo(expiresAt);
        assertThat(nonce.isConsumed()).isFalse();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // LoginRequest DTO
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    @DisplayName("LoginRequest : getters et setters fonctionnent")
    void loginRequest_gettersSetters() {
        LoginRequest req = new LoginRequest();
        req.setEmail("test@example.com");
        req.setNonce("my-nonce");
        req.setTimestamp(1711234567L);
        req.setHmac("abc123");

        assertThat(req.getEmail()).isEqualTo("test@example.com");
        assertThat(req.getNonce()).isEqualTo("my-nonce");
        assertThat(req.getTimestamp()).isEqualTo(1711234567L);
        assertThat(req.getHmac()).isEqualTo("abc123");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // LoginResponse DTO
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    @DisplayName("LoginResponse : constructeur et getters fonctionnent")
    void loginResponse_constructorAndGetters() {
        LoginResponse resp = new LoginResponse("mytoken", 1711234567L);

        assertThat(resp.getAccessToken()).isEqualTo("mytoken");
        assertThat(resp.getExpiresAt()).isEqualTo(1711234567L);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MeResponse DTO
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    @DisplayName("MeResponse : constructeur et getters fonctionnent")
    void meResponse_constructorAndGetters() {
        MeResponse me = new MeResponse(1L, "alice@example.com");

        assertThat(me.getId()).isEqualTo(1L);
        assertThat(me.getEmail()).isEqualTo("alice@example.com");
    }
}