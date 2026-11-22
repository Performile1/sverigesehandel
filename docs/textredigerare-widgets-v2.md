# Textredigerare, metadata och widgets – etapp 2

Tredje widgetetappen beskrivs i `widgets-v3.md`. Detta dokument beskriver
redigeraren och den ursprungliga niomoduls-etappen.

## Vad redigeraren är

En gemensam **Markdown-baserad textredigerare med verktygsrad och förhandsvisning**,
inte en full WYSIWYG-/drag-and-drop-sidbyggare. Verktygen infogar H2/H3/H4,
fet/kursiv text, punkt-/numrerad lista, sektionsdelare, HTTPS-länk eller bildreferens.
Rubrikfältet på en artikelsida är H1; brödtext använder H2–H4. Om text importeras med
`# H1` renderas den som H2 för att inte skapa ytterligare en sid-H1.

Ansluten till bloggfulltext, startguide och köp-/säljannonsernas beskrivning och
vad som ingår/efterfrågas. Både CMS-skapade annonser och medlemsförslag använder
samma säkra renderer; admin-godkännande kvarstår. Nyheter, jobb, partnertexter,
bannerrubriker och alla andra äldre fält har **inte** automatiskt bytts till en
ny redigerare eller fått en ny HTML-tolkning.

Texten är fortfarande redigerbar som text med enkel Markdown. Första verktygs-
åtgärden på äldre text ber om bekräftelse före aktivering. `contentFormat` är
valfritt och måste vara `markdown` för att renderaren ska tolka formatering.
Gamla poster utan fältet visas precis som tidigare med ren text/stycken/listor.
Ingen masskonvertering, innehållsradering eller ny standardformatering vid merge.
På annonser gäller formatvalet båda långa textfälten; granska båda vid konvertering.

## Säkerhet och begränsningar

- Begränsad, egen icke-rekursiv syntax; ingen rå HTML, JavaScript, iframe,
  tredjepartsembed, CSS, tabell-/pluginmotor eller godtycklig React-komponent.
- Text och länktexter renderas av React. Ingen `dangerouslySetInnerHTML`.
- Länkar tillåter HTTPS utan användarnamn/lösenord, och renderas som `<a>` med
  `target=_blank` och `rel=noopener noreferrer`. javascript/data/protokollrelativa
  länkar blir inte klickbara. Rel är fast, inte redigerbar HTML-attributkod.
- Bildreferenser kräver HTTPS på exakt `firebasestorage.googleapis.com` och alt-text.
  Bilden måste ligga som ett eget stycke. Inga externa trackingbilder tillåts av
  denna textfunktion. Andra Storage-buckets på samma domän är inte bevis på rättighet:
  redaktionen kontrollerar innehåll/publiceringsrätt. Inga privata åtkomstlänkar.
- Verktyget för bildreferens laddar inte upp någon fil. Använd befintlig Firebase-
  bildpanel/annonsgalleri och kopiera offentlig referens. Firebase är fortfarande
  separat konfiguration/aktivering; fullständigt mediebibliotek/bildväljare är inte
  infört här. Även utkastbilder kan vara publika hos Storage.
- Endast grundläggande inline-markeringar stöds, inte nästlad Markdown, tabeller,
  automatisk klistra-in-från-Word eller fullständig CommonMark. Använd förhandsvy.
- Längdbegränsningar, serverbehörigheter, granskning, scheman, historik och
  revisionskonflikter kvarstår. Inga privata profiler eller ärenden rich-renderas.

## SEO-fält och taggar

Blogg, guide och köp/sälj kan spara separat SEO-titel (80 tecken), beskrivning
(180 tecken) och högst 15 unika taggar à 40 tecken. Klient normaliserar tomrader/
dubbletter före sparning; server validerar samma gränser. Fälten bevaras i historik,
backup och duplicering av offentlig annonsdata. De förändrar inga kontaktidentiteter.

Taggar visas i artikel-/guide-/annonsinnehåll och används i blogg-/annonssökning.
Det är **inte meta-keywords eller ett löfte om bättre ranking**. Bloggartikeln sätter
browserns document title och description när vyn öppnas och återställer dem när
man lämnar vyn. Guide-/annonsmetadata sparas som förberedelse, inte som separata
indexerbara serversidor.

Sajten använder fortfarande hashadresser. Denna PR inför inte SSR, permanenta
HTTP-artikelrutter, sitemap, canonical/OG/schema.org eller garanterad indexering/
social förhandsvisning per artikel. Det kräver separat routing-/SEO-etapp. Att
ett fält heter SEO ersätter inte den förändringen.

## Nio widgettyper med bevarad standard

Etapp 1:s målgruppskort, senaste Paketindex, periodarkiv och bloggurval kompletteras
med övre annonsplats, övre kontaktformulär, checkout-ingång, nedre annonsplats och
nedre kontaktformulär.

Fyra fasta ytor:

1. Efter hero: målgruppskort → senaste Paketindex → arkiv.
2. Före kartan: övre annonsplats → övre formulär.
3. Redaktionell nedre yta: checkout-ingång → nedre annonsplats → bloggurval.
4. Längst ned: nedre formulär.

Admin visar/döljer och ändrar ordning **inom** respektive yta. Inga privata widgets,
fria skript/HTML, flytt mellan ytor eller nya innehållskopior. Annonsers/formulärs
befintliga aktiverings-, mottagar- och behörighetsregler gäller fortfarande.
Karta, diagram, kalkylatorer, juridik- och historiksektioners logik rörs inte.
Döljning tar inte bort data och är inte avpublicering/rättighetsskydd.

`homeWidgets.version=1` är fortsatt giltigt vid databas-/backupinläsning. Render-
uppgradering till version 2 bevarar gamla enabled-val och övre ordning, och nya
moduler får sina tidigare fasta placeringar. Först när admin sparar skrivs version
2 och revisionen ökar. Saknat/ogiltigt layoutobjekt använder version-2-standard
vid rendering. Server/import avvisar felaktiga konfigurationer; ingen tyst
innehållsåterställning. Dagens nio-modulordning är standard utan konfiguration.

## Testning och vad som återstår

Lokalt testas React-rendering av rubriker, stark/em, listor, avdelare, länkar,
bildreferens, blockerade protokoll och escapad scripttext. Gamla Markdown-liknande
texter utan formatflagga behåller sin bokstavliga visning. API-tester täcker
metadata/formatroundtrip för blogg, guide och annons samt gränser och snapshot-
validering. Widgettester täcker version-1-läsning/sparning, gamla dolda val,
standardordning i alla fyra ytor samt tidigare säkerhets-/behörighetsregressioner.

Inloggad CMS-redigering, verklig Storage-uppladdning och kompletta backup-
återställningsflöden kräver isolerad Firebase-miljö, testdata och admin. README
saknar testidentitet/auth-bypass. Previewns publika blogg/startsidekontroller
redovisas i PR:n. Tester och bygge är inte bevis på att all portal-/CMS-funktion
är driftverifierad. Ingen produktionspost eller spårningsinställning ändras av
kodarbetet. MFA, filbackup och integritetsbeslut kvarstår enligt tidigare dokument.
