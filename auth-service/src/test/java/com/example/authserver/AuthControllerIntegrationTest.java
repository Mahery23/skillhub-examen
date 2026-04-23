package com.example.authserver;

import com.example.authserver.dto.LoginRequest;
import com.example.authserver.service.AuthService;
import com.example.authserver.service.CryptoException;
import com.example.authserver.service.HmacService;
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

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Tests d'intégration du protocole d'authentification forte HMAC.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthControllerIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private AuthService authService;
    @Autowired private UserRepository userRepository;
    @Autowired private HmacService hmacService;

    private static final String EMAIL = "test@example.com";
    private static final String PASSWORD = "Password123!";

    @BeforeEach
    void setUp() throws CryptoException {
        // Crée l'utilisateur de test s'il n'existe pas encore
        if (userRepository.findByEmail(EMAIL).isEmpty()) {
            authService.register(EMAIL, PASSWORD, "Test User", "apprenant");
        }
    }

    /** Construit une requête de login HMAC valide */
    private LoginRequest buildValidRequest() {
        long timestamp = Instant.now().getEpochSecond();
        String nonce = UUID.randomUUID().toString();
        String hmac = hmacService.compute(PASSWORD, hmacService.buildMessage(EMAIL, nonce, timestamp));
        LoginRequest req = new LoginRequest();
        req.setEmail(EMAIL); req.setNonce(nonce);
        req.setTimestamp(timestamp); req.setHmac(hmac);
        return req;
    }

    @Test
    @DisplayName("T01 - Login OK : HMAC valide → 200 + accessToken")
    void loginOk_withValidHmac() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(buildValidRequest())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.expiresAt").isNumber());
    }

    @Test
    @DisplayName("T02 - Login KO : HMAC invalide → 401")
    void loginKo_withInvalidHmac() throws Exception {
        LoginRequest req = buildValidRequest();
        req.setHmac("0000000000000000000000000000000000000000000000000000000000000000");
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("T03 - Login KO : timestamp expiré → 401")
    void loginKo_withExpiredTimestamp() throws Exception {
        long ts = Instant.now().getEpochSecond() - 120;
        String nonce = UUID.randomUUID().toString();
        String hmac = hmacService.compute(PASSWORD, hmacService.buildMessage(EMAIL, nonce, ts));
        LoginRequest req = new LoginRequest();
        req.setEmail(EMAIL); req.setNonce(nonce); req.setTimestamp(ts); req.setHmac(hmac);
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("T04 - Login KO : nonce rejoué → 401")
    void loginKo_withReplayedNonce() throws Exception {
        String body = objectMapper.writeValueAsString(buildValidRequest());
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("T05 - Login KO : utilisateur inconnu → 401")
    void loginKo_withUnknownUser() throws Exception {
        long ts = Instant.now().getEpochSecond();
        String nonce = UUID.randomUUID().toString();
        String hmac = hmacService.compute(PASSWORD, hmacService.buildMessage("unknown@test.com", nonce, ts));
        LoginRequest req = new LoginRequest();
        req.setEmail("unknown@test.com"); req.setNonce(nonce); req.setTimestamp(ts); req.setHmac(hmac);
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("T06 - Comparaison temps constant : correcte")
    void constantTimeComparison_isCorrect() {
        String hmac = hmacService.compute("password", "message");
        assertThat(hmacService.verifyConstantTime(hmac, hmac)).isTrue();
        assertThat(hmacService.verifyConstantTime(hmac, "wrong")).isFalse();
        assertThat(hmacService.verifyConstantTime(null, hmac)).isFalse();
    }
}