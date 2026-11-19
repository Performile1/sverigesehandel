import { LogIn, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useFirebase } from '../contexts/FirebaseContext';
import type { PortalTab } from '../types';

interface NavbarProps {
  mode: 'portal' | 'cms';
  activeTab: PortalTab;
  onSelectTab: (tab: PortalTab) => void;
  onToggleMode: () => void;
}

const NAV_ITEMS: Array<{ id: PortalTab; label: string }> = [
  { id: 'marknad', label: 'Marknad' },
  { id: 'nyheter', label: 'Nyheter' },
  { id: 'event', label: 'Event' },
  { id: 'ehandlare', label: 'E-handlare' },
  { id: 'partners', label: 'Partners' },
  { id: '3pl', label: '3PL & 4PL' },
  { id: 'jobb', label: 'Jobb' },
  { id: 'community', label: 'Community' },
  { id: 'kontakt', label: 'Kontakt' },
];

export function Navbar({ mode, activeTab, onSelectTab, onToggleMode }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, authReady, signingIn, signInWithGoogle, signOutUser } = useFirebase();

  const shortUserLabel =
    user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'Konto';

  return (
    <header className="sticky top-0 z-40 bg-[#040B16]/95 backdrop-blur-md border-b border-white/10 text-white">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <a
          href="#marknad"
          onClick={(e) => {
            e.preventDefault();
            if (mode === 'cms') onToggleMode();
            onSelectTab('marknad');
          }}
          className="font-display font-extrabold text-lg tracking-tight whitespace-nowrap shrink-0 text-white"
        >
          sverigesehandel<span className="text-[#FECC02]">.se</span>
        </a>

        <nav className="hidden lg:flex items-center gap-4 xl:gap-5 text-sm font-medium">
          {NAV_ITEMS.map((item) => {
            const isActive =
              mode === 'portal' &&
              (activeTab === item.id || (activeTab === 'historia' && item.id === 'marknad'));
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (mode === 'cms') onToggleMode();
                  onSelectTab(item.id);
                }}
                className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer ${
                  isActive
                    ? 'border-[#FECC02] text-white font-semibold'
                    : 'border-transparent text-slate-300 hover:text-white hover:border-white/30'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-2.5 shrink-0">
          {authReady &&
            (user ? (
              <button
                type="button"
                onClick={signOutUser}
                title={`Inloggad som ${user.email || shortUserLabel} – klicka för att logga ut`}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-100 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
              >
                <span className="max-w-[96px] truncate">{shortUserLabel}</span>
                <LogOut className="w-3.5 h-3.5 text-slate-300 shrink-0" />
              </button>
            ) : (
              <button
                type="button"
                disabled={signingIn}
                onClick={signInWithGoogle}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 disabled:opacity-60 text-xs font-semibold text-white whitespace-nowrap shrink-0 transition-colors cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5 text-[#FECC02] shrink-0" />
                {signingIn ? 'Loggar in...' : 'Logga in'}
              </button>
            ))}

          <button
            type="button"
            onClick={onToggleMode}
            className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              mode === 'cms'
                ? 'bg-white text-[#040B16] hover:bg-slate-100'
                : 'bg-[#FECC02] text-[#040B16] hover:bg-[#EAB308]'
            }`}
          >
            {mode === 'cms' ? 'Visa portal' : 'Öppna CMS'}
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="lg:hidden p-2 rounded-lg text-slate-200 hover:bg-white/10 shrink-0"
            aria-label={mobileOpen ? 'Stäng meny' : 'Öppna meny'}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden border-t border-white/10 px-4 py-3 space-y-1 bg-[#040B16]">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                if (mode === 'cms') onToggleMode();
                onSelectTab(item.id);
                setMobileOpen(false);
              }}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium ${
                mode === 'portal' && activeTab === item.id
                  ? 'bg-white/10 text-[#FECC02]'
                  : 'text-slate-200 hover:bg-white/5'
              }`}
            >
              {item.label}
            </button>
          ))}
          {authReady && (
            <div className="pt-2 mt-2 border-t border-white/10">
              {user ? (
                <button
                  type="button"
                  onClick={() => {
                    signOutUser();
                    setMobileOpen(false);
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-slate-200 hover:bg-white/5 flex items-center justify-between"
                >
                  <span>Logga ut ({user.email || shortUserLabel})</span>
                  <LogOut className="w-4 h-4 text-slate-400" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={signingIn}
                  onClick={() => {
                    signInWithGoogle();
                    setMobileOpen(false);
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-[#FECC02] hover:bg-white/5 flex items-center justify-between"
                >
                  <span>{signingIn ? 'Loggar in...' : 'Logga in med Google'}</span>
                  <LogIn className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </header>
  );
}
