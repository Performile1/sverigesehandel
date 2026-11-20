import { useState } from 'react';
import type { CmsImage } from '../types';

export function CmsPublicImage({ image, kind }: { image?: CmsImage; kind: 'logo' | 'banner' }) {
  if (!image) return null;
  return <Image key={image.url} image={image} kind={kind} />;
}
function Image({ image, kind }: { image: CmsImage; kind: 'logo' | 'banner' }) {
  const [failed, setFailed] = useState(false);
  let allowed = false;
  try { const url = new URL(image.url); allowed = url.protocol === 'https:' && url.hostname === 'firebasestorage.googleapis.com'; } catch { /* missing/legacy image */ }
  if (failed || !allowed) return null;
  return <img src={image.url} alt={image.alt} width={image.width} height={image.height} loading="lazy"
    onError={() => setFailed(true)} className={kind === 'logo'
      ? 'block h-12 w-24 object-contain bg-white rounded-lg p-1 mb-2'
      : 'block max-h-64 w-full object-contain rounded-xl mb-3'} />;
}
