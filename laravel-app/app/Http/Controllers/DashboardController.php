<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

class DashboardController extends Controller
{
    public function index()
    {
        $user = Auth::user();

        if ($user->isAdmin()) {
            return redirect()->route('admin.dashboard');
        }

        if ($user->isTeacher()) {
            return redirect()->route('teacher.dashboard');
        }

        return redirect()->route('student.dashboard');
    }

    public function admin()
    {
        $bookings = Booking::with(['teacher', 'student'])->orderBy('scheduled_at', 'desc')->get();

        $stats = [
            'users' => User::count(),
            'bookings' => Booking::count(),
            'teachers' => User::where('role', 'teacher')->count(),
        ];

        return view('admin.dashboard', compact('bookings', 'stats'));
    }

    public function teacher()
    {
        $user = Auth::user();
        $bookings = Booking::with(['student'])->where('teacher_id', $user->id)->orderBy('scheduled_at', 'desc')->get();
        return view('teacher.dashboard', compact('bookings'));
    }

    public function student()
    {
        $user = Auth::user();
        $bookings = Booking::with(['teacher'])->where('student_id', $user->id)->orderBy('scheduled_at', 'desc')->get();
        $teachers = User::where('role', 'teacher')->get();

        return view('student.dashboard', compact('bookings', 'teachers'));
    }
}
