<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\EventController;
use App\Http\Controllers\Api\HeroSlideController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:6,1');
Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:6,1');
Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:10,1');
Route::post('/reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:5,1');
Route::get('/public/events', [EventController::class, 'index']);
Route::get('/public/slides', [HeroSlideController::class, 'publicIndex']);

Route::middleware(['auth:sanctum', 'active.account'])->group(function () {
    Route::get('/user', function (Request $request) {
        return $request->user();
    });
    Route::post('/logout', [AuthController::class, 'logout']);
});

Route::middleware(['auth:sanctum', 'active.admin'])->group(function () {
    Route::apiResource('events', EventController::class);
    Route::apiResource('admin/slides', HeroSlideController::class)
        ->parameters(['slides' => 'slide'])
        ->except(['show']);

    Route::middleware('owner')->prefix('admin/admins')->group(function () {
        Route::get('/', [AdminController::class, 'index']);
        Route::post('/', [AdminController::class, 'store'])->middleware('throttle:10,1');
        Route::delete('/{user}', [AdminController::class, 'destroy']);
    });
});
