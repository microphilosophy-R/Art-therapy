import type { TherapyPlan } from '../types';
import { getDefaultPosterUrl, getFallbackPosterUrl } from './defaultPosters';

/**
 * Returns the URL for a therapy plan's poster image.
 * Uses a custom posterUrl if available, otherwise falls back to a static default poster.
 */
export const getPosterUrl = (
  plan: Pick<TherapyPlan, 'defaultPosterId' | 'posterUrl'>,
): string => {
  if (plan.posterUrl) return plan.posterUrl;
  return getDefaultPosterUrl(plan.defaultPosterId) ?? getFallbackPosterUrl();
};
