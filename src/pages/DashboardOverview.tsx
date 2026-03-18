import { useState, useMemo } from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichStrassenschadenmeldungen } from '@/lib/enrich';
import type { EnrichedStrassenschadenmeldungen } from '@/types/enriched';
import { LivingAppsService } from '@/services/livingAppsService';
import { formatDate } from '@/lib/formatters';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/StatCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { StrassenschadenmeldungenDialog } from '@/components/dialogs/StrassenschadenmeldungenDialog';
import {
  AlertCircle, Plus, Pencil, Trash2, MapPin, AlertTriangle,
  Clock, Tag, Camera, FileText, Phone, Mail,
  Filter, X, LayoutGrid, List,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const SEVERITY_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
  kritisch:  { label: 'Kritisch',  color: 'text-red-700',    bg: 'bg-red-50',     border: 'border-red-200',   dot: 'bg-red-500' },
  erheblich: { label: 'Erheblich', color: 'text-orange-700', bg: 'bg-orange-50',  border: 'border-orange-200',dot: 'bg-orange-500' },
  maessig:   { label: 'Mäßig',    color: 'text-yellow-700', bg: 'bg-yellow-50',  border: 'border-yellow-200',dot: 'bg-yellow-500' },
  gering:    { label: 'Gering',   color: 'text-green-700',  bg: 'bg-green-50',   border: 'border-green-200', dot: 'bg-green-500' },
};

const SEVERITY_ORDER = ['kritisch', 'erheblich', 'maessig', 'gering'];

export default function DashboardOverview() {
  const {
    schadenskategorien, strassenschadenmeldungen,
    schadenskategorienMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const enrichedMeldungen = enrichStrassenschadenmeldungen(strassenschadenmeldungen, { schadenskategorienMap });

  // ALL hooks BEFORE any early returns
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<EnrichedStrassenschadenmeldungen | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EnrichedStrassenschadenmeldungen | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');

  const filtered = useMemo(() => {
    return enrichedMeldungen.filter(m => {
      const sev = m.fields.schweregrad?.key ?? '';
      if (filterSeverity !== 'all' && sev !== filterSeverity) return false;
      if (filterCategory !== 'all' && m.schadenskategorieName !== filterCategory) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const addr = `${m.fields.strasse ?? ''} ${m.fields.hausnummer ?? ''} ${m.fields.stadt ?? ''}`.toLowerCase();
        const name = `${m.fields.vorname ?? ''} ${m.fields.nachname ?? ''}`.toLowerCase();
        const desc = (m.fields.detaillierte_beschreibung ?? '').toLowerCase();
        if (!addr.includes(q) && !name.includes(q) && !desc.includes(q)) return false;
      }
      return true;
    });
  }, [enrichedMeldungen, filterSeverity, filterCategory, searchQuery]);

  const withoutSeverity = useMemo(() => filtered.filter(m => !m.fields.schweregrad), [filtered]);

  const categoryNames = useMemo(() => {
    const names = new Set<string>();
    enrichedMeldungen.forEach(m => {
      if (m.schadenskategorieName) names.add(m.schadenskategorieName);
    });
    return Array.from(names).sort();
  }, [enrichedMeldungen]);

  const totalMeldungen = strassenschadenmeldungen.length;
  const kritischCount = strassenschadenmeldungen.filter(m => m.fields.schweregrad?.key === 'kritisch').length;
  const thisMonth = useMemo(() => {
    const now = new Date();
    return strassenschadenmeldungen.filter(m => {
      if (!m.fields.meldedatum) return false;
      const d = new Date(m.fields.meldedatum);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  }, [strassenschadenmeldungen]);

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  const boardColumns = SEVERITY_ORDER.map(key => {
    const cfg = SEVERITY_CONFIG[key];
    const items = filtered.filter(m => m.fields.schweregrad?.key === key);
    return { key, cfg, items };
  });

  async function handleSubmit(fields: any) {
    if (editRecord) {
      await LivingAppsService.updateStrassenschadenmeldungenEntry(editRecord.record_id, fields);
    } else {
      await LivingAppsService.createStrassenschadenmeldungenEntry(fields);
    }
    fetchAll();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await LivingAppsService.deleteStrassenschadenmeldungenEntry(deleteTarget.record_id);
    setDeleteTarget(null);
    fetchAll();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Schadensübersicht</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Alle gemeldeten Straßenschäden im Überblick</p>
        </div>
        <Button
          onClick={() => { setEditRecord(null); setDialogOpen(true); }}
          className="shrink-0 gap-2"
        >
          <Plus size={16} className="shrink-0" />
          Schaden melden
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Gesamt"
          value={String(totalMeldungen)}
          description="Meldungen gesamt"
          icon={<FileText size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Kritisch"
          value={String(kritischCount)}
          description="Sofortmaßnahmen nötig"
          icon={<AlertTriangle size={18} className="text-red-500" />}
        />
        <StatCard
          title="Diesen Monat"
          value={String(thisMonth)}
          description="Neue Meldungen"
          icon={<Clock size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Kategorien"
          value={String(schadenskategorien.length)}
          description="Schadensarten"
          icon={<Tag size={18} className="text-muted-foreground" />}
        />
      </div>

      {/* Filters & View Toggle */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
        <div className="relative flex-1 min-w-0 max-w-sm">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Suchen (Adresse, Person, Beschreibung)..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X size={14} />
            </button>
          )}
        </div>
        <Select value={filterSeverity} onValueChange={setFilterSeverity}>
          <SelectTrigger className="h-9 w-[150px] text-sm shrink-0">
            <SelectValue placeholder="Schweregrad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Schweregrade</SelectItem>
            {SEVERITY_ORDER.map(k => (
              <SelectItem key={k} value={k}>{SEVERITY_CONFIG[k].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="h-9 w-[160px] text-sm shrink-0">
            <SelectValue placeholder="Kategorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Kategorien</SelectItem>
            {categoryNames.map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-1 border rounded-lg p-1 shrink-0">
          <button
            onClick={() => setViewMode('board')}
            className={`p-1.5 rounded-md transition-colors ${viewMode === 'board' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            title="Board-Ansicht"
          >
            <LayoutGrid size={16} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            title="Listen-Ansicht"
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {/* Board View */}
      {viewMode === 'board' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {boardColumns.map(({ key, cfg, items }) => (
            <div key={key} className="flex flex-col gap-3 min-w-0">
              {/* Column Header */}
              <div className={`flex items-center justify-between px-4 py-2.5 rounded-2xl ${cfg.bg} ${cfg.border} border`}>
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${cfg.dot}`} />
                  <span className={`font-semibold text-sm ${cfg.color}`}>{cfg.label}</span>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
                  {items.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-2">
                {items.map(m => (
                  <MeldungCard
                    key={m.record_id}
                    meldung={m}
                    onEdit={() => { setEditRecord(m); setDialogOpen(true); }}
                    onDelete={() => setDeleteTarget(m)}
                  />
                ))}
                {items.length === 0 && (
                  <div
                    className="border-2 border-dashed border-border rounded-2xl px-4 py-6 text-center cursor-pointer hover:border-primary/40 hover:bg-muted/30 transition-colors"
                    onClick={() => { setEditRecord(null); setDialogOpen(true); }}
                  >
                    <Plus size={20} className="mx-auto text-muted-foreground mb-1" />
                    <p className="text-xs text-muted-foreground">Keine Meldungen</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="flex flex-col gap-3">
          {filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <FileText size={48} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Keine Meldungen gefunden</p>
            </div>
          )}
          {SEVERITY_ORDER.map(sevKey => {
            const items = filtered.filter(m => m.fields.schweregrad?.key === sevKey);
            if (items.length === 0) return null;
            const cfg = SEVERITY_CONFIG[sevKey];
            return (
              <div key={sevKey} className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                  <span className={`text-xs font-semibold uppercase tracking-wide ${cfg.color}`}>{cfg.label} ({items.length})</span>
                </div>
                {items.map(m => (
                  <MeldungListRow
                    key={m.record_id}
                    meldung={m}
                    onEdit={() => { setEditRecord(m); setDialogOpen(true); }}
                    onDelete={() => setDeleteTarget(m)}
                  />
                ))}
              </div>
            );
          })}
          {withoutSeverity.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <span className="w-2 h-2 rounded-full bg-muted-foreground/40" />
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ohne Schweregrad ({withoutSeverity.length})</span>
              </div>
              {withoutSeverity.map(m => (
                <MeldungListRow
                  key={m.record_id}
                  meldung={m}
                  onEdit={() => { setEditRecord(m); setDialogOpen(true); }}
                  onDelete={() => setDeleteTarget(m)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Dialogs */}
      <StrassenschadenmeldungenDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditRecord(null); }}
        onSubmit={handleSubmit}
        defaultValues={editRecord?.fields}
        schadenskategorienList={schadenskategorien}
        enablePhotoScan={AI_PHOTO_SCAN['Strassenschadenmeldungen']}
        enablePhotoLocation={(AI_PHOTO_LOCATION as Record<string, boolean>)['Strassenschadenmeldungen']}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Meldung löschen"
        description={`Soll die Meldung für "${deleteTarget?.fields.strasse ?? 'diese Adresse'}" wirklich gelöscht werden?`}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

// ─── Board Card ───────────────────────────────────────────────────────────────

function MeldungCard({
  meldung, onEdit, onDelete,
}: {
  meldung: EnrichedStrassenschadenmeldungen;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const sev = meldung.fields.schweregrad?.key ?? '';
  const cfg = SEVERITY_CONFIG[sev];
  const addr = [meldung.fields.strasse, meldung.fields.hausnummer].filter(Boolean).join(' ');
  const city = [meldung.fields.postleitzahl, meldung.fields.stadt].filter(Boolean).join(' ');
  const reporter = [meldung.fields.vorname, meldung.fields.nachname].filter(Boolean).join(' ');

  return (
    <div className="group bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Photo */}
      {meldung.fields.foto && (
        <div className="relative h-32 bg-muted overflow-hidden">
          <img
            src={meldung.fields.foto}
            alt="Schadensfo­to"
            className="w-full h-full object-cover"
            onError={e => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
          />
          {cfg && (
            <span className={`absolute top-2 left-2 text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
              {cfg.label}
            </span>
          )}
        </div>
      )}

      <div className="p-3 space-y-2">
        {/* Category */}
        {meldung.schadenskategorieName && (
          <div className="flex items-center gap-1.5">
            <Tag size={11} className="text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground truncate">{meldung.schadenskategorieName}</span>
          </div>
        )}

        {/* Address */}
        <div className="flex items-start gap-1.5 min-w-0">
          <MapPin size={13} className="text-primary shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{addr || '—'}</p>
            {city && <p className="text-xs text-muted-foreground truncate">{city}</p>}
          </div>
        </div>

        {/* Description */}
        {meldung.fields.detaillierte_beschreibung && (
          <p className="text-xs text-muted-foreground line-clamp-2">{meldung.fields.detaillierte_beschreibung}</p>
        )}

        {/* Reporter & Date */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/60">
          <div className="min-w-0">
            {reporter && <p className="text-xs text-muted-foreground truncate">{reporter}</p>}
            {meldung.fields.meldedatum && (
              <p className="text-xs text-muted-foreground">{formatDate(meldung.fields.meldedatum)}</p>
            )}
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button
              onClick={onEdit}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              title="Bearbeiten"
            >
              <Pencil size={13} />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
              title="Löschen"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── List Row ─────────────────────────────────────────────────────────────────

function MeldungListRow({
  meldung, onEdit, onDelete,
}: {
  meldung: EnrichedStrassenschadenmeldungen;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const sev = meldung.fields.schweregrad?.key ?? '';
  const cfg = SEVERITY_CONFIG[sev];
  const addr = [meldung.fields.strasse, meldung.fields.hausnummer].filter(Boolean).join(' ');
  const city = [meldung.fields.postleitzahl, meldung.fields.stadt].filter(Boolean).join(' ');
  const reporter = [meldung.fields.vorname, meldung.fields.nachname].filter(Boolean).join(' ');

  return (
    <div className="group flex items-start gap-4 bg-card border border-border rounded-2xl p-4 hover:shadow-sm transition-shadow overflow-hidden">
      {/* Photo thumbnail */}
      <div className="shrink-0 w-14 h-14 rounded-xl bg-muted overflow-hidden">
        {meldung.fields.foto ? (
          <img
            src={meldung.fields.foto}
            alt=""
            className="w-full h-full object-cover"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Camera size={20} className="text-muted-foreground/40" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-foreground truncate">{addr || '—'}</span>
          {city && <span className="text-sm text-muted-foreground truncate">{city}</span>}
          {cfg && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color} border ${cfg.border} shrink-0`}>
              {cfg.label}
            </span>
          )}
          {meldung.schadenskategorieName && (
            <span className="text-xs text-muted-foreground border border-border rounded-full px-2 py-0.5 shrink-0">
              {meldung.schadenskategorieName}
            </span>
          )}
        </div>
        {meldung.fields.detaillierte_beschreibung && (
          <p className="text-sm text-muted-foreground line-clamp-1">{meldung.fields.detaillierte_beschreibung}</p>
        )}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {reporter && (
            <span className="flex items-center gap-1">
              <Mail size={11} className="shrink-0" />
              {reporter}
            </span>
          )}
          {meldung.fields.telefon && (
            <span className="flex items-center gap-1">
              <Phone size={11} className="shrink-0" />
              {meldung.fields.telefon}
            </span>
          )}
          {meldung.fields.meldedatum && (
            <span className="flex items-center gap-1">
              <Clock size={11} className="shrink-0" />
              {formatDate(meldung.fields.meldedatum)}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onEdit}
          className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          title="Bearbeiten"
        >
          <Pencil size={15} />
        </button>
        <button
          onClick={onDelete}
          className="p-2 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
          title="Löschen"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}

// ─── Skeleton & Error ─────────────────────────────────────────────────────────

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
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <AlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">{error.message}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry}>Erneut versuchen</Button>
    </div>
  );
}
