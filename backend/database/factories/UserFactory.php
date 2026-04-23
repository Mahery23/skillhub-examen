<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Factory pour le modele User.
 *
 * Usage dans les tests :
 *   User::factory()->create()                   -> role aleatoire
 *   User::factory()->apprenant()->create()      -> force role = apprenant
 *   User::factory()->formateur()->create()      -> force role = formateur
 *   User::factory()->count(5)->create()         -> 5 users d'un coup
 *
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    /**
     * Definit les valeurs par defaut pour chaque User genere.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'prenom' => fake()->firstName(),
            'nom' => fake()->lastName(),
            // Format "06########" : matche la regex du register (+?[0-9\s\-().]{8,20})
            'contact' => fake()->numerify('06########'),
            // unique()->safeEmail() evite les doublons entre factories.
            'email' => fake()->unique()->safeEmail(),
            // Mot de passe en clair : le cast 'hashed' sur le model User le hashera
            // automatiquement a la persistance (cf. App\Models\User::casts()).
            // Cote tests, on peut donc faire directement :
            //   auth('api')->attempt(['email' => ..., 'password' => 'Password123!'])
            'mot_de_passe' => 'Password123!',
            'role' => fake()->randomElement(['apprenant', 'formateur']),
        ];
    }

    /**
     * State "apprenant" : a utiliser dans les tests ou on a besoin
     * d'un role apprenant deterministe (pas du random).
     */
    public function apprenant(): static
    {
        return $this->state(fn () => ['role' => 'apprenant']);
    }

    /**
     * State "formateur" : idem pour un formateur deterministe.
     */
    public function formateur(): static
    {
        return $this->state(fn () => ['role' => 'formateur']);
    }
}
