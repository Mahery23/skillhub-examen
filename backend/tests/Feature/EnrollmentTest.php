<?php

namespace Tests\Feature;

use App\Models\Enrollment;
use App\Models\Formation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EnrollmentTest extends TestCase
{
    use RefreshDatabase;

    public function test_apprenant_can_enroll_in_a_formation(): void
    {
        $apprenant = User::factory()->apprenant()->create();
        $formation = Formation::factory()->create();

        $response = $this->withSpringAuth($apprenant->email, 'apprenant')
            ->postJson("/api/formations/{$formation->id}/inscription");

        $response->assertStatus(201)
            ->assertJsonStructure(['message', 'enrollment' => ['id', 'utilisateur_id', 'formation_id', 'progression']])
            ->assertJsonPath('enrollment.progression', 0);
    }

    public function test_apprenant_cannot_enroll_twice_in_same_formation(): void
    {
        $apprenant = User::factory()->apprenant()->create();
        $formation = Formation::factory()->create();
        Enrollment::factory()->create([
            'utilisateur_id' => $apprenant->id,
            'formation_id'   => $formation->id,
        ]);

        $response = $this->withSpringAuth($apprenant->email, 'apprenant')
            ->postJson("/api/formations/{$formation->id}/inscription");

        $response->assertStatus(409)
            ->assertJsonPath('message', 'Vous suivez déjà cette formation.');
    }

    public function test_enrollment_requires_existing_formation(): void
    {
        $apprenant = User::factory()->apprenant()->create();

        $this->withSpringAuth($apprenant->email, 'apprenant')
            ->postJson('/api/formations/999999/inscription')
            ->assertStatus(404);
    }

    public function test_apprenant_can_unsubscribe_from_a_formation(): void
    {
        $apprenant = User::factory()->apprenant()->create();
        $formation = Formation::factory()->create();
        $enrollment = Enrollment::factory()->create([
            'utilisateur_id' => $apprenant->id,
            'formation_id'   => $formation->id,
        ]);

        $this->withSpringAuth($apprenant->email, 'apprenant')
            ->deleteJson("/api/formations/{$formation->id}/inscription")
            ->assertStatus(200);

        $this->assertDatabaseMissing('enrollments', ['id' => $enrollment->id]);
    }

    public function test_unsubscribe_returns_404_when_not_enrolled(): void
    {
        $apprenant = User::factory()->apprenant()->create();
        $formation = Formation::factory()->create();

        $this->withSpringAuth($apprenant->email, 'apprenant')
            ->deleteJson("/api/formations/{$formation->id}/inscription")
            ->assertStatus(404);
    }

    public function test_mes_formations_returns_only_own_enrollments(): void
    {
        $alice = User::factory()->apprenant()->create();
        $bob   = User::factory()->apprenant()->create();

        $formationA = Formation::factory()->create();
        $formationB = Formation::factory()->create();

        Enrollment::factory()->create(['utilisateur_id' => $alice->id, 'formation_id' => $formationA->id]);
        Enrollment::factory()->create(['utilisateur_id' => $bob->id,   'formation_id' => $formationB->id]);

        $response = $this->withSpringAuth($alice->email, 'apprenant')
            ->getJson('/api/apprenant/formations');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'formations')
            ->assertJsonPath('formations.0.formation.id', $formationA->id);
    }

    public function test_mes_formations_empty_for_new_apprenant(): void
    {
        $apprenant = User::factory()->apprenant()->create();

        $this->withSpringAuth($apprenant->email, 'apprenant')
            ->getJson('/api/apprenant/formations')
            ->assertStatus(200)
            ->assertJsonCount(0, 'formations');
    }

    /**
     * Règle métier : un apprenant ne peut pas s'inscrire à plus de 5 formations simultanément.
     * Tentative d'une 6ème inscription → 400 Bad Request.
     */
    public function test_apprenant_cannot_enroll_in_more_than_5_formations(): void
    {
        $apprenant = User::factory()->apprenant()->create();

        // Créer 5 formations et inscrire l'apprenant à chacune
        Formation::factory()->count(5)->create()->each(function ($formation) use ($apprenant) {
            Enrollment::factory()->create([
                'utilisateur_id' => $apprenant->id,
                'formation_id'   => $formation->id,
            ]);
        });

        // Tenter une 6ème inscription
        $sixieme = Formation::factory()->create();

        $this->withSpringAuth($apprenant->email, 'apprenant')
            ->postJson("/api/formations/{$sixieme->id}/inscription")
            ->assertStatus(400)
            ->assertJsonPath('message', 'Vous ne pouvez pas vous inscrire à plus de 5 formations simultanément.');
    }
}