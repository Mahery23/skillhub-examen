package com.example.authserver.repository;

import com.example.authserver.entity.AuthNonce;
import com.example.authserver.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

/**
 * Repository JPA pour l'entité {@link AuthNonce}.
 */
@Repository
public interface AuthNonceRepository extends JpaRepository<AuthNonce, Long> {

    /**
     * Recherche un nonce pour un utilisateur donné.
     *
     * @param user  l'utilisateur
     * @param nonce la valeur du nonce
     * @return un Optional contenant le nonce s'il existe
     */
    Optional<AuthNonce> findByUserAndNonce(User user, String nonce);

    /**
     * Supprime les nonces expirés (nettoyage périodique optionnel).
     *
     * @param now date/heure de référence
     */
    @Modifying
    @Transactional
    @Query("DELETE FROM AuthNonce n WHERE n.expiresAt < :now")
    void deleteExpiredNonces(LocalDateTime now);
}
