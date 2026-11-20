import { jobSummary } from '../../shared/editorial';
import type { EcommerceJob } from '../types';

export function PlainTextDescription({ text }: { text: string }) {
  // No HTML or markdown execution: React escapes the entire original text.
  const blocks: Array<{ list: boolean; lines: string[] }> = [];
  for (const line of text.replace(/\r\n?/g, '\n').split('\n')) {
    if (!line.trim()) { blocks.push({ list: false, lines: [] }); continue; }
    const match = /^\s*[-•*]\s+(.+)$/.exec(line);
    const list = Boolean(match);
    const last = blocks[blocks.length - 1];
    if (last && last.list === list && last.lines.length) last.lines.push(match ? match[1] : line);
    else blocks.push({ list, lines: [match ? match[1] : line] });
  }
  return <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
    {blocks.filter((block) => block.lines.length).map((block, index) => block.list
      ? <ul key={index} className="list-disc pl-5 space-y-1">{block.lines.map((line, i) => <li key={i}>{line}</li>)}</ul>
      : <p key={index} className="whitespace-pre-wrap">{block.lines.join('\n')}</p>)}
  </div>;
}

export function JobDescription({ job }: { job: EcommerceJob }) {
  return <div className="space-y-3">
    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{jobSummary(job)}</p>
    {job.desc.trim() && <details className="rounded-xl border border-slate-200 p-3">
      <summary className="text-sm font-semibold text-[#006AA7] cursor-pointer">Läs hela tjänsten<span className="sr-only">: {job.title} hos {job.company}</span></summary>
      <div className="pt-3"><PlainTextDescription text={job.desc} /></div>
    </details>}
  </div>;
}
