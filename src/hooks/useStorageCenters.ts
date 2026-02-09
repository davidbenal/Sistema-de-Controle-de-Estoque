import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../lib/api';
import { config } from '../config';

export interface StorageCenter {
  id: string;
  value: string;
  label: string;
  order: number;
}

let cachedCenters: StorageCenter[] | null = null;
let fetchPromise: Promise<StorageCenter[]> | null = null;

export function useStorageCenters() {
  const [centers, setCenters] = useState<StorageCenter[]>(cachedCenters || []);
  const [isLoading, setIsLoading] = useState(!cachedCenters);

  const fetchCenters = useCallback(async () => {
    if (fetchPromise) return fetchPromise;

    fetchPromise = apiFetch(config.endpoints.cadastros.storageCenters)
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          cachedCenters = result.centers;
          return result.centers;
        }
        return [];
      })
      .catch(() => [])
      .finally(() => { fetchPromise = null; });

    return fetchPromise;
  }, []);

  useEffect(() => {
    if (cachedCenters) {
      setCenters(cachedCenters);
      setIsLoading(false);
      return;
    }

    fetchCenters().then(data => {
      setCenters(data);
      setIsLoading(false);
    });
  }, [fetchCenters]);

  const refetch = useCallback(async () => {
    cachedCenters = null;
    setIsLoading(true);
    const data = await fetchCenters();
    setCenters(data);
    setIsLoading(false);
  }, [fetchCenters]);

  const getLabel = useCallback((value: string) => {
    if (!value) return '-';
    const center = centers.find(c => c.value === value);
    return center?.label || value.charAt(0).toUpperCase() + value.slice(1).replace(/-/g, ' ');
  }, [centers]);

  return { centers, isLoading, refetch, getLabel };
}
