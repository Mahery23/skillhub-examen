<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Formation;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

/**
 * Gère les endpoints API des formations SkillHub.
 *
 * Cette couche expose le catalogue public et les opérations protégées
 * réservées aux formateurs propriétaires.
 */
class FormationController extends Controller
{
    private const VIEW_COOLDOWN_MINUTES = 15;

    private const CATEGORIES = [
        'Développement web',
        'Data',
        'Design',
        'Marketing',
        'DevOps',
    ];

    private const NIVEAUX = [
        'Débutant',
        'Intermédiaire',
        'Avancé',
    ];

    /**
     * Retourne la liste des formations avec filtres.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Formation::query()->with('formateur:id,nom')->withCount('inscriptions');

        $search = trim((string) $request->input('search', ''));
        $categorie = trim((string) $request->input('categorie', ''));
        $niveau = trim((string) $request->input('niveau', ''));

        if ($search !== '') {
            $query->where(function ($subQuery) use ($search): void {
                $subQuery->where('titre', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        if ($categorie !== '') {
            $query->where('categorie', $categorie);
        }

        if ($niveau !== '') {
            $query->where('niveau', $niveau);
        }

        $formations = $query->orderByDesc('date_creation')->get();

        return response()->json([
            'data' => $formations->map(fn (Formation $formation) => $this->formatFormation($formation, false))->values(),
        ]);
    }

    /**
     * Affiche une formation et incrémente son compteur de vues.
     */
    public function show(Request $request, Formation $formation): JsonResponse
    {
        if ($this->shouldIncrementViews($formation, $request)) {
            $formation->increment('nombre_de_vues');
        }

        $formation->refresh()->load(['formateur:id,nom', 'modules:id,formation_id,titre,contenu,ordre,date_creation'])->loadCount('inscriptions');

        return response()->json([
            'formation' => $this->formatFormation($formation, true),
        ]);
    }

    /**
     * Détermine si la consultation doit incrémenter le compteur de vues.
     *
     * Le formateur propriétaire ne doit pas augmenter ses propres statistiques.
     */
    private function shouldIncrementViews(Formation $formation, Request $request): bool
    {
        $user = auth('api')->user();

        if ($user && (int) $user->id === (int) $formation->formateur_id) {
            return false;
        }

        // Hash SHA-256 (et non SHA-1) pour l'identifiant de cache d'un visiteur
        // anonyme : meme s'il ne s'agit pas d'un contexte cryptographique sensible,
        // on evite les algorithmes faibles signales par SonarCloud (php:S4790).
        $viewerKey = $user
            ? 'user:' . $user->id
            : 'guest:' . hash('sha256', ($request->ip() ?? 'unknown') . '|' . ($request->userAgent() ?? 'unknown'));

        $cacheKey = sprintf('formation:%d:view:%s', $formation->id, $viewerKey);

        // Incrémente au plus une fois par visiteur sur la fenêtre de cooldown.
        return Cache::add($cacheKey, true, now()->addMinutes(self::VIEW_COOLDOWN_MINUTES));
    }

    /**
     * Crée une formation pour le formateur connecté.
     */
    public function store(Request $request): JsonResponse
    {
        $this->ensureTrainer();

        $validated = $request->validate([
            'titre' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string'],
            'categorie' => ['required', 'in:' . implode(',', self::CATEGORIES)],
            'niveau' => ['required', 'in:' . implode(',', self::NIVEAUX)],
        ]);

        $formation = Formation::create([
            ...$validated,
            'formateur_id' => auth('api')->id(),
            'nombre_de_vues' => 0,
        ]);

        app(ActivityLogService::class)->log('formation.created', [
            'user_id' => auth('api')->id(),
            'formation_id' => $formation->id,
            'titre' => $formation->titre,
            'categorie' => $formation->categorie,
            'niveau' => $formation->niveau,
        ]);

        return response()->json([
            'message' => 'Formation created successfully',
            'formation' => $this->formatFormation($formation->load('formateur:id,nom'), true),
        ], 201);
    }

    /**
     * Met à jour une formation appartenant au formateur connecté.
     */
    public function update(Request $request, Formation $formation): JsonResponse
    {
        $this->ensureTrainer($formation);

        $validated = $request->validate([
            'titre' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string'],
            'categorie' => ['required', 'in:' . implode(',', self::CATEGORIES)],
            'niveau' => ['required', 'in:' . implode(',', self::NIVEAUX)],
        ]);

        $formation->update($validated);

        app(ActivityLogService::class)->log('formation.updated', [
            'user_id' => auth('api')->id(),
            'formation_id' => $formation->id,
            'titre' => $formation->titre,
            'categorie' => $formation->categorie,
            'niveau' => $formation->niveau,
        ]);

        return response()->json([
            'message' => 'Formation updated successfully',
            'formation' => $this->formatFormation($formation->refresh()->load('formateur:id,nom'), true),
        ]);
    }

    /**
     * Supprime une formation appartenant au formateur connecté.
     */
    public function destroy(Formation $formation): JsonResponse
    {
        $this->ensureTrainer($formation);

        app(ActivityLogService::class)->log('formation.deleted', [
            'user_id' => auth('api')->id(),
            'formation_id' => $formation->id,
            'titre' => $formation->titre,
            'categorie' => $formation->categorie,
            'niveau' => $formation->niveau,
        ]);

        $formation->delete();

        return response()->json([
            'message' => 'Formation deleted successfully',
        ]);
    }

    /**
     * Vérifie que l'utilisateur connecté est bien un formateur propriétaire.
     */
    private function ensureTrainer(?Formation $formation = null): void
    {
        $user = auth('api')->user();

        abort_unless($user && $user->role === 'formateur', 403, 'Seul un formateur peut gérer les formations.');

        if ($formation) {
            abort_unless((int) $formation->formateur_id === (int) $user->id, 403, 'Vous ne pouvez gérer que vos propres formations.');
        }
    }

    /**
     * Normalise une formation pour la réponse JSON.
     *
     * @return array<string, mixed>
     */
    private function formatFormation(Formation $formation, bool $withDescription = true): array
    {
        $payload = [
            'id' => $formation->id,
            'titre' => $formation->titre,
            'niveau' => $formation->niveau,
            'categorie' => $formation->categorie,
            'vues' => $formation->nombre_de_vues,
            'apprenants' => (int) ($formation->inscriptions_count ?? 0),
            'formateur' => [
                'id' => $formation->formateur_id,
                'nom' => $formation->formateur?->nom,
            ],
            'date_creation' => $formation->date_creation,
        ];

        if ($withDescription) {
            $payload['description'] = $formation->description;
            $payload['modules'] = $formation->modules
                ->sortBy('ordre')
                ->values()
                ->map(fn ($module) => [
                    'id' => $module->id,
                    'titre' => $module->titre,
                    'contenu' => $module->contenu,
                    'ordre' => $module->ordre,
                ]);
        } else {
            $payload['mini_description'] = str($formation->description)->limit(120);
        }

        return $payload;
    }
}

