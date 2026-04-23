<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('formations', function (Blueprint $table) {
            $table->id();
            $table->string('titre');
            $table->text('description');
            $table->string('categorie')->index();
            $table->enum('niveau', ['Débutant', 'Intermédiaire', 'Avancé'])->index();
            $table->foreignId('formateur_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedInteger('nombre_de_vues')->default(0);
            $table->timestamp('date_creation')->useCurrent();
            $table->index(['formateur_id', 'categorie', 'niveau']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('formations');
    }
};

