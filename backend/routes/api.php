<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\EnrollmentController;
use App\Http\Controllers\Api\FormationController;
use App\Http\Controllers\Api\ModuleController;
use Illuminate\Support\Facades\Route;

// Route de vérification — utilisée par le healthcheck Docker
Route::get('/health', function () {
    return response()->json(['status' => 'ok']);
});

// Endpoints publics d'authentification
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Catalogue des formations (public)
Route::get('/formations', [FormationController::class, 'index']);
Route::get('/formations/{formation}', [FormationController::class, 'show']);
Route::get('/formations/{formation}/modules', [ModuleController::class, 'index']);

// Routes protégées par JWT
Route::middleware('auth:api')->group(function () {
    Route::get('/profile', [AuthController::class, 'profile']);
    Route::post('/logout', [AuthController::class, 'logout']);
});

// Routes formateur uniquement
Route::middleware(['auth:api', 'check.role:formateur'])->group(function () {
    Route::post('/formations', [FormationController::class, 'store']);
    Route::put('/formations/{formation}', [FormationController::class, 'update']);
    Route::delete('/formations/{formation}', [FormationController::class, 'destroy']);

    Route::post('/formations/{formation}/modules', [ModuleController::class, 'store']);
    Route::put('/modules/{module}', [ModuleController::class, 'update']);
    Route::delete('/modules/{module}', [ModuleController::class, 'destroy']);
});

// Routes apprenant uniquement
Route::middleware(['auth:api', 'check.role:apprenant'])->group(function () {
    Route::post('/formations/{formation}/inscription', [EnrollmentController::class, 'store']);
    Route::delete('/formations/{formation}/inscription', [EnrollmentController::class, 'destroy']);
    Route::get('/apprenant/formations', [EnrollmentController::class, 'mesFormations']);
});
