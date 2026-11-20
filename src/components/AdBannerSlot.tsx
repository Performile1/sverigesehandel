import { CmsPublicImage } from './CmsPublicImage';
import { ArrowRight, ExternalLink, Megaphone } from 'lucide-react';
import type { AdBanner, AdBannerPlacement, PortalTab } from '../types';

interface AdBannerSlotProps {
  banners: AdBanner[];
  placement: AdBannerPlacement;
  onNavigate: (tab: PortalTab, searchQuery?: string) => void;
  onBookSlot?: (slotName: string) => void;
}

export function AdBannerSlot({
  banners,
  placement,
  onNavigate,
  onBookSlot,
}: AdBannerSlotProps) {
  const banner = banners.find((b) => b.placement === placement && b.active);
  if (!banner) return null;

  const isPlaceholder = banner.mode === 'placeholder';

  const containerClass =
    banner.theme === 'navy'
      ? 'bg-[#040B16] text-white border border-slate-800'
      : banner.theme === 'gold'
      ? 'bg-[#FEF9C3] text-[#040B16] border border-[#EAB308]/60'
      : isPlaceholder
      ? 'bg-slate-50 text-[#040B16] border border-dashed border-slate-300'
      : 'bg-white text-[#040B16] border border-slate-200';

  const kickerClass =
    banner.theme === 'navy'
      ? 'text-[#FECC02]'
      : banner.theme === 'gold'
      ? 'text-[#040B16]'
      : 'text-[#006AA7]';

  const bodyClass =
    banner.theme === 'navy' ? 'text-slate-300' : 'text-slate-600';

  const primaryBtnClass =
    banner.theme === 'navy'
      ? 'bg-[#FECC02] hover:bg-[#EAB308] text-[#040B16]'
      : banner.theme === 'gold'
      ? 'bg-[#040B16] hover:bg-[#006AA7] text-white'
      : 'bg-[#040B16] hover:bg-[#006AA7] text-white';

  const secondaryBtnClass =
    banner.theme === 'navy'
      ? 'border border-white/20 text-white hover:bg-white/10'
      : 'border border-slate-300 text-[#040B16] hover:bg-white';

  const isExternal = /^https?:\/\//i.test(banner.targetUrl);

  return (
    <aside
      aria-label={`Annonsplats: ${banner.sponsorName}`}
      className={`rounded-2xl p-5 sm:p-6 transition-colors ${containerClass}`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-1.5 min-w-0">
          {!isPlaceholder && <CmsPublicImage image={banner.image} kind="banner" />}
          <div className={`text-xs font-mono font-semibold flex flex-wrap items-center gap-2 ${kickerClass}`}>
            <Megaphone className="w-3.5 h-3.5 shrink-0" />
            <span>{banner.kicker}</span>
            <span aria-hidden="true">·</span>
            <span className="opacity-80 tabular-nums">{banner.dimensions}</span>
          </div>

          <h3 className="font-display text-lg sm:text-xl font-extrabold leading-snug">
            {banner.headline}
          </h3>

          <p className={`text-xs sm:text-sm max-w-3xl leading-relaxed ${bodyClass}`}>
            {banner.body}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {isPlaceholder ? (
            <button
              type="button"
              onClick={() => {
                if (onBookSlot) {
                  onBookSlot(banner.placementLabel);
                } else {
                  onNavigate('kontakt');
                }
              }}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${primaryBtnClass}`}
            >
              {banner.ctaLabel}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <>
              {isExternal && (
                <a
                  href={banner.targetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${primaryBtnClass}`}
                >
                  {banner.ctaLabel}
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              {banner.internalTab && (
                <button
                  type="button"
                  onClick={() => onNavigate(banner.internalTab!)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${secondaryBtnClass}`}
                >
                  Se program & detaljer
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
