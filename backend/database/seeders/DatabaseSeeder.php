<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        User::factory()->create([
            'prenom' => 'Test',
            'nom' => 'User',
            'contact' => '0600000000',
            'email' => 'test@example.com',
            'role' => 'apprenant',
        ]);
    }
}
