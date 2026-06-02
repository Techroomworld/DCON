'use client';

interface ControlButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'danger' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
}

export default function ControlButton({
  icon,
  label,
  onClick,
  disabled = false,
  variant = 'secondary',
  size = 'md',
}: ControlButtonProps) {
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-12 h-12',
    lg: 'w-14 h-14',
  };

  const variantClasses = {
    primary: 'bg-cyan-600 hover:bg-cyan-500 text-white',
    danger: 'bg-red-600 hover:bg-red-500 text-white',
    secondary: 'bg-slate-700 hover:bg-slate-600 text-slate-100',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`${sizeClasses[size]} ${variantClasses[variant]} rounded-lg flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {icon}
    </button>
  );
}
