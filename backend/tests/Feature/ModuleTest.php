<?php

namespace Tests\Feature;

use App\Models\Formation;
use App\Models\Module;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Tests complets du ModuleController.
 *
 * Specificites metier a couvrir :
 *  - (formation_id, ordre) est UNIQUE : deux modules d'une meme formation
 *    ne peuvent pas avoir le meme ordre.
 *  - Regle metier forte : on ne peut PAS supprimer un module si la formation
 *    n'aurait plus que 2 modules (minimum absolu = 3). C'est une contrainte
 *    applicative (pas une contrainte DB), donc on la teste explicitement.
 *  - Double garde : middleware check.role:formateur + ownership via
 *    ensureTrainerOwner() dans le controller.
 */
class ModuleTest extends TestCase
{
    use RefreshDatabase;

    // ─────────────────────────────────────────────────────────────
    // GET /api/formations/{id}/modules  (public)
    // ─────────────────────────────────────────────────────────────

    /**
     * Les modules doivent etre TRIES par "ordre" croissant.
     * On insere volontairement dans l'ordre 2,1,3 pour verifier le tri.
     */
    public function test_index_returns_modules_of_a_formation_ordered(): void
    {
        $formation = Formation::factory()->create();
        Module::factory()->create(['formation_id' => $formation->id, 'ordre' => 2]);
        Module::factory()->create(['formation_id' => $formation->id, 'ordre' => 1]);
        Module::factory()->create(['formation_id' => $formation->id, 'ordre' => 3]);

        $response = $this->getJson("/api/formations/{$formation->id}/modules");

        $response->assertStatus(200)->assertJsonCount(3, 'modules');

        $ordres = collect($response->json('modules'))->pluck('ordre')->all();
        $this->assertSame([1, 2, 3], $ordres);
    }

    // ─────────────────────────────────────────────────────────────
    // POST /api/formations/{id}/modules  (formateur proprietaire)
    // ─────────────────────────────────────────────────────────────

    /**
     * Happy path : le formateur proprietaire peut ajouter un module.
     */
    public function test_store_creates_a_module_for_owner_formateur(): void
    {
        $formateur = User::factory()->formateur()->create();
        $formation = Formation::factory()->create(['formateur_id' => $formateur->id]);
        $token = auth('api')->login($formateur);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/formations/{$formation->id}/modules", [
                'titre' => 'Module 1',
                'contenu' => 'Contenu pedagogique du module 1.',
                'ordre' => 1,
            ]);

        $response->assertStatus(201)->assertJsonPath('module.titre', 'Module 1');

        $this->assertDatabaseHas('modules', [
            'titre' => 'Module 1',
            'formation_id' => $formation->id,
            'ordre' => 1,
        ]);
    }

    /**
     * Validation : tous les champs sont obligatoires et ordre doit etre >= 1.
     */
    public function test_store_validates_payload(): void
    {
        $formateur = User::factory()->formateur()->create();
        $formation = Formation::factory()->create(['formateur_id' => $formateur->id]);
        $token = auth('api')->login($formateur);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/formations/{$formation->id}/modules", [
                'titre' => '',
                'contenu' => '',
                'ordre' => 0,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['titre', 'contenu', 'ordre']);
    }

    /**
     * Test de la contrainte d'unicite (formation_id, ordre) :
     * un module avec ordre=1 existe deja -> on doit refuser la creation
     * d'un autre avec ordre=1 pour LA MEME formation.
     * La regle Rule::unique dans le controller doit lever une 422.
     */
    public function test_store_rejects_duplicate_ordre_in_same_formation(): void
    {
        $formateur = User::factory()->formateur()->create();
        $formation = Formation::factory()->create(['formateur_id' => $formateur->id]);
        Module::factory()->create(['formation_id' => $formation->id, 'ordre' => 1]);
        $token = auth('api')->login($formateur);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/formations/{$formation->id}/modules", [
                'titre' => 'Doublon',
                'contenu' => 'Contenu',
                'ordre' => 1,
            ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['ordre']);
    }

    /**
     * Securite : un formateur qui n'est pas proprietaire de la formation
     * ne doit pas pouvoir y ajouter des modules.
     */
    public function test_store_rejects_non_owner_formateur(): void
    {
        $owner = User::factory()->formateur()->create();
        $other = User::factory()->formateur()->create();
        $formation = Formation::factory()->create(['formateur_id' => $owner->id]);
        $token = auth('api')->login($other);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/formations/{$formation->id}/modules", [
                'titre' => 'Module',
                'contenu' => 'Contenu',
                'ordre' => 1,
            ]);

        $response->assertStatus(403);
    }

    // ─────────────────────────────────────────────────────────────
    // PUT /api/modules/{id}
    // ─────────────────────────────────────────────────────────────

    /**
     * Le proprietaire peut modifier son module.
     * A noter : la regle unique ignore l'id du module courant (->ignore())
     * donc on peut "modifier" en gardant le meme ordre, sans declencher
     * le conflit d'unicite avec soi-meme.
     */
    public function test_update_modifies_module_for_owner(): void
    {
        $formateur = User::factory()->formateur()->create();
        $formation = Formation::factory()->create(['formateur_id' => $formateur->id]);
        $module = Module::factory()->create(['formation_id' => $formation->id, 'ordre' => 1]);
        $token = auth('api')->login($formateur);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson("/api/modules/{$module->id}", [
                'titre' => 'Titre modifie',
                'contenu' => 'Contenu revu.',
                'ordre' => 1,
            ]);

        $response->assertStatus(200)->assertJsonPath('module.titre', 'Titre modifie');
    }

    /**
     * Securite : un autre formateur ne peut pas modifier un module qui ne
     * lui appartient pas (via sa formation).
     */
    public function test_update_rejects_non_owner(): void
    {
        $owner = User::factory()->formateur()->create();
        $other = User::factory()->formateur()->create();
        $formation = Formation::factory()->create(['formateur_id' => $owner->id]);
        $module = Module::factory()->create(['formation_id' => $formation->id, 'ordre' => 1]);
        $token = auth('api')->login($other);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson("/api/modules/{$module->id}", [
                'titre' => 'Hack',
                'contenu' => 'Contenu',
                'ordre' => 1,
            ]);

        $response->assertStatus(403);
    }

    // ─────────────────────────────────────────────────────────────
    // DELETE /api/modules/{id}  (regle metier du minimum de 3 modules)
    // ─────────────────────────────────────────────────────────────

    /**
     * Formation avec 4 modules -> on peut supprimer le 4e et il en reste 3.
     */
    public function test_destroy_allows_deletion_when_more_than_three_modules(): void
    {
        $formateur = User::factory()->formateur()->create();
        $formation = Formation::factory()->create(['formateur_id' => $formateur->id]);
        Module::factory()->create(['formation_id' => $formation->id, 'ordre' => 1]);
        Module::factory()->create(['formation_id' => $formation->id, 'ordre' => 2]);
        Module::factory()->create(['formation_id' => $formation->id, 'ordre' => 3]);
        $moduleToDelete = Module::factory()->create(['formation_id' => $formation->id, 'ordre' => 4]);
        $token = auth('api')->login($formateur);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->deleteJson("/api/modules/{$moduleToDelete->id}");

        $response->assertStatus(200);
        $this->assertDatabaseMissing('modules', ['id' => $moduleToDelete->id]);
    }

    /**
     * Regle metier forte : on refuse la suppression qui passerait sous 3 modules.
     * Formation avec exactement 3 modules -> suppression = 422 avec message metier,
     * et le module doit rester en base.
     */
    public function test_destroy_rejects_deletion_when_only_three_modules(): void
    {
        $formateur = User::factory()->formateur()->create();
        $formation = Formation::factory()->create(['formateur_id' => $formateur->id]);
        $module1 = Module::factory()->create(['formation_id' => $formation->id, 'ordre' => 1]);
        Module::factory()->create(['formation_id' => $formation->id, 'ordre' => 2]);
        Module::factory()->create(['formation_id' => $formation->id, 'ordre' => 3]);
        $token = auth('api')->login($formateur);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->deleteJson("/api/modules/{$module1->id}");

        $response->assertStatus(422)
            ->assertJsonPath('message', 'Une formation doit contenir au minimum 3 modules.');

        $this->assertDatabaseHas('modules', ['id' => $module1->id]);
    }
}
