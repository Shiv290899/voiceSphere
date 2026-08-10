import * as React from "react";
export { cn } from "./utils";

// ==========================================
// BUTTON COMPONENT
// ==========================================
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] ${
          variant === 'primary' ? 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-indigo-500/25 focus:ring-indigo-500' : ''
        } ${
          variant === 'secondary' ? 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 focus:ring-slate-600' : ''
        } ${
          variant === 'outline' ? 'bg-transparent border border-slate-700 hover:bg-slate-800/50 text-slate-300 hover:text-white focus:ring-slate-600' : ''
        } ${
          variant === 'ghost' ? 'bg-transparent hover:bg-slate-800/80 text-slate-400 hover:text-white focus:ring-slate-600' : ''
        } ${
          variant === 'danger' ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-500/20 focus:ring-rose-500' : ''
        } ${
          size === 'sm' ? 'h-9 px-3.5 text-xs' : ''
        } ${
          size === 'md' ? 'h-10 px-5 text-sm' : ''
        } ${
          size === 'lg' ? 'h-12 px-7 text-base' : ''
        } ${className || ''}`}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

// ==========================================
// INPUT COMPONENT
// ==========================================
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, label, type = "text", ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label className="text-xs font-semibold text-slate-400 tracking-wide uppercase px-0.5">
            {label}
          </label>
        )}
        <input
          type={type}
          ref={ref}
          className={`flex h-11 w-full rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-2 text-sm text-slate-100 placeholder-slate-500 transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium focus:border-indigo-500/80 focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
            error ? 'border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/20' : ''
          } ${className || ''}`}
          {...props}
        />
        {error && (
          <span className="text-xs font-medium text-rose-500 px-0.5">{error}</span>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

// ==========================================
// CARD COMPONENT
// ==========================================
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glassmorphism?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, glassmorphism = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`rounded-2xl border ${
          glassmorphism 
            ? 'bg-slate-950/40 backdrop-blur-xl border-white/[0.06] shadow-2xl' 
            : 'bg-slate-900 border-slate-800/80 shadow-md'
        } ${className || ''}`}
        {...props}
      />
    );
  }
);
Card.displayName = "Card";

// ==========================================
// BADGE COMPONENT
// ==========================================
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
}

export const Badge: React.FC<BadgeProps> = ({ className, variant = 'primary', ...props }) => {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors ${
        variant === 'primary' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : ''
      } ${
        variant === 'secondary' ? 'bg-slate-800 text-slate-300 border border-slate-700' : ''
      } ${
        variant === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : ''
      } ${
        variant === 'warning' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : ''
      } ${
        variant === 'danger' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : ''
      } ${className || ''}`}
      {...props}
    />
  );
};

// ==========================================
// AVATAR COMPONENT
// ==========================================
export interface AvatarProps {
  src?: string;
  alt?: string;
  fallback: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  isOnline?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = "avatar",
  fallback,
  size = 'md',
  className = '',
  isOnline = false,
}) => {
  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-14 w-14 text-lg',
    xl: 'h-20 w-20 text-2xl',
  };

  const badgeSizeClasses = {
    sm: 'h-2 w-2 right-0 bottom-0 ring-1',
    md: 'h-2.5 w-2.5 right-0.5 bottom-0.5 ring-2',
    lg: 'h-3.5 w-3.5 right-0.5 bottom-0.5 ring-2',
    xl: 'h-5 w-5 right-1 bottom-1 ring-3',
  };

  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      {src ? (
        <img
          src={src}
          alt={alt}
          className={`rounded-full object-cover border border-slate-800 ${sizeClasses[size]}`}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        <div className={`flex items-center justify-center rounded-full bg-indigo-950 border border-indigo-800 font-bold text-indigo-300 uppercase select-none ${sizeClasses[size]}`}>
          {fallback.substring(0, 2)}
        </div>
      )}
      {isOnline && (
        <span className={`absolute block rounded-full bg-emerald-500 ring-slate-900 ${badgeSizeClasses[size]}`} />
      )}
    </div>
  );
};
