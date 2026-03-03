import React, { useState } from 'react';

export const Step4CalendarVisibility = ({ profile, onSave }: any) => {
  const [calendarVisible, setCalendarVisible] = useState(profile?.calendarVisible || false);

  const handleToggle = () => {
    const updated = !calendarVisible;
    setCalendarVisible(updated);
    onSave({ calendarVisible: updated });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Calendar Visibility</h3>
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium">Show calendar to public</label>
        <button
          type="button"
          onClick={handleToggle}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            calendarVisible ? 'bg-teal-600' : 'bg-stone-300'
          }`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            calendarVisible ? 'translate-x-6' : 'translate-x-1'
          }`} />
        </button>
      </div>
      <div className="mt-4 p-4 bg-stone-50 rounded-lg">
        <p className="text-sm text-stone-600">Calendar preview (read-only)</p>
      </div>
    </div>
  );
};
