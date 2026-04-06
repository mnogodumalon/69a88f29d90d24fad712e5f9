import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Schadenskategorien, Strassenschadenmeldungen } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [schadenskategorien, setSchadenskategorien] = useState<Schadenskategorien[]>([]);
  const [strassenschadenmeldungen, setStrassenschadenmeldungen] = useState<Strassenschadenmeldungen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [schadenskategorienData, strassenschadenmeldungenData] = await Promise.all([
        LivingAppsService.getSchadenskategorien(),
        LivingAppsService.getStrassenschadenmeldungen(),
      ]);
      setSchadenskategorien(schadenskategorienData);
      setStrassenschadenmeldungen(strassenschadenmeldungenData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Silent background refresh (no loading state change → no flicker)
  useEffect(() => {
    async function silentRefresh() {
      try {
        const [schadenskategorienData, strassenschadenmeldungenData] = await Promise.all([
          LivingAppsService.getSchadenskategorien(),
          LivingAppsService.getStrassenschadenmeldungen(),
        ]);
        setSchadenskategorien(schadenskategorienData);
        setStrassenschadenmeldungen(strassenschadenmeldungenData);
      } catch {
        // silently ignore — stale data is better than no data
      }
    }
    function handleRefresh() { void silentRefresh(); }
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, []);

  const schadenskategorienMap = useMemo(() => {
    const m = new Map<string, Schadenskategorien>();
    schadenskategorien.forEach(r => m.set(r.record_id, r));
    return m;
  }, [schadenskategorien]);

  return { schadenskategorien, setSchadenskategorien, strassenschadenmeldungen, setStrassenschadenmeldungen, loading, error, fetchAll, schadenskategorienMap };
}