import { useState } from 'react';
import { api } from '../api';
export function CommunityReportButton({ threadId, commentId = '', signedIn, onSignIn }: { threadId: string; commentId?: string; signedIn: boolean; onSignIn?: () => void }) {
  const [reason,setReason] = useState('offensive'); const [detail,setDetail] = useState('');
  const [open,setOpen] = useState(false); const [busy,setBusy] = useState(false); const [message,setMessage] = useState('');
  return <div className="text-xs">
    <button type="button" className="underline text-slate-600 cursor-pointer" onClick={() => { if (!signedIn) { onSignIn?.(); return; } setOpen(!open); }}>Anmäl {commentId ? 'kommentar' : 'inlägg'}</button>
    {open && <div className="p-3 mt-2 border rounded-xl bg-white text-slate-800 space-y-2">
      <p>Rapportera till Sveriges E-handel. Anmälan är inte offentlig. Innehåll tas inte bort automatiskt efter en anmälan.</p>
      <label className="block">Orsak<select value={reason} onChange={(e) => setReason(e.target.value)} className="block w-full border p-2 rounded-lg"><option value="offensive">Stötande innehåll / trakasserier</option><option value="incorrect">Felaktig information</option><option value="spam">Spam / reklam</option><option value="other">Annat</option></select></label>
      <label className="block">Förklaring<textarea value={detail} onChange={(e) => setDetail(e.target.value)} maxLength={1500} className="block w-full border p-2 rounded-lg" /></label>
      <button type="button" disabled={busy} className="px-3 py-2 bg-slate-900 text-white rounded-lg" onClick={async () => {
        setBusy(true); setMessage(''); try { await api.reportCommunity({ threadId, commentId, reason, detail }); setOpen(false); setMessage('Anmälan skickad till Sveriges E-handel.'); }
        catch (e) { setMessage((e as Error).message); } finally { setBusy(false); }
      }}>Skicka anmälan</button>
    </div>}
    {message && <p role="status">{message}</p>}
  </div>;
}
