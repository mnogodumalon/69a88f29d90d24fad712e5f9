import type { EnrichedStrassenschadenmeldungen } from '@/types/enriched';
import type { Schadenskategorien, Strassenschadenmeldungen } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface StrassenschadenmeldungenMaps {
  schadenskategorienMap: Map<string, Schadenskategorien>;
}

export function enrichStrassenschadenmeldungen(
  strassenschadenmeldungen: Strassenschadenmeldungen[],
  maps: StrassenschadenmeldungenMaps
): EnrichedStrassenschadenmeldungen[] {
  return strassenschadenmeldungen.map(r => ({
    ...r,
    schadenskategorieName: resolveDisplay(r.fields.schadenskategorie, maps.schadenskategorienMap, 'kategoriename'),
  }));
}
