<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Gère l'authentification via le microservice Spring Boot (auth-service).
 * Laravel ne gère plus les mots de passe — il délègue au auth-service.
 */
class AuthController extends Controller
{
    /** URL de base du auth-service Spring Boot */
    private string $authServiceUrl;

    public function __construct()
    {
        $this->authServiceUrl = env('AUTH_SERVICE_URL', 'http://auth-service:8080');
    }

    /**
     * Inscription : transfère la demande au auth-service.
     * POST /api/register
     * Body: { prenom, nom, contact, email, password, role }
     */
    public function register(Request $request): JsonResponse
    {
        $request->validate([
            'prenom'   => ['required', 'string', 'max:100'],
            'nom'      => ['required', 'string', 'max:100'],
            'contact'  => ['required', 'string', 'max:30'],
            'email'    => ['required', 'email'],
            'password' => ['required', 'string', 'min:8'],
            'role'     => ['required', 'in:apprenant,formateur'],
        ]);

        // Appel au auth-service Spring Boot
        $response = $this->callAuthService('POST', '/api/auth/register', [
            'email'    => $request->email,
            'password' => $request->password,
            'name'     => trim($request->prenom . ' ' . $request->nom),
            'role'     => $request->role,
        ]);

        if ($response['status'] !== 200) {
            return response()->json([
                'message' => $response['body']['message'] ?? 'Erreur lors de l\'inscription.',
            ], $response['status']);
        }

        app(ActivityLogService::class)->log('user.registered', [
            'email' => $request->email,
            'role'  => $request->role,
        ]);

        return response()->json([
            'message' => 'Inscription réussie. Vous pouvez maintenant vous connecter.',
        ], 201);
    }

    /**
     * Étape 1 du login HMAC : récupère le nonce depuis le auth-service.
     * GET /api/challenge?email=...
     */
    public function challenge(Request $request): JsonResponse
    {
        $request->validate(['email' => ['required', 'email']]);

        $response = $this->callAuthService('GET', '/api/auth/challenge?email=' . urlencode($request->email));

        return response()->json($response['body'], $response['status']);
    }

    /**
     * Étape 2 du login HMAC : envoie la preuve HMAC au auth-service et retourne le JWT.
     * POST /api/login
     * Body: { email, nonce, timestamp, hmac }
     */
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email'     => ['required', 'email'],
            'nonce'     => ['required', 'string'],
            'timestamp' => ['required', 'integer'],
            'hmac'      => ['required', 'string'],
        ]);

        $response = $this->callAuthService('POST', '/api/auth/login', $request->only([
            'email', 'nonce', 'timestamp', 'hmac',
        ]));

        if ($response['status'] !== 200) {
            return response()->json(['message' => 'Identifiants invalides.'], 401);
        }

        app(ActivityLogService::class)->log('user.logged_in', [
            'email' => $request->email,
        ]);

        // On retourne directement le JWT émis par Spring Boot
        return response()->json($response['body']);
    }

    /**
     * Retourne le profil de l'utilisateur à partir du JWT Spring Boot.
     * GET /api/profile — protégé par le middleware spring.auth
     */
    public function profile(Request $request): JsonResponse
    {
        return response()->json([
            'user' => [
                'email' => $request->attributes->get('auth_email'),
                'role'  => $request->attributes->get('auth_role'),
                'name'  => $request->attributes->get('auth_name'),
            ],
        ]);
    }

    /**
     * Logout côté client — le JWT Spring Boot est stateless, pas de blacklist.
     * Le frontend doit supprimer le token de son côté.
     */
    public function logout(): JsonResponse
    {
        return response()->json(['message' => 'Déconnexion réussie.']);
    }

    /**
     * Appelle le auth-service Spring Boot via HTTP.
     *
     * @return array{status: int, body: array}
     */
    private function callAuthService(string $method, string $path, array $body = []): array
    {
        $url = $this->authServiceUrl . $path;

        $opts = [
            'http' => [
                'method'  => $method,
                'header'  => "Content-Type: application/json\r\nAccept: application/json\r\n",
                'content' => $method === 'GET' ? null : json_encode($body),
                'ignore_errors' => true, // pour récupérer les réponses 4xx/5xx
            ],
        ];

        $result   = file_get_contents($url, false, stream_context_create($opts));
        $decoded  = json_decode($result ?: '{}', true);

        // Récupérer le code HTTP depuis les headers de réponse
        $httpCode = 200;
        if (isset($http_response_header)) {
            preg_match('/HTTP\/\d\.\d (\d+)/', $http_response_header[0], $matches);
            $httpCode = (int) ($matches[1] ?? 200);
        }

        return ['status' => $httpCode, 'body' => $decoded];
    }
}
