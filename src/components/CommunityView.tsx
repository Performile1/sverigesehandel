import { useState } from 'react';
import { ChevronUp, MessageSquare } from 'lucide-react';
import type { CommunityThread, PageCopyBlock } from '../types';

interface CommunityViewProps {
  threads: CommunityThread[];
  pageCopy?: PageCopyBlock;
  memberCount?: number;
  memberCities?: string[];
  userDisplayName?: string | null;
  userEmail?: string | null;
  isSignedIn?: boolean;
  onSignIn?: () => void;
  onAddThread: (payload: { channel: string; author: string; title: string }) => Promise<void>;
  onUpvote: (id: string) => Promise<void>;
  onJoinMember: (payload: { name: string; email: string; role: string; city: string }) => Promise<void>;
}

const CHANNELS = [
  'all',
  '#checkout-optimering',
  '#export-tull',
  '#ai-och-data',
  '#d-congress-2027',
];

export function CommunityView({
  threads,
  pageCopy,
  memberCount = 0,
  memberCities = [],
  userDisplayName = null,
  userEmail = null,
  isSignedIn = false,
  onSignIn,
  onAddThread,
  onUpvote,
  onJoinMember,
}: CommunityViewProps) {
  const [activeChannel, setActiveChannel] = useState('all');
  const [newTitle, setNewTitle] = useState('');
  const [newChannel, setNewChannel] = useState('#checkout-optimering');
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  const [joinName, setJoinName] = useState('');
  const [joinEmail, setJoinEmail] = useState('');
  const [joinRole, setJoinRole] = useState('E-handlare / Grundare');
  const [joinCity, setJoinCity] = useState('Göteborg / Borås');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinSuccess, setJoinSuccess] = useState(false);

  const filtered =
    activeChannel === 'all' ? threads : threads.filter((t) => t.channel === activeChannel);

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim() || posting) return;
    setPostError(null);
    setPosting(true);
    try {
      await onAddThread({
        channel: newChannel,
        author: userDisplayName || 'Verifierad medlem · Sveriges E-handel',
        title: newTitle.trim(),
      });
      setNewTitle('');
    } catch (err) {
      setPostError((err as Error).message || 'Kunde inte publicera tråden.');
    } finally {
      setPosting(false);
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!joinName.trim() || !joinEmail.trim() || joining) return;
    setJoinError(null);
    setJoinSuccess(false);
    setJoining(true);
    try {
      await onJoinMember({
        name: joinName.trim(),
        email: joinEmail.trim(),
        role: joinRole,
        city: joinCity,
      });
      setJoinName('');
      setJoinEmail('');
      setJoinSuccess(true);
    } catch (err) {
      setJoinError((err as Error).message || 'Kunde inte skicka ansökan.');
    } finally {
      setJoining(false);
    }
  }

  const regionSummary =
    memberCities.length > 0 ? memberCities.join(', ') : 'Väntar på första ansökan';

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="bg-[#040B16] text-white border border-slate-800 rounded-2xl p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-7 space-y-4">
          <div className="font-mono text-xs font-semibold text-[#10B981]">
            {pageCopy?.kicker || 'Sveriges E-handel Network'} · {memberCount} sökande till nätverket
          </div>
          <h1 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-balance">
            {pageCopy?.title || (
              <>
                Där svenska e-handlare <span className="text-[#FECC02]">delar riktig data.</span>
              </>
            )}
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            {pageCopy?.subtitle ||
              'Ett leverantörsoberoende branschnätverk under uppbyggnad för e-handlare, E-commerce Managers, tillväxtteam och logistikledare. Utbyt erfarenheter digitalt och anmäl ditt intresse för kommande träffar.'}
          </p>
          <div className="grid grid-cols-3 gap-4 pt-2 border-t border-white/10">
            <div>
              <div className="font-mono text-2xl font-extrabold text-[#FECC02] tabular-nums">
                {memberCount}
              </div>
              <div className="text-xs text-slate-400">Sökande handlare &amp; medlemmar</div>
            </div>
            <div>
              <div className="font-mono text-2xl font-extrabold text-[#10B981] tabular-nums">
                {memberCities.length} {memberCities.length === 1 ? 'region' : 'regioner'}
              </div>
              <div className="text-xs text-slate-400 truncate" title={regionSummary}>
                {regionSummary}
              </div>
            </div>
            <div>
              <div className="font-mono text-2xl font-extrabold text-white tabular-nums">0 SEK</div>
              <div className="text-xs text-slate-400">Kostnadsfritt för handlare</div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 bg-white text-[#040B16] rounded-2xl p-6">
          <h3 className="font-display text-xl font-extrabold">Ansök om verifierat medlemskap</h3>
          <p className="text-xs text-slate-500 mt-1">
            Varje ansökan räknas upp direkt i nätverkets statistik och ger access till benchmark-rapporter och träffar.
          </p>
          {!isSignedIn && (
            <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2 text-xs">
              <span className="text-slate-600">Verifiera med Google-konto för att skicka ansökan.</span>
              <button
                type="button"
                onClick={onSignIn}
                className="shrink-0 font-bold text-[#006AA7] hover:underline cursor-pointer"
              >
                Logga in
              </button>
            </div>
          )}
          <form onSubmit={handleJoin} className="space-y-3 mt-4">
            <input
              type="text"
              required
              value={joinName}
              onChange={(e) => setJoinName(e.target.value)}
              placeholder={userDisplayName || 'Ditt namn (t.ex. Maja Lindqvist)'}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#006AA7] focus:outline-none"
            />
            <input
              type="email"
              required
              value={joinEmail}
              onChange={(e) => setJoinEmail(e.target.value)}
              placeholder={userEmail || 'Arbetsmejl (maja@dinbutik.se)'}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#006AA7] focus:outline-none"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={joinRole}
                onChange={(e) => setJoinRole(e.target.value)}
                className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
              >
                <option>E-handlare / Grundare</option>
                <option>E-commerce Manager</option>
                <option>Performance / Growth</option>
                <option>CTO / Tech Lead</option>
              </select>
              <select
                value={joinCity}
                onChange={(e) => setJoinCity(e.target.value)}
                className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
              >
                <option>Göteborg / Borås</option>
                <option>Stockholm / Uppsala</option>
                <option>Malmö / Skåne</option>
                <option>Norrland / Remote</option>
              </select>
            </div>
            {joinError && (
              <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                {joinError}
              </div>
            )}
            {joinSuccess && (
              <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                Ansökan registrerad! Totalt {memberCount} sökande i nätverket.
              </div>
            )}
            <button
              type="submit"
              disabled={joining}
              className="w-full py-3 rounded-xl bg-[#FECC02] hover:bg-[#EAB308] disabled:opacity-60 text-[#040B16] font-bold text-sm transition-colors cursor-pointer"
            >
              {joining ? 'Skickar...' : 'Skicka ansökan →'}
            </button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
            <div className="text-xs font-mono font-semibold text-[#006AA7]">Ämneskanaler</div>
            <div className="space-y-1 text-xs font-mono font-semibold">
              {CHANNELS.map((ch) => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => setActiveChannel(ch)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                    activeChannel === ch
                      ? 'bg-[#040B16] text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {ch === 'all' ? '# alla-kanaler' : ch}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
            <div className="text-xs font-mono font-semibold text-[#059669]">Svenska branschnätverk</div>
            <div className="space-y-3 text-xs divide-y divide-slate-100">
              <div className="pt-1">
                <div className="font-bold text-[#040B16]">E-handelsstaden Borås</div>
                <p className="text-slate-600 mt-0.5">
                  Sveriges ledande regionala kluster för handel, textil och logistikutveckling.
                </p>
              </div>
              <div className="pt-3">
                <div className="font-bold text-[#040B16]">Svensk Handel – Digital Handel</div>
                <p className="text-slate-600 mt-0.5">
                  Arrangör av D-Congress och ansvarig för Trygg E-handel.
                </p>
              </div>
              <div className="pt-3">
                <div className="font-bold text-[#040B16]">Women in E-Commerce Sweden</div>
                <p className="text-slate-600 mt-0.5">
                  Nätverk och mentorskapsprogram för kvinnliga ledare inom nordisk e-handel.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-extrabold text-[#040B16]">
              Diskussioner i nätverket
            </h2>
            <span className="text-xs font-mono text-slate-500 tabular-nums">
              {filtered.length} aktiva trådar
            </span>
          </div>

          <form
            onSubmit={handlePost}
            className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <span>
                Publicerar som:{' '}
                <strong className="text-[#040B16]">
                  {userDisplayName || 'Verifierad medlem · Sveriges E-handel'}
                </strong>
              </span>
              {!isSignedIn && (
                <button
                  type="button"
                  onClick={onSignIn}
                  className="text-[#006AA7] font-semibold hover:underline cursor-pointer"
                >
                  Logga in med Google för verifierad profil
                </button>
              )}
            </div>
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Starta en ny diskussion eller ställ en fråga till nätverket..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#006AA7]"
            />
            {postError && (
              <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                {postError}
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <select
                value={newChannel}
                onChange={(e) => setNewChannel(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-mono font-semibold"
              >
                <option value="#checkout-optimering">#checkout-optimering</option>
                <option value="#export-tull">#export-tull</option>
                <option value="#ai-och-data">#ai-och-data</option>
                <option value="#d-congress-2027">#d-congress-2027</option>
              </select>
              <button
                type="submit"
                disabled={posting}
                className="px-4 py-2 rounded-lg bg-[#040B16] hover:bg-[#006AA7] disabled:opacity-60 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                {posting ? 'Publicerar...' : 'Publicera tråd →'}
              </button>
            </div>
          </form>

          <div className="space-y-3">
            {filtered.map((t) => (
              <div
                key={t.id}
                className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors flex items-start gap-4"
              >
                <button
                  type="button"
                  onClick={() => onUpvote(t.id)}
                  className="shrink-0 flex flex-col items-center justify-center w-12 py-2 rounded-lg bg-slate-50 hover:bg-[#FECC02]/25 border border-slate-200 transition-colors cursor-pointer"
                  aria-label={`Rösta upp ${t.title}`}
                >
                  <ChevronUp className="w-4 h-4 text-[#040B16]" />
                  <span className="font-mono text-xs font-bold text-[#040B16] tabular-nums">
                    {t.votes}
                  </span>
                </button>
                <div className="flex-1 space-y-1.5">
                  <div className="text-xs text-slate-500">
                    <span className="font-mono font-semibold text-[#006AA7]">{t.channel}</span> ·{' '}
                    <span>{t.author}</span> · <span>{t.time}</span>
                  </div>
                  <h4 className="font-display font-bold text-sm sm:text-base text-[#040B16]">
                    {t.title}
                  </h4>
                  <div className="text-xs text-slate-500 font-medium inline-flex items-center gap-1.5 tabular-nums">
                    <MessageSquare className="w-3.5 h-3.5" />
                    {t.replies} kommentarer
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
