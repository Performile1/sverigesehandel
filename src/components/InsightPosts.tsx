import { useState } from 'react';
import type { InsightPost, PortalTab } from '../types';
import { ResilientImage } from './ResilientImage';
import { PlainTextDescription } from './JobDescription';
import { insightUrl } from '../../shared/insightPosts';
import checkout from '../assets/images/checkout_mobile_payment_1795029384663.jpg';
import logistics from '../assets/images/nordic_green_logistics_1795029385111.jpg';
import events from '../assets/images/dcongress_stage_1795029383597.jpg';

const bundled = { checkout, logistics, events };
export function InsightPosts({ posts, onNavigate, preview = false }: {
  posts: InsightPost[]; onNavigate: (tab: PortalTab) => void; preview?: boolean;
}) {
  const visible = [...posts].filter((p) => preview || p.status === 'published').sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  if (!visible.length) return null;
  return <section aria-label="Insikter och artiklar" className="grid grid-cols-1 md:grid-cols-3 gap-6">
    {visible.map((post) => <InsightCard key={post.id + (post.image?.url || post.imageKey)} post={post} onNavigate={onNavigate} preview={preview} />)}
  </section>;
}
function InsightCard({ post, onNavigate, preview }: { post: InsightPost; onNavigate: (tab: PortalTab) => void; preview: boolean }) {
  const [open, setOpen] = useState(false);
  const dark = post.theme === 'dark';
  let uploaded = '';
  if (post.image) {
    try { const u = new URL(post.image.url); if (u.protocol === 'https:' && u.hostname === 'firebasestorage.googleapis.com') uploaded = u.href; } catch { /* no image */ }
  }
  const src = uploaded || (post.imageKey ? bundled[post.imageKey] : '');
  const action = dark ? 'text-[#FECC02]' : 'text-[#006AA7]';
  return <article className={`border rounded-2xl overflow-hidden flex flex-col ${dark ? 'bg-[#040B16] text-white border-slate-800' : 'bg-white text-[#040B16] border-slate-200'}`}>
    {src && <div className="h-44"><ResilientImage src={src} alt={uploaded ? post.image!.alt : post.imageAlt} className="w-full h-full object-cover" /></div>}
    <div className="p-6 flex-1 flex flex-col justify-between gap-4 min-w-0">
      <div>
        <div className={`text-xs font-mono font-semibold ${action}`}>{post.category}</div>
        <h3 className="font-display font-bold text-lg mt-1 break-words">{post.title}</h3>
        {(post.author || post.publishedDate) && <p className="text-xs mt-1 opacity-75">{[post.author, post.publishedDate].filter(Boolean).join(' · ')}</p>}
        <p className={`text-xs mt-2 leading-relaxed whitespace-pre-wrap break-words ${dark ? 'text-slate-300' : 'text-slate-600'}`}>{post.excerpt}</p>
        {post.body && <div className="mt-3">
          <button type="button" className={`text-sm font-bold underline cursor-pointer ${action}`} aria-expanded={open} aria-controls={`insight-body-${post.id}`}
            onClick={() => setOpen(!open)}>{open ? 'Stäng artikeln' : 'Läs hela artikeln'}</button>
          {open && <div id={`insight-body-${post.id}`} className="mt-3 p-4 rounded-xl bg-white text-slate-800 border border-slate-200 break-words"><PlainTextDescription text={post.body} /></div>}
        </div>}
      </div>
      <div className="space-y-2">
        {post.sourceUrl && insightUrl(post.sourceUrl) && <a href={post.sourceUrl} target="_blank" rel="noopener noreferrer" className={`block text-xs underline ${action}`}>Källa / vidare läsning</a>}
        {post.ctaLabel && (post.targetTab ? <button type="button" onClick={() => { if (!preview && post.targetTab) onNavigate(post.targetTab); }}
          className={`text-xs font-bold hover:underline text-left cursor-pointer ${action}`}>{post.ctaLabel} →</button>
          : post.targetUrl && insightUrl(post.targetUrl) ? <a href={post.targetUrl} target="_blank" rel="noopener noreferrer" className={`text-xs font-bold hover:underline ${action}`}>{post.ctaLabel} →</a> : null)}
        {preview && <p className="text-xs text-amber-600">CMS-förhandsvisning · {post.status === 'published' ? 'Publicerad' : 'Utkast'}</p>}
      </div>
    </div>
  </article>;
}
