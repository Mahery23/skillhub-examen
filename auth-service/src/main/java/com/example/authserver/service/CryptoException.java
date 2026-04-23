package com.example.authserver.service;

/**
 * Exception levée lors d'une erreur de chiffrement ou déchiffrement AES.
 */
public class CryptoException extends Exception {

    public CryptoException(String message, Throwable cause) {
        super(message, cause);
    }
}