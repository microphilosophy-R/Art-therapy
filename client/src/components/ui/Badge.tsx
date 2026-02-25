import React from 'react';
import { cn } from '../../utils/cn';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantMap: Record<BadgeVariant, string> = {
  default: 'bg-stone-100 text-stone-700',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  danger:  'bg-rose-100 text-rose-700',
  info:    'bg-teal-100 text-teal-700',
  outline: 'border border-stone-300 text-stone-600 bg-transparent',
};

export const Badge = ({ variant = 'default', className, children, ...props }: BadgeProps) => (
  <span
    className={cn(
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
      variantMap[variant],
      className
    )}
    {...props}
  >
    {children}
  </span>
);
