package com.example.authserver.controller;

import com.example.authserver.dto.LoginRequest;
import com.example.authserver.dto.LoginResponse;
import com.example.authserver.service.AuthService;
import com.example.authserver.service.CryptoException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Point d'entrée REST du microservice d'authentification forte.
 * Endpoints publics : /api/auth/register, /api/auth/challenge, /api/auth/login
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AuthController {

    private final AuthService authService;

    /**
     * Inscription d'un nouvel utilisateur.
     * POST /api/auth/register
     * Body: { email, password, name, role }
     */
    @PostMapping("/register")
    public ResponseEntity<Map<String, String>> register(
            @RequestBody Map<String, String> body) throws CryptoException {
        authService.register(
                body.get("email"),
                body.get("password"),
                body.getOrDefault("name", "Utilisateur"),
                body.getOrDefault("role", "apprenant")
        );
        return ResponseEntity.ok(Map.of("message", "Utilisateur créé avec succès."));
    }

    /**
     * Génère un nonce de challenge pour le login HMAC.
     * GET /api/auth/challenge?email=...
     */
    @GetMapping("/challenge")
    public ResponseEntity<Map<String, String>> challenge(@RequestParam String email) {
        String nonce = authService.generateChallenge(email);
        return ResponseEntity.ok(Map.of("nonce", nonce));
    }

    /**
     * Login fort HMAC.
     * POST /api/auth/login
     * Body: { email, nonce, timestamp, hmac }
     */
    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest request) throws CryptoException {
        return ResponseEntity.ok(authService.login(request));
    }
}