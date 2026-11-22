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

export const NAV_GROUPS: Array<{ label: string; items: Array<{ id: PortalTab; label: string }> }> = [
  {label:'Insikter',items:[{id:'marknad',label:'Marknad & Paketindex'},{id:'starta',label:'Starta e-handel'},{id:'nyheter',label:'Nyheter'},{id:'blogg',label:'Blogg & Insikter'},{id:'historia',label:'E-handelns historia'}]},
  {label:'Hitta företag',items:[{id:'ehandlare',label:'E-handlare'},{id:'partners',label:'Partners & transportörer'},{id:'3pl',label:'3PL & 4PL'},{id:'kop-salj',label:'Köpa & sälja'}]},
  {label:'Nätverk & karriär',items:[{id:'community',label:'Community'},{id:'jobb',label:'Jobb'},{id:'event',label:'Event & mässor'}]},
  {label:'Om oss',items:[{id:'om',label:'Om Sveriges E-handel'},{id:'kontakt',label:'Kontakt & annonsering'}]},
];

export function GroupedNavigation({activeTab,onSelect}:{activeTab:PortalTab;onSelect:(tab:PortalTab)=>void}) {
  return <nav aria-label="Huvudmeny" className="flex flex-col xl:flex-row gap-2 xl:gap-4 text-sm">
    {NAV_GROUPS.map(group=><details key={group.label} className="relative group"
      onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node|null))e.currentTarget.open=false;}}
      onKeyDown={e=>{if(e.key==='Escape'){e.currentTarget.open=false;e.currentTarget.querySelector('summary')?.focus();e.stopPropagation();}}}>
      <summary className={`cursor-pointer rounded-lg p-2 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-yellow-400 ${group.items.some(i=>i.id===activeTab)?'text-[#FECC02]':'text-slate-200'}`}>{group.label}</summary>
      <div className="xl:absolute xl:top-full xl:left-0 xl:min-w-60 rounded-xl bg-[#040B16] border border-white/15 p-2 shadow-xl z-50">
        {group.items.map(item=><a key={item.id} href={`#${item.id}`} aria-current={activeTab===item.id?'page':undefined}
          className={`block rounded-lg p-3 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-yellow-400 ${activeTab===item.id?'text-[#FECC02]':'text-white'}`}
          onClick={e=>{e.preventDefault();e.currentTarget.closest('details')?.removeAttribute('open');onSelect(item.id);}}>{item.label}</a>)}
      </div>
    </details>)}
  </nav>;
}

export function Navbar({ mode, activeTab, onSelectTab, onToggleMode }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, isAdmin, authReady, signingIn, requestSignIn, signOutUser } = useFirebase();

  const shortUserLabel =
    user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'Konto';

  return (
    <header className="sticky top-0 z-40 bg-[#040B16]/95 backdrop-blur-md border-b border-white/10 text-white">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 xl:px-8 h-16 flex items-center justify-between gap-4">
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

        <div className="hidden xl:block"><GroupedNavigation activeTab={activeTab} onSelect={tab=>{if(mode==='cms')onToggleMode();onSelectTab(tab);}}/></div>

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
                onClick={requestSignIn}
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
            {mode === 'cms' ? 'Visa portal' : user?.emailVerified && !isAdmin ? 'Min arbetsyta' : 'Öppna CMS'}
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="xl:hidden p-2 rounded-lg text-slate-200 hover:bg-white/10 shrink-0"
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
            aria-label={mobileOpen ? 'Stäng meny' : 'Öppna meny'}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div id="mobile-navigation" className="xl:hidden max-h-[80vh] overflow-y-auto border-t border-white/10 px-4 py-3 space-y-1 bg-[#040B16]">
          <GroupedNavigation activeTab={activeTab} onSelect={tab=>{if(mode==='cms')onToggleMode();onSelectTab(tab);setMobileOpen(false);}}/>
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
                    requestSignIn();
                    setMobileOpen(false);
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-[#FECC02] hover:bg-white/5 flex items-center justify-between"
                >
                  <span>{signingIn ? 'Loggar in...' : 'Logga in / registrera dig'}</span>
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
