package com.example.authserver.service;

/**
 * Validateur de force du mot de passe.
 *
 * Regles obligatoires :
 * - Minimum 12 caracteres
 * - Au moins une majuscule
 * - Au moins une minuscule
 * - Au moins un chiffre
 * - Au moins un caractere special
 */
public class PasswordValidator {

    private static final int MIN_LENGTH = 12;

    // Empeche l'instanciation
    private PasswordValidator() {}

    /**
     * Valide la force du mot de passe.
     *
     * @param password le mot de passe a valider
     * @throws IllegalArgumentException si le mot de passe ne respecte pas les regles
     */
    public static void validate(String password) {
        if (password == null || password.length() < MIN_LENGTH) {
            throw new IllegalArgumentException(
                    "Le mot de passe doit contenir au moins 12 caracteres.");
        }
        if (!password.matches(".*[A-Z].*")) {
            throw new IllegalArgumentException(
                    "Le mot de passe doit contenir au moins une majuscule.");
        }
        if (!password.matches(".*[a-z].*")) {
            throw new IllegalArgumentException(
                    "Le mot de passe doit contenir au moins une minuscule.");
        }
        if (!password.matches(".*[0-9].*")) {
            throw new IllegalArgumentException(
                    "Le mot de passe doit contenir au moins un chiffre.");
        }
        if (!password.matches(".*[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>/?].*")) {
            throw new IllegalArgumentException(
                    "Le mot de passe doit contenir au moins un caractere special.");
        }
    }
}