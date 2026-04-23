<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Firebase\JWT\ExpiredException;
use Firebase\JWT\SignatureInvalidException;

/**
 * Valide le JWT émis par le auth-service Spring Boot.
 * Injecte email, role et name dans la requête pour les controllers.
 */
class VerifySpringJWT
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $token = $request->bearerToken();

        if (!$token) {
            return response()->json(['message' => 'Token manquant.'], 401);
        }

        try {
            $secret = env('JWT_SECRET');
            $decoded = JWT::decode($token, new Key($secret, 'HS256'));
        } catch (ExpiredException) {
            return response()->json(['message' => 'Token expiré.'], 401);
        } catch (SignatureInvalidException) {
            return response()->json(['message' => 'Signature invalide.'], 401);
        } catch (\Exception) {
            return response()->json(['message' => 'Token invalide.'], 401);
        }

        // Injecter les infos dans la requête pour les controllers
        $request->attributes->set('auth_email', $decoded->sub);
        $request->attributes->set('auth_role',  $decoded->role ?? '');
        $request->attributes->set('auth_name',  $decoded->name ?? '');

        // Vérification du rôle si spécifié
        if (!empty($roles) && !in_array($decoded->role ?? '', $roles, true)) {
            return response()->json(['message' => 'Accès refusé pour ce rôle.'], 403);
        }

        return $next($request);
    }
}