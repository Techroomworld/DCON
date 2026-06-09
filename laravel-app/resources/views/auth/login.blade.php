@extends('layout')

@section('content')
<div class="max-w-md mx-auto bg-white p-8 rounded-3xl shadow-sm">
    <h1 class="text-2xl font-bold mb-6">Login</h1>
    @if($errors->any())
        <div class="mb-4 rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
            {{ $errors->first() }}
        </div>
    @endif
    <form method="POST" action="{{ route('login') }}" class="space-y-4">
        @csrf
        <div>
            <label class="block text-sm font-medium text-slate-700">Email</label>
            <input type="email" name="email" value="{{ old('email') }}" required class="mt-2 w-full rounded-3xl border border-slate-300 px-4 py-3" />
        </div>
        <div>
            <label class="block text-sm font-medium text-slate-700">Password</label>
            <input type="password" name="password" required class="mt-2 w-full rounded-3xl border border-slate-300 px-4 py-3" />
        </div>
        <button type="submit" class="w-full rounded-3xl bg-slate-900 text-white px-4 py-3">Login</button>
    </form>
    <p class="mt-4 text-center text-sm text-slate-500">Don't have an account? <a href="{{ route('register') }}" class="text-blue-600">Register</a></p>
</div>
@endsection
