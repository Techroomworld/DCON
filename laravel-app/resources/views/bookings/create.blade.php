@extends('layout')

@section('content')
<div class="max-w-2xl mx-auto space-y-6">
    <div class="rounded-3xl bg-white p-8 shadow-sm">
        <h1 class="text-2xl font-bold">Create Booking</h1>
        <p class="mt-2 text-slate-600">Request a lesson with one of our teachers.</p>
    </div>

    <div class="rounded-3xl bg-white p-8 shadow-sm">
        @if($errors->any())
            <div class="mb-4 rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
                {{ $errors->first() }}
            </div>
        @endif

        <form method="POST" action="{{ route('bookings.store') }}" class="space-y-4">
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
                <input type="text" name="subject" required class="mt-2 w-full rounded-3xl border border-slate-300 px-4 py-3" value="{{ old('subject') }}" />
            </div>
            <div>
                <label class="block text-sm font-medium text-slate-700">Topic</label>
                <textarea name="topic" rows="4" class="mt-2 w-full rounded-3xl border border-slate-300 px-4 py-3">{{ old('topic') }}</textarea>
            </div>
            <div>
                <label class="block text-sm font-medium text-slate-700">Schedule</label>
                <input type="datetime-local" name="scheduled_at" required class="mt-2 w-full rounded-3xl border border-slate-300 px-4 py-3" value="{{ old('scheduled_at') }}" />
            </div>
            <button type="submit" class="w-full rounded-3xl bg-slate-900 text-white px-4 py-3">Request Booking</button>
        </form>
    </div>
</div>
@endsection
