import { useState, useMemo } from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichStrassenschadenmeldungen } from '@/lib/enrich';
import type { EnrichedStrassenschadenmeldungen } from '@/types/enriched';
import { APP_IDS, LOOKUP_OPTIONS } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { formatDate } from '@/lib/formatters';
import { AI_PHOTO_SCAN } from '@/config/ai-features';
import { Skeleton } from '@/components/ui/skeleton';
import { IconAlertCircle, IconPlus, IconPencil, IconTrash, IconMapPin, IconCalendar, IconUser, IconTag, IconAlertTriangle, IconSearch, IconX, IconRefresh } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { StatCard } from '@/components/StatCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { StrassenschadenmeldungenDialog } from '@/components/dialogs/StrassenschadenmeldungenDialog';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const SEVERITY_ORDER = ['kritisch', 'erheblich', 'maessig', 'gering'];

const SEVERITY_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
  kritisch: {
    label: 'Kritisch',
    color: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
    dot: 'bg-red-500',
  },
  erheblich: {
    label: 'Erheblich',
    color: 'text-orange-700',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    dot: 'bg-orange-500',
  },
  maessig: {
    label: 'Mäßig',
    color: 'text-yellow-700',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    dot: 'bg-yellow-500',
  },
  gering: {
    label: 'Gering',
    color: 'text-green-700',
    bg: 'bg-green-50',
    border: 'border-green-200',
    dot: 'bg-green-500',
  },
};

const CHART_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e'];

export default function DashboardOverview() {
  const {
    schadenskategorien,
    strassenschadenmeldungen,
    schadenskategorienMap,
    loading,
    error,
    fetchAll,
  } = useDashboardData();

  const enrichedMeldungen = enrichStrassenschadenmeldungen(strassenschadenmeldungen, { schadenskategorienMap });

  const [search, setSearch] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<string | null>(null);
  const [filterKategorie, setFilterKategorie] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<EnrichedStrassenschadenmeldungen | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EnrichedStrassenschadenmeldungen | null>(null);
  const [prefilledSeverity, setPrefilledSeverity] = useState<string | null>(null);

  // ALL hooks before early returns
  const filtered = useMemo(() => {
    let result = enrichedMeldungen;
    if (search.trim()) {
      const s = search.toLowerCase();
      result = result.filter(m =>
        [m.fields.strasse, m.fields.hausnummer, m.fields.stadt, m.fields.postleitzahl,
         m.fields.vorname, m.fields.nachname, m.schadenskategorieName,
         m.fields.detaillierte_beschreibung]
          .some(v => v && String(v).toLowerCase().includes(s))
      );
    }
    if (filterSeverity) {
      result = result.filter(m => m.fields.schweregrad?.key === filterSeverity);
    }
    if (filterKategorie) {
      result = result.filter(m => m.schadenskategorieName === filterKategorie);
    }
    return result;
  }, [enrichedMeldungen, search, filterSeverity, filterKategorie]);

  const grouped = useMemo(() => {
    const map: Record<string, EnrichedStrassenschadenmeldungen[]> = {};
    for (const sev of SEVERITY_ORDER) {
      map[sev] = [];
    }
    for (const m of filtered) {
      const key = m.fields.schweregrad?.key ?? 'gering';
      if (!map[key]) map[key] = [];
      map[key].push(m);
    }
    return map;
  }, [filtered]);

  const stats = useMemo(() => {
    const total = enrichedMeldungen.length;
    const kritisch = enrichedMeldungen.filter(m => m.fields.schweregrad?.key === 'kritisch').length;
    const offene = enrichedMeldungen.length;
    const kategorien = schadenskategorien.length;
    return { total, kritisch, offene, kategorien };
  }, [enrichedMeldungen, schadenskategorien]);

  const chartData = useMemo(() => {
    return SEVERITY_ORDER.map((key, i) => ({
      name: SEVERITY_CONFIG[key]?.label ?? key,
      count: enrichedMeldungen.filter(m => m.fields.schweregrad?.key === key).length,
      color: CHART_COLORS[i],
    }));
  }, [enrichedMeldungen]);

  const uniqueKategorien = useMemo(() => {
    const names = new Set(enrichedMeldungen.map(m => m.schadenskategorieName).filter(Boolean));
    return Array.from(names);
  }, [enrichedMeldungen]);

  const activeFilters = (filterSeverity ? 1 : 0) + (filterKategorie ? 1 : 0);

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  async function handleDelete() {
    if (!deleteTarget) return;
    await LivingAppsService.deleteStrassenschadenmeldungenEntry(deleteTarget.record_id);
    fetchAll();
    setDeleteTarget(null);
  }

  function handleNewForSeverity(severityKey: string) {
    setPrefilledSeverity(severityKey);
    setCreateOpen(true);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Schadensmeldungen</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Übersicht aller gemeldeten Straßenschäden</p>
        </div>
        <Button onClick={() => { setPrefilledSeverity(null); setCreateOpen(true); }} className="shrink-0 gap-2">
          <IconPlus size={16} stroke={1.5} className="shrink-0" />
          Neue Meldung
        </Button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Gesamt"
          value={String(stats.total)}
          description="Meldungen"
          icon={<IconAlertTriangle size={18} stroke={1.5} className="text-muted-foreground" />}
        />
        <StatCard
          title="Kritisch"
          value={String(stats.kritisch)}
          description="Dringend"
          icon={<IconAlertCircle size={18} stroke={1.5} className="text-red-500" />}
        />
        <StatCard
          title="Kategorien"
          value={String(stats.kategorien)}
          description="Schadenstypen"
          icon={<IconTag size={18} stroke={1.5} className="text-muted-foreground" />}
        />
        <StatCard
          title="Gesamt offen"
          value={String(stats.offene)}
          description="Zu bearbeiten"
          icon={<IconRefresh size={18} stroke={1.5} className="text-muted-foreground" />}
        />
      </div>

      {/* Chart + Filters row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Bar Chart */}
        <div className="lg:col-span-2 rounded-[20px] bg-card border border-border p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground mb-4">Meldungen nach Schweregrad</h2>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} barSize={36}>
              <XAxis dataKey="name" stroke="var(--muted-foreground)" tick={{ fontSize: 12 }} />
              <YAxis stroke="var(--muted-foreground)" tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 }}
                cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Quick filter panel */}
        <div className="rounded-[20px] bg-card border border-border p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Filter</h2>
          <div className="relative">
            <IconSearch size={14} stroke={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground shrink-0" />
            <Input
              placeholder="Suchen..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground font-medium">Schweregrad</p>
            <div className="flex flex-wrap gap-1.5">
              {SEVERITY_ORDER.map(key => {
                const cfg = SEVERITY_CONFIG[key];
                const active = filterSeverity === key;
                return (
                  <button
                    key={key}
                    onClick={() => setFilterSeverity(active ? null : key)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                      active ? `${cfg.bg} ${cfg.color} ${cfg.border}` : 'bg-muted text-muted-foreground border-transparent hover:border-border'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>
          {uniqueKategorien.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground font-medium">Kategorie</p>
              <div className="flex flex-wrap gap-1.5">
                {uniqueKategorien.map(name => {
                  const active = filterKategorie === name;
                  return (
                    <button
                      key={name}
                      onClick={() => setFilterKategorie(active ? null : name)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                        active
                          ? 'bg-primary/10 text-primary border-primary/30'
                          : 'bg-muted text-muted-foreground border-transparent hover:border-border'
                      }`}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <button
            onClick={() => { setFilterSeverity(null); setFilterKategorie(null); setSearch(''); }}
            disabled={activeFilters === 0 && !search.trim()}
            className={`flex items-center gap-1 text-xs transition-colors ${
              activeFilters > 0 || search.trim()
                ? 'text-primary hover:text-primary/80'
                : 'text-muted-foreground/40 cursor-not-allowed'
            }`}
          >
            <IconX size={12} stroke={1.5} />
            Filter zurücksetzen{activeFilters > 0 ? ` (${activeFilters})` : ''}
          </button>
        </div>
      </div>

      {/* Kanban groups by severity */}
      <div className="space-y-5">
        {(filterSeverity ? [filterSeverity] : SEVERITY_ORDER).map(severityKey => {
          const items = grouped[severityKey] ?? [];
          const cfg = SEVERITY_CONFIG[severityKey];
          return (
            <section key={severityKey}>
              <div className="flex items-center gap-3 mb-3">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${cfg.dot}`} />
                <h2 className="text-sm font-semibold text-foreground">{cfg.label}</h2>
                <Badge variant="secondary" className="text-xs">{items.length}</Badge>
                <button
                  onClick={() => handleNewForSeverity(severityKey)}
                  className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  <IconPlus size={13} stroke={1.5} />
                  Hinzufügen
                </button>
              </div>

              {items.length === 0 ? (
                <div
                  className={`rounded-[16px] border-2 border-dashed ${cfg.border} px-6 py-6 text-center cursor-pointer hover:opacity-80 transition-opacity`}
                  onClick={() => handleNewForSeverity(severityKey)}
                >
                  <p className="text-sm text-muted-foreground">Keine {cfg.label.toLowerCase()} Meldungen</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Klicken zum Hinzufügen</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {items.map(m => (
                    <MeldungCard
                      key={m.record_id}
                      meldung={m}
                      cfg={cfg}
                      onEdit={() => setEditRecord(m)}
                      onDelete={() => setDeleteTarget(m)}
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {filtered.length === 0 && !SEVERITY_ORDER.some(k => (grouped[k] ?? []).length > 0) && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <IconAlertTriangle size={40} stroke={1.5} className="text-muted-foreground" />
          <p className="text-muted-foreground text-sm">Keine Meldungen gefunden.</p>
          {activeFilters > 0 && (
            <Button variant="ghost" size="sm" onClick={() => { setFilterSeverity(null); setFilterKategorie(null); setSearch(''); }}>
              Filter zurücksetzen
            </Button>
          )}
        </div>
      )}

      {/* Create dialog */}
      <StrassenschadenmeldungenDialog
        open={createOpen}
        onClose={() => { setCreateOpen(false); setPrefilledSeverity(null); }}
        onSubmit={async (fields) => {
          await LivingAppsService.createStrassenschadenmeldungenEntry(fields);
          fetchAll();
        }}
        defaultValues={
          prefilledSeverity
            ? (() => {
                const opt = LOOKUP_OPTIONS['straßenschadenmeldungen']?.schweregrad?.find(o => o.key === prefilledSeverity);
                return opt ? { schweregrad: opt } : undefined;
              })()
            : undefined
        }
        schadenskategorienList={schadenskategorien}
        enablePhotoScan={AI_PHOTO_SCAN['Strassenschadenmeldungen']}
      />

      {/* Edit dialog */}
      {editRecord && (
        <StrassenschadenmeldungenDialog
          open={!!editRecord}
          onClose={() => setEditRecord(null)}
          onSubmit={async (fields) => {
            await LivingAppsService.updateStrassenschadenmeldungenEntry(editRecord.record_id, fields);
            fetchAll();
          }}
          defaultValues={editRecord.fields}
          schadenskategorienList={schadenskategorien}
          enablePhotoScan={AI_PHOTO_SCAN['Strassenschadenmeldungen']}
        />
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Meldung löschen"
        description={`Soll die Meldung von ${deleteTarget?.fields.vorname ?? ''} ${deleteTarget?.fields.nachname ?? ''} wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden.`}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function MeldungCard({
  meldung,
  cfg,
  onEdit,
  onDelete,
}: {
  meldung: EnrichedStrassenschadenmeldungen;
  cfg: (typeof SEVERITY_CONFIG)[string];
  onEdit: () => void;
  onDelete: () => void;
}) {
  const f = meldung.fields;
  const address = [f.strasse, f.hausnummer, f.postleitzahl, f.stadt].filter(Boolean).join(' ');
  const reporter = [f.vorname, f.nachname].filter(Boolean).join(' ');

  return (
    <div className={`rounded-[18px] border ${cfg.border} bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow group`}>
      {/* Foto thumbnail if available */}
      {f.foto && (
        <div className="h-32 w-full overflow-hidden">
          <img
            src={f.foto}
            alt="Schadensfoto"
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={e => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
          />
        </div>
      )}
      <div className="p-4 space-y-3">
        {/* Category + severity badge */}
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="min-w-0">
            {meldung.schadenskategorieName ? (
              <span className="text-xs font-medium text-primary bg-primary/10 rounded-full px-2 py-0.5 truncate">
                {meldung.schadenskategorieName}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">Keine Kategorie</span>
            )}
          </div>
          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color} border ${cfg.border} shrink-0`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </span>
        </div>

        {/* Address */}
        {address && (
          <div className="flex items-start gap-1.5 min-w-0">
            <IconMapPin size={13} stroke={1.5} className="shrink-0 text-muted-foreground mt-0.5" />
            <span className="text-sm font-medium text-foreground truncate">{address}</span>
          </div>
        )}

        {/* Description */}
        {f.detaillierte_beschreibung && (
          <p className="text-xs text-muted-foreground line-clamp-2">{f.detaillierte_beschreibung}</p>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-3 flex-wrap">
          {reporter && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground min-w-0">
              <IconUser size={11} stroke={1.5} className="shrink-0" />
              <span className="truncate">{reporter}</span>
            </div>
          )}
          {f.meldedatum && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
              <IconCalendar size={11} stroke={1.5} className="shrink-0" />
              <span>{formatDate(f.meldedatum)}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1 border-t border-border/50">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1 flex-1"
            onClick={onEdit}
          >
            <IconPencil size={12} stroke={1.5} className="shrink-0" />
            <span className="hidden sm:inline">Bearbeiten</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1 text-destructive hover:text-destructive flex-1"
            onClick={onDelete}
          >
            <IconTrash size={12} stroke={1.5} className="shrink-0" />
            <span className="hidden sm:inline">Löschen</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Skeleton className="lg:col-span-2 h-52 rounded-[20px]" />
        <Skeleton className="h-52 rounded-[20px]" />
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} stroke={1.5} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">{error.message}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry}>Erneut versuchen</Button>
    </div>
  );
}
