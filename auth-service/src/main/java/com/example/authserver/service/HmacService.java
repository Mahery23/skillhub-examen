package com.example.authserver.service;

import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/**
 * Service de calcul et vérification HMAC-SHA256.
 *
 * <h2>Rôle dans le protocole</h2>
 * <p>Le HMAC (Hash-based Message Authentication Code) permet au client de prouver
 * qu'il connaît le mot de passe sans jamais l'envoyer sur le réseau.</p>
 *
 * <h2>Formule</h2>
 * <pre>
 *   message = email + ":" + nonce + ":" + timestamp
 *   hmac    = HMAC_SHA256(key = password, data = message)
 * </pre>
 *
 * <h2>Comparaison en temps constant</h2>
 * <p>La comparaison des HMAC utilise {@link MessageDigest#isEqual} pour éviter
 * les attaques temporelles (timing attacks) : un attaquant ne peut pas déduire
 * combien de caractères sont corrects en mesurant le temps de réponse.</p>
 */
@Service
public class HmacService {

    private static final String HMAC_ALGORITHM = "HmacSHA256";

    /**
     * Calcule le HMAC-SHA256 d'un message avec un mot de passe comme clé.
     *
     * @param password le mot de passe (clé HMAC)
     * @param message  le message à signer ({@code email:nonce:timestamp})
     * @return le HMAC encodé en hexadécimal (64 caractères)
     */
    public String compute(String password, String message) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            SecretKeySpec keySpec = new SecretKeySpec(
                    password.getBytes(StandardCharsets.UTF_8),
                    HMAC_ALGORITHM
            );
            mac.init(keySpec);
            byte[] hmacBytes = mac.doFinal(message.getBytes(StandardCharsets.UTF_8));
            return bytesToHex(hmacBytes);
        } catch (Exception e) {
            throw new RuntimeException("Erreur lors du calcul HMAC", e);
        }
    }

    /**
     * Construit le message à signer à partir des composants.
     *
     * @param email     l'email de l'utilisateur
     * @param nonce     le nonce UUID
     * @param timestamp le timestamp epoch en secondes
     * @return le message formaté {@code "email:nonce:timestamp"}
     */
    public String buildMessage(String email, String nonce, long timestamp) {
        return email + ":" + nonce + ":" + timestamp;
    }

    /**
     * Compare deux HMAC en temps constant pour éviter les timing attacks.
     *
     * <p>Une comparaison naïve ({@code expected.equals(received)}) s'arrête au
     * premier caractère différent, permettant à un attaquant de mesurer combien
     * de caractères sont corrects. {@link MessageDigest#isEqual} garantit un
     * temps de comparaison identique quelle que soit la position de la différence.</p>
     *
     * @param expected le HMAC attendu (calculé par le serveur)
     * @param received le HMAC reçu (envoyé par le client)
     * @return {@code true} si les deux HMAC sont identiques
     */
    public boolean verifyConstantTime(String expected, String received) {
        if (expected == null || received == null) {
            return false;
        }
        byte[] expectedBytes = expected.getBytes(StandardCharsets.UTF_8);
        byte[] receivedBytes = received.getBytes(StandardCharsets.UTF_8);
        return MessageDigest.isEqual(expectedBytes, receivedBytes);
    }

    /**
     * Convertit un tableau d'octets en représentation hexadécimale.
     *
     * @param bytes tableau d'octets
     * @return chaîne hexadécimale en minuscules
     */
    private String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }
}
