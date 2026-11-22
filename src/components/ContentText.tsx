import { Fragment } from 'react';
import { inlineParts, contentUrl } from '../../shared/contentFormat';
import { PlainTextDescription } from './JobDescription';
function Inline({text}:{text:string}) {return <>{inlineParts(text).map((p,i)=>p.kind==='strong'?<strong key={i}>{p.text}</strong>:p.kind==='em'?<em key={i}>{p.text}</em>:p.kind==='link'?<a key={i} className="underline text-blue-800 break-words" href={p.url} target="_blank" rel="noopener noreferrer">{p.text}</a>:<Fragment key={i}>{p.text}</Fragment>)}</>;}
export function ContentText({text,format}:{text:string;format?:'markdown'}) {
  if(format!=='markdown')return <PlainTextDescription text={text}/>;
  const blocks=text.replace(/\r\n?/g,'\n').split(/\n\s*\n/).filter(b=>b.trim());
  return <div className="space-y-4 text-sm leading-relaxed text-slate-700 break-words">{blocks.map((block,i)=>{
    const heading=/^(#{1,4})\s+([^\n]+)$/.exec(block);
    if(heading){const title=<Inline text={heading[2]}/>;return heading[1].length<=2?<h2 className="text-2xl font-bold" key={i}>{title}</h2>:heading[1].length===3?<h3 className="text-xl font-bold" key={i}>{title}</h3>:<h4 className="text-lg font-bold" key={i}>{title}</h4>;}
    if(block==='---')return <hr key={i}/>;
    const image=/^!\[([^\]\n]{1,200})\]\(([^\s)]{1,2000})\)$/.exec(block);
    if(image&&contentUrl(image[2],true))return <figure key={i}><img src={contentUrl(image[2],true)!} alt={image[1]} loading="lazy" className="max-h-96 max-w-full rounded-xl object-contain"/></figure>;
    const lines=block.split('\n');const bullet=lines.every(l=>/^[-•*]\s+/.test(l));const ordered=lines.every(l=>/^\d+\.\s+/.test(l));
    if(bullet||ordered){const children=lines.map((l,n)=><li key={n}><Inline text={l.replace(bullet?/^[-•*]\s+/:/^\d+\.\s+/,'')}/></li>);return bullet?<ul key={i} className="list-disc pl-6 space-y-1">{children}</ul>:<ol key={i} className="list-decimal pl-6 space-y-1">{children}</ol>;}
    return <p className="whitespace-pre-wrap" key={i}><Inline text={block}/></p>;
  })}</div>;
}
