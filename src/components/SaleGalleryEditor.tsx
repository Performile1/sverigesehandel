import { useEffect, useState } from 'react';
import type { SaleListing } from '../types';
import { api } from '../api';
import { CmsPublicImage } from './CmsPublicImage';
export function SaleGalleryEditor({sale,onRefresh}:{sale:SaleListing;onRefresh:()=>Promise<void>}) {
  const [enabled,setEnabled]=useState(false);const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);
  useEffect(()=>{let live=true;api.firebaseFeatures().then(s=>{if(live)setEnabled(s.mediaEnabled);}).catch(()=>{if(live)setMessage('Kunde inte läsa bildlagringens status.');});return()=>{live=false;};},[]);
  const images=sale.images??[];
  const change=async(paths:string[])=>{setBusy(true);setMessage('');try{await api.saleGallery(sale.id,sale.revision??0,paths);await onRefresh();}catch(err){setMessage((err as Error).message);}finally{setBusy(false);}};
  return <section className="border rounded-xl p-4 space-y-3"><h3 className="text-lg font-bold">Annonsbilder ({images.length}/5)</h3>
    <p className="text-sm">Endast bilder som får publiceras. Uppladdning skapar en publik Storage-länk även för utkast. Befintlig Firebase-bildlagring måste vara aktiverad; denna vy ändrar ingen konfiguration. Bortkoppling behåller filen för backup/historik.</p>
    {!enabled&&<p>Uppladdning är avstängd eller inte tillgänglig i denna miljö.</p>}
    <div className="grid sm:grid-cols-2 gap-3">{images.map((image,i)=><div key={image.path} className="border p-3 rounded-lg"><CmsPublicImage image={image} kind="banner"/><p>{image.alt}</p><div className="flex flex-wrap gap-3">
      <button type="button" className="underline" disabled={busy||i===0} onClick={()=>{const paths=images.map(v=>v.path);[paths[i-1],paths[i]]=[paths[i],paths[i-1]];void change(paths);}}>Flytta tidigare</button>
      <button type="button" className="underline" disabled={busy} onClick={()=>{if(window.confirm('Koppla bort bilden? Filen behålls.'))void change(images.filter(v=>v.path!==image.path).map(v=>v.path));}}>Koppla bort</button></div></div>)}</div>
    <form className="space-y-3" onSubmit={async e=>{e.preventDefault();if(busy||!enabled)return;const f=new FormData(e.currentTarget);const file=f.get('file') as File;const alt=String(f.get('alt')||'').trim();
      if(!file||file.size>350000||!['image/jpeg','image/png','image/webp'].includes(file.type)||!alt){setMessage('Välj PNG/JPEG/WebP högst 350 kB samt alt-text.');return;}
      setBusy(true);setMessage('');try{const data=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(new Error('Filen kunde inte läsas.'));reader.readAsDataURL(file);});
        await api.uploadImage({targetType:'sale',targetId:sale.id,data,alt,revision:sale.revision??0});await onRefresh();
      }catch(err){setMessage((err as Error).message+' Kontrollera sparat läge före nytt försök; en oanvänd fil kan finnas.');}finally{setBusy(false);}
    }}><fieldset disabled={!enabled||busy||images.length>=5} className="space-y-3"><label className="block">Bild<input name="file" type="file" accept="image/png,image/jpeg,image/webp" required className="block"/></label>
      <label className="block">Alt-text<input name="alt" required maxLength={200} className="block border rounded-lg p-2 w-full"/></label><button className="bg-blue-800 text-white px-4 py-2 rounded-lg">Ladda upp annonsbild</button></fieldset></form>
    {message&&<p role="status">{message}</p>}
  </section>;
}
