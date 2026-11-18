import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import type { PortalTab } from '../types';

interface NavbarProps {
  mode: 'portal' | 'cms';
  activeTab: PortalTab;
  onSelectTab: (tab: PortalTab) => void;
  onToggleMode: () => void;
}

const NAV_ITEMS: Array<{ id: PortalTab; label: string }> = [
  { id: 'marknad', label: 'Marknad' },
  { id: 'event', label: 'Event' },
  { id: 'ehandlare', label: 'E-handlare' },
  { id: 'partners', label: 'Partners' },
  { id: 'jobb', label: 'Jobb' },
  { id: 'community', label: 'Community' },
  { id: 'kontakt', label: 'Kontakt' },
];

export function Navbar({ mode, activeTab, onSelectTab, onToggleMode }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-[#040B16]/95 backdrop-blur-md border-b border-white/10 text-white">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
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

        <nav className="hidden md:flex items-center gap-5 text-sm font-medium">
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

        <div className="flex items-center gap-3 shrink-0">
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
            className="md:hidden p-2 rounded-lg text-slate-200 hover:bg-white/10"
            aria-label={mobileOpen ? 'Stäng meny' : 'Öppna meny'}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-white/10 px-4 py-3 space-y-1 bg-[#040B16]">
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
        </div>
      )}
    </header>
  );
}
