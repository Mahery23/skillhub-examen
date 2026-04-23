<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Formation;
use App\Models\Module;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Gère les endpoints API des modules de formation.
 */
class ModuleController extends Controller
{
    /**
     * Liste les modules d'une formation triés par ordre.
     */
    public function index(Formation $formation): JsonResponse
    {
        $modules = $formation->modules()->orderBy('ordre')->get();

        return response()->json([
            'modules' => $modules->map(fn (Module $module) => $this->formatModule($module))->values(),
        ]);
    }

    /**
     * Ajoute un module à une formation du formateur connecté.
     */
    public function store(Request $request, Formation $formation): JsonResponse
    {
        $this->ensureTrainerOwner($formation);

        $validated = $request->validate([
            'titre' => ['required', 'string', 'max:255'],
            'contenu' => ['required', 'string'],
            'ordre' => [
                'required',
                'integer',
                'min:1',
                Rule::unique('modules', 'ordre')->where(fn ($query) => $query->where('formation_id', $formation->id)),
            ],
        ]);

        $module = $formation->modules()->create($validated);

        app(ActivityLogService::class)->log('module.created', [
            'user_id' => auth('api')->id(),
            'formation_id' => $formation->id,
            'module_id' => $module->id,
            'titre' => $module->titre,
            'ordre' => $module->ordre,
        ]);

        return response()->json([
            'message' => 'Module created successfully',
            'module' => $this->formatModule($module),
        ], 201);
    }

    /**
     * Met à jour un module appartenant à une formation du formateur connecté.
     */
    public function update(Request $request, Module $module): JsonResponse
    {
        $formation = $module->formation;
        $this->ensureTrainerOwner($formation);

        $validated = $request->validate([
            'titre' => ['required', 'string', 'max:255'],
            'contenu' => ['required', 'string'],
            'ordre' => [
                'required',
                'integer',
                'min:1',
                Rule::unique('modules', 'ordre')
                    ->where(fn ($query) => $query->where('formation_id', $formation->id))
                    ->ignore($module->id),
            ],
        ]);

        $module->update($validated);

        app(ActivityLogService::class)->log('module.updated', [
            'user_id' => auth('api')->id(),
            'formation_id' => $formation->id,
            'module_id' => $module->id,
            'titre' => $module->titre,
            'ordre' => $module->ordre,
        ]);

        return response()->json([
            'message' => 'Module updated successfully',
            'module' => $this->formatModule($module->refresh()),
        ]);
    }

    /**
     * Supprime un module si la formation conserve au moins 3 modules.
     */
    public function destroy(Module $module): JsonResponse
    {
        $formation = $module->formation;
        $this->ensureTrainerOwner($formation);

        if ((int) $formation->modules()->count() <= 3) {
            return response()->json([
                'message' => 'Une formation doit contenir au minimum 3 modules.',
            ], 422);
        }

        app(ActivityLogService::class)->log('module.deleted', [
            'user_id' => auth('api')->id(),
            'formation_id' => $formation->id,
            'module_id' => $module->id,
            'titre' => $module->titre,
            'ordre' => $module->ordre,
        ]);

        $module->delete();

        return response()->json([
            'message' => 'Module deleted successfully',
        ]);
    }

    /**
     * Vérifie que l'utilisateur connecté est un formateur propriétaire de la formation.
     */
    private function ensureTrainerOwner(Formation $formation): void
    {
        $user = auth('api')->user();

        abort_unless($user && $user->role === 'formateur', 403, 'Seul un formateur peut gérer les modules.');
        abort_unless((int) $formation->formateur_id === (int) $user->id, 403, 'Vous ne pouvez gérer que les modules de vos formations.');
    }

    /**
     * @return array<string, mixed>
     */
    private function formatModule(Module $module): array
    {
        return [
            'id' => $module->id,
            'titre' => $module->titre,
            'contenu' => $module->contenu,
            'formation_id' => $module->formation_id,
            'ordre' => $module->ordre,
            'date_creation' => $module->date_creation,
        ];
    }
}

