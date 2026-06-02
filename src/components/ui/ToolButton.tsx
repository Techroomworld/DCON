'use client';

interface ToolButtonProps {
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
  tooltip?: string;
}

export default function ToolButton({
  icon,
  active,
  onClick,
  tooltip,
}: ToolButtonProps) {
  return (
    <button
      onClick={onClick}
      title={tooltip}
      className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
        active
          ? 'bg-cyan-500 text-white'
          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
      }`}
    >
      {icon}
    </button>
  );
}
