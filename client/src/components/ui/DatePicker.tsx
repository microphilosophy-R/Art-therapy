import React from 'react';
import ReactDatePicker, { registerLocale } from 'react-datepicker';
import { useTranslation } from 'react-i18next';
import { cn } from '../../utils/cn';
import { parseISO, format as formatFull } from 'date-fns';
import { zhCN } from 'date-fns/locale/zh-CN';

// Register locales
registerLocale('zh', zhCN);

interface DatePickerProps {
  label?: string;
  value?: string; // ISO string
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  className?: string;
  placeholder?: string;
  showTime?: boolean;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  label,
  value,
  onChange,
  error,
  hint,
  className,
  placeholder,
  showTime = true,
}) => {
  const { i18n } = useTranslation();

  const selectedDate = value ? parseISO(value) : null;

  const handleChange = (date: Date | null) => {
    if (!date) {
      onChange('');
      return;
    }
    // Format back to ISO string for the form
    // datetime-local format is basically ISO without the Z and milliseconds usually, 
    // but the API/Form handles ISO fine.
    onChange(date.toISOString());
  };

  return (
    <div className="flex flex-col gap-1 w-full">
      {label && (
        <label className="text-sm font-medium text-stone-700">
          {label}
        </label>
      )}

      <div className="relative w-full date-picker-container">
        <ReactDatePicker
          selected={selectedDate}
          onChange={handleChange}
          showTimeSelect={showTime}
          timeFormat="HH:mm"
          timeIntervals={30}
          timeCaption={i18n.language.startsWith('zh') ? '时间' : 'Time'}
          dateFormat={showTime ? "yyyy/MM/dd HH:mm" : "yyyy/MM/dd"}
          locale={i18n.language.startsWith('zh') ? 'zh' : undefined}
          minTime={new Date(new Date().setHours(6, 0, 0, 0))}
          maxTime={new Date(new Date().setHours(22, 0, 0, 0))}
          placeholderText={placeholder || (i18n.language.startsWith('zh') ? '请选择日期' : 'Select date')}
          className={cn(
            'h-10 w-full rounded-lg border bg-white px-3 text-sm text-stone-900',
            'placeholder:text-stone-400 transition-colors cursor-pointer',
            'focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500',
            error ? 'border-rose-400 focus:ring-rose-400' : 'border-stone-300',
            className
          )}
          wrapperClassName="w-full"
          portalId="root"
          popperPlacement="bottom-start"
        />
      </div>

      {error && <p className="text-xs text-rose-500">{error}</p>}
      {hint && !error && <p className="text-xs text-stone-500">{hint}</p>}

      <style>{`
        .date-picker-container .react-datepicker-wrapper {
          width: 100%;
        }
        .date-picker-container .react-datepicker__input-container {
          width: 100%;
        }
        /* Style adjustments to match our UI better */
        .react-datepicker {
          font-family: inherit;
          border-radius: 0.75rem;
          border: 1px solid #e7e5e4;
          box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
          display: flex !important;
          background-color: #fff;
          overflow: hidden;
          height: 256px; /* Fixed height to match 5-6 row calendars */
        }
        .react-datepicker__header {
          background-color: #f5f5f4;
          border-bottom: 1px solid #e7e5e4;
          border-top-left-radius: 0.75rem !important;
          padding-top: 10px;
          height: 40px; /* Consistent header height */
          box-sizing: border-box;
        }
        .react-datepicker__header--time {
          border-top-right-radius: 0.75rem !important;
          border-top-left-radius: 0 !important;
        }
        .react-datepicker__day--selected {
          background-color: #0d9488 !important;
          border-radius: 0.375rem;
        }
        .react-datepicker__month-container {
          float: none;
          display: flex;
          flex-direction: column;
        }
        .react-datepicker__time-container {
          border-left: 1px solid #e7e5e4;
          width: 100px;
          display: flex;
          flex-direction: column;
        }
        .react-datepicker__time {
          background: white;
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        .react-datepicker__time-box {
          width: 100% !important;
          flex: 1;
          border-bottom-right-radius: 0.75rem;
        }
        .react-datepicker__time-list {
          padding: 0 !important;
          height: 216px !important; /* Total height (256) - header (40) */
        }
        .react-datepicker__time-list-item {
          height: 36px !important;
          display: flex !important;
          align-items: center;
          justify-content: center;
          padding: 0 !important;
        }
        .react-datepicker__time-list-item--selected {
          background-color: #0d9488 !important;
          font-weight: bold;
        }
        .react-datepicker__time-list-item--disabled {
          display: none !important; /* Conceal unavailable times */
        }
        .react-datepicker__time-list-item:hover:not(.react-datepicker__time-list-item--disabled) {
          background-color: #f0fdfa !important;
          color: #0d9488;
        }
        /* Custom scrollbar for the time list */
        .react-datepicker__time-list::-webkit-scrollbar {
          width: 4px;
        }
        .react-datepicker__time-list::-webkit-scrollbar-thumb {
          background-color: #e7e5e4;
          border-radius: 2px;
        }
        .react-datepicker-popper {
          z-index: 9999 !important;
        }
      `}</style>
    </div>
  );
};
