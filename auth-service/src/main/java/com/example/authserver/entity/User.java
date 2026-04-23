package com.example.authserver.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "auth_users")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String name;

    /**
     * Rôle : "apprenant" ou "formateur"
     */
    @Column(nullable = false)
    private String role = "apprenant";

    /**
     * Mot de passe chiffré (AES-GCM) encodé en Base64.
     */
    @Column(name = "password_encrypted", nullable = false)
    private String passwordEncrypted;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}