import { useEffect, useState } from 'react';

export const useAutoSave = <T>(data: T, saveFn: (data: T) => Promise<void>) => {
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    const timer = setTimeout(() => {
      setStatus('saving');
      saveFn(data)
        .then(() => setStatus('saved'))
        .catch(() => setStatus('error'));
    }, 2000);

    return () => clearTimeout(timer);
  }, [data, saveFn]);

  return status;
};
