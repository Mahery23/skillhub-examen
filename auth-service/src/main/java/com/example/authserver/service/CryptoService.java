package com.example.authserver.service;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * Service de chiffrement/déchiffrement AES-GCM.
 * La clé est injectée via la variable d'environnement APP_MASTER_KEY.
 * Si la clé est absente, l'application refuse de démarrer.
 */
@Service
public class CryptoService {

    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int IV_SIZE = 12;
    private static final int TAG_LENGTH_BIT = 128;
    private static final int KEY_SIZE = 32;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    @Value("${APP_MASTER_KEY:#{null}}")
    private String masterKey;

    private SecretKeySpec secretKey;

    /**
     * Vérifie que APP_MASTER_KEY est présente au démarrage.
     * Refuse de démarrer si absente ou trop courte.
     */
    @PostConstruct
    public void init() {
        if (masterKey == null || masterKey.isBlank()) {
            throw new IllegalStateException(
                    "APP_MASTER_KEY est absente. L'application ne peut pas démarrer sans clé de chiffrement.");
        }
        if (masterKey.length() < KEY_SIZE) {
            throw new IllegalStateException(
                    "APP_MASTER_KEY doit faire au moins 32 caractères.");
        }
        byte[] keyBytes = masterKey.substring(0, KEY_SIZE)
                .getBytes(StandardCharsets.UTF_8);
        this.secretKey = new SecretKeySpec(keyBytes, "AES");
    }

    /**
     * Chiffre un mot de passe.
     * Format de sortie : v1:Base64(iv):Base64(ciphertext)
     */
    public String encrypt(String plainPassword) throws CryptoException {
        try {
            byte[] iv = new byte[IV_SIZE];
            SECURE_RANDOM.nextBytes(iv);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, secretKey,
                    new GCMParameterSpec(TAG_LENGTH_BIT, iv));

            byte[] encrypted = cipher.doFinal(
                    plainPassword.getBytes(StandardCharsets.UTF_8));

            String ivB64 = Base64.getEncoder().encodeToString(iv);
            String cipherB64 = Base64.getEncoder().encodeToString(encrypted);

            return "v1:" + ivB64 + ":" + cipherB64;
        } catch (Exception e) {
            throw new CryptoException("Erreur lors du chiffrement", e);
        }
    }

    /**
     * Déchiffre un mot de passe stocké au format v1:Base64(iv):Base64(ciphertext).
     */
    public String decrypt(String encryptedValue) throws CryptoException {
        try {
            String[] parts = encryptedValue.split(":");
            if (parts.length != 3 || !parts[0].equals("v1")) {
                throw new CryptoException("Format de chiffrement invalide", null);
            }

            byte[] iv = Base64.getDecoder().decode(parts[1]);
            byte[] ciphertext = Base64.getDecoder().decode(parts[2]);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.DECRYPT_MODE, secretKey,
                    new GCMParameterSpec(TAG_LENGTH_BIT, iv));

            byte[] decrypted = cipher.doFinal(ciphertext);
            return new String(decrypted, StandardCharsets.UTF_8);
        } catch (CryptoException e) {
            throw e;
        } catch (Exception e) {
            throw new CryptoException("Erreur lors du déchiffrement", e);
        }
    }
}