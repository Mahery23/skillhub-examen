package com.example.authserver;

import com.example.authserver.service.CryptoException;
import com.example.authserver.service.CryptoService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Tests obligatoires TP4 — Master Key.
 *
 * Couvre :
 * - Test encryption/decryption OK
 * - Test mot de passe chiffré différent du mot de passe en clair
 * - Test déchiffrement KO si ciphertext modifié
 * - Test format de stockage v1:Base64(iv):Base64(ciphertext)
 */
@SpringBootTest
@ActiveProfiles("test")
class MasterKeyTest {

    @Autowired
    private CryptoService cryptoService;

    // ─────────────────────────────────────────────────────────────────────────
    // Test 1 : encryption/decryption OK
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    @DisplayName("MK01 - encrypt/decrypt round-trip OK")
    void masterKey_encryptDecrypt_roundTrip() throws CryptoException {
        String original = "monmotdepasse";
        String encrypted = cryptoService.encrypt(original);
        String decrypted = cryptoService.decrypt(encrypted);
        assertThat(decrypted).isEqualTo(original);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Test 2 : mot de passe chiffré différent du mot de passe en clair
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    @DisplayName("MK02 - Le mot de passe chiffré est différent du mot de passe en clair")
    void masterKey_encryptedIsDifferentFromPlain() throws CryptoException {
        String plain = "monmotdepasse";
        String encrypted = cryptoService.encrypt(plain);
        assertThat(encrypted).isNotEqualTo(plain);
        assertThat(encrypted).startsWith("v1:");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Test 3 : déchiffrement KO si ciphertext modifié
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    @DisplayName("MK03 - Déchiffrement KO si ciphertext modifié")
    void masterKey_decrypt_failsIfTampered() throws CryptoException {
        String encrypted = cryptoService.encrypt("monmotdepasse");
        String tampered = encrypted.substring(0, encrypted.length() - 4) + "XXXX";
        assertThatThrownBy(() -> cryptoService.decrypt(tampered))
                .isInstanceOf(CryptoException.class);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Test 4 : format de stockage v1:Base64(iv):Base64(ciphertext)
    // ─────────────────────────────────────────────────────────────────────────
    @Test
    @DisplayName("MK04 - Format de stockage v1:Base64(iv):Base64(ciphertext)")
    void masterKey_storageFormat_isV1() throws CryptoException {
        String encrypted = cryptoService.encrypt("monmotdepasse");
        String[] parts = encrypted.split(":");
        assertThat(parts).hasSize(3);
        assertThat(parts[0]).isEqualTo("v1");
        assertThat(parts[1]).isNotBlank(); // Base64(iv)
        assertThat(parts[2]).isNotBlank(); // Base64(ciphertext)
    }
}