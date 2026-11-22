# Alla publika sidor som sektionswidgets – gransknings-PR

## Omfattning och säkerhetsgräns

Ett gemensamt layoutsystem täcker **14 publika sidtyper och 95 registrerade
sidbundna moduler**. En modul är en sammanhängande sektion, inte varje enskild
rubrik, tabellrad, filter eller databaspunkt. Samma komponenter, props, beräkningar,
listor, modaler och serverbehörigheter återanvänds. Inga innehållsposter flyttas,
raderas eller dupliceras för layouten.

Alla publika sidors sektionslistor finns i `shared/pageLayouts.ts`. Startsidan
återanvänder dessutom de tolv befintliga widgettyperna. Sidorna behåller sina
responsiva ytterbehållare och fasta layoutytor. Ordning ändras **inom respektive
yta**, inte genom fri drag-and-drop mellan sidor eller obegränsade kolumner.
Inga nya CMS-importer kan skapa okända widgettyper, skript eller godtycklig HTML.

**Låsta moduler**: sidhuvud/H1 och viktiga juridiska/säkerhetsbesked kan inte
avaktiveras eller flyttas från sin plats. Bloggens artikelvy behåller artikeln
som en sammanhängande obligatorisk modul och en tillbaka-knapp. Guidekapitel,
kataloger och listor styrs som samlingar – respektive posts publicering fortsätter
hanteras i sitt innehållsflöde, inte i layouten.

**Utanför publikt layoutregister**: autentisering, medlemsansökan, privat
medlemskatalog/DM/inkorg, administrations-/AI-verktyg, redigeringsmodaler, globala
säkerhets-/pausbesked, CMS, navigation och sidfot. Communityns offentliga
presentation, öppna forum och formulär kan hanteras, men arbetsytans verifiering,
registreringsflöde och privata kataloggren ligger kvar och kan inte placeras
som publik widget. Nyhetsinsamling/manuellt adminformulär ligger också kvar med
sitt tidigare skydd utanför layoutvalen. Flytt ger aldrig nya rättigheter.

## Sidor & layout i CMS

**Innehåll & marknad → Sidor & layout** ersätter den äldre startsideslayoutvyn:

1. Välj offentlig sida. Registret visar bara dess egna tillåtna moduler.
2. Visa/dölj och ordna inom ytan. Låsta positioner går inte att passera.
3. **Förhandsvisa utan att spara** öppnar den riktiga portalvyn med lokala layoutval
   i App-minnet. En banner säger att layouten är osparad. Ändringarna går inte till
   andra användare och försvinner vid full omladdning.
4. API-skrivningar och direkta sparningar av eventprogram till Firestore stoppas
   under förhandsvisning. Automatisk profilsynk hoppar över skrivning under denna
   vy. Detta är klientsidigt olycksskydd för admin, inte en ny serverbehörighet
   eller isolering av produktionsdata. GET-anrop kan fortfarande läsa aktuella
   data. Externa länkar/navigering kan fortfarande öppnas.
5. **Avsluta förhandsvisning** återgår till CMS/layoutvyn med samma osparade utkast
   när serverrevisionen inte ändrats. Om någon sparat ny revision används aktuell
   serverlayout; gamla osparade val ska jämföras manuellt.
6. **Publicera sidlayout** kräver uttrycklig bekräftelse och serverkontrollerad
   adminbehörighet. Layouten gäller vid nästa laddning, inget innehåll ändras.
7. **Standardlayout i formuläret** är en återställningsmöjlighet som kräver
   sparning. På startsidan finns också återgång till tidigare homeWidgets-val.
   Befintlig CMS JSON-backup/export/import innehåller samtliga layoutfält.

Ingen separat versionshistorik för layout införs här. Spara backup före stora
ändringar. En defaultknapp återställer inställningar, inte raderat innehåll eller
lagringsfiler. Denna PR utför ingen verklig produktionsbackup/återställning.

## Lagring, migration och konflikter

Nytt valfritt `pageLayouts`-fält per PortalTab med fast schema, revision och
allowlistade ID:n. Saknad inställning ger tidigare sida/ordning. Ogiltig runtime-
inställning ger standardrendering; ogiltig databas/backup avvisas av validering,
inte tyst omskrivning av innehåll.

Äldre `homeWidgets` v1/v2/v3 bevaras exakt. Om `pageLayouts.marknad` saknas,
ärvs deras synlighetsval och ordning inom tidigare ytor. Nya startsidesmoduler
(ej tidigare widgetstyrda) är synliga i tidigare fasta ordning. Först bekräftad
sparning skapar den nya sidlayouten. Vid första konverteringen måste även äldre
homeWidgets-revision matcha, så samtidiga ändringar inte tappas. När startsidan
har ny sidlayout nekar den äldre layout-endpointen skrivning med 409 i stället
för att dölja att de gamla inställningarna inte längre styr sidan.

Alla nya sparningar använder per-sida revision/409. En sida kan ändras utan att
skriva över en annan sidas layout. Servern validerar exakt antal och kända ID:n,
unika ordningspositioner, rätt sida/yta, obligatoriska låsta moduler, typer och
storleksgräns. Befintlig snapshotgräns 900 KB med 890 KB skrivvakt gäller fortsatt.
Inga produktionsinställningar ändras bara genom att PR:n mergas.

Döljning är layout, **inte** avpublicering, samtyckesstyrning eller åtkomstkontroll.
Data kan fortfarande hämtas av sidan och visas via andra publicerade ingångar.
Filter, beräkningar och hooks i sidkomponenterna finns kvar även om deras modul
inte renderas. Inställningar kan skapa en glest innehållen sida; säkerhetsbesked
/H1 kan dock inte tas bort. Manuell testning behövs efter egna layoutändringar.

## Sektionsberoenden

- Dold Paketindexarkivmodul tar bort senaste-rutans scrollänk dit.
- Dolda guidekapitel döljer även innehållsförteckning. Dolt historieflöde döljer
  epokfilter; dold bloggliste-modul döljer bloggfiltret.
- Eventhuvudets länkar till katalog/program visas bara om respektive modul är
  aktiv. Klick scrollar utan att byta portalens hashflik till en okänd sida.
- Kartans densitetslänk använder fortsatt säker uppslagning; om admin döljer
  täckningssektionen finns ingen destination och inget privat innehåll öppnas.
- Jobb-/partnerflikarnas lägesval och listornas interna villkor bevaras. Det är
  möjligt att en aktiv flik saknar innehåll eftersom admin dolt den tillhörande
  listmodulen. Att välja layout är redaktionellt ansvar, inte en behörighetsändring.

## Automatiska kontroller

`bun run check:page-layouts` jämför standardrendering mot en baslinje från
**fd6eef35ee40dbd8b707b9e6a3a27d710fc9d772** för alla 14 sidtyper med samma publika
seeddata och fixerad testtid 2026-11-22T21:06:00Z och utloggad Firebase-kontext. SHA-256-fixturen innehåller inga nya
personuppgifter eller hela kopior av sidinnehåll. Normalisering ignorerar bara
React-/diagramgenererade ID:n, lokala bildrotprefix och blanksteg – inte
verksamhetstexter, priser, elementordning eller attribut. Standardmarkupen matchar
före/efter. Det är **inte** ett visuellt browsertest eller en verifiering av alla
villkorade flikar, inloggade lägen eller datakällors riktighet.

Samtliga registernycklar testas för standard/fallback, synlighet, omordning inom
yta, låsta moduler, okända ID:n och privatgräns. Isolerade API-/Firestore-adapter-
tester sparar alla 14 sidlayouter, nekar icke-admin/overifierad/blockerad användare,
stale revision och otillåtna moduler, samt kontrollerar bevarade företag,
Paketindex, inlägg, kontakter, governance och äldre homeWidgets. Backupvalidering
av felaktiga layouter och klientens skrivskydd testas. Befintlig CMS-regression,
typkontroll, API-start och bygge körs också.

## Manuell granskningsgrind före produktionsgodkännande

PR:n lämnas som **draft** för granskning, inte som påstående att samtliga
inloggade flöden är driftverifierade. Browserkontroller dokumenteras per sida och
viewport i PR:n. Ett READY-bygge bevisar inte att formulär/behörigheter fungerar.
Inloggad layoutpublicering/förhandsvisning/återgång, medlemsansökan, privata
meddelanden, moderering, jämförelser, formulärinskick och verklig backup/återläsning
kräver isolerat Firebase Auth-projekt/databas med testkonton. README saknar sådan
testidentitet/bypass. Skapa inte riktiga poster eller ta bort skydd för att testa.

Inga Firebase-provider-/betal-/MFA-/spårningsaktiveringar görs här. SEO-rutter,
full WYSIWYG, filbackup och tidigare juridiska beslut är separata frågor.

## Inventering per sida

| Sida | Moduler | Automatiskt före/efter | Särskild granskningspunkt |
| --- | ---: | --- | --- |
| Startsida / Marknad | 20 | Matchar | Kalkylator, karta, densitetslänk, tidigare widgetval |
| Nyheter | 7 | Matchar | Artikelmål och separat admin-/AI-flöde |
| Event | 7 | Matchar | Ankarlänkar, filter och sparad agenda |
| Historia | 6 | Matchar | Epokfilter och tidslinje |
| E-handlare | 6 | Matchar | Sökning, sortering och formulär |
| Partners | 7 | Matchar | Jämförelse-/katalogläge och intresseförfrågan |
| 3PL & 4PL | 8 | Matchar | Lista/kort, filter och skyddad redigeringsmodal |
| Jobb | 7 | Matchar | Ort/roll/distans, rekryterare och ansökan |
| Community (publikt) | 5 | Matchar | Privat katalog/DM, medlemsansökan och pausbesked är utanför registret |
| Kontakt | 5 | Matchar | Formulärrouting och annonsöversikt |
| Starta e-handel | 5 | Matchar | Kapitellänkar, checklistor och låst rådgivningsbesked |
| Köpa & sälja | 4 | Matchar | Låst ansvarsbesked, annonsfilter, verifieringskrav |
| Om oss | 3 | Matchar | Rubrik, brödtext och rättelsekontakt |
| Blogg & Insikter | 5 | Matchar | Lista/filter samt obligatorisk artikel-/tillbakavy |

Matchar betyder utloggad serverrenderad standard med samma seeddata, inte att
alla manuella granskningspunkter eller egenvalda layouter har browsergodkänts.
