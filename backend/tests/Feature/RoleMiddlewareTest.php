<?php

namespace Tests\Feature;

use App\Models\Formation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Tests du middleware App\Http\Middleware\CheckRole.
 *
 * Plutot que de tester le middleware en isolation (unit), on le teste
 * via les routes reelles qui l'utilisent ("check.role:formateur" et
 * "check.role:apprenant"). Avantage : on valide en meme temps que
 * l'alias est bien enregistre dans bootstrap/app.php.
 *
 * Matrice verifiee :
 *   +----------------------+-----------+-----------+---------------+
 *   |  Endpoint            | Formateur | Apprenant | Non connecte  |
 *   +----------------------+-----------+-----------+---------------+
 *   | POST /api/formations |    201    |    403    |     401       |
 *   | POST /.../inscription|    403    |    201    |     401       |
 *   +----------------------+-----------+-----------+---------------+
 */
class RoleMiddlewareTest extends TestCase
{
    use RefreshDatabase;

    // ─────────────────────────────────────────────────────────────
    // Endpoint formateur uniquement (POST /api/formations)
    // ─────────────────────────────────────────────────────────────

    /**
     * Cas nominal : un formateur peut creer une formation.
     */
    public function test_formateur_endpoint_allows_formateur(): void
    {
        $formateur = User::factory()->formateur()->create();
        $token = auth('api')->login($formateur);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/formations', [
                'titre' => 'Test formation',
                'description' => 'Une description valide pour la formation.',
                'categorie' => 'Data',
                'niveau' => 'Débutant',
            ]);

        $response->assertStatus(201);
    }

    /**
     * Un apprenant authentifie doit etre refuse avec 403 (pas 401).
     * 403 = "je sais qui tu es, mais tu n'as pas le bon role".
     */
    public function test_formateur_endpoint_rejects_apprenant(): void
    {
        $apprenant = User::factory()->apprenant()->create();
        $token = auth('api')->login($apprenant);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/formations', [
                'titre' => 'Test',
                'description' => 'Description',
                'categorie' => 'Data',
                'niveau' => 'Débutant',
            ]);

        $response->assertStatus(403)
            ->assertJsonPath('message', 'Accès refusé pour ce rôle.');
    }

    /**
     * Pas de token -> 401 avant meme d'arriver a CheckRole
     * (auth:api se declenche en premier dans la chaine de middlewares).
     */
    public function test_formateur_endpoint_rejects_unauthenticated_user(): void
    {
        $response = $this->postJson('/api/formations', [
            'titre' => 'Test',
            'description' => 'Description',
            'categorie' => 'Data',
            'niveau' => 'Débutant',
        ]);

        $response->assertStatus(401);
    }

    // ─────────────────────────────────────────────────────────────
    // Endpoint apprenant uniquement (POST /api/formations/{id}/inscription)
    // ─────────────────────────────────────────────────────────────

    /**
     * Cas nominal : un apprenant peut s'inscrire a une formation.
     */
    public function test_apprenant_endpoint_allows_apprenant(): void
    {
        $apprenant = User::factory()->apprenant()->create();
        $formation = Formation::factory()->create();
        $token = auth('api')->login($apprenant);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/formations/{$formation->id}/inscription");

        $response->assertStatus(201);
    }

    /**
     * Un formateur ne doit PAS pouvoir s'inscrire comme apprenant.
     * Symmetrique du test precedent.
     */
    public function test_apprenant_endpoint_rejects_formateur(): void
    {
        $formateur = User::factory()->formateur()->create();
        $formation = Formation::factory()->create();
        $token = auth('api')->login($formateur);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/formations/{$formation->id}/inscription");

        $response->assertStatus(403);
    }

    /**
     * Pas de token -> 401.
     */
    public function test_apprenant_endpoint_rejects_unauthenticated_user(): void
    {
        $formation = Formation::factory()->create();

        $response = $this->postJson("/api/formations/{$formation->id}/inscription");

        $response->assertStatus(401);
    }
}
