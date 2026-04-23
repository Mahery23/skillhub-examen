<?php

namespace Tests\Feature;

use App\Models\Formation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Tests complets du FormationController.
 *
 * On distingue 3 familles de tests :
 *   1. Consultation publique (index / show)      -> pas de token requis
 *   2. Compteur de vues (regle metier)            -> show()
 *   3. Mutations protegees (store/update/destroy) -> formateur proprietaire
 *
 * Le controller a une double garde sur les mutations :
 *   - Le middleware check.role:formateur (teste dans RoleMiddlewareTest)
 *   - La methode privee ensureTrainer() qui verifie aussi l'ownership
 * Du coup on teste explicitement les cas "formateur non proprietaire -> 403".
 */
class FormationTest extends TestCase
{
    use RefreshDatabase;

    // ─────────────────────────────────────────────────────────────
    // GET /api/formations  (catalogue public)
    // ─────────────────────────────────────────────────────────────

    /**
     * Le catalogue doit renvoyer toutes les formations au format attendu.
     */
    public function test_index_returns_public_list_of_formations(): void
    {
        Formation::factory()->count(3)->create();

        $response = $this->getJson('/api/formations');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    ['id', 'titre', 'niveau', 'categorie', 'vues', 'apprenants', 'formateur'],
                ],
            ])
            ->assertJsonCount(3, 'data');
    }

    /**
     * Le filtre ?search=... doit retourner uniquement les formations
     * dont le titre OU la description matche.
     */
    public function test_index_filters_by_search(): void
    {
        Formation::factory()->create(['titre' => 'Cours React avance']);
        Formation::factory()->create(['titre' => 'Cours Python debutant']);

        $response = $this->getJson('/api/formations?search=React');

        $response->assertStatus(200)->assertJsonCount(1, 'data');
    }

    /**
     * Le filtre ?categorie=... est un "equals", pas un "like".
     */
    public function test_index_filters_by_categorie(): void
    {
        Formation::factory()->create(['categorie' => 'Data']);
        Formation::factory()->create(['categorie' => 'Design']);

        $response = $this->getJson('/api/formations?categorie=Data');

        $response->assertStatus(200)->assertJsonCount(1, 'data');
    }

    // ─────────────────────────────────────────────────────────────
    // GET /api/formations/{id}  (detail + compteur de vues)
    // ─────────────────────────────────────────────────────────────

    /**
     * Happy path du detail : structure + bon id.
     */
    public function test_show_returns_a_formation(): void
    {
        $formation = Formation::factory()->create();

        $response = $this->getJson("/api/formations/{$formation->id}");

        $response->assertStatus(200)
            ->assertJsonPath('formation.id', $formation->id)
            ->assertJsonPath('formation.titre', $formation->titre);
    }

    /**
     * Regle metier : un visiteur anonyme incremente le compteur "nombre_de_vues".
     * Cooldown de 15 min par IP+UserAgent mais pour un 1er hit, on passe.
     */
    public function test_show_increments_view_counter_for_anonymous_visitor(): void
    {
        $formation = Formation::factory()->create(['nombre_de_vues' => 0]);

        $this->getJson("/api/formations/{$formation->id}");

        $this->assertSame(1, (int) $formation->refresh()->nombre_de_vues);
    }

    /**
     * Regle metier importante : le formateur proprietaire ne doit PAS
     * augmenter ses propres stats en consultant sa formation.
     * Sinon il pourrait gonfler artificiellement ses vues.
     */
    public function test_show_does_not_increment_view_for_owner_formateur(): void
    {
        $formateur = User::factory()->formateur()->create();
        $formation = Formation::factory()->create([
            'formateur_id' => $formateur->id,
            'nombre_de_vues' => 0,
        ]);
        $token = auth('api')->login($formateur);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson("/api/formations/{$formation->id}");

        $this->assertSame(0, (int) $formation->refresh()->nombre_de_vues);
    }

    /**
     * Route Model Binding : id inexistant -> 404 automatique de Laravel.
     */
    public function test_show_returns_404_for_unknown_formation(): void
    {
        $response = $this->getJson('/api/formations/999999');

        $response->assertStatus(404);
    }

    // ─────────────────────────────────────────────────────────────
    // POST /api/formations  (creation, formateur uniquement)
    // ─────────────────────────────────────────────────────────────

    /**
     * Happy path de creation. formateur_id est auto-injecte depuis le token,
     * le client n'a pas a l'envoyer (securite : empeche qu'un formateur
     * cree une formation au nom d'un autre).
     */
    public function test_store_creates_a_formation_for_authenticated_formateur(): void
    {
        $formateur = User::factory()->formateur()->create();
        $token = auth('api')->login($formateur);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/formations', [
                'titre' => 'PHP avance',
                'description' => 'Une formation complete sur PHP.',
                'categorie' => 'Développement web',
                'niveau' => 'Avancé',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('formation.titre', 'PHP avance');

        $this->assertDatabaseHas('formations', [
            'titre' => 'PHP avance',
            'formateur_id' => $formateur->id,
        ]);
    }

    /**
     * Validation stricte :
     *  - titre/description obligatoires
     *  - categorie doit etre dans la whitelist (dev web, Data, Design, Marketing, DevOps)
     *  - niveau doit etre Debutant / Intermediaire / Avance
     */
    public function test_store_validates_input(): void
    {
        $formateur = User::factory()->formateur()->create();
        $token = auth('api')->login($formateur);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/formations', [
                'titre' => '',
                'description' => '',
                'categorie' => 'CategorieInconnue',
                'niveau' => 'Expert',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['titre', 'description', 'categorie', 'niveau']);
    }

    // ─────────────────────────────────────────────────────────────
    // PUT /api/formations/{id}  (modification)
    // ─────────────────────────────────────────────────────────────

    /**
     * Un formateur peut modifier SA formation.
     */
    public function test_update_modifies_formation_owned_by_formateur(): void
    {
        $formateur = User::factory()->formateur()->create();
        $formation = Formation::factory()->create(['formateur_id' => $formateur->id]);
        $token = auth('api')->login($formateur);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson("/api/formations/{$formation->id}", [
                'titre' => 'Nouveau titre',
                'description' => 'Nouvelle description suffisamment longue.',
                'categorie' => 'Data',
                'niveau' => 'Intermédiaire',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('formation.titre', 'Nouveau titre');

        $this->assertDatabaseHas('formations', [
            'id' => $formation->id,
            'titre' => 'Nouveau titre',
        ]);
    }

    /**
     * Cas de securite crucial : un formateur ne peut PAS modifier la formation
     * d'un autre formateur, meme s'il a le bon role.
     * Sans cette protection, n'importe quel formateur pourrait vandaliser
     * les formations des autres.
     */
    public function test_update_rejects_non_owner_formateur(): void
    {
        $owner = User::factory()->formateur()->create();
        $other = User::factory()->formateur()->create();
        $formation = Formation::factory()->create(['formateur_id' => $owner->id]);
        $token = auth('api')->login($other);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson("/api/formations/{$formation->id}", [
                'titre' => 'Tentative de hijack',
                'description' => 'Description',
                'categorie' => 'Data',
                'niveau' => 'Débutant',
            ]);

        $response->assertStatus(403);
    }

    // ─────────────────────────────────────────────────────────────
    // DELETE /api/formations/{id}
    // ─────────────────────────────────────────────────────────────

    /**
     * Suppression par le proprietaire -> ligne reellement supprimee en DB.
     */
    public function test_destroy_deletes_formation_owned_by_formateur(): void
    {
        $formateur = User::factory()->formateur()->create();
        $formation = Formation::factory()->create(['formateur_id' => $formateur->id]);
        $token = auth('api')->login($formateur);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->deleteJson("/api/formations/{$formation->id}");

        $response->assertStatus(200);
        $this->assertDatabaseMissing('formations', ['id' => $formation->id]);
    }

    /**
     * Un autre formateur ne peut pas supprimer une formation qui ne lui
     * appartient pas -> 403 ET la formation reste bien en base.
     */
    public function test_destroy_rejects_non_owner_formateur(): void
    {
        $owner = User::factory()->formateur()->create();
        $other = User::factory()->formateur()->create();
        $formation = Formation::factory()->create(['formateur_id' => $owner->id]);
        $token = auth('api')->login($other);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->deleteJson("/api/formations/{$formation->id}");

        $response->assertStatus(403);
        $this->assertDatabaseHas('formations', ['id' => $formation->id]);
    }
}
