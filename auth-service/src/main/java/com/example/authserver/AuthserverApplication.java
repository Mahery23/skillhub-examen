package com.example.authserver;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Point d'entrée du serveur d'authentification forte.
 *
 * <h2>Protocole d'authentification implémenté</h2>
 * <p>Ce serveur implémente un protocole SSO en un seul échange réseau basé sur HMAC-SHA256.
 * Le mot de passe ne circule jamais sur le réseau (ni en clair, ni haché).</p>
 *
 * <h2>Flux d'authentification</h2>
 * <ol>
 *   <li>Le client calcule : {@code hmac = HMAC_SHA256(password, email:nonce:timestamp)}</li>
 *   <li>Le client envoie : {@code {email, nonce, timestamp, hmac}}</li>
 *   <li>Le serveur vérifie le timestamp, le nonce (anti-rejeu), puis recalcule le HMAC</li>
 *   <li>Si HMAC valide → émission d'un JWT access token</li>
 * </ol>
 *
 * <h2>Limites du chiffrement réversible</h2>
 * <p>Le serveur stocke les mots de passe chiffrés de façon réversible (AES) avec une
 * Server Master Key (SMK). Ce choix est <strong>pédagogique</strong> : il permet de recalculer
 * le HMAC côté serveur sans stocker le mot de passe en clair.</p>
 * <p><strong>En production</strong>, on utiliserait un hash adaptatif non réversible
 * (bcrypt, argon2id) couplé à un protocole de type SRP (Secure Remote Password).</p>
 * <p><strong>Risque</strong> : si la SMK est compromise, tous les mots de passe sont exposés.</p>
 */
@SpringBootApplication
public class AuthserverApplication {
    public static void main(String[] args) {
        SpringApplication.run(AuthserverApplication.class, args);
    }
}
