import type { TherapyPlan } from '../types';

/**
 * Returns the URL for a therapy plan's poster image.
 * Uses a custom posterUrl if available, otherwise falls back to a static default poster.
 */
export const getPosterUrl = (
  plan: Pick<TherapyPlan, 'defaultPosterId' | 'posterUrl'>,
): string => {
  if (plan.posterUrl) return plan.posterUrl;
  if (plan.defaultPosterId) return `/posters/default-${plan.defaultPosterId}.jpg`;
  return '/posters/default-1.jpg';
};
