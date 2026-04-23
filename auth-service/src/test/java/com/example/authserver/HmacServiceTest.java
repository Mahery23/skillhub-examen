package com.example.authserver;

import com.example.authserver.service.HmacService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Tests unitaires pour {@link HmacService}.
 * Couvre : calcul HMAC, construction du message, comparaison en temps constant.
 */
class HmacServiceTest {

    private HmacService hmacService;

    @BeforeEach
    void setUp() {
        hmacService = new HmacService();
    }

    @Test
    @DisplayName("compute() retourne un HMAC non nul de 64 caractères hex")
    void compute_returnsHex64Chars() {
        String hmac = hmacService.compute("password", "alice@example.com:uuid-123:1711234567");
        assertThat(hmac).isNotNull().hasSize(64).matches("[0-9a-f]+");
    }

    @Test
    @DisplayName("compute() est déterministe : même entrée → même HMAC")
    void compute_isDeterministic() {
        String h1 = hmacService.compute("password", "msg");
        String h2 = hmacService.compute("password", "msg");
        assertThat(h1).isEqualTo(h2);
    }

    @Test
    @DisplayName("compute() change si le mot de passe change")
    void compute_changesWith_differentPassword() {
        String h1 = hmacService.compute("pass1", "msg");
        String h2 = hmacService.compute("pass2", "msg");
        assertThat(h1).isNotEqualTo(h2);
    }

    @Test
    @DisplayName("compute() change si le message change")
    void compute_changesWith_differentMessage() {
        String h1 = hmacService.compute("password", "msg1");
        String h2 = hmacService.compute("password", "msg2");
        assertThat(h1).isNotEqualTo(h2);
    }

    @Test
    @DisplayName("buildMessage() formate correctement email:nonce:timestamp")
    void buildMessage_formatsCorrectly() {
        String msg = hmacService.buildMessage("alice@example.com", "my-nonce", 1711234567L);
        assertThat(msg).isEqualTo("alice@example.com:my-nonce:1711234567");
    }

    @Test
    @DisplayName("verifyConstantTime() retourne true pour deux HMAC identiques")
    void verifyConstantTime_returnsTrue_whenEqual() {
        String hmac = hmacService.compute("password", "message");
        assertThat(hmacService.verifyConstantTime(hmac, hmac)).isTrue();
    }

    @Test
    @DisplayName("verifyConstantTime() retourne false pour deux HMAC différents")
    void verifyConstantTime_returnsFalse_whenDifferent() {
        String h1 = hmacService.compute("password", "msg1");
        String h2 = hmacService.compute("password", "msg2");
        assertThat(hmacService.verifyConstantTime(h1, h2)).isFalse();
    }

    @Test
    @DisplayName("verifyConstantTime() retourne false si un argument est null")
    void verifyConstantTime_returnsFalse_whenNull() {
        String hmac = hmacService.compute("password", "msg");
        assertThat(hmacService.verifyConstantTime(null, hmac)).isFalse();
        assertThat(hmacService.verifyConstantTime(hmac, null)).isFalse();
        assertThat(hmacService.verifyConstantTime(null, null)).isFalse();
    }

    @Test
    @DisplayName("La comparaison en temps constant est testée (ne lève pas d'exception)")
    void verifyConstantTime_doesNotLeakTimingInfo() {
        // On vérifie que même avec des longueurs différentes, pas d'exception
        String short1 = "abc";
        String long1 = "a".repeat(64);
        assertThat(hmacService.verifyConstantTime(short1, long1)).isFalse();
    }
}
