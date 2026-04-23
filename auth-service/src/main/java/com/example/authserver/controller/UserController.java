package com.example.authserver.controller;

import com.example.authserver.dto.MeResponse;
import com.example.authserver.entity.User;
import com.example.authserver.repository.UserRepository;
import com.example.authserver.service.CryptoException;
import com.example.authserver.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

/**
 * Contrôleur REST pour la gestion des utilisateurs.
 *
 * <h2>Endpoints</h2>
 * <ul>
 *   <li>POST /api/users/register — inscription (public)</li>
 *   <li>GET  /api/me             — profil de l'utilisateur connecté (JWT requis)</li>
 * </ul>
 */
@RestController
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final UserRepository userRepository;

    /**
     * Enregistre un nouvel utilisateur.
     *
     * @param body JSON avec "email" et "password"
     * @return 201 Created
     */
    @PostMapping("/api/users/register")
    public ResponseEntity<Map<String, String>> register(@RequestBody Map<String, String> body) throws CryptoException {
        String email = body.get("email");
        String password = body.get("password");
        if (email == null || password == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "email and password required");
        }
        userService.register(email, password);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of("message", "User registered successfully"));
    }

    /**
     * Retourne les informations de l'utilisateur authentifié.
     * Nécessite un JWT valide dans le header Authorization.
     *
     * @param authentication l'authentification injectée par Spring Security
     * @return 200 + {id, email} si token valide, 401 sinon
     */
    @GetMapping("/api/me")
    public ResponseEntity<MeResponse> me(Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
        return ResponseEntity.ok(new MeResponse(user.getId(), user.getEmail()));
    }
}