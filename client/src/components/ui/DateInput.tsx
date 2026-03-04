import React from 'react';

interface DateInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function DateInput({ value, onChange, className = '', ...props }: DateInputProps) {
  return (
    <input
      type="date"
      value={value || ''}
      onChange={onChange}
      className={className}
      {...props}
    />
  );
}
