import React from 'react';

interface NavIconProps {
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
  label?: string;
}

export default function NavIcon({ icon, active, onClick, label }: NavIconProps) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
        active ? 'bg-cyan-500/10 text-cyan-400' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
      }`}
    >
      {React.isValidElement(icon) ? React.cloneElement(icon, { size: 24 } as any) : icon}
    </button>
  );
}