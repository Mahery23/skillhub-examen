<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Représente l'inscription d'un apprenant à une formation.
 */
class Enrollment extends Model
{
    use HasFactory;

    protected $fillable = [
        'utilisateur_id',
        'formation_id',
        'progression',
    ];

    public const CREATED_AT = 'date_inscription';
    public const UPDATED_AT = null;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'progression' => 'integer',
            'date_inscription' => 'datetime',
        ];
    }

    /**
     * Retourne l'utilisateur inscrit.
     */
    public function utilisateur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'utilisateur_id');
    }

    /**
     * Retourne la formation suivie.
     */
    public function formation(): BelongsTo
    {
        return $this->belongsTo(Formation::class, 'formation_id');
    }
}

