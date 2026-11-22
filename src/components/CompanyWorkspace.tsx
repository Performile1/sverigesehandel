import { TeamWorkspace } from './TeamWorkspace';
import { MyProfileEditor } from './StaffProfiles';
import { useEffect, useState } from 'react';
import type { CompanyWorkspace as Workspace } from '../types';
import { api } from '../api';
const field = 'block w-full mt-1 p-2 border border-slate-300 rounded-lg';
const labels: Record<string,string> = {name:'Företagsnamn',domain:'Domän',origin:'Ort / ursprung',stack:'Teknik / erbjudande',desc:'Beskrivning',pricingModel:'Prismodell',setupTime:'Införandetid',bestFor:'Passar för',hqCity:'Huvudkontor',warehouseSqm:'Lageryta',automation:'Automation',wmsPlatform:'WMS',minOrderVolume:'Minsta ordervolym',cutoffTime:'Stopptid',city:'Ort',platform:'Plattform',paymentProvider:'Betalpartner',carrier:'Transportör'};
const button = 'px-4 py-2 bg-slate-900 text-white rounded-lg disabled:opacity-50 cursor-pointer';
export function CompanyWorkspace() {
  const [data, setData] = useState<Workspace | null>(null); const [error, setError] = useState('');
  async function reload() { setError(''); try { setData(await api.companyWorkspace()); } catch (e) { setData(null); setError((e as Error).message); } }
  useEffect(() => { let live = true; api.companyWorkspace().then((value) => { if (live) setData(value); }).catch((e) => { if (live) setError(e.message); }); return () => { live = false; }; }, []);
  return <section className="max-w-5xl mx-auto p-5 space-y-5">
    <h1 className="text-2xl font-bold">Min företagsyta</h1>
    <MyProfileEditor/>
    <TeamWorkspace/>
    <p>Här visas endast företag och meddelanden som Sveriges E-handel har gett ditt konto åtkomst till. Ändringsförslag publiceras aldrig direkt. Borttagning måste begäras och beslutas av Sveriges E-handel.</p>
    <button className={button} onClick={() => void reload()}>Uppdatera företagsytan</button>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {!data && !error && <p role="status">Läser behörigheter…</p>}
    {data && <>
      {!data.companies.length && <p>Ingen aktiv företagskoppling. Ansök om medlemskap i Community och kontakta Sveriges E-handel för godkännande och koppling.</p>}
      {data.companies.map((company) => <CompanyForm key={JSON.stringify(company)} company={company} reload={reload} />)}
      <section className="bg-white border rounded-xl p-5 space-y-3"><h2 className="font-bold text-lg">Mina förslag och begäranden</h2>
        {!data.proposals.length && <p>Inga förslag ännu.</p>}
        {data.proposals.map((p) => <div key={p.id} className="border rounded-lg p-3 text-sm"><strong>{p.kind === 'delete' ? 'Borttagningsbegäran' : 'Ändringsförslag'} · {p.entityType}/{p.entityId}</strong><p>Status: {({pending:'Väntar på Sveriges E-handel', approved:'Godkänt', rejected:'Avslaget'})[p.status]}</p><p>{p.reason}</p>{p.comment && <p>Admin: {p.comment}</p>}</div>)}
      </section>
      <section className="bg-white border rounded-xl p-5 space-y-3"><h2 className="font-bold text-lg">Företagsinkorg: intro och meddelanden</h2>
        <p className="text-sm">CMS styr åtkomst per person, företag och typ. Endast direktstyrda förfrågningar delas. Redaktionsärenden och meddelanden till andra företag ingår inte. Läskvitto är personligt.</p>
        {!data.messages.length && <p>Inga tilldelade meddelanden.</p>}
        {data.messages.map((m) => <article key={m.id} className="border rounded-lg p-3 space-y-2"><h3 className="font-bold">{m.entityName} · {m.topic}</h3><p className="text-sm">{m.name} · {m.email} · {m.company} · {m.createdAt.slice(0,10)} · {m.kind}</p><p className="whitespace-pre-wrap">{m.message}</p>
          <button className={button} disabled={m.read} onClick={async () => { try { await api.companyInboxRead(m.id); await reload(); } catch (e) { setError((e as Error).message); } }}>{m.read ? 'Läst' : 'Markera läst'}</button></article>)}
      </section>
    </>}
  </section>;
}
function CompanyForm({ company, reload }: { company: Workspace['companies'][number]; reload: () => Promise<void> }) {
  const [busy,setBusy] = useState(false); const [message,setMessage] = useState('');
  return <form className="bg-white border rounded-xl p-5 space-y-3" onSubmit={async (event) => {
    event.preventDefault(); const form = new FormData(event.currentTarget); setBusy(true); setMessage('');
    const patch = Object.fromEntries(Object.keys(company.fields).map((key) => [key, String(form.get(key) || '')]));
    try { await api.companyProposal({ entityType: company.link.entityType, entityId: company.link.entityId, kind: 'edit', patch, reason: String(form.get('reason')) }); await reload(); setMessage('Förslaget inväntar godkännande.'); }
    catch (e) { setMessage((e as Error).message + ' Uppdatera företagsytan före nytt försök om resultatet är osäkert.'); } finally { setBusy(false); }
  }}>
    <h2 className="font-bold text-xl">{company.name}</h2>
    {!company.link.canPropose ? <p>Du har läs-/inkorgsåtkomst men får inte föreslå ändringar.</p> : <>
      <div className="grid sm:grid-cols-2 gap-3">{Object.entries(company.fields).map(([key, value]) => <label key={key} className="text-sm">{labels[key] || key}<textarea name={key} className={field} rows={key === 'desc' ? 5 : 2} maxLength={key === 'desc' ? 2000 : 500} defaultValue={value} /></label>)}</div>
      <label className="block">Motivering till ändringen<textarea name="reason" className={field} maxLength={2000} required /></label>
      <div className="flex flex-wrap gap-3"><button className={button} type="submit" disabled={busy}>Skicka ändringsförslag till Sveriges E-handel</button>
        <button className={button} type="button" disabled={busy} onClick={async () => {
          const reason = window.prompt('Varför vill ni att företaget tas bort? Sveriges E-handel beslutar.'); if (!reason?.trim()) return;
          setBusy(true); setMessage(''); try { await api.companyProposal({ entityType: company.link.entityType, entityId: company.link.entityId, kind: 'delete', patch: {}, reason }); await reload(); }
          catch (e) { setMessage((e as Error).message); } finally { setBusy(false); }
        }}>Begär borttagning</button></div>
    </>}
    {message && <p role="status">{message}</p>}
  </form>;
}
