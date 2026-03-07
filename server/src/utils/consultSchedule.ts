export const CONSULT_TIMEZONE = 'Asia/Shanghai';
const UTC8_OFFSET_MINUTES = 8 * 60;

export const ACTIVE_PERSONAL_CONSULT_STATUSES = [
  'DRAFT',
  'PENDING_REVIEW',
  'PUBLISHED',
] as const;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const normalizeDateOnly = (value: string | Date): string => {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (DATE_RE.test(value)) return value;
  if (value.includes('T')) return value.slice(0, 10);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date value: ${value}`);
  }
  return parsed.toISOString().slice(0, 10);
};

export const parseTimeToMinutes = (value: string): number => {
  const m = value.match(TIME_RE);
  if (!m) throw new Error(`Invalid HH:mm time: ${value}`);
  const hours = Number(m[1]);
  const minutes = Number(m[2]);
  return hours * 60 + minutes;
};

export const minutesToTimeString = (minutes: number): string => {
  const clamped = Math.max(0, Math.min(1439, Math.floor(minutes)));
  const h = String(Math.floor(clamped / 60)).padStart(2, '0');
  const m = String(clamped % 60).padStart(2, '0');
  return `${h}:${m}`;
};

export const combineUtc8DateAndMinutes = (date: string | Date, minutes: number): Date => {
  const dateStr = normalizeDateOnly(date);
  const [y, m, d] = dateStr.split('-').map(Number);
  const utcMs =
    Date.UTC(y, m - 1, d, 0, 0, 0, 0) +
    (minutes - UTC8_OFFSET_MINUTES) * 60 * 1000;
  return new Date(utcMs);
};

export const deriveWindowFromConsultFields = (input: {
  consultDateStart: string | Date;
  consultDateEnd: string | Date;
  consultWorkStartMin: number;
  consultWorkEndMin: number;
}) => {
  const startDate = normalizeDateOnly(input.consultDateStart);
  const endDate = normalizeDateOnly(input.consultDateEnd);
  const workStart = Math.floor(input.consultWorkStartMin);
  const workEnd = Math.floor(input.consultWorkEndMin);

  if (workStart < 0 || workStart > 1439 || workEnd < 1 || workEnd > 1440 || workEnd <= workStart) {
    throw new Error('Invalid consult working hours');
  }
  if (endDate < startDate) {
    throw new Error('consultDateEnd must be on or after consultDateStart');
  }

  return {
    startTime: combineUtc8DateAndMinutes(startDate, workStart),
    endTime: combineUtc8DateAndMinutes(endDate, workEnd),
    consultDateStart: startDate,
    consultDateEnd: endDate,
    consultWorkStartMin: workStart,
    consultWorkEndMin: workEnd,
  };
};

export const getUtc8DateString = (value: Date): string => {
  const shifted = new Date(value.getTime() + UTC8_OFFSET_MINUTES * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
};

export const getUtc8Minutes = (value: Date): number => {
  const shifted = new Date(value.getTime() + UTC8_OFFSET_MINUTES * 60 * 1000);
  return shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
};

export const isSlotWithinConsultWindow = (
  slotStart: Date,
  slotEnd: Date,
  consultWindow: {
    consultDateStart: Date | string | null;
    consultDateEnd: Date | string | null;
    consultWorkStartMin: number | null;
    consultWorkEndMin: number | null;
  },
): boolean => {
  if (
    !consultWindow.consultDateStart ||
    !consultWindow.consultDateEnd ||
    consultWindow.consultWorkStartMin == null ||
    consultWindow.consultWorkEndMin == null
  ) {
    return false;
  }

  const dateStart = normalizeDateOnly(consultWindow.consultDateStart);
  const dateEnd = normalizeDateOnly(consultWindow.consultDateEnd);
  const slotDate = getUtc8DateString(slotStart);

  if (slotDate < dateStart || slotDate > dateEnd) return false;

  const slotStartMin = getUtc8Minutes(slotStart);
  const slotEndMin = getUtc8Minutes(slotEnd);

  return (
    slotStartMin >= consultWindow.consultWorkStartMin &&
    slotEndMin <= consultWindow.consultWorkEndMin
  );
};

