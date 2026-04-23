package com.example.authserver.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

/**
 * Entité représentant un utilisateur du système.
 *
 * <h2>Stockage du mot de passe</h2>
 * <p>Le champ {@code passwordEncrypted} contient le mot de passe chiffré de façon
 * <strong>réversible</strong> avec AES-128 en mode CBC, en utilisant la Server Master Key (SMK).</p>
 *
 * <h2>Pourquoi réversible ?</h2>
 * <p>Pour que le serveur puisse recalculer le HMAC :
 * {@code HMAC_SHA256(key=password_plain, data=email:nonce:timestamp)}
 * et ainsi vérifier la preuve d'identité envoyée par le client.</p>
 *
 * <h2>Limites de sécurité</h2>
 * <ul>
 *   <li>Si la SMK est compromise, tous les mots de passe sont exposés</li>
 *   <li>En production : utiliser argon2id ou bcrypt + protocole SRP</li>
 *   <li>Ce design est accepté ici pour simplifier l'apprentissage du protocole signé</li>
 * </ul>
 */
@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Email de l'utilisateur — identifiant unique de connexion. */
    @Column(nullable = false, unique = true)
    private String email;

    /**
     * Mot de passe chiffré (AES/CBC/PKCS5Padding) encodé en Base64.
     */
    @Column(name = "password_encrypted", nullable = false)
    private String passwordEncrypted;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
