package com.example.authserver.fx;

import com.fasterxml.jackson.databind.JsonNode;
import javafx.application.Platform;
import javafx.fxml.FXML;
import javafx.scene.control.*;

/**
 * Contrôleur de l'écran de login.
 */
public class LoginController {

    @FXML private TextField emailField;
    @FXML private PasswordField passwordField;
    @FXML private Button loginButton;
    @FXML private Label statusLabel;
    @FXML private Hyperlink registerLink;

    @FXML
    public void handleLogin() {
        String email = emailField.getText().trim();
        String password = passwordField.getText();

        if (email.isEmpty() || password.isEmpty()) {
            showError("Veuillez remplir tous les champs.");
            return;
        }

        loginButton.setDisable(true);
        statusLabel.setText("Connexion en cours...");
        statusLabel.setStyle("-fx-text-fill: #888888;");

        new Thread(() -> {
            try {
                JsonNode response = AuthClient.login(email, password);
                Platform.runLater(() -> {
                    try {
                        if (response != null) {
                            String token = response.get("accessToken").asText();
                            long expiresAt = response.get("expiresAt").asLong();
                            MainApp.showProfile(email, token, expiresAt);
                        } else {
                            showError("Email ou mot de passe incorrect.");
                            loginButton.setDisable(false);
                        }
                    } catch (Exception e) {
                        showError("Erreur inattendue.");
                        loginButton.setDisable(false);
                    }
                });
            } catch (Exception e) {
                Platform.runLater(() -> {
                    showError("Serveur inaccessible. Vérifiez que Spring Boot tourne.");
                    loginButton.setDisable(false);
                });
            }
        }).start();
    }

    @FXML
    public void goToRegister() {
        try {
            MainApp.showRegister();
        } catch (Exception e) {
            showError("Erreur de navigation.");
        }
    }

    private void showError(String msg) {
        statusLabel.setText(msg);
        statusLabel.setStyle("-fx-text-fill: #e74c3c;");
    }
}
