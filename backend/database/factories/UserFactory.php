<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'prenom' => fake()->firstName(),
            'nom' => fake()->lastName(),
            'contact' => fake()->numerify('06########'),
            'email' => fake()->unique()->safeEmail(),
            'mot_de_passe' => Hash::make('Password123!'),
            'role' => fake()->randomElement(['apprenant', 'formateur']),
        ];
    }
}
