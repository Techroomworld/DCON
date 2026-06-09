<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class BookingController extends Controller
{
    public function index()
    {
        $user = Auth::user();

        if ($user->isAdmin()) {
            $bookings = Booking::with(['teacher', 'student'])->orderBy('scheduled_at', 'desc')->get();
        } elseif ($user->isTeacher()) {
            $bookings = Booking::with(['student'])->where('teacher_id', $user->id)->orderBy('scheduled_at', 'desc')->get();
        } else {
            $bookings = Booking::with(['teacher'])->where('student_id', $user->id)->orderBy('scheduled_at', 'desc')->get();
        }

        return view('bookings.index', compact('bookings'));
    }

    public function create()
    {
        $user = Auth::user();
        $teachers = User::where('role', 'teacher')->get();
        return view('bookings.create', compact('teachers'));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'teacher_id' => ['required', 'exists:users,id'],
            'subject' => ['required', 'string', 'max:255'],
            'topic' => ['nullable', 'string', 'max:500'],
            'scheduled_at' => ['required', 'date'],
        ]);

        Booking::create([
            'teacher_id' => $validated['teacher_id'],
            'student_id' => Auth::id(),
            'subject' => $validated['subject'],
            'topic' => $validated['topic'],
            'scheduled_at' => $validated['scheduled_at'],
            'status' => 'pending',
        ]);

        return redirect()->route('bookings.index')->with('success', 'Booking request created.');
    }

    public function show(Booking $booking)
    {
        $this->authorizeBooking($booking);
        return view('bookings.show', compact('booking'));
    }

    public function destroy(Booking $booking)
    {
        $this->authorizeBooking($booking);
        $booking->delete();
        return redirect()->route('bookings.index')->with('success', 'Booking deleted.');
    }

    private function authorizeBooking(Booking $booking)
    {
        $user = Auth::user();
        if ($user->isAdmin()) {
            return;
        }

        if ($user->isTeacher() && $booking->teacher_id !== $user->id) {
            abort(403);
        }

        if ($user->isStudent() && $booking->student_id !== $user->id) {
            abort(403);
        }
    }
}
