<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Enrollment;
use App\Models\Formation;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Gère l'inscription et la désinscription des apprenants.
 * Limite : un apprenant ne peut pas s'inscrire à plus de 5 formations simultanément.
 */
class EnrollmentController extends Controller
{
    private const MAX_ENROLLMENTS = 5;

    /**
     * Inscrit l'apprenant connecté à une formation.
     */
    public function store(Request $request, Formation $formation): JsonResponse
    {
        $email = $request->attributes->get('auth_email');

        // Trouver l'id de l'utilisateur par son email
        $userId = \App\Models\User::where('email', $email)->value('id');

        $count = Enrollment::query()
            ->where('utilisateur_id', $userId)
            ->count();

        if ($count >= self::MAX_ENROLLMENTS) {
            return response()->json([
                'message' => 'Vous ne pouvez pas vous inscrire à plus de 5 formations simultanément.',
            ], 400);
        }

        $alreadyEnrolled = Enrollment::query()
            ->where('utilisateur_id', $userId)
            ->where('formation_id', $formation->id)
            ->exists();

        if ($alreadyEnrolled) {
            return response()->json([
                'message' => 'Vous suivez déjà cette formation.',
            ], 409);
        }

        $enrollment = Enrollment::create([
            'utilisateur_id' => $userId,
            'formation_id'   => $formation->id,
            'progression'    => 0,
        ]);

        if ($count >= self::MAX_ENROLLMENTS) {
            return response()->json([
                'message' => 'Vous ne pouvez pas vous inscrire à plus de 5 formations simultanément.',
            ], 400);
        }

        $alreadyEnrolled = Enrollment::query()
            ->where('utilisateur_id', $email)
            ->where('formation_id', $formation->id)
            ->exists();

        if ($alreadyEnrolled) {
            return response()->json([
                'message' => 'Vous suivez déjà cette formation.',
            ], 409);
        }

        $enrollment = Enrollment::create([
            'utilisateur_id' => $email,
            'formation_id'   => $formation->id,
            'progression'    => 0,
        ]);

        app(ActivityLogService::class)->log('enrollment.created', [
            'user_email'    => $email,
            'formation_id'  => $formation->id,
            'enrollment_id' => $enrollment->id,
        ]);

        return response()->json([
            'message'    => 'Enrollment created successfully',
            'enrollment' => [
                'id'              => $enrollment->id,
                'utilisateur_id'  => $enrollment->utilisateur_id,
                'formation_id'    => $enrollment->formation_id,
                'progression'     => $enrollment->progression,
                'date_inscription' => $enrollment->date_inscription,
            ],
        ], 201);
    }

    /**
     * Désinscrit l'apprenant connecté d'une formation suivie.
     */
    public function destroy(Request $request, Formation $formation): JsonResponse
    {
        $email = $request->attributes->get('auth_email');

        $enrollment = Enrollment::query()
            ->where('utilisateur_id', $email)
            ->where('formation_id', $formation->id)
            ->first();

        if (! $enrollment) {
            return response()->json([
                'message' => 'Aucune inscription trouvée pour cette formation.',
            ], 404);
        }

        app(ActivityLogService::class)->log('enrollment.deleted', [
            'user_email'    => $email,
            'formation_id'  => $formation->id,
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
    public function mesFormations(Request $request): JsonResponse
    {
        $email = $request->attributes->get('auth_email');

        $enrollments = Enrollment::query()
            ->with(['formation' => fn ($q) => $q->with('formateur:id,nom')->withCount('inscriptions')])
            ->where('utilisateur_id', $email)
            ->orderByDesc('date_inscription')
            ->get();

        return response()->json([
            'formations' => $enrollments->map(function (Enrollment $enrollment): array {
                $formation = $enrollment->formation;

                return [
                    'enrollment_id'    => $enrollment->id,
                    'progression'      => $enrollment->progression,
                    'date_inscription' => $enrollment->date_inscription,
                    'formation'        => [
                        'id'         => $formation?->id,
                        'titre'      => $formation?->titre,
                        'description' => $formation?->description,
                        'niveau'     => $formation?->niveau,
                        'categorie'  => $formation?->categorie,
                        'vues'       => $formation?->nombre_de_vues,
                        'apprenants' => (int) ($formation?->inscriptions_count ?? 0),
                        'formateur'  => [
                            'id'  => $formation?->formateur_id,
                            'nom' => $formation?->formateur?->nom,
                        ],
                    ],
                ];
            })->values(),
        ]);
    }
}