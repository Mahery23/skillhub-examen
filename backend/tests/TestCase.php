<?php

namespace Tests;

use App\Services\ActivityLogService;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Mockery;

/**
 * Classe de base pour tous les tests SkillHub.
 * - Mock MongoDB pour éviter la dépendance au container en CI
 * - Helper withSpringAuth() pour simuler le middleware spring.auth
 */
abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        $this->app->instance(
            ActivityLogService::class,
            Mockery::mock(ActivityLogService::class)->shouldIgnoreMissing()
        );
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    /**
     * Simule le middleware spring.auth en injectant les attributs
     * que VerifySpringJWT injecterait normalement après validation du JWT.
     *
     * @param string $email Email de l'utilisateur simulé
     * @param string $role  Rôle : "apprenant" ou "formateur"
     */
    protected function withSpringAuth(string $email, string $role = 'apprenant'): static
    {
        $this->app->bind(
            \App\Http\Middleware\VerifySpringJWT::class,
            fn() => new class($email, $role) {
                public function __construct(
                    private string $fakeEmail,
                    private string $fakeRole
                ) {}

                public function handle($request, \Closure $next, string ...$roles): mixed
                {
                    $request->attributes->set('auth_email', $this->fakeEmail);
                    $request->attributes->set('auth_role', $this->fakeRole);
                    $request->attributes->set('auth_name', 'Test User');

                    if (!empty($roles) && !in_array($this->fakeRole, $roles, true)) {
                        return response()->json(['message' => 'Accès refusé pour ce rôle.'], 403);
                    }

                    return $next($request);
                }
            }
        );

        return $this;
    }
}