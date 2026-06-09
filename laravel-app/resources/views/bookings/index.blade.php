@extends('layout')

@section('content')
<div class="space-y-6">
    <div class="rounded-3xl bg-white p-8 shadow-sm">
        <div class="flex items-center justify-between">
            <div>
                <h1 class="text-2xl font-bold">Bookings</h1>
                <p class="mt-2 text-slate-600">Review current session requests and manage your schedule.</p>
            </div>
            @if(auth()->user()->isStudent())
                <a href="{{ route('bookings.create') }}" class="rounded-3xl bg-slate-900 px-5 py-3 text-white">New Booking</a>
            @endif
        </div>
    </div>

    <div class="space-y-4">
        @forelse($bookings as $booking)
            <div class="rounded-3xl bg-white p-6 shadow-sm">
                <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p class="font-semibold">{{ $booking->subject }}</p>
                        <p class="text-sm text-slate-500">{{ $booking->scheduled_at->format('M d, Y H:i') }} • Status: {{ ucfirst($booking->status) }}</p>
                        <p class="text-sm text-slate-500">
                            @if(auth()->user()->isAdmin())
                                Teacher: {{ $booking->teacher->name }} • Student: {{ $booking->student->name }}
                            @elseif(auth()->user()->isTeacher())
                                Student: {{ $booking->student->name }}
                            @else
                                Teacher: {{ $booking->teacher->name }}
                            @endif
                        </p>
                    </div>
                    <div class="flex items-center gap-3">
                        <a href="{{ route('bookings.show', $booking) }}" class="rounded-3xl border border-slate-300 px-4 py-2 text-sm text-slate-700">Details</a>
                        <form method="POST" action="{{ route('bookings.destroy', $booking) }}">
                            @csrf
                            @method('DELETE')
                            <button type="submit" class="rounded-3xl bg-red-600 px-4 py-2 text-sm text-white">Delete</button>
                        </form>
                    </div>
                </div>
            </div>
        @empty
            <div class="rounded-3xl bg-white p-6 shadow-sm text-center text-slate-500">No bookings found.</div>
        @endforelse
    </div>
</div>
@endsection
