# Paketindexarkiv och källbelagda lönespann

## Paketindex i CMS

Under **Paketindex & Marknad** finns nu ett versionsseparerat periodarkiv:

- Skapa, redigera, publicera/avpublicera och radera observationer.
- Nyckeln är **rapportversion + period + mått + metod**. Nyckeln är låst under
  redigering; skapa ny rad om den ska bytas. Andra utgåvor/perioder bevaras.
- Välj rapportversion, mått, underlagsmetod och period. Tabell visar år, YTD och
  kvartal; tidsserie visar endast kvartal. Procenttal och paketantal blandas inte.
- Jämförelse med motsvarande period föregående år görs enbart inom samma version,
  mått, metod och enhet. Noll som föregående värde ger ingen procentdivision.
  Negativa förändringar visas korrekt. Procentandelar jämförs i procentenheter.
- Transportörsstatistik och konsumentundersökning har olika metodnycklar.
  Undersökning kräver respondentantal; dokumentera mätmånad/bas i metodnoten.
- Second hand är en delmängd, inte ett extra tillägg till totalen. Returer/export/
  större varuförsändelser lagras som separata mått.
- Ny post kan förberedas som utkast utan käll-URL eller datum. Publicering kräver
  giltig HTTPS-käll-URL och publiceringsdatum, och får inte ha framtida år/datum.
  Dessa tekniska kontroller bevisar inte att källan är korrekt eller att datarättigheter finns:
  redaktören måste granska innan publicering.

### Importflöde

1. Ta backup och använd isolerad previewdatabas vid provimport.
2. Ladda ner tom mall från CMS eller läs de mottagna kvartals-/årsutdragen med
   respektive knapp. De 73 kvartalsraderna och 19 års-/YTD-raderna är **inte
   automatiskt inlästa, publicerade eller skrivna till produktion**.
3. Välj CSV-fil eller klistra in innehåll. Komma och semikolon stöds, inklusive
   citerade fält, citattecken, radbrytningar, CRLF och UTF-8-BOM. Decimalkomma ska
   stå i citerat fält i kommaseparerad fil, eller använd semikolon. Ingen XLSX.
4. Välj **avbryt**, **hoppa över** eller **ersätt med utkast** vid dubblett mot arkivet.
   Dubbletter inom samma fil är alltid fel, eftersom de är tvetydiga.
5. Klicka **Förhandsgranska utan att spara**. Alla rader valideras före skrivning;
   förhandsvisningen visar nya, överhoppade och ersatta poster och en tabell.
6. Klicka **Bekräfta import som utkast**. Servern validerar på nytt mot det då
   aktuella arkivet och skriver hela uppdateringen i en snapshot-transaktion.
   Samtidiga redigeringar kan ändra utfallet eller avbryta importen. Avbryts den
   på valideringsfel finns inga delskrivningar. Vid okänt nätverksutfall: läs om
   arkivet före nytt försök.
7. Ange verklig källa/publiceringsdatum och kontrollera rätt rapportversion före
   publicering av respektive rad. Ersättning via import avpublicerar en redan
   publicerad rad tills den granskats och publicerats igen.

### CSV-fält

Tom mall finns i `public/templates/paketindex.csv`.

| Fält | Exempel / tillåtna värden |
| --- | --- |
| `edition` | `2026-Q3`, stabilt namn 1–60 tecken: bokstäver/siffror/_/- |
| `period` | `2026-Q3`, `2025`, `2026-YTD-Q3` (YTD är inte helår) |
| `metric` | `total`, `domestic`, `foreign`, `returns`, `secondhand`, `export`, `bulky`, `returnRate`, `pickupShare`, `homeShare`, `lockerShare` |
| `basis` | `carrier`, `survey`, `legacy` |
| `value` | I antal paket eller procent, **inte miljoner eller tusental** i generella mallen. Noll är ett värde; tomt är fel/saknat underlag. |
| `unit` | `packages` (heltal) eller `percent` (0–100) beroende på mått |
| `sourceName` | Faktiskt källnamn, obligatoriskt |
| `sourceUrl` | HTTPS-URL eller tomt för utkast |
| `publishedDate` | Verkligt datum YYYY-MM-DD eller tomt för utkast |
| `precision` | `exact` eller `rounded-thousands` för paketantal |
| `sampleSize` | Positivt heltal, obligatoriskt för `survey` |
| `note` | Metod, bas, mätmånad, avgränsningar och övriga begränsningar |

De mottagna utdragens tidigare CSV-format stöds också: `rapportversion`, `period`
eller `ar`, `ehandelspaket`, `enhet`, `bilaga_sha256`, `status` samt `periodtyp`
för år/YTD. **Endast den adaptern** räknar om `tusen paket` till paket; den bevarar
precisionen som avrundad. YTD-år får slutkvartal från rapportversionen. Ingen
källa-URL eller exakt publiceringsdag gissas. Alla importer tvingas till utkast,
även om en fil påstår att raden är publicerad.

### Bakåtkompatibilitet och begränsningar

- Ett snapshot som saknar arkiv får vid läsning en **utkastpost** för den gamla
  sammanfattningens total om dess period går att tolka. Den äldre sammanfattningen
  inklusive leveransfördelning/historiska punkter behålls oförändrad, separat från
  nya arkivet. Äldre backups förstör inte dessa uppgifter vid import.
- Läsuppgraderingen gör ingen databasskrivning. Nästa vanliga transaktion kan
  spara den nya strukturen. Ett uttryckligt tomt arkiv återfylls aldrig, och
  borttagna arkivposter återskapas inte.
- Publika API-svar och arkivvyn visar bara publicerade observationer. Admins ser
  utkast i CMS; inget redigerings-/importformulär finns på portalen.
- Arkivet är i denna version begränsat till **500 observationer i befintligt CMS-
  snapshot**, inte en obegränsad ny databas. Importförhandsgranskning kontrollerar
  även 890 000 bytes marginal under snapshotets befintliga 900 000-bytesgräns.
  Firestore-adaptern stoppar alla skrivningar över sin storleksgräns atomärt.
  Flytta arkivet till separata dokument före större tillväxt; denna PR gör inte
  en riskfylld total lagringsmigrering med saknad produktionsbackup.
- Arkivvyns val påverkar endast arkivvyn. Äldre sammanfattningens kort, KPI:er och
  leveransstatistik märks separat och utger sig inte för att följa arkivvalet.
- Historikversionernas skillnader är inte utredda. Använd inte en blandad serie
  för tillväxtberäkningar och skriv inte över utgåvorna med varandra.

## Lönespann i CMS

I CMS **Jobb & Rekrytering**, vid redigering av jobbtexter, finns en utfällbar
redigerare för ett separat granskat lönespann. Ange min/max i SEK/mån före skatt,
heltid, yrkesgrupp/SSYK, faktisk geografi, lokal/regional/riksnivå, källa/HTTPS-URL,
statistikår och metod/antaganden. Fälten valideras både i CMS och på servern,
även vid jobb-batchimport och backupimport.

- Befintligt fria `salaryRange` bevaras som **angivet lönefält**, inte automatiskt
  som arbetsgivarverifierat eller som portalens skattning. Tidigare källor är okända.
- Uppskattningen visas med etikett, geografisk nivå, källa, år och metod. Finns
  ingen giltig uppskattning visas **Löneuppskattning: underlag saknas**.
- Redaktören kan ersätta eller ta bort uppskattningen utan att ändra jobbets
  ansökningslänk, stängningsstatus eller giltighetstid.
- Det finns **inga förifyllda lönebelopp, ortsfaktorer eller AI-genererade löner**.
  Inga löneunderlag har lämnats. En källa med återanvändningsrätt och faktisk
  fördelning/intervall behövs; medelvärde ensamt räcker inte för min/max.
- Distansroller/flera orter beskrivs i geografi och metod. Välj riksunderlag när
  det faktiskt är det som finns, inte en påhittad exakt ortsprognos.

## Vad som fortfarande behöver beslut/underlag

- Originalkällor, faktiska publiceringsdatum och käll-/rättighetsgranskning för
  Paketindex samt lönedata. Endast totalvolym är extraherad i bifogade CSV:er;
  andra segment kan nu registreras/importeras men är inte manuellt transkriberade.
- Isolerad databas och behörig testanvändare för inloggade CMS-/importflöden.
  Inga skrivtester ska göras mot delad produktionsdata.
- Firebase Storage/GA4-aktivering kräver checklistan i `firebase-bilder-statistik.md`.
- Juridiskt ansvarig organisation, rättsliga grunder, faktiska avtal/lagringstider
  och godkänd policy krävs innan publicerad integritetstext eller ny insamling.
  Samtyckes-/insamlingsimplementation är fortfarande en separat återstående del.
- Råa IP-adresser och heatmaps är fortsatt uttryckligen avstängda.
