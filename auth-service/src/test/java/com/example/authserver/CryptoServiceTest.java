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
 * Tests unitaires pour {@link CryptoService}.
 * Couvre : chiffrement AES-GCM réversible, déchiffrement, unicité IV.
 * Utilise le profil "test" qui injecte APP_MASTER_KEY via application-test.properties.
 */
@SpringBootTest
@ActiveProfiles("test")
class CryptoServiceTest {

    @Autowired
    private CryptoService cryptoService;

    @Test
    @DisplayName("encrypt() retourne une valeur non nulle différente du mot de passe en clair")
    void encrypt_returnsCiphertext() throws CryptoException {
        String encrypted = cryptoService.encrypt("mypassword");
        assertThat(encrypted).isNotNull().isNotEqualTo("mypassword");
    }

    @Test
    @DisplayName("encrypt() retourne une valeur au format v1:...:...")
    void encrypt_returnsV1Format() throws CryptoException {
        String encrypted = cryptoService.encrypt("mypassword");
        assertThat(encrypted).startsWith("v1:");
        assertThat(encrypted.split(":")).hasSize(3);
    }

    @Test
    @DisplayName("decrypt(encrypt(x)) == x — chiffrement réversible")
    void encryptDecrypt_roundTrip() throws CryptoException {
        String original = "SuperSecret123!";
        String encrypted = cryptoService.encrypt(original);
        String decrypted = cryptoService.decrypt(encrypted);
        assertThat(decrypted).isEqualTo(original);
    }

    @Test
    @DisplayName("Deux chiffrements du même mot de passe produisent des résultats différents (IV aléatoire)")
    void encrypt_producesDifferentCiphertexts() throws CryptoException {
        String e1 = cryptoService.encrypt("samepassword");
        String e2 = cryptoService.encrypt("samepassword");
        // Les IV sont aléatoires donc les ciphertexts doivent être différents
        assertThat(e1).isNotEqualTo(e2);
        // Mais les deux déchiffrent vers le même texte
        assertThat(cryptoService.decrypt(e1)).isEqualTo("samepassword");
        assertThat(cryptoService.decrypt(e2)).isEqualTo("samepassword");
    }

    @Test
    @DisplayName("decrypt() fonctionne avec des caractères spéciaux")
    void encryptDecrypt_withSpecialChars() throws CryptoException {
        String password = "p@$$w0rd!éàü";
        assertThat(cryptoService.decrypt(cryptoService.encrypt(password))).isEqualTo(password);
    }

    @Test
    @DisplayName("decrypt() échoue si le ciphertext est modifié")
    void decrypt_failsIfCiphertextModified() throws CryptoException {
        String encrypted = cryptoService.encrypt("mypassword");
        // Modifier le ciphertext (dernière partie après v1:iv:)
        String tampered = encrypted.substring(0, encrypted.length() - 4) + "XXXX";
        assertThatThrownBy(() -> cryptoService.decrypt(tampered))
                .isInstanceOf(CryptoException.class);
    }

    @Test
    @DisplayName("Le mot de passe chiffré est différent du mot de passe en clair")
    void encrypted_isDifferentFromPlain() throws CryptoException {
        String plain = "monmotdepasse";
        String encrypted = cryptoService.encrypt(plain);
        assertThat(encrypted).isNotEqualTo(plain);
    }
}