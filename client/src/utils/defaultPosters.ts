export const DEFAULT_POSTER_FILES = [
  'art-therapy-somatic.png',
  'artificers-somatic.png',
  'therapy-meditation.png',
  'therapy-forest.png',
  'therapy-sound.png',
  'therapy-tea.png',
  'therapy-somatic.png',
  'therapy-emdr.png',
  'therapy-narrative.png',
  'therapy-art.png',
] as const;

export const DEFAULT_POSTER_COUNT = DEFAULT_POSTER_FILES.length;

export const getDefaultPosterUrl = (defaultPosterId?: number | null): string | null => {
  if (!defaultPosterId || defaultPosterId < 1 || defaultPosterId > DEFAULT_POSTER_COUNT) return null;
  return `/posters/${DEFAULT_POSTER_FILES[defaultPosterId - 1]}`;
};

export const getFallbackPosterUrl = (): string => `/posters/${DEFAULT_POSTER_FILES[0]}`;
