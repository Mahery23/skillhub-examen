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
import java.util.UUID;

/**
 * Service principal du microservice d'authentification forte (protocole HMAC).
 *
 * Flux :
 * 1. Client demande un nonce via GET /api/auth/challenge
 * 2. Client calcule HMAC(password, email:nonce:timestamp)
 * 3. Client envoie POST /api/auth/login sans jamais transmettre le mot de passe
 * 4. Serveur vérifie et émet un JWT
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
     * Inscription d'un nouvel utilisateur.
     * Le mot de passe est chiffré avec AES-GCM avant stockage.
     */
    @Transactional
    public void register(String email, String password, String name, String role) throws CryptoException {
        if (userRepository.findByEmail(email).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email déjà utilisé.");
        }
        if (!role.equals("apprenant") && !role.equals("formateur")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Rôle invalide.");
        }
        User user = new User();
        user.setEmail(email);
        user.setName(name);
        user.setRole(role);
        user.setPasswordEncrypted(cryptoService.encrypt(password));
        userRepository.save(user);
    }

    /**
     * Génère un nonce aléatoire pour le challenge HMAC.
     */
    public String generateChallenge(String email) {
        return UUID.randomUUID().toString();
    }

    /**
     * Authentification forte HMAC en 7 étapes.
     * Aucun mot de passe ne circule sur le réseau.
     */
    @Transactional
    public LoginResponse login(LoginRequest request) throws CryptoException {

        // 1. Vérifier que l'email existe
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Access Denied"));

        // 2. Vérifier la fenêtre de timestamp (±60 secondes)
        long diff = Math.abs(Instant.now().getEpochSecond() - request.getTimestamp());
        if (diff > timestampWindowSeconds) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Access Denied");
        }

        // 3. Vérifier le nonce (anti-rejeu)
        Optional<AuthNonce> existingNonce = nonceRepository.findByUserAndNonce(user, request.getNonce());
        if (existingNonce.isPresent()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Access Denied");
        }

        // 4. Réserver le nonce avant la vérification HMAC (évite les race conditions)
        LocalDateTime expiresAt = LocalDateTime.now(ZoneOffset.UTC).plusSeconds(nonceTtlSeconds);
        AuthNonce newNonce = new AuthNonce(user, request.getNonce(), expiresAt);
        nonceRepository.save(newNonce);

        // 5. Recalculer le HMAC côté serveur
        String passwordPlain = cryptoService.decrypt(user.getPasswordEncrypted());
        String message = hmacService.buildMessage(request.getEmail(), request.getNonce(), request.getTimestamp());
        String expectedHmac = hmacService.compute(passwordPlain, message);

        // 6. Comparaison en temps constant (résistant aux timing attacks)
        if (!hmacService.verifyConstantTime(expectedHmac, request.getHmac())) {
            newNonce.setConsumed(true);
            nonceRepository.save(newNonce);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Access Denied");
        }

        // 7. Émettre le JWT avec email, rôle et nom
        newNonce.setConsumed(true);
        nonceRepository.save(newNonce);

        String token = jwtService.generateToken(user.getEmail(), user.getRole(), user.getName());
        return new LoginResponse(token, jwtService.computeExpiresAt());
    }
}