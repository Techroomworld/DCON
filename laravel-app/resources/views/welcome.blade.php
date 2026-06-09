@extends('layout')

@section('content')
<div class="max-w-4xl mx-auto rounded-3xl bg-white p-12 shadow-sm text-center">
    <h1 class="text-4xl font-bold">Welcome to DCONS Academy</h1>
    <p class="mt-4 text-slate-600">A role-based learning platform for admins, teachers, and students.</p>
    <div class="mt-10 space-x-4">
        <a href="{{ route('login') }}" class="inline-flex rounded-3xl bg-slate-900 px-7 py-3 text-white">Login</a>
        <a href="{{ route('register') }}" class="inline-flex rounded-3xl border border-slate-300 px-7 py-3 text-slate-900">Register</a>
    </div>
</div>
@endsection
