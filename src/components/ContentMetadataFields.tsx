import type { ContentMetadata } from '../types';
export function ContentMetadataFields({value,onChange}:{value:ContentMetadata;onChange:(v:Partial<ContentMetadata>)=>void}) {
  return <fieldset className="border rounded-xl p-3 space-y-3 text-sm"><legend>SEO & taggar</legend>
    <label className="block">SEO-titel (högst 80 tecken)<input className="block w-full border rounded-lg p-2" maxLength={80} value={value.seoTitle??''} onChange={e=>onChange({seoTitle:e.target.value})}/></label>
    <label className="block">Metabeskrivning (högst 180 tecken)<textarea className="block w-full border rounded-lg p-2" maxLength={180} value={value.seoDescription??''} onChange={e=>onChange({seoDescription:e.target.value})}/></label>
    <label className="block">Taggar (en per rad, högst 15)<textarea className="block w-full border rounded-lg p-2" value={(value.tags??[]).join('\n')} onChange={e=>onChange({tags:e.target.value.split('\n')})}/></label>
    <p className="text-xs text-slate-600">Taggar är för innehållsstruktur och sökning, inte garanterad ranking. Bloggens artikelvy kan sätta titel/beskrivning i webbläsaren. Hashlänkarna är ännu inte separata serverrenderade SEO-sidor; sociala förhandsvisningar och sökindexering garanteras inte. Guide-/annonsmetadata förbereds för nästa routingetapp.</p>
  </fieldset>;
}
