<?php

namespace Database\Factories;

use App\Models\Formation;
use App\Models\Module;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Factory pour le modele Module.
 *
 * Attention : la migration a une contrainte UNIQUE(formation_id, ordre).
 * Si on cree plusieurs modules pour la MEME formation avec la valeur
 * aleatoire par defaut, on risque (rarement) une collision.
 * Bonne pratique dans les tests : on passe explicitement 'ordre' =>
 * pour eviter toute ambiguite, comme on le fait dans ModuleTest.
 *
 * @extends Factory<Module>
 */
class ModuleFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'titre' => fake()->sentence(3),
            'contenu' => fake()->paragraphs(2, true),
            // Lazy factory : cree une Formation (avec son formateur) a la volee.
            'formation_id' => Formation::factory(),
            // Intervalle large pour minimiser les collisions accidentelles.
            // Les tests critiques sur l'ordre passent explicitement leur valeur.
            'ordre' => fake()->numberBetween(1, 100),
        ];
    }
}
