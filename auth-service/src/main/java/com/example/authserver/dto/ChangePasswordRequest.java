package com.example.authserver.dto;

import lombok.Data;

/**
 * Payload JSON pour PUT /api/auth/change-password.
 * L'utilisateur doit etre authentifie (JWT requis).
 */
@Data
public class ChangePasswordRequest {

    /** Ancien mot de passe pour verification. */
    private String oldPassword;

    /** Nouveau mot de passe. */
    private String newPassword;

    /** Confirmation du nouveau mot de passe. */
    private String confirmPassword;
}