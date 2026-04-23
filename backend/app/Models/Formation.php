<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Représente une formation SkillHub gérée par un formateur.
 */
class Formation extends Model
{
    use HasFactory;

    protected $fillable = [
        'titre',
        'description',
        'categorie',
        'niveau',
        'formateur_id',
        'nombre_de_vues',
    ];

    public const CREATED_AT = 'date_creation';
    public const UPDATED_AT = null;

    /**
     * Définit les casts des attributs métier de la formation.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'nombre_de_vues' => 'integer',
            'date_creation' => 'datetime',
        ];
    }

    /**
     * Retourne le formateur propriétaire de la formation.
     */
    public function formateur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'formateur_id');
    }

    /**
     * Retourne les modules associés à la formation.
     */
    public function modules(): HasMany
    {
        return $this->hasMany(Module::class);
    }

    /**
     * Retourne les inscriptions liées à cette formation.
     */
    public function inscriptions(): HasMany
    {
        return $this->hasMany(Enrollment::class, 'formation_id');
    }

    /**
     * Retourne les apprenants inscrits à cette formation.
     */
    public function apprenants(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'enrollments', 'formation_id', 'utilisateur_id')
            ->withPivot(['progression', 'date_inscription']);
    }
}

