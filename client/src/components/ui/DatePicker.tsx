import React from 'react';
import ReactDatePicker, { registerLocale } from 'react-datepicker';
import { useTranslation } from 'react-i18next';
import { cn } from '../../utils/cn';
import { parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale/zh-CN';
import 'react-datepicker/dist/react-datepicker.css';

registerLocale('zh', zhCN);

interface DatePickerProps {
  label?: string;
  value?: string;
  onChange: (value: string) => void;
  error?: string;
  className?: string;
  placeholder?: string;
  showTime?: boolean;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  label,
  value,
  onChange,
  error,
  className,
  placeholder,
  showTime = false,
}) => {
  const { i18n } = useTranslation();
  const selectedDate = value ? parseISO(value) : null;

  return (
    <div className="flex flex-col gap-1 w-full">
      {label && <label className="text-sm font-medium text-stone-700">{label}</label>}
      <ReactDatePicker
        selected={selectedDate}
        onChange={(date: Date | null) =>
          onChange(date ? (showTime ? date.toISOString() : date.toISOString().split('T')[0]) : '')
        }
        showTimeSelect={showTime}
        dateFormat={showTime ? 'yyyy/MM/dd HH:mm' : 'yyyy/MM/dd'}
        locale={i18n.language.startsWith('zh') ? 'zh' : undefined}
        placeholderText={placeholder}
        className={cn(
          'h-10 w-full rounded-lg border bg-white px-3 text-sm',
          error ? 'border-rose-400' : 'border-stone-300',
          className
        )}
        wrapperClassName="w-full"
      />
      {error && <p className="text-xs text-rose-500">{error}</p>}
    </div>
  );
};
