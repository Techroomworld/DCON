@extends('layout')

@section('content')
<div class="space-y-6">
    <div class="rounded-3xl bg-white p-8 shadow-sm">
        <h1 class="text-2xl font-bold">Student Dashboard</h1>
        <p class="mt-2 text-slate-600">Request a session with a teacher and view your upcoming lessons.</p>
    </div>

    <div class="rounded-3xl bg-white p-8 shadow-sm">
        <h2 class="text-lg font-semibold">Create a Booking</h2>
        <form method="POST" action="{{ route('bookings.store') }}" class="space-y-4 mt-6">
            @csrf
            <div>
                <label class="block text-sm font-medium text-slate-700">Teacher</label>
                <select name="teacher_id" required class="mt-2 w-full rounded-3xl border border-slate-300 px-4 py-3">
                    @foreach($teachers as $teacher)
                        <option value="{{ $teacher->id }}">{{ $teacher->name }}</option>
                    @endforeach
                </select>
            </div>
            <div>
                <label class="block text-sm font-medium text-slate-700">Subject</label>
                <input type="text" name="subject" required class="mt-2 w-full rounded-3xl border border-slate-300 px-4 py-3" />
            </div>
            <div>
                <label class="block text-sm font-medium text-slate-700">Schedule</label>
                <input type="datetime-local" name="scheduled_at" required class="mt-2 w-full rounded-3xl border border-slate-300 px-4 py-3" />
            </div>
            <button type="submit" class="w-full rounded-3xl bg-slate-900 text-white px-4 py-3">Book Session</button>
        </form>
    </div>

    <div class="rounded-3xl bg-white p-8 shadow-sm">
        <h2 class="text-lg font-semibold">Your Bookings</h2>
        <div class="mt-6 space-y-4">
            @forelse($bookings as $booking)
                <div class="rounded-3xl border border-slate-200 p-4">
                    <p class="font-medium">{{ $booking->subject }} with {{ $booking->teacher->name }}</p>
                    <p class="text-sm text-slate-500">{{ $booking->scheduled_at->format('M d, Y H:i') }}</p>
                    <p class="text-sm text-slate-500">Status: {{ ucfirst($booking->status) }}</p>
                </div>
            @empty
                <p class="text-slate-500">No bookings yet.</p>
            @endforelse
        </div>
    </div>
</div>
@endsection
