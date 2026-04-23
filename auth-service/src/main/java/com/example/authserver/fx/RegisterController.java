package com.example.authserver.fx;

import javafx.application.Platform;
import javafx.fxml.FXML;
import javafx.scene.control.*;

/**
 * Contrôleur de l'écran d'inscription.
 */
public class RegisterController {

    @FXML private TextField emailField;
    @FXML private PasswordField passwordField;
    @FXML private PasswordField confirmPasswordField;
    @FXML private Button registerButton;
    @FXML private Label statusLabel;

    @FXML
    public void handleRegister() {
        String email = emailField.getText().trim();
        String password = passwordField.getText();
        String confirm = confirmPasswordField.getText();

        if (email.isEmpty() || password.isEmpty() || confirm.isEmpty()) {
            showError("Veuillez remplir tous les champs.");
            return;
        }
        if (!password.equals(confirm)) {
            showError("Les mots de passe ne correspondent pas.");
            return;
        }
        if (password.length() < 6) {
            showError("Le mot de passe doit faire au moins 6 caractères.");
            return;
        }

        registerButton.setDisable(true);
        statusLabel.setText("Inscription en cours...");
        statusLabel.setStyle("-fx-text-fill: #888888;");

        new Thread(() -> {
            try {
                boolean success = AuthClient.register(email, password);
                Platform.runLater(() -> {
                    if (success) {
                        statusLabel.setText("✅ Compte créé ! Redirection...");
                        statusLabel.setStyle("-fx-text-fill: #27ae60;");
                        new Thread(() -> {
                            try {
                                Thread.sleep(1200);
                                Platform.runLater(() -> {
                                    try { MainApp.showLogin(); }
                                    catch (Exception e) { showError("Erreur de navigation."); }
                                });
                            } catch (InterruptedException ignored) {}
                        }).start();
                    } else {
                        showError("Email déjà utilisé ou erreur serveur.");
                        registerButton.setDisable(false);
                    }
                });
            } catch (Exception e) {
                Platform.runLater(() -> {
                    showError("Serveur inaccessible. Vérifiez que Spring Boot tourne.");
                    registerButton.setDisable(false);
                });
            }
        }).start();
    }

    @FXML
    public void goToLogin() {
        try {
            MainApp.showLogin();
        } catch (Exception e) {
            showError("Erreur de navigation.");
        }
    }

    private void showError(String msg) {
        statusLabel.setText(msg);
        statusLabel.setStyle("-fx-text-fill: #e74c3c;");
    }
}
