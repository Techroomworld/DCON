@extends('layout')

@section('content')
<div class="space-y-6">
    <div class="rounded-3xl bg-white p-8 shadow-sm">
        <h1 class="text-2xl font-bold">Admin Dashboard</h1>
        <p class="mt-2 text-slate-600">Manage teachers, students, and all bookings.</p>
    </div>

    <div class="grid gap-6 lg:grid-cols-3">
        <div class="rounded-3xl bg-white p-6 shadow-sm">
            <h2 class="text-lg font-semibold">Total Users</h2>
            <p class="mt-4 text-3xl font-bold">{{ $stats['users'] }}</p>
        </div>
        <div class="rounded-3xl bg-white p-6 shadow-sm">
            <h2 class="text-lg font-semibold">Total Bookings</h2>
            <p class="mt-4 text-3xl font-bold">{{ $stats['bookings'] }}</p>
        </div>
        <div class="rounded-3xl bg-white p-6 shadow-sm">
            <h2 class="text-lg font-semibold">Active Teachers</h2>
            <p class="mt-4 text-3xl font-bold">{{ $stats['teachers'] }}</p>
        </div>
    </div>

    <div class="rounded-3xl bg-white p-8 shadow-sm">
        <h2 class="text-xl font-semibold">Recent Bookings</h2>
        <div class="mt-6 space-y-4">
            @forelse($bookings as $booking)
                <div class="rounded-3xl border border-slate-200 p-4">
                    <p class="font-medium">{{ $booking->subject }}</p>
                    <p class="text-sm text-slate-500">Teacher: {{ $booking->teacher->name }} • Student: {{ $booking->student->name }}</p>
                    <p class="text-sm text-slate-500">{{ $booking->scheduled_at->format('M d, Y H:i') }} • Status: {{ ucfirst($booking->status) }}</p>
                </div>
            @empty
                <p class="text-slate-500">No bookings available.</p>
            @endforelse
        </div>
    </div>
</div>
@endsection
