package com.example.authserver.service;

import com.example.authserver.entity.User;
import com.example.authserver.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Service de gestion des utilisateurs.
 */
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final CryptoService cryptoService;

    /**
     * Enregistre un nouvel utilisateur en chiffrant son mot de passe avec AES.
     *
     * @param email    l'email de l'utilisateur
     * @param password le mot de passe en clair (sera chiffré avant stockage)
     * @return l'utilisateur persisté
     */
    public User register(String email, String password) throws CryptoException {
        User user = new User();
        user.setEmail(email);
        user.setPasswordEncrypted(cryptoService.encrypt(password));
        return userRepository.save(user);
    }
}
