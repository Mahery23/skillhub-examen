<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use PHPOpenSourceSaver\JWTAuth\Contracts\JWTSubject;

/**
 * Représente un utilisateur SkillHub authentifié par JWT.
 */
class User extends Authenticatable implements JWTSubject
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    protected $fillable = [
        'prenom',
        'nom',
        'contact',
        'email',
        'mot_de_passe',
        'role',
    ];

    protected $hidden = [
        'mot_de_passe',
    ];

    public const CREATED_AT = 'date_creation';
    public const UPDATED_AT = null;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'date_creation' => 'datetime',
            'mot_de_passe' => 'hashed',
        ];
    }

    public function getJWTIdentifier(): mixed
    {
        return $this->getKey();
    }

    /**
     * @return array<string, mixed>
     */
    public function getJWTCustomClaims(): array
    {
        return [
            'role' => $this->role,
            'prenom' => $this->prenom,
            'nom' => $this->nom,
        ];
    }

    public function getAuthPassword(): string
    {
        return $this->mot_de_passe;
    }

    /**
     * @return HasMany<Formation, $this>
     */
    public function formations(): HasMany
    {
        return $this->hasMany(Formation::class, 'formateur_id');
    }

    /**
     * Retourne les inscriptions de l'apprenant.
     *
     * @return HasMany<Enrollment, $this>
     */
    public function inscriptions(): HasMany
    {
        return $this->hasMany(Enrollment::class, 'utilisateur_id');
    }

    /**
     * Retourne les formations suivies par l'apprenant.
     */
    public function formationsSuivies(): BelongsToMany
    {
        return $this->belongsToMany(Formation::class, 'enrollments', 'utilisateur_id', 'formation_id')
            ->withPivot(['progression', 'date_inscription']);
    }
}
