package com.example.authserver;

import com.example.authserver.dto.LoginRequest;
import com.example.authserver.service.CryptoException;
import com.example.authserver.service.HmacService;
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
import org.springframework.test.web.servlet.MvcResult;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Tests d'intégration complets du protocole d'authentification forte.
 *
 * Couvre tous les scénarios obligatoires du TP3 :
 * - Login OK avec HMAC valide
 * - Login KO HMAC invalide
 * - KO timestamp expiré
 * - KO timestamp futur
 * - KO nonce déjà utilisé (anti-rejeu)
 * - KO user inconnu
 * - Comparaison temps constant testée
 * - Token émis et accès /api/me OK
 * - Accès /api/me sans token KO
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserService userService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private HmacService hmacService;

    private static final String EMAIL = "test@example.com";
    private static final String PASSWORD = "testpassword";

    @BeforeEach
    void setUp() throws CryptoException {
        // Créer l'utilisateur de test s'il n'existe pas déjà
        if (userRepository.findByEmail(EMAIL).isEmpty()) {
            userService.register(EMAIL, PASSWORD);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helper : construit une LoginRequest valide
    // ─────────────────────────────────────────────────────────────────────────
    private LoginRequest buildValidRequest() {
        long timestamp = Instant.now().getEpochSecond();
        String nonce = UUID.randomUUID().toString();
        String message = hmacService.buildMessage(EMAIL, nonce, timestamp);
        String hmac = hmacService.compute(PASSWORD, message);
        LoginRequest req = new LoginRequest();
        req.setEmail(EMAIL);
        req.setNonce(nonce);
        req.setTimestamp(timestamp);
        req.setHmac(hmac);
        return req;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Test 1 : Login OK avec HMAC valide
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    @DisplayName("T01 - Login OK : HMAC valide → 200 + accessToken")
    void loginOk_withValidHmac() throws Exception {
        LoginRequest req = buildValidRequest();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.expiresAt").isNumber());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Test 2 : Login KO HMAC invalide
    // ─────────────────────────────────────────────────────────────────────────
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

    // ─────────────────────────────────────────────────────────────────────────
    // Test 3 : KO timestamp expiré (trop vieux)
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    @DisplayName("T03 - Login KO : timestamp expiré (> 60s dans le passé) → 401")
    void loginKo_withExpiredTimestamp() throws Exception {
        long expiredTimestamp = Instant.now().getEpochSecond() - 120; // 2 minutes dans le passé
        String nonce = UUID.randomUUID().toString();
        String message = hmacService.buildMessage(EMAIL, nonce, expiredTimestamp);
        String hmac = hmacService.compute(PASSWORD, message);

        LoginRequest req = new LoginRequest();
        req.setEmail(EMAIL);
        req.setNonce(nonce);
        req.setTimestamp(expiredTimestamp);
        req.setHmac(hmac);

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Test 4 : KO timestamp futur
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    @DisplayName("T04 - Login KO : timestamp trop dans le futur → 401")
    void loginKo_withFutureTimestamp() throws Exception {
        long futureTimestamp = Instant.now().getEpochSecond() + 300; // 5 minutes dans le futur
        String nonce = UUID.randomUUID().toString();
        String message = hmacService.buildMessage(EMAIL, nonce, futureTimestamp);
        String hmac = hmacService.compute(PASSWORD, message);

        LoginRequest req = new LoginRequest();
        req.setEmail(EMAIL);
        req.setNonce(nonce);
        req.setTimestamp(futureTimestamp);
        req.setHmac(hmac);

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Test 5 : KO nonce déjà utilisé (anti-rejeu)
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    @DisplayName("T05 - Login KO : nonce déjà utilisé → 401 (anti-rejeu)")
    void loginKo_withReplayedNonce() throws Exception {
        LoginRequest req = buildValidRequest();
        String body = objectMapper.writeValueAsString(req);

        // Première requête : doit réussir
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk());

        // Même nonce rejoué → doit échouer
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isUnauthorized());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Test 6 : KO user inconnu
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    @DisplayName("T06 - Login KO : utilisateur inconnu → 401")
    void loginKo_withUnknownUser() throws Exception {
        long timestamp = Instant.now().getEpochSecond();
        String nonce = UUID.randomUUID().toString();
        String message = hmacService.buildMessage("unknown@nowhere.com", nonce, timestamp);
        String hmac = hmacService.compute(PASSWORD, message);

        LoginRequest req = new LoginRequest();
        req.setEmail("unknown@nowhere.com");
        req.setNonce(nonce);
        req.setTimestamp(timestamp);
        req.setHmac(hmac);

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Test 7 : Comparaison en temps constant testée directement
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    @DisplayName("T07 - Comparaison temps constant : même valeur → true, différente → false")
    void constantTimeComparison_isCorrect() {
        HmacService svc = new HmacService();
        String hmac = svc.compute("password", "message");

        assertThat(svc.verifyConstantTime(hmac, hmac)).isTrue();
        assertThat(svc.verifyConstantTime(hmac, "wrong")).isFalse();
        assertThat(svc.verifyConstantTime(null, hmac)).isFalse();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Test 8 : Token émis et accès /api/me OK
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    @DisplayName("T08 - Token valide → GET /api/me retourne 200 + email")
    void meEndpoint_withValidToken_returns200() throws Exception {
        LoginRequest req = buildValidRequest();

        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andReturn();

        String responseBody = loginResult.getResponse().getContentAsString();
        String accessToken = objectMapper.readTree(responseBody).get("accessToken").asText();

        assertThat(accessToken).isNotBlank();

        mockMvc.perform(get("/api/me")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(EMAIL))
                .andExpect(jsonPath("$.id").isNumber());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Test 9 : Accès /api/me sans token → 401
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    @DisplayName("T09 - GET /api/me sans token → 401")
    void meEndpoint_withoutToken_returns401() throws Exception {
        mockMvc.perform(get("/api/me"))
                .andExpect(status().isUnauthorized());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Test 10 : Accès /api/me avec token invalide → 401
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    @DisplayName("T10 - GET /api/me avec token invalide → 401")
    void meEndpoint_withInvalidToken_returns401() throws Exception {
        mockMvc.perform(get("/api/me")
                        .header("Authorization", "Bearer invalid.token.here"))
                .andExpect(status().isUnauthorized());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Test 11 : Register + login complet
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    @DisplayName("T11 - Register puis login → 200")
    void register_thenLogin_succeeds() throws Exception {
        String newEmail = "newuser_" + UUID.randomUUID() + "@example.com";
        String newPassword = "newpass456";

        // Register
        mockMvc.perform(post("/api/users/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + newEmail + "\",\"password\":\"" + newPassword + "\"}"))
                .andExpect(status().isCreated());

        // Login
        long timestamp = Instant.now().getEpochSecond();
        String nonce = UUID.randomUUID().toString();
        String message = hmacService.buildMessage(newEmail, nonce, timestamp);
        String hmac = hmacService.compute(newPassword, message);

        LoginRequest req = new LoginRequest();
        req.setEmail(newEmail);
        req.setNonce(nonce);
        req.setTimestamp(timestamp);
        req.setHmac(hmac);

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Test 12 : Register sans email → 400
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    @DisplayName("T12 - Register sans email → 400")
    void register_withoutEmail_returns400() throws Exception {
        mockMvc.perform(post("/api/users/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"password\":\"pass\"}"))
                .andExpect(status().isBadRequest());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Test 13 : Deux nonces différents → deux logins réussis
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    @DisplayName("T13 - Deux nonces différents → deux logins réussis")
    void twoLoginsWith_differentNonces_bothSucceed() throws Exception {
        LoginRequest req1 = buildValidRequest();
        LoginRequest req2 = buildValidRequest(); // nouveau nonce UUID

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req1)))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req2)))
                .andExpect(status().isOk());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Test 14 : expiresAt est cohérent (dans le futur)
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    @DisplayName("T14 - expiresAt dans la réponse est dans le futur")
    void loginResponse_expiresAt_isInFuture() throws Exception {
        LoginRequest req = buildValidRequest();

        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andReturn();

        long expiresAt = objectMapper.readTree(result.getResponse().getContentAsString())
                .get("expiresAt").asLong();

        assertThat(expiresAt).isGreaterThan(Instant.now().getEpochSecond());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Test 15 : HMAC avec mauvais mot de passe → 401
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    @DisplayName("T15 - HMAC signé avec mauvais password → 401")
    void loginKo_withWrongPassword() throws Exception {
        long timestamp = Instant.now().getEpochSecond();
        String nonce = UUID.randomUUID().toString();
        String message = hmacService.buildMessage(EMAIL, nonce, timestamp);
        String hmac = hmacService.compute("WRONG_PASSWORD", message); // mauvais password

        LoginRequest req = new LoginRequest();
        req.setEmail(EMAIL);
        req.setNonce(nonce);
        req.setTimestamp(timestamp);
        req.setHmac(hmac);

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized());
    }
}