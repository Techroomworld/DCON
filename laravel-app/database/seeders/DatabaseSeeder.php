<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        User::create([
            'name' => 'Administrator',
            'email' => 'admin@dcons.academy',
            'password' => Hash::make('password123'),
            'role' => 'admin',
        ]);

        User::create([
            'name' => 'Teacher One',
            'email' => 'teacher@dcons.academy',
            'password' => Hash::make('password123'),
            'role' => 'teacher',
        ]);

        User::create([
            'name' => 'Student One',
            'email' => 'student@dcons.academy',
            'password' => Hash::make('password123'),
            'role' => 'student',
        ]);
    }
}
