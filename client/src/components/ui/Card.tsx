import React from 'react';
import { cn } from '../../utils/cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const Card = ({ className, children, ...props }: CardProps) => (
  <div
    className={cn('rounded-xl border border-stone-200 bg-white shadow-sm', className)}
    {...props}
  >
    {children}
  </div>
);

export const CardHeader = ({ className, children, ...props }: CardProps) => (
  <div className={cn('p-6 pb-0', className)} {...props}>{children}</div>
);

export const CardTitle = ({ className, children, ...props }: CardProps) => (
  <h3 className={cn('text-lg font-semibold text-stone-900', className)} {...props}>{children}</h3>
);

export const CardDescription = ({ className, children, ...props }: CardProps) => (
  <p className={cn('text-sm text-stone-500 mt-1', className)} {...props}>{children}</p>
);

export const CardContent = ({ className, children, ...props }: CardProps) => (
  <div className={cn('p-6', className)} {...props}>{children}</div>
);

export const CardFooter = ({ className, children, ...props }: CardProps) => (
  <div className={cn('p-6 pt-0 flex items-center', className)} {...props}>{children}</div>
);
