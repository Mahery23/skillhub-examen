<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Enrollment;
use App\Models\Formation;
use App\Models\User;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;

/**
 * Gère l'inscription et la désinscription des apprenants.
 */
class EnrollmentController extends Controller
{
    /**
     * Inscrit l'apprenant connecté à une formation.
     */
    public function store(Formation $formation): JsonResponse
    {
        $user = $this->ensureLearner();

        $alreadyEnrolled = Enrollment::query()
            ->where('utilisateur_id', $user->id)
            ->where('formation_id', $formation->id)
            ->exists();

        if ($alreadyEnrolled) {
            return response()->json([
                'message' => 'Vous suivez déjà cette formation.',
            ], 409);
        }

        $enrollment = Enrollment::create([
            'utilisateur_id' => $user->id,
            'formation_id' => $formation->id,
            'progression' => 0,
        ]);

        app(ActivityLogService::class)->log('enrollment.created', [
            'user_id' => $user->id,
            'formation_id' => $formation->id,
            'enrollment_id' => $enrollment->id,
        ]);

        return response()->json([
            'message' => 'Enrollment created successfully',
            'enrollment' => [
                'id' => $enrollment->id,
                'utilisateur_id' => $enrollment->utilisateur_id,
                'formation_id' => $enrollment->formation_id,
                'progression' => $enrollment->progression,
                'date_inscription' => $enrollment->date_inscription,
            ],
        ], 201);
    }

    /**
     * Désinscrit l'apprenant connecté d'une formation suivie.
     */
    public function destroy(Formation $formation): JsonResponse
    {
        $user = $this->ensureLearner();

        $enrollment = Enrollment::query()
            ->where('utilisateur_id', $user->id)
            ->where('formation_id', $formation->id)
            ->first();

        if (! $enrollment) {
            return response()->json([
                'message' => 'Aucune inscription trouvée pour cette formation.',
            ], 404);
        }

        app(ActivityLogService::class)->log('enrollment.deleted', [
            'user_id' => $user->id,
            'formation_id' => $formation->id,
            'enrollment_id' => $enrollment->id,
        ]);

        $enrollment->delete();

        return response()->json([
            'message' => 'Enrollment deleted successfully',
        ]);
    }

    /**
     * Retourne les formations suivies par l'apprenant connecté.
     */
    public function mesFormations(): JsonResponse
    {
        $user = $this->ensureLearner();

        $enrollments = Enrollment::query()
            ->with(['formation' => fn ($query) => $query->with('formateur:id,nom')->withCount('inscriptions')])
            ->where('utilisateur_id', $user->id)
            ->orderByDesc('date_inscription')
            ->get();

        return response()->json([
            'formations' => $enrollments->map(function (Enrollment $enrollment): array {
                $formation = $enrollment->formation;

                return [
                    'enrollment_id' => $enrollment->id,
                    'progression' => $enrollment->progression,
                    'date_inscription' => $enrollment->date_inscription,
                    'formation' => [
                        'id' => $formation?->id,
                        'titre' => $formation?->titre,
                        'description' => $formation?->description,
                        'niveau' => $formation?->niveau,
                        'categorie' => $formation?->categorie,
                        'vues' => $formation?->nombre_de_vues,
                        'apprenants' => (int) ($formation?->inscriptions_count ?? 0),
                        'formateur' => [
                            'id' => $formation?->formateur_id,
                            'nom' => $formation?->formateur?->nom,
                        ],
                    ],
                ];
            })->values(),
        ]);
    }

    /**
     * Vérifie que l'utilisateur connecté est un apprenant.
     */
    private function ensureLearner(): User
    {
        $user = auth('api')->user();

        abort_unless($user && $user->role === 'apprenant', 403, 'Seul un apprenant peut gérer ses inscriptions.');

        return $user;
    }
}

