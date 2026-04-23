<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Représente un module pédagogique d'une formation SkillHub.
 */
class Module extends Model
{
    use HasFactory;

    protected $fillable = [
        'titre',
        'contenu',
        'formation_id',
        'ordre',
    ];

    public const CREATED_AT = 'date_creation';
    public const UPDATED_AT = null;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'ordre' => 'integer',
            'date_creation' => 'datetime',
        ];
    }

    /**
     * Retourne la formation à laquelle appartient ce module.
     */
    public function formation(): BelongsTo
    {
        return $this->belongsTo(Formation::class);
    }
}

