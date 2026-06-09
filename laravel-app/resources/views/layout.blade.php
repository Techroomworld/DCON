<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DCONS Academy</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/tailwindcss@2/dist/tailwind.min.css">
</head>
<body class="bg-slate-100 font-sans text-slate-900">
    <div class="min-h-screen">
        <header class="bg-white shadow-sm">
            <div class="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
                <a href="{{ url('/') }}" class="text-xl font-bold text-slate-900">DCONS Academy</a>
                <nav class="space-x-4 text-sm text-slate-700">
                    @auth
                        <a href="{{ route('dashboard') }}">Dashboard</a>
                        <a href="{{ route('bookings.index') }}">Bookings</a>
                        <form action="{{ route('logout') }}" method="POST" class="inline">
                            @csrf
                            <button type="submit" class="text-red-600 hover:text-red-800">Logout</button>
                        </form>
                    @else
                        <a href="{{ route('login') }}">Login</a>
                        <a href="{{ route('register') }}">Register</a>
                    @endauth
                </nav>
            </div>
        </header>

        <main class="max-w-6xl mx-auto px-6 py-10">
            @if(session('success'))
                <div class="mb-6 rounded-3xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-800">
                    {{ session('success') }}
                </div>
            @endif

            @if(session('error'))
                <div class="mb-6 rounded-3xl bg-red-50 border border-red-200 p-4 text-red-800">
                    {{ session('error') }}
                </div>
            @endif

            @yield('content')
        </main>
    </div>
</body>
</html>
