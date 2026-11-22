import { useId, useRef, useState } from 'react';
import { ContentText } from './ContentText';
import { contentUrl } from '../../shared/contentFormat';
export function ContentEditor({label,value,onChange,format,maxLength,required=false}:{label:string;value:string;onChange:(v:string,formatted?:boolean)=>void;format?:'markdown';maxLength:number;required?:boolean}) {
  const ref=useRef<HTMLTextAreaElement>(null);const id=useId();const [preview,setPreview]=useState(false);const [error,setError]=useState('');
  const insert=(before:string,after='',placeholder='text')=>{
    const el=ref.current;if(!el)return;const start=el.selectionStart;const end=el.selectionEnd;const chosen=value.slice(start,end)||placeholder;
    const next=value.slice(0,start)+before+chosen+after+value.slice(end);
    if(next.length>maxLength){setError('Texten blir för lång.');return;}
    if(format!=='markdown'&&!window.confirm('Aktivera formaterad text? Befintlig text bevaras, men Markdown-tecken kan börja formateras. Kontrollera förhandsvisningen före sparning.'))return;
    onChange(next,true);setError('');requestAnimationFrame(()=>{el.focus();el.setSelectionRange(start+before.length,start+before.length+chosen.length);});
  };
  return <div className="space-y-2 border rounded-xl p-3"><label className="font-semibold block" htmlFor={id}>{label}</label>
    <div role="group" aria-label={`${label}: formatering`} className="flex flex-wrap gap-2">
      {([['H2','\n\n## ','\n\n','Avsnittsrubrik'],['H3','\n\n### ','\n\n','Underrubrik'],['H4','\n\n#### ','\n\n','Underrubrik'],['Fet','**','**','fet text'],['Kursiv','*','*','kursiv text'],['Punktlista','\n\n- ','\n\n','Listpunkt'],['Numrerad lista','\n\n1. ','\n\n','Listpunkt'],['Ny sektion','\n\n---\n\n','','']] as const).map(([name,before,after,placeholder])=><button key={name} className="border rounded-lg px-3 py-2 bg-slate-50" type="button" onClick={()=>insert(before,after,placeholder)}>{name}</button>)}
      <button className="border rounded-lg px-3 py-2" type="button" onClick={()=>{const url=window.prompt('Länkadress (HTTPS). Lägg aldrig in lösenord eller privata åtkomstlänkar.');if(!url)return;if(!contentUrl(url)){setError('Ange en HTTPS-adress utan inbäddade inloggningsuppgifter.');return;}insert('[',`](${url})`,'Länktext');}}>Länk</button>
      <button className="border rounded-lg px-3 py-2" type="button" onClick={()=>{const url=window.prompt('Publik bildlänk från Firebase Storage. Ingen uppladdning sker här.');if(!url)return;if(!contentUrl(url,true)){setError('Bilden måste ha en publik HTTPS-länk från Firebase Storage.');return;}const alt=window.prompt('Beskriv bilden (alt-text, obligatoriskt)');if(!alt?.trim()||/[\]\n]/.test(alt)||alt.length>200){setError('Ange en giltig alt-text på högst 200 tecken.');return;}insert(`\n\n![${alt}](${url})\n\n`,'','');}}>Bildreferens</button>
    </div>
    <p className="text-xs text-slate-600">Sidans titel är H1. Använd H2–H4 i brödtexten. Verktygen infogar enkel Markdown, inte HTML. Länkar får rel="noopener noreferrer". Bilder är publika Firebase-referenser; uppladdning hanteras av befintlig bildpanel. {!format&&'Äldre text visas oförändrad tills du aktiverar formatering.'}</p>
    <textarea id={id} ref={ref} className="block w-full border rounded-lg p-3 font-mono text-sm" rows={9} maxLength={maxLength} required={required} value={value} onChange={e=>onChange(e.target.value)}/>
    <button type="button" className="underline" onClick={()=>setPreview(p=>!p)} aria-expanded={preview}>{preview?'Dölj':'Visa'} textförhandsvisning</button>
    {preview&&<div className="border rounded-xl p-4 bg-white"><ContentText text={value} format={format}/></div>}{error&&<p role="alert">{error}</p>}
  </div>;
}
