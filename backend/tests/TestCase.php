<?php

namespace Tests;

use App\Services\ActivityLogService;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Mockery;

/**
 * Classe de base pour TOUS les tests Feature et Unit de SkillHub.
 *
 * Role principal :
 *  - Booter l'application Laravel pour chaque test (heritage de BaseTestCase)
 *  - Remplacer automatiquement le service d'ecriture MongoDB par un mock
 *    no-op, pour que les tests ne dependent pas du container mongodb et
 *    ne plantent jamais a cause d'un Mongo injoignable en CI.
 *
 * Consequence : quand un controller appelle `app(ActivityLogService::class)->log(...)`,
 * l'appel est silencieusement avale par le mock (aucune ecriture reelle).
 * Un test qui veut VERIFIER la logique du service peut toujours re-binder
 * un vrai instance localement (voir ActivityLogServiceTest).
 */
abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // shouldIgnoreMissing() : le mock accepte n'importe quel appel de methode
        // (log, autres) et retourne null par defaut. Parfait pour un no-op.
        $this->app->instance(
            ActivityLogService::class,
            Mockery::mock(ActivityLogService::class)->shouldIgnoreMissing()
        );
    }

    protected function tearDown(): void
    {
        // Mockery::close() verifie que toutes les expectations "shouldReceive"
        // ont bien ete declenchees pendant le test. Indispensable pour que les
        // tests unitaires qui utilisent des mocks stricts soient fiables.
        Mockery::close();
        parent::tearDown();
    }
}
