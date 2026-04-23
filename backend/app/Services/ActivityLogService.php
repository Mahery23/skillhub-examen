<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Centralise l'écriture des événements métier dans MongoDB.
 */
class ActivityLogService
{
    /**
     * Enregistre un événement dans la collection activity_logs.
     *
     * @param  array<string, mixed>  $data
     */
    public function log(string $event, array $data): void
    {
        $payload = [
            'event' => $event,
            ...$data,
            'timestamp' => now()->toIso8601String(),
        ];

        try {
            DB::connection('mongodb')
                ->table('activity_logs')
                ->insert($payload);
        } catch (Throwable $exception) {
            // Ne pas casser le flux API si MongoDB est indisponible.
            Log::warning('Mongo activity log failed', [
                'event' => $event,
                'error' => $exception->getMessage(),
            ]);
        }
    }
}
