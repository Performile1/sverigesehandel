import { useState } from 'react';
import type { MapPoint, RegionMetric } from '../types';
import { api } from '../api';

interface Props {
  points: MapPoint[];
  regions: Record<string, RegionMetric>;
  onRefresh: () => Promise<void>;
  onNotify: (message: string) => void;
}
const field = 'block w-full mt-1 p-2 rounded-lg border border-slate-300';
const button = 'px-3 py-2 rounded-lg bg-slate-900 text-white disabled:opacity-50 cursor-pointer';

export function MapPointsEditor({ points, regions, onRefresh, onNotify }: Props) {
  const [selected, setSelected] = useState('new');
  const point = points.find((item) => item.id === selected);
  return <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
    <h2 className="text-lg font-bold">Kartpunkter</h2>
    <p className="text-sm text-slate-600">Lägg till punkter på befintlig karta. Utseende, regiongränser och befintliga orter behålls. Koordinater anges i WGS84, med decimalpunkt.</p>
    <label className="block text-sm">Välj punkt<select className={field} value={point?.id || 'new'} onChange={(event) => setSelected(event.target.value)}>
      <option value="new">Ny kartpunkt</option>
      {points.map((item) => <option key={item.id} value={item.id}>{item.label} · {item.status === 'published' ? 'Publicerad' : 'Utkast'}</option>)}
    </select></label>
    <PointForm key={point ? JSON.stringify(point) : 'new'} point={point} regions={regions} onSave={async (value) => {
      await api.upsertMapPoint(value); await onRefresh(); setSelected(value.id); onNotify('Kartpunkten sparad.');
    }} onDelete={point ? async () => {
      await api.deleteMapPoint(point.id); await onRefresh(); setSelected('new'); onNotify('Kartpunkten borttagen.');
    } : undefined} />
  </section>;
}

function PointForm({ point, regions, onSave, onDelete }: {
  point?: MapPoint; regions: Props['regions']; onSave: (value: MapPoint) => Promise<void>; onDelete?: () => Promise<void>;
}) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return <form className="space-y-3 text-sm" onSubmit={async (event) => {
    event.preventDefault(); const form = new FormData(event.currentTarget); setBusy(true); setError('');
    try {
      await onSave({ id: point?.id || `point-${crypto.randomUUID()}`, label: String(form.get('label') || ''),
        description: String(form.get('description') || ''), longitude: Number(form.get('longitude')),
        latitude: Number(form.get('latitude')), regionKey: String(form.get('region')) as MapPoint['regionKey'],
        status: form.get('status') === 'published' ? 'published' : 'draft' });
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  }}>
    <label className="block">Namn<input name="label" className={field} required maxLength={80} defaultValue={point?.label || ''} /></label>
    <div className="grid grid-cols-2 gap-3">
      <label>Latitud<input name="latitude" className={field} type="number" min={55} max={69.5} step="any" required defaultValue={point?.latitude} /></label>
      <label>Longitud<input name="longitude" className={field} type="number" min={10} max={25} step="any" required defaultValue={point?.longitude} /></label>
    </div>
    <label className="block">Befintlig region<select name="region" className={field} defaultValue={point?.regionKey || 'svealand'}>
      {Object.values(regions).map((region) => <option key={region.key} value={region.key}>{region.name}</option>)}
    </select></label>
    <label className="block">Beskrivning<textarea name="description" className={field} rows={3} maxLength={1000} defaultValue={point?.description || ''} /></label>
    <label className="block">Status<select name="status" className={field} defaultValue={point?.status || 'draft'}><option value="draft">Utkast</option><option value="published">Publicerad</option></select></label>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    <div className="flex gap-3"><button type="submit" className={button} disabled={busy}>Spara kartpunkt</button>
      {onDelete && <button type="button" className={button} disabled={busy} onClick={async () => {
        if (!window.confirm('Ta bort kartpunkten?')) return;
        setBusy(true); setError('');
        try { await onDelete(); } catch (cause) { setError((cause as Error).message); }
        finally { setBusy(false); }
      }}>Ta bort punkt</button>}
    </div>
  </form>;
}
