# Egen bloggsida och säker widgetgrund – etapp 1

Senare nio-moduls-etapp och formateringsredigerare: se `textredigerare-widgets-v2.md`.
Detta dokument beskriver ursprunglig fyramodulsleverans.

## Blogg & Insikter

Ny publik sida `#blogg` under **Insikter → Blogg & Insikter**. Den återanvänder
`insightPosts`, bilder och befintliga publicerings-/schema-/papperskorgsregler.
Ingen kopia, ny import eller flytt av lagrade inlägg. Söker i rubrik, ingress,
fulltext och författare; filtrerar på befintliga kategorier. Dolda/utgångna/
framtida inlägg visas inte heller för admin i den publika bloggvyn.

Varje inlägg har stabil direktlänk `#blogg/<inläggets-id>`. Artikeln visar
bild, rubrik, ingress, fulltext i stycken/listor, författare/datum där de finns,
källa och befintlig CTA. Saknad fulltext för äldre kort anges uttryckligen; ingen
text eller författare hittas på. Länk till opublicerat/saknat ID ger neutral
inte-tillgänglig-vy. Ren text renderas av React, inte HTML från redaktören.

Detta använder sajtens hash-navigation, **inte serverrenderade artikeladresser,
SEO-/Open Graph-metadata eller en ny slugmodell**. Egna HTTP-artikeladresser och
sociala delningsbilder kräver en separat routing/SEO-etapp. Startsidan behåller
högst tre publicerade inlägg enligt befintlig redaktionell `order`, inte påhittad
kronologisk ordning, och länkar till hela bloggen. De ursprungliga tre korten,
utfällbara texter och CTA:er fungerar som tidigare på startsidan.

## Fyra tillåtna widgettyper

CMS → **Innehåll & marknad → Startsida – widgets**:

| Typ | Standard | Placering |
| --- | --- | --- |
| Målgruppskort | Synlig, först | Övre ytan efter hero |
| Senaste Paketindex | Synlig, andra | Övre ytan |
| Paketindexarkiv | Synlig, tredje | Övre ytan |
| Blogg & Insikter – urval | Synlig | Befintlig nedre redaktionell yta |

Admin kan visa/dölja var och en samt ändra ordningen **inom övre ytan**. Bloggen
stannar i den nedre ytan i denna riskbegränsade etapp. Ingen flytt mellan områden,
drag-and-drop, fri HTML, skript eller val av privata CMS-moduler. Det är fyra fasta
komponenttyper, inte en godtycklig sidbyggare för hela portalen.

Karta, diagram, kalkylatorer, annonser, formulär, hero och befintliga fördjupningar
behåller sin kod och placering. Målgruppsknapparnas höjd/linjering bevaras. När
arkivet döljs försvinner även senaste-rutans scrollänk till arkivet; själva datan
och hero-KPI:n finns kvar. Att dölja en widget är **inte avpublicering** av dess
innehåll eller rättighetsskydd: bloggsidan och andra tillåtna ingångar kan fortsatt
visa publicerade uppgifter.

## Standard, fallback och databevarande

`homeWidgets` är ett valfritt snapshotfält med versionsnyckel och revision. Saknat
fält ger dagens modulordning. Layoutinställningen skapar inga nya innehållsposter
och skriver inte över Paketindex, kartpunkter, företag, annonser eller blogg.
Att visa/dölja är bara en layoutändring. Alla fyra kända ID:n måste finnas exakt
en gång med unika ordningsvärden; okända ID:n/duplicerade poster avvisas på servern.

Renderingen använder standardlayout om den får saknad/ogiltig konfiguration.
**Backupimport/databasvalidering accepterar däremot inte ett ogiltigt fält**;
felaktiga snapshots ska rättas/återläsas kontrollerat, inte tyst räddas genom en
skrivning som riskerar innehåll. Fallbacken är inte ett generellt skydd mot alla
möjliga databasfel. CMS sparar först efter administratörens bekräftelse.

Samtidiga layoutändringar får konflikt (409) när revision inte matchar. ”Återställ
standard i formuläret” fyller bara standardvalen; de gäller först när admin sparar.
Befintlig JSON-backup inkluderar inställningen. Ingen produktionsbackup eller
produktionsimport görs av denna kodleverans och merge muterar ingen CMS-data.
Befintlig snapshot-storleksgräns gäller fortsatt. Ny historiktabell för layout
införs inte; återställning sker via standardval eller kontrollerad CMS-backup.

## Verifiering och lanseringsgrind

Lokalt: giltiga/ogiltiga/okända/duplicerade widgets, standard/fallback, visa/dölj,
ordning per yta, adminskydd, konflikt, sparning/återläsning och oförändrade
innehållslistor testas med isolerad snapshot och API. SSR jämför saknad layout
med explicit standard och kontrollerar att kalkylator/kartval/fördjupningar finns
kvar även när alla fyra widgets döljs. Bloggtest utesluter utkast/schemalagt/
papperskorg och kontrollerar stabil artikellänk. Typkontroll, CMS-regressioner,
API-start och produktionsbygge körs. Befintlig import/backupvalidering kvarstår;
verklig fil-/produktionsåterställning påstås inte genomförd.

Previewkontroll ska omfatta startsida vid desktop/mobil, målgruppsknappar, blogg-
sökning/kategori/öppna/tillbaka/direktlänk, befintlig kalkylator och kartnavigation.
Inloggad layoutändring kräver isolerat adminkonto och databas; README saknar
sådan testidentitet/auth-bypass. Skapa inte produktionsposter för att testa.
Resultatet och allt som inte kan verifieras redovisas i PR:n.

## Senare etapper

Extrahera stora diagram/kalkylatorer en sektion åt gången, jämför före/efter och
behåll gränssnitt/tillstånd innan de får widgetinställningar. Ingen total omskrivning
eller förändring av datamodeller för kalkyler i denna PR. Ny tracking, rå-IP,
heatmaps, leverantörsaktivering och betalplaner ingår inte.
