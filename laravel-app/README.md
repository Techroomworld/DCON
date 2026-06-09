# DCONS Academy Laravel App

This is the new Laravel + MySQL implementation for DCONS Academy.

## Setup

1. Install PHP 8.1+ and Composer.
2. Run `composer install` inside `laravel-app/`.
3. Copy `.env.example` to `.env` and configure your MySQL database.
4. Run `php artisan key:generate`.
5. Run `php artisan migrate --seed`.
6. Start the app with `php artisan serve`.

### Seeded demo users

- Admin: `admin@dcons.academy` / `password123`
- Teacher: `teacher@dcons.academy` / `password123`
- Student: `student@dcons.academy` / `password123`

## Features

- Admin / Teacher / Student authentication
- Role-based dashboards
- Booking management
- Blade templating
