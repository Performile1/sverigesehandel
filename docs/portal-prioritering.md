# Portalens ordning och nästa leveranser

## Denna leverans

- Fyra menygrupper med underkategorier, samma innehåll på mobil och desktop.
  Inga befintliga sidor tas bort. Historia får en egen synlig underkategori.
- Startsidan börjar med tre målgruppsingångar, senaste Paketindex och periodarkiv
  före sponsrat innehåll och befintliga fördjupningar. Övriga sektioner bevaras.
- `#om`: redigerbar Om Sveriges E-handel-sida under CMS sidtexter. Samma befintliga
  adminskydd och backup. Den beskriver syfte, målgrupp, källor och rättelsekontakt;
  den är inte en påhittad juridisk policy eller organisationspresentation.
- Hero-KPI för Paketindex följer samma källa/period som senaste-rutan, inte gamla
  sidtexts-KPI:er. De äldre redigerbara KPI-strängarna ligger kvar i CMS-data men
  styr inte aktuell Paketindexvisning. Äldre sammanfattning och diagram bevaras
  med historikmärkning. Ingen snapshot/databas skrivs om genom merge.

## Senaste Paketindex, källgranskning 2026-11-22

Transportföretagens lista och rapportsida anger K3 2026, daterad 10 november 2026.
Rapporten anger preliminär utgivning av K4/helår 2026 först vecka 5 år 2027.

- Källsida: https://www.transportforetagen.se/rapporter-remisser-och-statistik/statistik/paketindex-q3-2026/
- Rapport: https://via.tt.se/files/3235972/4631131/460562/sv
- Diagram: K3 2026 = 67 554 tusen paket, K3 2025 = 62 672 tusen paket,
  båda inom samma rapportversion. Cirka +7,8 %. Det är avrundade diagramvärden,
  inte exakta paketantal. Källsidans löptext sammanfattar volymen som 67,5 miljoner.
- Bara dessa två direkt avstämda observationer används som källgranskad läsreferens.
  Övriga mottagna CSV-rader ändras inte till publicerade och skrivs inte över.
- Läsreferensen är separat koddata och är inte en genomförd CMS-import. Det
  befintliga CMS-arkivet kan fortsatt vara tomt eller innehålla utkast. Redaktören
  kan lägga in källgranskade poster via ordinarie arkivflöde.
- En senare publicerad CMS-kvartalsobservation för total/carrier prioriteras.
  Vid samma kvartal prioriteras CMS när publiceringsdatum är minst lika nytt.
  Inga års-/YTD-värden eller konsumentandelar används som kvartalstotal.
- Jämförelsen använder bara publicerade poster med samma rapportversion, mått,
  metod och enhet. Saknas jämförbart underlag står det uttryckligen.
- Arkivets standardval använder senaste kvartalsperiod och publiceringsdatum,
  inte alfabetisk versionsordning. Manuella val av äldre versioner finns kvar.
- Ingen automatisk extern bevakning eller hämtning införs. Nästa rapport måste
  källgranskas och publiceras i CMS, eller läggas till som separat läsreferens.

## Prioriterad fortsättning (inte färdig genom denna PR)

1. **Drift och förtroende:** riktiga isolerade inloggnings-/Firebase-/mejltester,
   kostnadsgodkännande, backup/återställning och säkert administratörs-MFA.
   Juridisk organisationsidentitet, lagringstider och granskad integritetsinformation
   behöver fortfarande beställarens uppgifter/beslut. Ingen insamling aktiveras här.
2. **Företagssidor och introduktioner:** egna delbara företagssidor, integrationer,
   täckning, kundcase och kontaktpersoner. Återanvänd företagsbehörigheter och
   Sveriges E-handels godkännandeflöde. Hitta inte på verifieringar eller svarstider.
3. **Artikeladresser:** egna delbara blogg-/insiktssidor med författare, datum,
   källor och relaterat innehåll. Bevara existerande kort och fulltexter.
4. **Gemensam sökning:** företag, transportörer, jobb, artiklar och event med
   tydliga innehållstyper. Återanvänd befintliga jobbfilter.
5. **Medlemsnotiser:** sparade objekt, ämnesföljning, egna förfrågningar och relevanta
   notiser; frivilliga val och enkel avregistrering före nya utskick.

2–5 beskriver genomförandeordningen och är inga påståenden om färdig kod.
Råa IP-adresser och heatmaps förblir avstängda. Originalplanen i
`cms-utvecklingsplan.md` och dess återstående driftkrav gäller fortsatt.

## Verifiering

Tester täcker att alla gamla menyval finns exakt en gång plus Om-sidan,
aktiv länkmärkning, React-escapad Om-text, adminskyddad sparning/återläsning mot
isolerad snapshot och att arkiv-/företagsdata förblir oförändrade. Urvalstester
täcker rapportrevisioner vars namn inte sorteras kronologiskt, utkast, år/YTD,
andra metoder, tomt CMS, senare publicerad period och jämförelse utan versionsmix.
Previewkontroll och verklig inloggad CMS-redigering redovisas separat i PR:n.
