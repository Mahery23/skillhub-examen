package com.example.authserver.service;

import com.example.authserver.dto.LoginRequest;
import com.example.authserver.dto.LoginResponse;
import com.example.authserver.entity.AuthNonce;
import com.example.authserver.entity.User;
import com.example.authserver.repository.AuthNonceRepository;
import com.example.authserver.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Optional;

/**
 * Service principal d'authentification forte (protocole HMAC-SSO).
 *
 * <h2>Protocole en 2 phases</h2>
 * <pre>
 * Client                              Serveur
 *   |                                    |
 *   |  POST /api/auth/login              |
 *   |  { email, nonce, timestamp, hmac } |
 *   | ---------------------------------> |
 *   |                                    | 1. Vérifie email existe
 *   |                                    | 2. Vérifie timestamp dans ±60s
 *   |                                    | 3. Vérifie nonce non rejoué
 *   |                                    | 4. Recalcule HMAC côté serveur
 *   |                                    | 5. Compare en temps constant
 *   |                                    | 6. Consomme le nonce
 *   |                                    | 7. Émet JWT
 *   |  { accessToken, expiresAt }        |
 *   | <--------------------------------- |
 * </pre>
 *
 * <h2>Ordre des vérifications</h2>
 * <p>L'ordre est intentionnel pour éviter les fuites d'information :</p>
 * <ol>
 *   <li>Email → 401 générique (ne pas indiquer si l'email existe)</li>
 *   <li>Timestamp → 401 (fenêtre de 60 secondes)</li>
 *   <li>Nonce → 401 (anti-rejeu)</li>
 *   <li>HMAC → 401 (comparaison en temps constant)</li>
 * </ol>
 */
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final AuthNonceRepository nonceRepository;
    private final CryptoService cryptoService;
    private final HmacService hmacService;
    private final JwtService jwtService;

    @Value("${app.auth.timestamp-window-seconds:60}")
    private long timestampWindowSeconds;

    @Value("${app.auth.nonce-ttl-seconds:120}")
    private long nonceTtlSeconds;

    /**
     * Traite une demande d'authentification forte.
     *
     * @param request le payload JSON contenant email, nonce, timestamp, hmac
     * @return la réponse avec accessToken et expiresAt
     * @throws ResponseStatusException 401 si l'une des vérifications échoue
     */
    @Transactional
    public LoginResponse login(LoginRequest request) throws CryptoException {

        // ── Étape 1 : Vérifier que l'email existe ─────────────────────────────
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Access Denied"));

        // ── Étape 2 : Vérifier la fenêtre de timestamp (±60 secondes) ─────────
        long nowEpoch = Instant.now().getEpochSecond();
        long diff = Math.abs(nowEpoch - request.getTimestamp());
        if (diff > timestampWindowSeconds) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Access Denied");
        }

        // ── Étape 3 : Vérifier le nonce (anti-rejeu) ──────────────────────────
        Optional<AuthNonce> existingNonce = nonceRepository.findByUserAndNonce(user, request.getNonce());
        if (existingNonce.isPresent()) {
            // Nonce déjà vu → rejeu détecté
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Access Denied");
        }

        // ── Étape 4 : Réserver le nonce AVANT la vérification HMAC ───────────
        // (évite une race condition : deux requêtes simultanées avec le même nonce)
        LocalDateTime expiresAt = LocalDateTime.now(ZoneOffset.UTC).plusSeconds(nonceTtlSeconds);
        AuthNonce newNonce = new AuthNonce(user, request.getNonce(), expiresAt);
        nonceRepository.save(newNonce);

        // ── Étape 5 : Recalculer le HMAC côté serveur ─────────────────────────
        String passwordPlain = cryptoService.decrypt(user.getPasswordEncrypted());
        String message = hmacService.buildMessage(request.getEmail(), request.getNonce(), request.getTimestamp());
        String expectedHmac = hmacService.compute(passwordPlain, message);

        // ── Étape 6 : Comparaison en temps constant ────────────────────────────
        if (!hmacService.verifyConstantTime(expectedHmac, request.getHmac())) {
            // Marquer le nonce comme consommé même en cas d'échec
            // (empêche les tentatives de brute force avec le même nonce)
            newNonce.setConsumed(true);
            nonceRepository.save(newNonce);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Access Denied");
        }

        // ── Étape 7 : Marquer le nonce comme consommé et émettre le token ─────
        newNonce.setConsumed(true);
        nonceRepository.save(newNonce);

        String token = jwtService.generateToken(user.getEmail());
        long expiresAtEpoch = jwtService.computeExpiresAt();

        return new LoginResponse(token, expiresAtEpoch);
    }

    /**
     * Change le mot de passe d'un utilisateur authentifie.
     *
     * Etapes :
     * 1. Verifier que l'utilisateur existe
     * 2. Verifier que l'ancien mot de passe est correct
     * 3. Verifier que newPassword == confirmPassword
     * 4. Verifier la force du nouveau mot de passe
     * 5. Chiffrer et sauvegarder le nouveau mot de passe
     *
     * @param email           email de l'utilisateur authentifie
     * @param oldPassword     ancien mot de passe en clair
     * @param newPassword     nouveau mot de passe en clair
     * @param confirmPassword confirmation du nouveau mot de passe
     * @throws CryptoException si le chiffrement echoue
     */
    @Transactional
    public void changePassword(String email,
                               String oldPassword,
                               String newPassword,
                               String confirmPassword) throws CryptoException {

        // 1. Verifier que l'utilisateur existe
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Utilisateur introuvable."));

        // 2. Verifier que l'ancien mot de passe est correct
        String currentPlain = cryptoService.decrypt(user.getPasswordEncrypted());
        if (!currentPlain.equals(oldPassword)) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED, "Ancien mot de passe incorrect.");
        }

        // 3. Verifier que newPassword == confirmPassword
        if (!newPassword.equals(confirmPassword)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Les mots de passe ne correspondent pas.");
        }

        // 4. Verifier la force du nouveau mot de passe
        try {
            PasswordValidator.validate(newPassword);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }

        // 5. Chiffrer et sauvegarder le nouveau mot de passe
        user.setPasswordEncrypted(cryptoService.encrypt(newPassword));
        userRepository.save(user);
    }
}
