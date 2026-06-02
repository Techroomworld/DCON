import React from 'react'
import { Link } from 'react-router-dom'

export default function NavBar(){
  return (
    <header className="w-full bg-slate-900 p-4 border-b border-slate-800">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="text-xl font-bold text-cyan-400">DCONS Academy</div>
        <nav className="flex gap-3">
          <Link to="/" className="text-slate-300 hover:text-white">Home</Link>
          <Link to="/teacher" className="text-slate-300 hover:text-white">Teacher</Link>
          <Link to="/student" className="text-slate-300 hover:text-white">Student</Link>
          <Link to="/admin" className="text-slate-300 hover:text-white">Admin</Link>
        </nav>
      </div>
    </header>
  )
}
