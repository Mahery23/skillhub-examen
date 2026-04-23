<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Tests de l'authentification JWT SkillHub.
 *
 * Couvre tous les endpoints publics et proteges du AuthController :
 *  - POST   /api/register  -> creation de compte + JWT
 *  - POST   /api/login     -> echange credentials -> JWT
 *  - GET    /api/profile   -> recupere le user depuis le token
 *  - POST   /api/logout    -> invalide le token JWT courant
 *
 * On valide a la fois les "happy paths" et les erreurs (validation,
 * credentials invalides, token absent ou forge).
 */
class AuthTest extends TestCase
{
    // RefreshDatabase : on repart d'une base SQLite :memory: propre pour
    // CHAQUE test. Garantit l'isolation et evite les effets de bord.
    use RefreshDatabase;

    // Endpoints de l'API d'authentification (extraits en constantes pour
    // eviter la duplication de chaines - regle SonarQube
    // "Define a constant instead of duplicating this literal N times").
    private const REGISTER_ENDPOINT = '/api/register';
    private const LOGIN_ENDPOINT    = '/api/login';
    private const PROFILE_ENDPOINT  = '/api/profile';

    // Valeurs de test reutilisees dans plusieurs cas.
    private const TEST_EMAIL    = 'jean.dupont@example.com';
    private const TEST_PASSWORD = 'Password123!';

    // ─────────────────────────────────────────────────────────────
    // REGISTER
    // ─────────────────────────────────────────────────────────────

    /**
     * Happy path d'inscription : payload valide -> 201 + token + user persiste.
     */
    public function test_register_creates_a_user_and_returns_a_jwt(): void
    {
        $response = $this->postJson(self::REGISTER_ENDPOINT, [
            'prenom' => 'Jean',
            'nom' => 'Dupont',
            'contact' => '+33612345678',
            'email' => self::TEST_EMAIL,
            'password' => self::TEST_PASSWORD,
            'role' => 'apprenant',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'message',
                'token',
                'user' => ['id', 'name', 'prenom', 'nom', 'contact', 'email', 'role'],
            ])
            ->assertJsonPath('user.email', self::TEST_EMAIL)
            ->assertJsonPath('user.role', 'apprenant');

        // On verifie aussi la persistance en base : le user doit vraiment exister.
        $this->assertDatabaseHas('users', [
            'email' => self::TEST_EMAIL,
            'role' => 'apprenant',
        ]);
    }

    /**
     * Verifie que le role "formateur" est aussi accepte au register
     * (seules valeurs autorisees : apprenant, formateur).
     */
    public function test_register_can_create_a_formateur(): void
    {
        $response = $this->postJson(self::REGISTER_ENDPOINT, [
            'prenom' => 'Alice',
            'nom' => 'Martin',
            'contact' => '0612345678',
            'email' => 'alice@example.com',
            'password' => self::TEST_PASSWORD,
            'role' => 'formateur',
        ]);

        $response->assertStatus(201)->assertJsonPath('user.role', 'formateur');
    }

    /**
     * Verifie que chaque regle de validation leve bien une erreur.
     * On envoie un payload INVALIDE sur tous les champs en meme temps :
     * prenom/nom vides, contact avec des lettres, email invalide,
     * password trop court (<8), role inconnu ("admin" n'est pas dans la whitelist).
     */
    public function test_register_rejects_invalid_payload(): void
    {
        $response = $this->postJson(self::REGISTER_ENDPOINT, [
            'prenom' => '',
            'nom' => '',
            'contact' => 'abc',
            'email' => 'not-an-email',
            'password' => '123',
            'role' => 'admin',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['prenom', 'nom', 'contact', 'email', 'password', 'role']);
    }

    /**
     * La contrainte "unique:users,email" doit empecher le doublon.
     * Cas metier : deux personnes ne peuvent pas avoir le meme email.
     */
    public function test_register_rejects_duplicate_email(): void
    {
        // On seed un user existant via factory.
        User::factory()->create(['email' => 'dup@example.com']);

        $response = $this->postJson(self::REGISTER_ENDPOINT, [
            'prenom' => 'Bob',
            'nom' => 'Durand',
            'contact' => '0712345678',
            'email' => 'dup@example.com',
            'password' => self::TEST_PASSWORD,
            'role' => 'apprenant',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['email']);
    }

    // ─────────────────────────────────────────────────────────────
    // LOGIN
    // ─────────────────────────────────────────────────────────────

    /**
     * Happy path : email/password corrects -> 200 + token JWT + infos user.
     * Le cast 'hashed' sur le model hashe automatiquement le mot de passe
     * quand on le passe en clair -> auth('api')->attempt() peut le verifier.
     */
    public function test_login_returns_a_jwt_with_valid_credentials(): void
    {
        $user = User::factory()->create([
            'email' => 'login@example.com',
            'mot_de_passe' => self::TEST_PASSWORD,
            'role' => 'apprenant',
        ]);

        $response = $this->postJson(self::LOGIN_ENDPOINT, [
            'email' => $user->email,
            'password' => self::TEST_PASSWORD,
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure(['message', 'token', 'user' => ['id', 'email', 'role']])
            ->assertJsonPath('user.email', 'login@example.com');
    }

    /**
     * Email correct, mais mot de passe different -> 401, pas 404.
     * On NE doit PAS divulguer si l'email existe (securite : pas de
     * "user enumeration attack").
     */
    public function test_login_rejects_invalid_password(): void
    {
        User::factory()->create([
            'email' => 'wrong@example.com',
            'mot_de_passe' => self::TEST_PASSWORD,
        ]);

        $response = $this->postJson(self::LOGIN_ENDPOINT, [
            'email' => 'wrong@example.com',
            'password' => 'WrongPassword',
        ]);

        $response->assertStatus(401)->assertJsonPath('message', 'Invalid credentials');
    }

    /**
     * Email qui n'existe pas en base -> aussi 401 (meme message qu'un mauvais
     * mot de passe, pour eviter la divulgation des comptes existants).
     */
    public function test_login_rejects_unknown_email(): void
    {
        $response = $this->postJson(self::LOGIN_ENDPOINT, [
            'email' => 'ghost@example.com',
            'password' => self::TEST_PASSWORD,
        ]);

        $response->assertStatus(401);
    }

    /**
     * Payload vide -> 422 avec les 2 champs manquants.
     */
    public function test_login_validates_payload(): void
    {
        $response = $this->postJson(self::LOGIN_ENDPOINT, []);

        $response->assertStatus(422)->assertJsonValidationErrors(['email', 'password']);
    }

    // ─────────────────────────────────────────────────────────────
    // PROFILE (route protegee par auth:api)
    // ─────────────────────────────────────────────────────────────

    /**
     * Token valide -> retourne le user associe.
     * auth('api')->login($user) genere un JWT pour ce user en test,
     * sans passer par le formulaire login.
     */
    public function test_profile_returns_authenticated_user(): void
    {
        $user = User::factory()->create(['role' => 'formateur']);
        $token = auth('api')->login($user);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson(self::PROFILE_ENDPOINT);

        $response->assertStatus(200)
            ->assertJsonPath('user.id', $user->id)
            ->assertJsonPath('user.role', 'formateur');
    }

    /**
     * Pas de header Authorization -> 401 via exception handler defini
     * dans bootstrap/app.php (AuthenticationException -> JSON 401).
     */
    public function test_profile_requires_authentication(): void
    {
        $response = $this->getJson(self::PROFILE_ENDPOINT);

        $response->assertStatus(401)->assertJsonPath('message', 'Unauthenticated.');
    }

    /**
     * Token forge ou corrompu -> 401, pas 500.
     * Important : une chaine aleatoire ne doit jamais casser l'app.
     */
    public function test_profile_rejects_invalid_token(): void
    {
        $response = $this->withHeader('Authorization', 'Bearer not-a-valid-jwt')
            ->getJson(self::PROFILE_ENDPOINT);

        $response->assertStatus(401);
    }

    // ─────────────────────────────────────────────────────────────
    // LOGOUT
    // ─────────────────────────────────────────────────────────────

    /**
     * Logout doit repondre 200 et invalider le token via auth('api')->logout().
     */
    public function test_logout_invalidates_token(): void
    {
        $user = User::factory()->create();
        $token = auth('api')->login($user);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/logout');

        $response->assertStatus(200)->assertJsonPath('message', 'Logout successful');
    }

    /**
     * Logout sans token -> 401 (on ne peut pas se deconnecter sans etre connecte).
     */
    public function test_logout_requires_authentication(): void
    {
        $response = $this->postJson('/api/logout');

        $response->assertStatus(401);
    }
}
