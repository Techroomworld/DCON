@extends('layout')

@section('content')
<div class="max-w-md mx-auto bg-white p-8 rounded-3xl shadow-sm">
    <h1 class="text-2xl font-bold mb-6">Register</h1>
    <form method="POST" action="{{ route('register') }}" class="space-y-4">
        @csrf
        <div>
            <label class="block text-sm font-medium text-slate-700">Name</label>
            <input type="text" name="name" value="{{ old('name') }}" required class="mt-2 w-full rounded-3xl border border-slate-300 px-4 py-3" />
        </div>
        <div>
            <label class="block text-sm font-medium text-slate-700">Email</label>
            <input type="email" name="email" value="{{ old('email') }}" required class="mt-2 w-full rounded-3xl border border-slate-300 px-4 py-3" />
        </div>
        <div>
            <label class="block text-sm font-medium text-slate-700">Role</label>
            <select name="role" required class="mt-2 w-full rounded-3xl border border-slate-300 px-4 py-3">
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="admin">Admin</option>
            </select>
        </div>
        <div>
            <label class="block text-sm font-medium text-slate-700">Password</label>
            <input type="password" name="password" required class="mt-2 w-full rounded-3xl border border-slate-300 px-4 py-3" />
        </div>
        <div>
            <label class="block text-sm font-medium text-slate-700">Confirm Password</label>
            <input type="password" name="password_confirmation" required class="mt-2 w-full rounded-3xl border border-slate-300 px-4 py-3" />
        </div>
        <button type="submit" class="w-full rounded-3xl bg-slate-900 text-white px-4 py-3">Register</button>
    </form>
</div>
@endsection
