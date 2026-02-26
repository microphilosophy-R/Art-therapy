import { format, formatDistanceToNow, parseISO, differenceInHours } from 'date-fns';

export const formatCurrency = (cents: number, currency = 'USD'): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);

/** @deprecated prices are now CNY — use formatCNY or PriceDisplay instead */
export const formatPrice = (dollars: number): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(dollars);

/** Format a CNY amount (e.g. 500 → "¥500.00") */
export const formatCNY = (yuan: number): string =>
  `¥${new Intl.NumberFormat('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(yuan)}`;

/** Format a USD amount (e.g. 68.5 → "$68.50") */
export const formatUSD = (usd: number): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(usd);

export const formatDate = (dateStr: string): string =>
  format(parseISO(dateStr), 'MMMM d, yyyy');

export const formatDateTime = (dateStr: string): string =>
  format(parseISO(dateStr), 'MMMM d, yyyy h:mm a');

export const formatTime = (dateStr: string): string =>
  format(parseISO(dateStr), 'h:mm a');

export const formatRelative = (dateStr: string): string =>
  formatDistanceToNow(parseISO(dateStr), { addSuffix: true });

export const formatShortDate = (dateStr: string): string =>
  format(parseISO(dateStr), 'MMM d');

export const hoursUntil = (dateStr: string): number =>
  differenceInHours(parseISO(dateStr), new Date());

export const getInitials = (firstName: string, lastName: string): string =>
  `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();

export const pluralize = (count: number, word: string): string =>
  count === 1 ? `${count} ${word}` : `${count} ${word}s`;

export const specialtyColors: Record<string, string> = {
  Trauma:      'bg-rose-100 text-rose-700',
  Anxiety:     'bg-amber-100 text-amber-700',
  Depression:  'bg-blue-100 text-blue-700',
  Grief:       'bg-purple-100 text-purple-700',
  Children:    'bg-green-100 text-green-700',
  Couples:     'bg-pink-100 text-pink-700',
  PTSD:        'bg-orange-100 text-orange-700',
  Stress:      'bg-teal-100 text-teal-700',
  default:     'bg-stone-100 text-stone-700',
};

export const getSpecialtyColor = (specialty: string): string =>
  specialtyColors[specialty] ?? specialtyColors.default;
