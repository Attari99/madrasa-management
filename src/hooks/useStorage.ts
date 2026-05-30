import { useState, useEffect } from 'react';
import { storage } from '@/utils/storage';

export function useCollection<T extends { id: string }>(key: string) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = () => {
    const items = storage.get<T[]>(key) ?? [];
    setData(items);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, [key]);

  return { data, loading, refresh };
}