package com.example.authserver.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * Réponse JSON de GET /api/me — informations de l'utilisateur connecté.
 */
@Data
@AllArgsConstructor
public class MeResponse {
    private Long id;
    private String email;
}
