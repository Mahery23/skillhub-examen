package com.example.authserver;

import com.example.authserver.service.CryptoException;
import com.example.authserver.service.UserService;
import com.example.authserver.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Tests du changement de mot de passe (TP5).
 *
 * Cas testes :
 * - Changement reussi
 * - Ancien mot de passe incorrect
 * - Confirmation differente
 * - Mot de passe trop faible
 * - Utilisateur inexistant
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ChangePasswordTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserService userService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private com.example.authserver.service.HmacService hmacService;

    private static final String EMAIL = "changepass_" + UUID.randomUUID() + "@example.com";
    private static final String PASSWORD = "OldPassword1!";
    private static final String NEW_PASSWORD = "NewPassword1!";

    @BeforeEach
    void setUp() throws CryptoException {
        if (userRepository.findByEmail(EMAIL).isEmpty()) {
            userService.register(EMAIL, PASSWORD);
        }
    }

    /**
     * Helper : obtenir un token JWT valide pour l'utilisateur de test.
     */
    private String getToken() throws Exception {
        long timestamp = java.time.Instant.now().getEpochSecond();
        String nonce = UUID.randomUUID().toString();
        String message = hmacService.buildMessage(EMAIL, nonce, timestamp);
        String hmac = hmacService.compute(PASSWORD, message);

        String body = objectMapper.writeValueAsString(Map.of(
                "email", EMAIL,
                "nonce", nonce,
                "timestamp", timestamp,
                "hmac", hmac
        ));

        String response = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        return objectMapper.readTree(response).get("accessToken").asText();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Test 1 : Changement reussi
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    @DisplayName("CP01 - Changement de mot de passe reussi → 200")
    void changePassword_success() throws Exception {
        String token = getToken();
        String uniqueNewPassword = "NewPass1!" + UUID.randomUUID().toString().substring(0, 4);

        String body = objectMapper.writeValueAsString(Map.of(
                "oldPassword", PASSWORD,
                "newPassword", uniqueNewPassword,
                "confirmPassword", uniqueNewPassword
        ));

        mockMvc.perform(put("/api/auth/change-password")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Mot de passe change avec succes."));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Test 2 : Ancien mot de passe incorrect
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    @DisplayName("CP02 - Ancien mot de passe incorrect → 401")
    void changePassword_wrongOldPassword() throws Exception {
        String token = getToken();

        String body = objectMapper.writeValueAsString(Map.of(
                "oldPassword", "WrongPassword1!",
                "newPassword", NEW_PASSWORD,
                "confirmPassword", NEW_PASSWORD
        ));

        mockMvc.perform(put("/api/auth/change-password")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isUnauthorized());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Test 3 : Confirmation differente
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    @DisplayName("CP03 - Confirmation differente → 400")
    void changePassword_confirmationMismatch() throws Exception {
        String token = getToken();

        String body = objectMapper.writeValueAsString(Map.of(
                "oldPassword", PASSWORD,
                "newPassword", NEW_PASSWORD,
                "confirmPassword", "DifferentPassword1!"
        ));

        mockMvc.perform(put("/api/auth/change-password")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Test 4 : Mot de passe trop faible
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    @DisplayName("CP04 - Mot de passe trop faible → 400")
    void changePassword_weakPassword() throws Exception {
        String token = getToken();

        String body = objectMapper.writeValueAsString(Map.of(
                "oldPassword", PASSWORD,
                "newPassword", "weak",
                "confirmPassword", "weak"
        ));

        mockMvc.perform(put("/api/auth/change-password")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Test 5 : Sans token → 401
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    @DisplayName("CP05 - Sans token JWT → 401")
    void changePassword_withoutToken() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
                "oldPassword", PASSWORD,
                "newPassword", NEW_PASSWORD,
                "confirmPassword", NEW_PASSWORD
        ));

        mockMvc.perform(put("/api/auth/change-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isUnauthorized());
    }
}