const DEFAULT_CLIENT_ORIGINS = ['http://localhost:5173', 'http://localhost:5174'];

export const getClientOrigins = (): string[] => {
  const configured = (process.env.CLIENT_URL ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return Array.from(new Set([...configured, ...DEFAULT_CLIENT_ORIGINS]));
};

export const getPrimaryClientUrl = (): string => getClientOrigins()[0] ?? DEFAULT_CLIENT_ORIGINS[0];
