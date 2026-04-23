package com.example.authserver.controller;

import com.example.authserver.dto.LoginRequest;
import com.example.authserver.dto.LoginResponse;
import com.example.authserver.service.AuthService;
import com.example.authserver.service.CryptoException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.example.authserver.dto.ChangePasswordRequest;
import org.springframework.security.core.Authentication;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * Contrôleur REST pour l'authentification forte.
 *
 * <h2>Endpoints</h2>
 * <ul>
 *   <li>POST /api/auth/login — authentification par HMAC</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /**
     * Authentification forte par preuve HMAC.
     *
     * <p>Le client envoie {@code {email, nonce, timestamp, hmac}} sans jamais
     * transmettre le mot de passe. Le serveur recalcule le HMAC et compare
     * en temps constant.</p>
     *
     * @param request le payload JSON de login
     * @return 200 + {accessToken, expiresAt} si valide, 401 sinon
     */
    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest request) throws CryptoException {
        LoginResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    /**
     * Change le mot de passe de l'utilisateur authentifie.
     * Necessite un JWT valide dans le header Authorization.
     *
     * @param request        le payload JSON avec oldPassword, newPassword, confirmPassword
     * @param authentication l'authentification injectee par Spring Security
     * @return 200 OK si le changement est reussi
     */
    @PutMapping("/change-password")
    public ResponseEntity<Map<String, String>> changePassword(
            @RequestBody ChangePasswordRequest request,
            Authentication authentication) throws CryptoException {

        // Verifier que l'utilisateur est bien authentifie
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Non authentifie.");
        }

        String email = authentication.getName();

        authService.changePassword(
                email,
                request.getOldPassword(),
                request.getNewPassword(),
                request.getConfirmPassword()
        );

        return ResponseEntity.ok(Map.of("message", "Mot de passe change avec succes."));
    }
}