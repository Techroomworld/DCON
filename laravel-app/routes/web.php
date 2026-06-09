<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\BookingController;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return Auth::check() ? redirect()->route('dashboard') : view('welcome');
});

Route::middleware('guest')->group(function () {
    Route::get('login', [AuthController::class, 'showLogin'])->name('login');
    Route::post('login', [AuthController::class, 'login']);
    Route::get('register', [AuthController::class, 'showRegister'])->name('register');
    Route::post('register', [AuthController::class, 'register']);
});

Route::middleware('auth')->group(function () {
    Route::post('logout', [AuthController::class, 'logout'])->name('logout');

    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('admin', [DashboardController::class, 'admin'])->name('admin.dashboard');
    Route::get('teacher', [DashboardController::class, 'teacher'])->name('teacher.dashboard');
    Route::get('student', [DashboardController::class, 'student'])->name('student.dashboard');

    Route::resource('bookings', BookingController::class)->only([
        'index', 'create', 'store', 'show', 'destroy'
    ]);
});
