<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\EnrollmentController;
use App\Http\Controllers\Api\FormationController;
use App\Http\Controllers\Api\ModuleController;
use Illuminate\Support\Facades\Route;

// Health check Docker
Route::get('/health', fn() => response()->json(['status' => 'ok']));

// Étape 1 du login HMAC : récupérer le nonce
Route::get('/challenge', [AuthController::class, 'challenge']);

// Authentification via auth-service Spring Boot
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login',    [AuthController::class, 'login']);

// Catalogue public
Route::get('/formations',                        [FormationController::class, 'index']);
Route::get('/formations/{formation}',            [FormationController::class, 'show']);
Route::get('/formations/{formation}/modules',    [ModuleController::class, 'index']);

// Routes protégées par JWT Spring Boot
Route::middleware('spring.auth')->group(function () {
    Route::get('/profile',  [AuthController::class, 'profile']);
    Route::post('/logout',  [AuthController::class, 'logout']);
});

// Formateur uniquement
Route::middleware(['spring.auth:formateur'])->group(function () {
    Route::post('/formations',                        [FormationController::class, 'store']);
    Route::put('/formations/{formation}',             [FormationController::class, 'update']);
    Route::delete('/formations/{formation}',          [FormationController::class, 'destroy']);
    Route::post('/formations/{formation}/modules',    [ModuleController::class, 'store']);
    Route::put('/modules/{module}',                   [ModuleController::class, 'update']);
    Route::delete('/modules/{module}',                [ModuleController::class, 'destroy']);
});

// Apprenant uniquement
Route::middleware(['spring.auth:apprenant'])->group(function () {
    Route::post('/formations/{formation}/inscription',   [EnrollmentController::class, 'store']);
    Route::delete('/formations/{formation}/inscription', [EnrollmentController::class, 'destroy']);
    Route::get('/apprenant/formations',                  [EnrollmentController::class, 'mesFormations']);
});
