import type { ContentMetadata } from '../src/types.ts';
export function contentUrl(value:string,image=false):string|null {
  try {const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||value.length>2000)return null;
    if(image&&u.hostname!=='firebasestorage.googleapis.com')return null;
    return u.href;
  } catch{return null;}
}
export function validContentMetadata(v:ContentMetadata):boolean {
  return (v.contentFormat===undefined||v.contentFormat==='markdown')&&
    (v.seoTitle===undefined||typeof v.seoTitle==='string'&&v.seoTitle.length<=80)&&
    (v.seoDescription===undefined||typeof v.seoDescription==='string'&&v.seoDescription.length<=180)&&
    (v.tags===undefined||Array.isArray(v.tags)&&v.tags.length<=15&&new Set(v.tags).size===v.tags.length&&v.tags.every(t=>typeof t==='string'&&!!t.trim()&&t.length<=40));
}
export function contentMetadata(v:ContentMetadata):ContentMetadata {
  return {...(v.contentFormat?{contentFormat:v.contentFormat}:{}),...(v.seoTitle!==undefined?{seoTitle:v.seoTitle}:{}),
    ...(v.seoDescription!==undefined?{seoDescription:v.seoDescription}:{}),...(v.tags?{tags:[...v.tags]}:{})};
}
export type InlinePart={kind:'text'|'strong'|'em'|'link';text:string;url?:string};
export function inlineParts(text:string):InlinePart[] {
  // Deliberately small non-recursive grammar. No raw HTML, scripts, embeds or nested markup.
  const regex=/\*\*([^*\n]+)\*\*|\*([^*\n]+)\*|\[([^\]\n]{1,300})\]\(([^\s)]{1,2000})\)/g;
  const parts:InlinePart[]=[];let from=0;let match:RegExpExecArray|null;
  while((match=regex.exec(text))!==null){if(match.index>from)parts.push({kind:'text',text:text.slice(from,match.index)});
    if(match[1])parts.push({kind:'strong',text:match[1]});else if(match[2])parts.push({kind:'em',text:match[2]});
    else {const url=contentUrl(match[4]);parts.push(url?{kind:'link',text:match[3],url}:{kind:'text',text:match[0]});}
    from=regex.lastIndex;
  }
  if(from<text.length)parts.push({kind:'text',text:text.slice(from)});return parts;
}

export function cleanContentMetadata<T extends ContentMetadata>(value:T):T {
  return {...value,...(value.tags?{tags:[...new Set(value.tags.map(t=>t.trim()).filter(Boolean))]}:{})};
}
