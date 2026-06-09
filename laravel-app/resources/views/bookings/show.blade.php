@extends('layout')

@section('content')
<div class="max-w-2xl mx-auto space-y-6">
    <div class="rounded-3xl bg-white p-8 shadow-sm">
        <h1 class="text-2xl font-bold">Booking Details</h1>
    </div>

    <div class="rounded-3xl bg-white p-8 shadow-sm space-y-4">
        <p><span class="font-semibold">Subject:</span> {{ $booking->subject }}</p>
        <p><span class="font-semibold">Topic:</span> {{ $booking->topic ?? '—' }}</p>
        <p><span class="font-semibold">Teacher:</span> {{ $booking->teacher->name }}</p>
        <p><span class="font-semibold">Student:</span> {{ $booking->student->name }}</p>
        <p><span class="font-semibold">Scheduled at:</span> {{ $booking->scheduled_at->format('M d, Y H:i') }}</p>
        <p><span class="font-semibold">Status:</span> {{ ucfirst($booking->status) }}</p>
    </div>

    <div class="flex justify-end gap-4">
        <a href="{{ route('bookings.index') }}" class="rounded-3xl border border-slate-300 px-5 py-3 text-slate-700">Back</a>
    </div>
</div>
@endsection
