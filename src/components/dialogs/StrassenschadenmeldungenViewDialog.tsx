import { useState } from 'react';
import type { Strassenschadenmeldungen, Schadenskategorien } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { IconPencil, IconFileText, IconChevronDown } from '@tabler/icons-react';
import { GeoMapPicker } from '@/components/GeoMapPicker';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

interface StrassenschadenmeldungenViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Strassenschadenmeldungen | null;
  onEdit: (record: Strassenschadenmeldungen) => void;
  schadenskategorienList: Schadenskategorien[];
}

export function StrassenschadenmeldungenViewDialog({ open, onClose, record, onEdit, schadenskategorienList }: StrassenschadenmeldungenViewDialogProps) {
  const [showCoords, setShowCoords] = useState(false);

  function getSchadenskategorienDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return schadenskategorienList.find(r => r.record_id === id)?.fields.kategoriename ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Straßenschadenmeldungen anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Straße</Label>
            <p className="text-sm">{record.fields.strasse ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Hausnummer</Label>
            <p className="text-sm">{record.fields.hausnummer ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Postleitzahl</Label>
            <p className="text-sm">{record.fields.postleitzahl ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Stadt</Label>
            <p className="text-sm">{record.fields.stadt ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">GPS-Koordinaten</Label>
            {record.fields.gps_koordinaten?.info && (
              <p className="text-sm text-muted-foreground break-words whitespace-normal">{record.fields.gps_koordinaten.info}</p>
            )}
            {record.fields.gps_koordinaten?.lat != null && record.fields.gps_koordinaten?.long != null && (
              <GeoMapPicker
                lat={record.fields.gps_koordinaten.lat}
                lng={record.fields.gps_koordinaten.long}
                readOnly
              />
            )}
            <button type="button" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors" onClick={() => setShowCoords(v => !v)}>
              {showCoords ? 'Koordinaten verbergen' : 'Koordinaten anzeigen'}
              <IconChevronDown className={`h-3 w-3 transition-transform ${showCoords ? "rotate-180" : ""}`} />
            </button>
            {showCoords && (
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-xs text-muted-foreground">Breitengrad:</span> {record.fields.gps_koordinaten?.lat?.toFixed(6) ?? '—'}</div>
                <div><span className="text-xs text-muted-foreground">Längengrad:</span> {record.fields.gps_koordinaten?.long?.toFixed(6) ?? '—'}</div>
              </div>
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Schadenskategorie</Label>
            <p className="text-sm">{getSchadenskategorienDisplayName(record.fields.schadenskategorie)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Foto des Schadens</Label>
            {record.fields.foto ? (
              <div className="relative w-full rounded-lg bg-muted overflow-hidden border">
                <img src={record.fields.foto} alt="" className="w-full h-auto object-contain" />
              </div>
            ) : <p className="text-sm text-muted-foreground">—</p>}
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Schweregrad</Label>
            <Badge variant="secondary">{record.fields.schweregrad?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Detaillierte Beschreibung</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.detaillierte_beschreibung ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Vorname</Label>
            <p className="text-sm">{record.fields.vorname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Nachname</Label>
            <p className="text-sm">{record.fields.nachname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">E-Mail</Label>
            <p className="text-sm">{record.fields.email ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Telefonnummer</Label>
            <p className="text-sm">{record.fields.telefon ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Meldedatum</Label>
            <p className="text-sm">{formatDate(record.fields.meldedatum)}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}