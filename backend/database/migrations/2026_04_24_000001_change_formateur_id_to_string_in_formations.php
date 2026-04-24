<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adapte formateur_id pour l'architecture SSO Spring Boot.
 * L'identifiant formateur est désormais un email (string) au lieu d'un integer.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('formations', function (Blueprint $table) {
            $table->dropForeign(['formateur_id']);
            $table->dropIndex(['formateur_id', 'categorie', 'niveau']);
            $table->string('formateur_id')->change();
            $table->index(['formateur_id', 'categorie', 'niveau']);
        });
    }

    public function down(): void
    {
        Schema::table('formations', function (Blueprint $table) {
            $table->dropIndex(['formateur_id', 'categorie', 'niveau']);
            $table->unsignedBigInteger('formateur_id')->change();
            $table->foreign('formateur_id')->references('id')->on('users')->cascadeOnDelete();
            $table->index(['formateur_id', 'categorie', 'niveau']);
        });
    }
};