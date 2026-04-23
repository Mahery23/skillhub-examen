package com.example.authserver.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Nonce d'authentification — mécanisme anti-rejeu.
 *
 * <h2>Rôle du nonce</h2>
 * <p>Le nonce est un UUID aléatoire généré par le client pour chaque tentative de login.
 * Il est inclus dans le message signé : {@code email:nonce:timestamp}.</p>
 *
 * <h2>Protection anti-rejeu</h2>
 * <p>Sans stockage du nonce, un attaquant pourrait enregistrer une requête valide
 * et la rejouer pour obtenir un nouveau token. Le serveur stocke chaque nonce
 * consommé et rejette toute réutilisation.</p>
 *
 * <h2>TTL</h2>
 * <p>Les nonces expirent après ~2 minutes ({@code expires_at}).
 * Un job de nettoyage peut supprimer les nonces expirés.</p>
 */
@Entity
@Table(
    name = "auth_nonce",
    uniqueConstraints = @UniqueConstraint(
        name = "uk_user_nonce",
        columnNames = {"user_id", "nonce"}
    )
)
@Data
@NoArgsConstructor
public class AuthNonce {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Utilisateur propriétaire de ce nonce. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** Valeur UUID du nonce (ex: "a1b2c3d4-e5f6-..."). */
    @Column(nullable = false, length = 36)
    private String nonce;

    /** Date/heure d'expiration (now + 2 minutes). Après cette date, le nonce est invalide. */
    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    /**
     * Indique si ce nonce a déjà été utilisé pour une authentification réussie.
     * Un nonce consommé ne peut jamais être réutilisé.
     */
    @Column(nullable = false)
    private boolean consumed = false;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public AuthNonce(User user, String nonce, LocalDateTime expiresAt) {
        this.user = user;
        this.nonce = nonce;
        this.expiresAt = expiresAt;
        this.consumed = false;
        this.createdAt = LocalDateTime.now();
    }
}
