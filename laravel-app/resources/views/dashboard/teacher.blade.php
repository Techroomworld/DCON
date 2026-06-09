@extends('layout')

@section('content')
<div class="space-y-6">
    <div class="rounded-3xl bg-white p-8 shadow-sm">
        <h1 class="text-2xl font-bold">Teacher Dashboard</h1>
        <p class="mt-2 text-slate-600">Review your booking requests and manage availability.</p>
    </div>

    <div class="rounded-3xl bg-white p-8 shadow-sm">
        <h2 class="text-lg font-semibold">Your Bookings</h2>
        <div class="mt-6 space-y-4">
            @forelse($bookings as $booking)
                <div class="rounded-3xl border border-slate-200 p-4">
                    <p class="font-medium">{{ $booking->student->name }} &bull; {{ $booking->subject }}</p>
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
