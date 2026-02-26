import { useQuery } from '@tanstack/react-query';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api/v1', '') ?? 'http://localhost:3001';

interface ExchangeRateResponse {
  code: number;
  result: number;
  rate: string | number;
}

/**
 * Fetches the exchange rate via the backend proxy at GET /api/v1/fx.
 * The proxy calls cn.apihz.cn server-side to avoid browser CORS issues.
 * Returns the numeric rate (1 unit of `from` in `to` currency), or null on error.
 */
export const useExchangeRate = (from: string, to: string) => {
  const enabled = !!from && !!to;

  const { data, isLoading } = useQuery<number | null>({
    queryKey: ['exchangeRate', from, to],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/v1/fx?from=${from}&to=${to}&money=1`);
      const json: ExchangeRateResponse = await res.json();
      if (json.code !== 200) return null;
      return Number(json.rate);
    },
    enabled,
    staleTime: 1000 * 60 * 60,    // cache 1 hour — API only updates daily
    gcTime: 1000 * 60 * 60 * 24,  // keep in cache 24 hours
    retry: 1,
  });

  return { rate: data ?? null, isLoading };
};
