# Utvecklingsplan för CMS och publik portal

Status: genomförande i etapper. Ursprunglig plan togs fram i PR #4. Senare
preciseringar nedan gäller framför tidigare förslag. Varje etapp behöver separat
verifiering innan produktionssättning.

## Preciserat av beställaren

- Firebase har valts för bildlagring och GA4-rapportåtkomst i stället för
  Vercel Blob/Web Analytics. Kod för uppladdning/bildvisning och rapportvy
  förbereds avstängd; se [Firebase-checklistan](firebase-bilder-statistik.md).
  Ingen ny insamling, betalaktivering eller leverantörskonfiguration ingår.

- Kartans utseende och regiongränser ska inte ändras. Endast nya punkter ska kunna
  läggas till och hanteras i CMS. Förslaget om länskarta utgår.
- Råa IP-adresser och heatmaps ska förbli avstängda. Se
  [integritets- och driftförslaget](integritet-och-drift.md) före eventuell aktivering.
- Fem Paketindexrapporter har mottagits. Se [versionsseparerat underlag](underlag/README.md).
  Rapporterna har olika historiska värden; import behöver period **och rapportversion**.
- Jobbsidan ska ha kombinerbar fritext, ort, roll och hybrid/distans/på plats.
- Ny huvudrubrik: ”Sveriges e-handel – insikter, partners och möjligheter.”
- Personliga placeholders neutraliseras, även från sparade CMS-formulär.
  Administratörsidentitet och säkerhetsregler är inte placeholders och ändras inte.

## Pågående implementation

Första implementations-PR:n omfattar nyhetslänkarnas granskningsflöde och
kort/full jobbtext. Den tar bort reservlänkar, sparar nyheter som utkast tills en
redaktör godkänt direktlänken, ger en inventering av befintliga nyheter och
bevarar äldre jobbtexter med en kort visningsingress. Nyhetsgranskningen är manuell;
automatisk hämtning av externa artiklar, omdirigerings- eller betalväggskontroll
ingår inte. Befintliga nyhetslänkar behöver fortfarande granskas av redaktionen.

Jobbfilter och hantering av tillagda kartpunkter ingår nu också i implementations-PR:n.
Bilduppladdning/bildvisning och läsning av befintliga GA4-rapporter är förberedda
avstängda i en separat Firebase-PR. Ny analysinsamling och Paketindexarkiv är
inte implementerade. Besluten under
”Beslut och underlag” nedan kvarstår. Produktionsdata har inte migrerats eller
ändrats genom kodarbetet; verifiering sker mot isolerade testdata och preview.

## Mål och omfattning

CMS ska stödja partnerloggor, annonsbilder, historiska och nya Paketindexperioder,
besöksstatistik, tydliga jobbtexter, källbelagda löneuppskattningar och utbyggbar
regiondata med karta. Nyheter måste dessutom länka direkt till rätt originalartikel.
Befintligt innehåll och administratörsskydd ska bevaras.

## Verifierat nuläge i koden

Granskat mot `main`, commit `c9baba6a745c1abd1b2b8906bbb0d0d7763a2dbc`.
Detta är en kodgranskning, inte verifiering av inloggade produktionsflöden.

| Område | Nuläge | Berörd kod |
| --- | --- | --- |
| Bilder | Partner- och annonsmodeller saknar bildfält och uppladdningsflöde. | `src/types.ts`, `src/components/EntityEditorModal.tsx`, `src/components/AdBannerSlot.tsx` |
| Lagring | Hela CMS lagras som JSON i `cmsSnapshots/main`, med gränsen 900 000 byte. | `server/firestoreStore.ts` |
| Paketindex | Ett aktuellt objekt med viss historik, inte ett komplett arkiv per kvartal. CMS redigerar aktuella siffror. Flera publika etiketter är hårdkodade till K1 2026. | `src/types.ts`, `src/components/CMSStudio.tsx`, `src/components/MarknadView.tsx`, `server/store.ts` |
| Statistik | Ingen integrerad besöksmätning hittades. Publika vyer väljs via hash/flikstatus. | `src/App.tsx`, `package.json` |
| Jobb | Ett beskrivningsfält visas i ett vanligt stycke. Lönefältet är fri text. | `src/types.ts`, `src/components/JobsView.tsx`, `src/components/CMSStudio.tsx` |
| Regioner | Fem koddefinierade kartområden. CMS kan redigera andel, snittorder, hubbar och beskrivning, men inte skapa nya kartområden. | `src/components/SwedenLogisticsMap.tsx`, `src/components/CMSStudio.tsx`, `src/types.ts` |
| Nyheter | AI-instruktionen tillåter URL till ”nyheten eller källan”. Saknad/ogiltig URL ersätts med en sökträff efter listposition eller en startsida. Manuellt skapande och visning har också startsidor som reserv. | `server/geminiDiscovery.ts`, `server/store.ts`, `src/components/NewsView.tsx`, `src/components/CMSStudio.tsx` |

## Rekommenderad genomförandeordning

| Etapp | Leverans | Beroenden |
| --- | --- | --- |
| 1 | Rätta nyhetslänkar och inför kort/full jobbtext. | Beslut om redaktionellt granskningsflöde. |
| 2 | Bildbibliotek, partnerloggor och annonsbilder. | Val och godkännande av fillagring, behörigheter och kostnadsram. |
| 3 | Paketindexarkiv, jämförelser och import. | Exempelfil och bekräftad datakälla. |
| 4 | Grundstatistik i CMS. | Mätdefinitioner, leverantör, åtkomst och integritetsbeslut. |
| 5 | Källbelagda lönespann. | Datakälla, användningsrätt och metod. |
| 6 | Nya kartpunkter på oförändrad karta. | Koordinater och innehåll till nya punkter; befintlig kartindelning behålls. |
| 7 | Aktiv tid och heatmaps som separat tillval. | Etapp 4, integritetsgranskning och godkänt samtyckesflöde. |

Etapper kan utvecklas parallellt där beroendena tillåter det. Inga nya betaltjänster,
produktionsändringar eller personuppgiftsinsamlingar aktiveras genom denna plan.

## 1. Nyheter: direkt till rätt originalartikel

### Föreslagen lösning

- Kräv en URL till den enskilda originalartikeln, inte utgivarens startsida,
  kategorisida, sökresultat eller en annan artikel. Källnamn, rubrik, datum och
  sammanfattning ska avse samma nyhet.
- Ta bort positionsbaserad koppling till sökträffar och alla startsidesfallbacks
  genom hela kedjan: AI-förslag, manuell redigering, batchimport, API och publik vy.
- AI-instruktioner räcker inte som validering. Matcha den föreslagna artikelns
  källunderlag och slutliga destination; låt osäkra träffar stanna som utkast.
- Ge CMS en tydlig granskningsstatus, senaste kontrolltid och möjlighet att öppna,
  korrigera och godkänna länken. Visa artikelns destination i importförhandsvyn.
- Gör nyhetsrubriken och en tydlig ”Läs originalartikeln”-länk klickbara till samma
  godkända artikel. Saknas verifierbar länk ska ingen missvisande reservlänk visas.
- Använd korrekt URL-parsning och tillåt endast godkända HTTP(S)-adresser utan
  inbäddade inloggningsuppgifter. Hantera omdirigeringar och kanoniska adresser utan
  att byta till en orelaterad sida. Ett HTTP 200 bevisar inte att artikeln är rätt.
- Om servern hämtar externa sidor: skydda mot SSRF, privata/lokala nätadresser,
  DNS-rebinding och otillåtna mål i varje omdirigering. Begränsa tid, svarsstorlek
  och antal omdirigeringar; använd vid behov en isolerad hämtningstjänst.
- Blockerad åtkomst, betalvägg eller timeout ska ge ”behöver granskas”, inte ett
  påstående om att artikeln saknas. Ingen kringgång av betalväggar.
- Inventera befintliga nyheter. Rapportera felaktiga länkar för redaktionell
  rättning; ändra eller radera inte befintligt innehåll automatiskt.

### Acceptanskriterier

- [ ] Nya nyheter kan inte publiceras utan granskad, artikelspecifik URL.
- [ ] Saknad URL kan aldrig få en annan sökträffs URL eller en startsida som reserv.
- [ ] CMS, manuell import och AI-import tillämpar samma servervalidering.
- [ ] Tester täcker omkastad källordning, tomma/otillåtna URL:er, fel artikel,
      startsida, omdirigering, 404, betalvägg och timeout.
- [ ] Rubrik och läslänk går direkt till samma rätta artikel i en browserkontroll.

## 2. Jobb: kortversion och fullständig beskrivning

- Lägg till separat ingress och fullständig beskrivning med stöd för stycken och
  punktlistor. Visa kortversionen i listan och ”Läs hela tjänsten” i en tillgänglig
  detaljvy. Behåll ansökningslänk och intresseanmälan där.
- Välj enkel strukturerad text eller ett begränsat format; rendera inte osanerad
  HTML. Detaljvyn ska fungera med tangentbord och på mobil.
- Migrera befintlig `desc` utan textförlust till fulltext och skapa en redigerbar
  kortversion. Uppdatera både CMS, övriga jobbformulär och AI-/batchimport.

### Acceptanskriterier

- [ ] Befintliga jobb behåller hela texten och kan fortfarande sökas/filtreras.
- [ ] Ingressen är kort; hela texten kan öppnas och stängas utan att filter tappas.
- [ ] Stycken och listor visas korrekt; script/otillåten HTML kan inte köras.
- [ ] Utgångna/stängda jobb förblir bortfiltrerade som tidigare.

## 3. Bildbibliotek, partnerloggor och annonsbilder

- Välj separat objektlagring. Spara filreferens, alt-text, mått, format och storlek
  i CMS; lagra aldrig base64-bildfiler i det befintliga snapshot-dokumentet.
- Bygg administratörsskyddad uppladdning med förhandsvisning, byte och borttagning.
  Börja med PNG, JPEG och WebP; tillåt inte osanerad SVG.
- Kontrollera verkligt filinnehåll, format, filstorlek och pixelmått på serversidan
  eller i en betrodd lagringspolicy. Begränsa uppladdningar och hantera avbrutna
  uppladdningar, delade bildreferenser och oanvända filer säkert.
- Lägg till logga i partnerredigering och alla relevanta partnervyer. Visa en
  textbaserad reserv om logga saknas. Bevara proportionerna utan att beskära loggor.
- Lägg till bild och alt-text per annons med responsiv visning och förhandsvy för
  aktuell placering. Behåll befintliga mål-URL:er och fungerande textannonser.
- Definiera maxstorlekar, bildrättigheter, budget och städpolicy före aktivering.

### Acceptanskriterier

- [ ] Endast administratörer kan ladda upp, byta och radera bilder.
- [ ] Tillåtna bilder visas efter omladdning; felaktiga/stora filer nekas tydligt.
- [ ] Mobil och desktop fungerar med långa namn, transparenta loggor och saknad bild.
- [ ] Borttagning av en referens raderar inte en bild som används någon annanstans.
- [ ] CMS-backup innehåller referenser; separat filbackup och återställning är provade.

## 4. Paketindex: historik, nya perioder och import

- Inför poster med stabil periodnyckel (år + kvartal) och separat rapportversionsnyckel, käll-URL, publiceringsdatum,
  enheter och utkast/publicerad-status. Tillåt historiska och nya perioder utan
  överskrivning. Ej utgivna framtidsperioder ska kunna förberedas som utkast.
- Migrera dagens objekt till en arkivpost och bevara befintliga jämförelsedata.
- Bygg skapa/redigera, periodväljare, tabell, tidsserier och jämförelse med samma
  kvartal föregående år när jämförbart underlag finns.
- Gör alla periodberoende etiketter dynamiska, inklusive K1-texter och diagram.
  Tillåt negativa förändringar och skilj på noll, saknat värde och ej jämförbart.
- Börja med en dokumenterad CSV-mall med svensk decimalhantering. Excel/XLSX är
  en separat importadapter om det behövs. Förhandsgranska och validera hela importen
  innan skrivning; välj uttryckligen hur dubbletter ska hanteras.

### Acceptanskriterier

- [ ] Två perioder kan sparas, väljas och jämföras utan att den första försvinner.
- [ ] Negativa förändringar, periodordning, enheter och källor visas korrekt.
- [ ] Felaktiga perioder, procenttal utanför giltigt intervall och dubbletter fångas.
- [ ] Misslyckad import lämnar inga oavsiktliga delskrivningar.
- [ ] Äldre backup kan importeras utan förlust eller återställning av raderat innehåll.

## 5. Besöksstatistik i CMS

- Använd Firebase/GA4 och Google Analytics Data API för rapportåtkomst i CMS.
  Aktiva användare per sida är inte ett exakt personantal eller måttet unik
  sidvisning. Rapportläsning och eventuell framtida insamling är separata beslut.
- Lägg rapporthämtning bakom befintlig serverkontrollerad CMS-adminbehörighet.
  Leverantörsbehörigheter hålls på servern. Skydda rapportcache och export likadant.
- Visa datumintervall, tidszon, sidvisningar, uppskattade unika besökare,
  unika sidvisningar per sida och mest besökta sidor. Definiera ”unik sidvisning”
  uttryckligen, exempelvis en sida en gång per besökarsession; kontrollera att vald
  datakälla stödjer definitionen innan måttet utlovas.
- Anpassa mätningen till hash-/fliknavigeringen. Ett byte till Jobb eller Partners
  måste räknas som rätt logisk sida utan dubbla händelser. Mät inte CMS,
  privata meddelanden, formulärinnehåll eller administratörers testtrafik som publik trafik.
- Skilj tidpunkt/timfördelning från tid som faktiskt tillbringas på sidan.
  Mätning börjar vid aktivering; historiska data kan inte återskapas utan underlag.
- Visa inte råa IP-adresser som standard. Om IP-insyn verkligen behövs ska ändamål,
  rättslig grund, behörighet och kort lagringstid beslutas separat; det är inte samma
  sak som vanlig anonymiserad besöksstatistik.

### Acceptanskriterier

- [ ] Mätdefinitioner, tidszon och källans begränsningar visas i CMS.
- [ ] Flikbyten räknas korrekt; omladdning och återbesök följer vald definition.
- [ ] Endast admin kan läsa rapporter; inga hemligheter eller personuppgifter läcker.
- [ ] Tomma rapporter, leverantörsfel, kvotgränser och väntande data hanteras tydligt.

## 6. Aktiv tid och heatmaps: separat integritetskänsligt tillval

- Välj leverantör först efter granskning av databehandling, lagringsregion,
  underleverantörer, kostnad, samtycke och raderings-/lagringstider.
- Definiera aktiv tid med synlig flik och inaktivitetströskel. Redovisa den som
  uppskattning; tid mellan två sidvisningar är inte ett säkert mått på aktiv tid.
- Maskera som standard all textinmatning och känsligt innehåll. Spåra aldrig CMS,
  autentisering, kontaktformulärens innehåll, medlemsprofiler eller direktmeddelanden.
- Samla inte in innan nödvändigt samtycke finns. Avslag och återkallat samtycke ska
  respekteras. Skilj klick-/scrollheatmaps från sessionsinspelningar; inspelningar
  ingår inte automatiskt i detta förslag.
- Undersök om rapporterna kan visas säkert i CMS; annars använd en skyddad länk.

### Acceptanskriterier

- [ ] Inga heatmaphändelser skickas vid nekat eller återkallat samtycke.
- [ ] Känsliga vyer och fält är undantagna i verifierade nätverks-/browserkontroller.
- [ ] Aktiv tid räknar inte bakgrundsflik eller lång inaktivitet som aktiv läsning.

## 7. Uppskattat lönespann per tjänst och ort

- Behåll arbetsgivarens uppgivna lön separat från portalens uppskattning.
- Koppla tjänst till yrkesgrupp, senioritet och tillgänglig geografisk nivå.
  Modellera min/max, valuta, period, heltid, käll-URL, statistikår och metod.
- Välj källor med rätt att återanvända data. SCB:s genomsnitt är ett möjligt
  underlag, men utgör inte i sig ett lokalt min/max-spann. Härled inte ett
  skenbart exakt spann från ett medelvärde eller en godtycklig ortsfaktor.
- Visa ”Uppskattat lönespann, kr/mån före skatt, heltid”, underlagets geografi och
  datum. Använd bredare regionalt/riksunderlag när lokala data saknas; ange nivån.
  Finns inget rimligt underlag, visa ”Underlag saknas”.
- Låt redaktör granska och uppdatera uppskattningen. Hantera distansroller och
  flera orter uttryckligen; låt inte AI hitta på lönebelopp.

### Acceptanskriterier

- [ ] Arbetsgivaruppgift och uppskattning kan inte förväxlas.
- [ ] Källa, år, geografisk nivå och antaganden är synliga.
- [ ] Saknat lokalt underlag ger tydlig reservnivå eller inget belopp.
- [ ] Min/max, valuta och löneperiod valideras; äldre jobb fungerar efter migrering.

## 8. Nya punkter på befintlig karta

Detta ersätter tidigare förslag om nya geografiska områden/länskarta.

- Behåll befintliga fem områden, polygoner, projektion, färger och ursprungliga orter.
- CMS-admin ska kunna skapa, redigera, publicera/avpublicera och ta bort egna punkter.
- Varje punkt har stabilt ID, namn, beskrivning, WGS84-koordinater och koppling till
  en befintlig region. Förhandsgranskning sker i isolerad previewdata.
- Publicerade punkter visas med befintlig pin-stil och detaljpanel. Utkast filtreras
  på servern. Tangentbord och en lista ger alternativ till pekarklick på kartan.
- Gamla snapshots utan nya punkter fortsätter fungera; import/backup validerar
  koordinater, fält och unika ID:n. Befintliga hårdkodade orter raderas inte via CMS.
- Fler regionala nyckeltal är en separat innehållsetapp med källa, enhet och år;
  de ska inte användas som skäl att bygga om kartan.

### Acceptanskriterier

- [ ] En ny punkt kan skapas, redigeras och tas bort utan komponentändringar.
- [ ] Admin krävs för skrivning; utkast syns inte i offentliga API-svar.
- [ ] Koordinater utanför kartans område eller ogiltiga punktfält nekas.
- [ ] Publicerad punkt kan väljas med mus, tangentbord och lista.
- [ ] Ingen ändring av regionpolygoner eller befintlig kartindelning.
- [ ] Sparning/readback och import av äldre snapshot verifieras med isolerade data.

## Gemensam teknik, migrering och kvalitet

- Säkerhetskopiera innehåll och provåterställ före datamigrering. Dela upp växande
  arkiv, mediaregister och eventuell händelsedata i separata dokument/samlingar
  innan snapshot-gränsen nås. Lägg aldrig besökshändelser i det gemensamma snapshotet.
- Behåll serverkontrollerad adminbehörighet, transaktioner och filtrering av privata
  uppgifter/utkast. Utöka inte publik tillgång för att förenkla implementationen.
- Inför bakåtkompatibel, versionshanterad migrering utan automatiskt återinförande
  av raderade poster. Förhindra förlorade uppdateringar vid samtidiga redigeringar.
- Testa med isolerad preview-databas och lagring: nuvarande konfiguration kan dela
  databas mellan Preview och Production. Inga destruktiva tester mot delad data.
- Kör relevanta tester samt befintliga `bun run check:cms`, `bun run check:startup`,
  `bun run lint` och `bun run build` för implementations-PR:er.
- Verifiera ändrade publika flöden i en READY preview. Inloggad CMS-redigering,
  uppladdning, import och readback kräver behörig testanvändare och isolerade data.
  En grön build är inte bevis på fungerande Firebase-IAM eller adminflöden.
- Produktgodkänn varje etapp före merge/produktion och dokumentera återställning,
  eventuella kostnader och återstående manuella kontroller.

## Beslut och underlag som behövs före respektive etapp

- [ ] Godkänn etappordningen och vem som redaktionellt granskar nyheter.
- [ ] Välj fillagring, kostnadsram och bildgränser.
- [ ] Lämna ett Paketindex-exempel och bekräfta CSV eller även XLSX samt datarättigheter.
- [ ] Välj statistikleverantör, definition av unika mått och eventuell separat IP-insyn.
- [ ] Besluta om heatmaps/aktiv tid ska aktiveras och godkänn integritetsupplägget.
- [ ] Välj lönekälla/metod och lämplig geografisk precision.
- [x] Behåll befintlig kartindelning; tillåt endast nya kartpunkter.
- [x] Låt råa IP-adresser och heatmaps förbli avstängda.
- [x] Paketindexexempel mottagna; avstämning mot original och rapportversion återstår.
- [ ] Prioritera nya regionnyckeltal och lämna koordinater för de första nya punkterna.

## Referenser för kommande implementation

- [Vercel Web Analytics: mått och besökaridentifiering](https://vercel.com/docs/analytics)
- [Web Analytics API](https://vercel.com/docs/analytics/web-analytics-api)
- [Web Analytics: integritet](https://vercel.com/docs/analytics/privacy-policy)
- [SCB: lönestatistik och dess begränsningar](https://www.scb.se/hitta-statistik/sverige-i-siffror/lonesok/)
- [SCB: digitala gränser för län och kommuner](https://www.scb.se/hitta-statistik/regional-statistik-och-kartor/regionala-indelningar/digitala-granser/)
- [SCB: regionala statistikområden och gränsversioner](https://www.scb.se/vara-tjanster/oppna-data/oppna-geodata/regso/)

Leverantörsfunktioner, priser, licenser och datatillgång ska bekräftas på nytt när
respektive implementation påbörjas. Ingen tids- eller kostnadsuppskattning är ännu
fastställd; den tas fram per etapp efter ovanstående beslut.
