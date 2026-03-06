type ProductImageLike = { url: string };

type ProductMediaLike = {
  posterUrl?: string | null;
  defaultPosterId?: number | null;
  images?: ProductImageLike[] | null;
};

export const getProductDefaultPosterUrl = (defaultPosterId?: number | null): string | null => {
  if (!defaultPosterId || defaultPosterId < 1 || defaultPosterId > 6) return null;
  return `/posters/default-${defaultPosterId}.jpg`;
};

export const getProductCoverUrl = (product?: ProductMediaLike | null): string | null => {
  if (!product) return null;
  if (product.posterUrl) return product.posterUrl;

  const defaultPosterUrl = getProductDefaultPosterUrl(product.defaultPosterId);
  if (defaultPosterUrl) return defaultPosterUrl;

  const firstImage = product.images?.[0]?.url;
  return firstImage ?? null;
};
