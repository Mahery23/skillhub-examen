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
 * Utilise le JWT Spring Boot via $request->attributes (middleware spring.auth).
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

        $search    = trim((string) $request->input('search', ''));
        $categorie = trim((string) $request->input('categorie', ''));
        $niveau    = trim((string) $request->input('niveau', ''));

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
     * Crée une formation pour le formateur connecté.
     */
    public function store(Request $request): JsonResponse
    {
        $this->ensureTrainer($request);

        $validated = $request->validate([
            'titre'       => ['required', 'string', 'max:255'],
            'description' => ['required', 'string'],
            'categorie'   => ['required', 'in:' . implode(',', self::CATEGORIES)],
            'niveau'      => ['required', 'in:' . implode(',', self::NIVEAUX)],
        ]);

        $formation = Formation::create([
            ...$validated,
            // On utilise l'email comme identifiant formateur (SSO Spring Boot)
            'formateur_id' => $request->attributes->get('auth_email'),
            'nombre_de_vues' => 0,
        ]);

        app(ActivityLogService::class)->log('formation.created', [
            'email'        => $request->attributes->get('auth_email'),
            'formation_id' => $formation->id,
            'titre'        => $formation->titre,
        ]);

        return response()->json([
            'message'   => 'Formation created successfully',
            'formation' => $this->formatFormation($formation->load('formateur:id,nom'), true),
        ], 201);
    }

    /**
     * Met à jour une formation appartenant au formateur connecté.
     */
    public function update(Request $request, Formation $formation): JsonResponse
    {
        $this->ensureTrainer($request, $formation);

        $validated = $request->validate([
            'titre'       => ['required', 'string', 'max:255'],
            'description' => ['required', 'string'],
            'categorie'   => ['required', 'in:' . implode(',', self::CATEGORIES)],
            'niveau'      => ['required', 'in:' . implode(',', self::NIVEAUX)],
        ]);

        $formation->update($validated);

        app(ActivityLogService::class)->log('formation.updated', [
            'email'        => $request->attributes->get('auth_email'),
            'formation_id' => $formation->id,
            'titre'        => $formation->titre,
        ]);

        return response()->json([
            'message'   => 'Formation updated successfully',
            'formation' => $this->formatFormation($formation->refresh()->load('formateur:id,nom'), true),
        ]);
    }

    /**
     * Supprime une formation appartenant au formateur connecté.
     */
    public function destroy(Request $request, Formation $formation): JsonResponse
    {
        $this->ensureTrainer($request, $formation);

        app(ActivityLogService::class)->log('formation.deleted', [
            'email'        => $request->attributes->get('auth_email'),
            'formation_id' => $formation->id,
            'titre'        => $formation->titre,
        ]);

        $formation->delete();

        return response()->json([
            'message' => 'Formation deleted successfully',
        ]);
    }

    /**
     * Vérifie que l'utilisateur connecté est bien un formateur.
     * Utilise les attributs injectés par le middleware spring.auth.
     */
    private function ensureTrainer(Request $request, ?Formation $formation = null): void
    {
        $role  = $request->attributes->get('auth_role', '');
        $email = $request->attributes->get('auth_email', '');

        abort_unless($role === 'formateur', 403, 'Seul un formateur peut gérer les formations.');

        if ($formation) {
            abort_unless(
                $formation->formateur_id === $email,
                403,
                'Vous ne pouvez gérer que vos propres formations.'
            );
        }
    }

    /**
     * Détermine si la consultation doit incrémenter le compteur de vues.
     */
    private function shouldIncrementViews(Formation $formation, Request $request): bool
    {
        $email = $request->attributes->get('auth_email');

        if ($email && $formation->formateur_id === $email) {
            return false;
        }

        $viewerKey = $email
            ? 'user:' . $email
            : 'guest:' . hash('sha256', ($request->ip() ?? 'unknown') . '|' . ($request->userAgent() ?? 'unknown'));

        $cacheKey = sprintf('formation:%d:view:%s', $formation->id, $viewerKey);

        return Cache::add($cacheKey, true, now()->addMinutes(self::VIEW_COOLDOWN_MINUTES));
    }

    /**
     * Normalise une formation pour la réponse JSON.
     *
     * @return array<string, mixed>
     */
    private function formatFormation(Formation $formation, bool $withDescription = true): array
    {
        $payload = [
            'id'          => $formation->id,
            'titre'       => $formation->titre,
            'niveau'      => $formation->niveau,
            'categorie'   => $formation->categorie,
            'vues'        => $formation->nombre_de_vues,
            'apprenants'  => (int) ($formation->inscriptions_count ?? 0),
            'formateur'   => [
                'id'  => $formation->formateur_id,
                'nom' => $formation->formateur?->nom,
            ],
            'date_creation' => $formation->date_creation,
        ];

        if ($withDescription) {
            $payload['description'] = $formation->description;
            $payload['modules']     = $formation->modules
                ->sortBy('ordre')
                ->values()
                ->map(fn ($module) => [
                    'id'      => $module->id,
                    'titre'   => $module->titre,
                    'contenu' => $module->contenu,
                    'ordre'   => $module->ordre,
                ]);
        } else {
            $payload['mini_description'] = str($formation->description)->limit(120);
        }

        return $payload;
    }
}