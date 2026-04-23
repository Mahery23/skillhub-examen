<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;

/**
 * Gère l'authentification API SkillHub en JWT.
 *
 * Ce contrôleur centralise l'inscription, la connexion,
 * la récupération du profil connecté et la déconnexion.
 */
class AuthController extends Controller
{
    /**
     * Crée un utilisateur SkillHub puis retourne un token JWT.
     *
     * @param  Request  $request  Données d'inscription attendues: prenom, nom, contact, email, password, role.
     */
    public function register(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'prenom' => ['required', 'string', 'max:100'],
            'nom' => ['required', 'string', 'max:100'],
            'contact' => ['required', 'string', 'max:30', 'regex:/^\+?[0-9\s\-().]{8,20}$/'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['required', 'in:apprenant,formateur'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation error',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = User::create([
            'prenom' => $request->string('prenom')->toString(),
            'nom' => $request->string('nom')->toString(),
            'contact' => $request->string('contact')->toString(),
            'email' => $request->string('email')->toString(),
            'mot_de_passe' => $request->string('password')->toString(),
            'role' => $request->string('role')->toString(),
        ]);

        $token = JWTAuth::fromUser($user);

        app(ActivityLogService::class)->log('user.registered', [
            'user_id' => $user->id,
            'role' => $user->role,
            'email' => $user->email,
        ]);

        return response()->json([
            'message' => 'User registered successfully',
            'token' => $token,
            'user' => $this->formatUser($user),
        ], 201);
    }

    /**
     * Authentifie un utilisateur et retourne son token JWT.
     *
     * @param  Request  $request  Identifiants attendus: email et password.
     */
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        if (! $token = auth('api')->attempt($credentials)) {
            return response()->json([
                'message' => 'Invalid credentials',
            ], 401);
        }

        /** @var User $user */
        $user = auth('api')->user();

        app(ActivityLogService::class)->log('user.logged_in', [
            'user_id' => $user->id,
            'role' => $user->role,
            'email' => $user->email,
        ]);

        return response()->json([
            'message' => 'Login successful',
            'token' => $token,
            'user' => $this->formatUser($user),
        ]);
    }

    /**
     * Retourne le profil de l'utilisateur authentifié via JWT.
     */
    public function profile(): JsonResponse
    {
        $user = auth('api')->user();

        return response()->json([
            'user' => $this->formatUser($user),
        ]);
    }

    /**
     * Invalide le token JWT courant.
     */
    public function logout(): JsonResponse
    {
        $user = auth('api')->user();

        if ($user) {
            app(ActivityLogService::class)->log('user.logged_out', [
                'user_id' => $user->id,
                'role' => $user->role,
                'email' => $user->email,
            ]);
        }

        auth('api')->logout();

        return response()->json([
            'message' => 'Logout successful',
        ]);
    }

    /**
     * Normalise le modèle User vers le format JSON attendu par le frontend.
     *
     * @param  User|null  $user  Utilisateur à convertir.
     * @return array<string, mixed>
     */
    private function formatUser(?User $user): array
    {
        if (! $user) {
            return [];
        }

        return [
            'id' => $user->id,
            'name' => trim(($user->prenom ?? '') . ' ' . ($user->nom ?? '')) ?: $user->nom,
            'prenom' => $user->prenom,
            'nom' => $user->nom,
            'contact' => $user->contact,
            'email' => $user->email,
            'role' => $user->role,
            'date_creation' => $user->date_creation,
        ];
    }
}

