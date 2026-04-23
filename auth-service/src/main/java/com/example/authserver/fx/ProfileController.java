package com.example.authserver.fx;

import javafx.application.Platform;
import javafx.fxml.FXML;
import javafx.scene.control.*;
import javafx.scene.input.Clipboard;
import javafx.scene.input.ClipboardContent;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

/**
 * Controleur de l'ecran profil.
 * Affiche les informations de l'utilisateur connecte,
 * son token JWT, et permet le changement de mot de passe.
 */
public class ProfileController {

    @FXML private Label welcomeLabel;
    @FXML private Label emailLabel;
    @FXML private TextArea tokenArea;
    @FXML private Label expiresLabel;
    @FXML private Label copyLabel;

    // Champs changement de mot de passe
    @FXML private PasswordField oldPasswordField;
    @FXML private PasswordField newPasswordField;
    @FXML private PasswordField confirmPasswordField;
    @FXML private Button changeButton;
    @FXML private Label changeStatusLabel;

    private String token;
    private String email;

    /**
     * Initialise l'ecran profil avec les donnees recues apres login.
     */
    public void setData(String email, String token, long expiresAt) {
        this.token = token;
        this.email = email;

        welcomeLabel.setText("Bienvenue !");
        emailLabel.setText(email);
        tokenArea.setText(token);

        LocalDateTime expiry = LocalDateTime.ofInstant(
                Instant.ofEpochSecond(expiresAt), ZoneId.systemDefault());
        String formatted = expiry.format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss"));
        expiresLabel.setText("⏱ Expire le : " + formatted);
    }

    /**
     * Copie le token JWT dans le presse-papier.
     */
    @FXML
    public void copyToken() {
        ClipboardContent content = new ClipboardContent();
        content.putString(token);
        Clipboard.getSystemClipboard().setContent(content);
        copyLabel.setText("✅ Copie !");
        copyLabel.setStyle("-fx-text-fill: #27ae60;");

        Thread.ofVirtual().start(() -> {
            try {
                Thread.sleep(2000);
                Platform.runLater(() -> copyLabel.setText(""));
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        });
    }

    /**
     * Gere le changement de mot de passe.
     * Appelle l'API PUT /api/auth/change-password avec le token JWT.
     */
    @FXML
    public void handleChangePassword() {
        String oldPassword = oldPasswordField.getText();
        String newPassword = newPasswordField.getText();
        String confirmPassword = confirmPasswordField.getText();

        // Validation basique cote client
        if (oldPassword.isEmpty() || newPassword.isEmpty() || confirmPassword.isEmpty()) {
            showChangeError("Veuillez remplir tous les champs.");
            return;
        }
        if (!newPassword.equals(confirmPassword)) {
            showChangeError("Les mots de passe ne correspondent pas.");
            return;
        }

        changeButton.setDisable(true);
        changeStatusLabel.setText("Changement en cours...");
        changeStatusLabel.setStyle("-fx-text-fill: #888888;");

        Thread.ofVirtual().start(() -> {
            try {
                boolean success = AuthClient.changePassword(
                        token, oldPassword, newPassword, confirmPassword);

                Platform.runLater(() -> {
                    if (success) {
                        showChangeSuccess("✅ Mot de passe change avec succes !");
                        oldPasswordField.clear();
                        newPasswordField.clear();
                        confirmPasswordField.clear();
                    } else {
                        showChangeError("Echec : verifiez votre ancien mot de passe.");
                    }
                    changeButton.setDisable(false);
                });
            } catch (Exception e) {
                Platform.runLater(() -> {
                    showChangeError("Serveur inaccessible.");
                    changeButton.setDisable(false);
                });
            }
        });
    }

    /**
     * Deconnecte l'utilisateur et revient a l'ecran de login.
     */
    @FXML
    public void handleLogout() {
        try {
            MainApp.showLogin();
        } catch (Exception e) {
            showChangeError("Erreur de deconnexion.");
        }
    }

    private void showChangeError(String msg) {
        changeStatusLabel.setText(msg);
        changeStatusLabel.setStyle("-fx-text-fill: #e74c3c;");
    }

    private void showChangeSuccess(String msg) {
        changeStatusLabel.setText(msg);
        changeStatusLabel.setStyle("-fx-text-fill: #27ae60;");
    }
}
