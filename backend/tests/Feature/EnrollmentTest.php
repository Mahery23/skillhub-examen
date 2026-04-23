<?php

namespace Tests\Feature;

use App\Models\Enrollment;
use App\Models\Formation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Tests complets du EnrollmentController.
 *
 * Couvre les 3 endpoints apprenant :
 *  - POST   /api/formations/{id}/inscription -> s'inscrire
 *  - DELETE /api/formations/{id}/inscription -> se desinscrire
 *  - GET    /api/apprenant/formations         -> liste de mes formations
 *
 * Regles metier cles :
 *  - Un apprenant ne peut pas s'inscrire DEUX fois a la meme formation (409).
 *  - On ne peut se desinscrire que d'une formation deja suivie (404 sinon).
 *  - "mes formations" doit etre filtre sur utilisateur_id = apprenant connecte
 *    (securite : pas de fuite de donnees entre apprenants).
 */
class EnrollmentTest extends TestCase
{
    use RefreshDatabase;

    // ─────────────────────────────────────────────────────────────
    // POST /api/formations/{id}/inscription
    // ─────────────────────────────────────────────────────────────

    /**
     * Happy path : inscription reussie -> 201 + ligne en DB + progression a 0.
     */
    public function test_apprenant_can_enroll_in_a_formation(): void
    {
        $apprenant = User::factory()->apprenant()->create();
        $formation = Formation::factory()->create();
        $token = auth('api')->login($apprenant);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/formations/{$formation->id}/inscription");

        $response->assertStatus(201)
            ->assertJsonStructure(['message', 'enrollment' => ['id', 'utilisateur_id', 'formation_id', 'progression']])
            ->assertJsonPath('enrollment.progression', 0);

        $this->assertDatabaseHas('enrollments', [
            'utilisateur_id' => $apprenant->id,
            'formation_id' => $formation->id,
        ]);
    }

    /**
     * Si l'apprenant est deja inscrit, la seconde tentative retourne 409
     * (Conflict) avec un message explicite. On utilise 409 plutot que 422
     * car ce n'est pas une erreur de validation mais un conflit d'etat.
     */
    public function test_apprenant_cannot_enroll_twice_in_same_formation(): void
    {
        $apprenant = User::factory()->apprenant()->create();
        $formation = Formation::factory()->create();
        Enrollment::factory()->create([
            'utilisateur_id' => $apprenant->id,
            'formation_id' => $formation->id,
        ]);
        $token = auth('api')->login($apprenant);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/formations/{$formation->id}/inscription");

        $response->assertStatus(409)
            ->assertJsonPath('message', 'Vous suivez déjà cette formation.');
    }

    /**
     * Route Model Binding : formation inexistante -> 404 auto.
     */
    public function test_enrollment_requires_existing_formation(): void
    {
        $apprenant = User::factory()->apprenant()->create();
        $token = auth('api')->login($apprenant);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/formations/999999/inscription');

        $response->assertStatus(404);
    }

    // ─────────────────────────────────────────────────────────────
    // DELETE /api/formations/{id}/inscription
    // ─────────────────────────────────────────────────────────────

    /**
     * Desinscription reussie -> la ligne enrollment est supprimee.
     */
    public function test_apprenant_can_unsubscribe_from_a_formation(): void
    {
        $apprenant = User::factory()->apprenant()->create();
        $formation = Formation::factory()->create();
        $enrollment = Enrollment::factory()->create([
            'utilisateur_id' => $apprenant->id,
            'formation_id' => $formation->id,
        ]);
        $token = auth('api')->login($apprenant);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->deleteJson("/api/formations/{$formation->id}/inscription");

        $response->assertStatus(200);
        $this->assertDatabaseMissing('enrollments', ['id' => $enrollment->id]);
    }

    /**
     * Tenter de se desinscrire d'une formation jamais suivie -> 404.
     */
    public function test_unsubscribe_returns_404_when_not_enrolled(): void
    {
        $apprenant = User::factory()->apprenant()->create();
        $formation = Formation::factory()->create();
        $token = auth('api')->login($apprenant);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->deleteJson("/api/formations/{$formation->id}/inscription");

        $response->assertStatus(404);
    }

    // ─────────────────────────────────────────────────────────────
    // GET /api/apprenant/formations  (liste perso)
    // ─────────────────────────────────────────────────────────────

    /**
     * Test de securite crucial : "mes formations" doit renvoyer UNIQUEMENT
     * les inscriptions de l'apprenant connecte, pas celles des autres.
     * Sans cette isolation, Alice verrait les formations de Bob.
     */
    public function test_mes_formations_returns_only_own_enrollments(): void
    {
        $alice = User::factory()->apprenant()->create();
        $bob = User::factory()->apprenant()->create();

        $formationA = Formation::factory()->create();
        $formationB = Formation::factory()->create();

        Enrollment::factory()->create([
            'utilisateur_id' => $alice->id,
            'formation_id' => $formationA->id,
        ]);
        Enrollment::factory()->create([
            'utilisateur_id' => $bob->id,
            'formation_id' => $formationB->id,
        ]);

        // On se connecte en tant qu'Alice. On doit voir UNIQUEMENT sa formation.
        $token = auth('api')->login($alice);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/apprenant/formations');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'formations')
            ->assertJsonPath('formations.0.formation.id', $formationA->id);
    }

    /**
     * Un apprenant sans inscription doit recevoir une liste vide (pas une 404).
     */
    public function test_mes_formations_empty_for_new_apprenant(): void
    {
        $apprenant = User::factory()->apprenant()->create();
        $token = auth('api')->login($apprenant);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/apprenant/formations');

        $response->assertStatus(200)->assertJsonCount(0, 'formations');
    }
}
