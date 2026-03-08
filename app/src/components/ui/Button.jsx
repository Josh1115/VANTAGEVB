import { memo } from 'react';
import clsx from 'clsx';

export const Button = memo(function Button({ children, variant = 'primary', size = 'md', className, disabled, ...props }) {
  return (
    <button
      disabled={disabled}
      className={clsx(
        'inline-flex items-center justify-center font-semibold rounded-lg transition-colors focus:outline-none active:scale-95',
        {
          'bg-primary text-white hover:bg-orange-600 disabled:opacity-50':                      variant === 'primary',
          'bg-surface text-white hover:bg-slate-600 border border-slate-600 disabled:opacity-50': variant === 'secondary',
          'bg-transparent text-red-400 hover:bg-red-900/30 border border-red-700 disabled:opacity-50': variant === 'danger',
          'bg-transparent text-slate-400 hover:bg-slate-700 disabled:opacity-50':               variant === 'ghost',
        },
        {
          'px-3 py-1.5 text-sm': size === 'sm',
          'px-4 py-2 text-base':  size === 'md',
          'px-6 py-3 text-lg':   size === 'lg',
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
});
