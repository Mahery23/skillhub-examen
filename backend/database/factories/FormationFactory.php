<?php

namespace Database\Factories;

use App\Models\Formation;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Factory pour le modele Formation.
 *
 * Par defaut, la factory cree automatiquement un User formateur et lie la
 * formation a cet utilisateur via formateur_id. Pratique pour les tests :
 *   Formation::factory()->create()
 * cree d'un coup un formateur + sa formation en 1 ligne.
 *
 * Si on veut lier la formation a un formateur precis (ex: test d'ownership) :
 *   Formation::factory()->create(['formateur_id' => $monFormateur->id])
 *
 * @extends Factory<Formation>
 */
class FormationFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'titre' => fake()->sentence(4),
            'description' => fake()->paragraph(3),
            // Categorie et niveau : on pioche dans les listes autorisees par le
            // FormationController (CATEGORIES et NIVEAUX). Sinon la validation
            // du controller refuserait ces valeurs.
            'categorie' => fake()->randomElement([
                'Développement web',
                'Data',
                'Design',
                'Marketing',
                'DevOps',
            ]),
            'niveau' => fake()->randomElement([
                'Débutant',
                'Intermédiaire',
                'Avancé',
            ]),
            // On passe une "lazy factory" : elle ne sera resolue que quand on
            // va reellement creer la formation (pas a l'initialisation de la
            // factory elle-meme). Permet d'avoir un formateur unique par Formation.
            'formateur_id' => User::factory()->formateur(),
            'nombre_de_vues' => 0,
        ];
    }
}
