package com.example.authserver.fx;

import javafx.application.Application;
import javafx.fxml.FXMLLoader;
import javafx.scene.Scene;
import javafx.stage.Stage;

/**
 * Point d'entrée de l'interface JavaFX.
 * Lance l'écran de login au démarrage.
 */
public class MainApp extends Application {

    private static Stage primaryStage;

    @Override
    public void start(Stage stage) throws Exception {
        primaryStage = stage;
        primaryStage.setTitle("Serveur d'Authentification — TP3");
        primaryStage.setResizable(false);
        showLogin();
        primaryStage.show();
    }

    public static void showLogin() throws Exception {
        FXMLLoader loader = new FXMLLoader(
            MainApp.class.getResource("/com/example/authserver/fx/login.fxml"));
        Scene scene = new Scene(loader.load(), 420, 480);
        scene.getStylesheets().add(
            MainApp.class.getResource("/com/example/authserver/fx/style.css").toExternalForm());
        primaryStage.setScene(scene);
    }

    public static void showRegister() throws Exception {
        FXMLLoader loader = new FXMLLoader(
            MainApp.class.getResource("/com/example/authserver/fx/register.fxml"));
        Scene scene = new Scene(loader.load(), 420, 480);
        scene.getStylesheets().add(
            MainApp.class.getResource("/com/example/authserver/fx/style.css").toExternalForm());
        primaryStage.setScene(scene);
    }

    public static void showProfile(String email, String token, long expiresAt) throws Exception {
        FXMLLoader loader = new FXMLLoader(
            MainApp.class.getResource("/com/example/authserver/fx/profile.fxml"));
        Scene scene = new Scene(loader.load(), 480, 520);
        scene.getStylesheets().add(
            MainApp.class.getResource("/com/example/authserver/fx/style.css").toExternalForm());
        ProfileController controller = loader.getController();
        controller.setData(email, token, expiresAt);
        primaryStage.setScene(scene);
    }

    public static void main(String[] args) {
        launch(args);
    }
}
