import { memo } from 'react';

export const Spinner = memo(function Spinner({ size = 'md' }) {
  const sz = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }[size];
  return (
    <div className={`${sz} border-2 border-slate-600 border-t-primary rounded-full animate-spin`} />
  );
});
