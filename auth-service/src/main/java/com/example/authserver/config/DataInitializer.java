package com.example.authserver.config;

import com.example.authserver.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

/**
 * Initialise des données de test au démarrage de l'application.
 *
 * <p>Crée un utilisateur par défaut pour pouvoir tester l'API immédiatement.
 * Désactivé en profil "test" (les tests créent leurs propres données).</p>
 */
@Configuration
@RequiredArgsConstructor
@Slf4j
public class DataInitializer {

    private final UserService userService;

    @Bean
    @Profile("!test")
    public CommandLineRunner initData() {
        return args -> {
            userService.register("alice@example.com", "password123");
            log.info("==============================================");
            log.info("Utilisateur de test créé :");
            log.info("  Email    : alice@example.com");
            log.info("  Password : password123");
            log.info("==============================================");
        };
    }
}
