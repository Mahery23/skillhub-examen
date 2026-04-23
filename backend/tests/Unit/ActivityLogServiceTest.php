<?php

namespace Tests\Unit;

use App\Services\ActivityLogService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Mockery;
use Tests\TestCase;

/**
 * Test unitaire du ActivityLogService.
 *
 * Ce service est le seul point du code qui parle a MongoDB. On le teste
 * EN ISOLATION avec des mocks pour 2 raisons :
 *   1. Pas besoin d'un vrai container Mongo -> les tests sont rapides
 *      et tournent partout (local, CI GitHub Actions, etc).
 *   2. On peut verifier le comportement en cas de panne Mongo
 *      (exception -> on ne casse pas l'API, on log un warning).
 *
 * A noter : ce test etend Tests\TestCase qui bind deja un mock du service
 * dans le container. Pas de conflit : ici on instancie le service a la
 * main avec `new ActivityLogService()`, ce qui bypasse le container.
 */
class ActivityLogServiceTest extends TestCase
{
    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    /**
     * Happy path : log() doit appeler DB::connection('mongodb')->table('activity_logs')->insert($payload)
     * avec un payload contenant event, les data fournies, et un timestamp ISO8601.
     *
     * On mock toute la chaine fluent : DB -> connection -> table -> insert.
     */
    public function test_log_writes_payload_to_mongo_activity_logs_collection(): void
    {
        // 3e niveau : la table "activity_logs" doit recevoir insert($payload)
        // avec un payload qui a event, user_id et timestamp.
        $table = Mockery::mock();
        $table->shouldReceive('insert')
            ->once()
            ->with(Mockery::on(function (array $payload): bool {
                return $payload['event'] === 'user.registered'
                    && $payload['user_id'] === 42
                    && array_key_exists('timestamp', $payload);
            }))
            ->andReturn(true);

        // 2e niveau : connection('mongodb') doit retourner un objet qui a
        // une methode table() qui retourne notre mock "table" ci-dessus.
        $connection = Mockery::mock();
        $connection->shouldReceive('table')
            ->once()
            ->with('activity_logs')
            ->andReturn($table);

        // 1er niveau : la facade DB doit recevoir connection('mongodb').
        DB::shouldReceive('connection')
            ->once()
            ->with('mongodb')
            ->andReturn($connection);

        (new ActivityLogService())->log('user.registered', ['user_id' => 42]);

        // Mockery verifie les expectations a tearDown(). On le signale
        // explicitement a PHPUnit sinon il marque le test "risky"
        // (pas de $this->assertSomething() visible).
        $this->addToAssertionCount(1);
    }

    /**
     * Robustesse critique : si Mongo est down, le service DOIT
     *   - capturer l'exception (ne pas la propager)
     *   - logger un warning
     *   - laisser l'appelant continuer normalement
     *
     * Sans ca, un Mongo indisponible ferait crasher tous les endpoints
     * qui loggent des evenements (register, login, create formation, etc).
     */
    public function test_log_swallows_exceptions_and_emits_warning(): void
    {
        DB::shouldReceive('connection')
            ->once()
            ->with('mongodb')
            ->andThrow(new \RuntimeException('Mongo down'));

        // Log::warning doit etre appele avec le nom de l'evenement dans le contexte.
        Log::shouldReceive('warning')
            ->once()
            ->with('Mongo activity log failed', Mockery::on(fn ($ctx) => $ctx['event'] === 'user.registered'));

        // Cet appel ne doit PAS lever d'exception, meme si Mongo plante.
        (new ActivityLogService())->log('user.registered', ['user_id' => 1]);

        // Si on arrive ici, c'est que l'exception a bien ete capturee.
        $this->assertTrue(true);
    }
}
