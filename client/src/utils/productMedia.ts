type ProductImageLike = { url: string };

type ProductMediaLike = {
  posterUrl?: string | null;
  defaultPosterId?: number | null;
  images?: ProductImageLike[] | null;
};

const DEFAULT_POSTERS = [
  'art-therapy-somatic.png',
  'artificers-somatic.png',
  'therapy-meditation.png',
  'therapy-forest.png',
  'therapy-sound.png',
  'therapy-tea.png',
  'therapy-somatic.png',
  'therapy-emdr.png',
  'therapy-narrative.png',
  'therapy-art.png'
];

export const getProductDefaultPosterUrl = (defaultPosterId?: number | null): string | null => {
  if (!defaultPosterId || defaultPosterId < 1 || defaultPosterId > DEFAULT_POSTERS.length) return null;
  return `/posters/${DEFAULT_POSTERS[defaultPosterId - 1]}`;
};

export const getProductCoverUrl = (product?: ProductMediaLike | null): string | null => {
  if (!product) return null;
  if (product.posterUrl) return product.posterUrl;

  const defaultPosterUrl = getProductDefaultPosterUrl(product.defaultPosterId);
  if (defaultPosterUrl) return defaultPosterUrl;

  const firstImage = product.images?.[0]?.url;
  return firstImage ?? null;
};
