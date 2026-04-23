<?php

namespace Database\Factories;

use App\Models\Enrollment;
use App\Models\Formation;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Factory pour le modele Enrollment (table pivot apprenant <-> formation).
 *
 * Par defaut, la factory cree :
 *   - un User apprenant
 *   - une Formation (et son formateur via FormationFactory)
 *   - progression a 0
 *
 * Pour tester un cas metier precis (ex: Alice inscrite a la formation X),
 * on override utilisateur_id et formation_id avec des instances existantes :
 *   Enrollment::factory()->create([
 *     'utilisateur_id' => $alice->id,
 *     'formation_id'   => $formationX->id,
 *   ]);
 *
 * @extends Factory<Enrollment>
 */
class EnrollmentFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            // On force un apprenant : seuls les apprenants peuvent s'inscrire
            // (cf. CheckRole middleware + EnrollmentController::ensureLearner).
            'utilisateur_id' => User::factory()->apprenant(),
            'formation_id' => Formation::factory(),
            // 0 = tout debut de formation (aucun module complete).
            'progression' => 0,
        ];
    }
}
