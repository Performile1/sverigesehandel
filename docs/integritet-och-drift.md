# Sveriges E-handel: förslag för bildlagring, statistik och integritet

Status: beslutsunderlag, inte aktiverad tjänst eller färdig juridisk policy.
Gäller Sveriges E-handel och dess CMS. Inga externa dashboards behöver vara den
normala arbetsytan för redaktionen: bildhantering och rapporter ska nås i CMS med
serverkontrollerad adminbehörighet. Externa leverantörer kan fortfarande behandla
data och ska redovisas öppet.

## Rekommendation och föreslagen budget

- **Bilder:** Vercel Blob för publika partnerloggor och annonsbilder. Uppladdning,
  byte och borttagning kräver CMS-admin. Endast avsedda publika bilder får läggas
  i publik lagring. Spara bildreferenser i CMS, inte bildfiler i snapshotet.
- **Grundstatistik:** Vercel Web Analytics med aggregerade rapporter i CMS genom
  serverhämtning. Anpassa mätningen till portalens flikar. Undanta CMS, formulärdata,
  privat kommunikation och testtrafik. Inga råa IP-adresser ska visas eller sparas
  av någon ny analysfunktion.
- **Budgetförslag:** 10 USD/månad i extra användning för dessa funktioner vid start,
  utöver befintlig hosting, skatt och eventuella valutakostnader. Varningsnivå 5 USD.
  Detta är en målbudget, inte en konfigurerad eller garanterad hård kostnadsgräns.
  Godkänn implementation av kostnadskontroll innan aktivering; pausa inte hela
  webbplatsen automatiskt för att statistikbudgeten nås.
- **Web Analytics Plus behövs inte vid start.** Web Analytics debiteras på Pro
  enligt dokumentationen med 0,03 USD/1 000 händelser: 100 000 händelser motsvarar
  3 USD före eventuell användningskredit. Sidvisningar och anpassade händelser
  räknas. Kostnaden är teamgemensam, inte ett isolerat tak per projekt.
- Blob-lagring på Pro annonseras från 0,023 USD/GB, enkla operationer från
  0,35 USD/miljon och avancerade från 4,50 USD/miljon. Region, trafik och övrig
  användning påverkar utfallet. Bekräfta valda regionens villkor innan inköp.

Inga resurser, köp, behörighetsändringar eller spårningsskript aktiveras av detta
underlag. Budget och leverantörsval behöver godkännas separat.

## Beslut: råa IP-adresser och heatmaps förblir avstängda

Beställaren har uttryckligen valt att inte aktivera dessa under tiden. Denna PR
inför varken IP-insamling, heatmap-SDK, sessionsinspelning eller statistikskript.
Detta säger inte att all infrastruktur, exempelvis säkerhetsloggning hos hosting-
eller inloggningsleverantörer, saknar IP-behandling. Sådan behandling måste ingå i
inventeringen; vi ändrar inte nödvändig drift/säkerhet under förevändning att
stänga av en CMS-statistikfunktion.

## Så införs integritetsupplägget före eventuell aktivering

1. **Inventera verkliga dataflöden.** Dokumentera drift, Firebase-inloggning,
   kontakt/intresseformulär, jobbansökningar, medlemskap, direktmeddelanden,
   bilder och den föreslagna statistiken. Fastställ vem som är juridiskt
   personuppgiftsansvarig och en kontaktväg; använd inte en påhittad organisation.
2. **Besluta ändamål och rättslig grund per behandling.** Definiera dataminimering,
   åtkomstroller, lagringstid, gallring och hur rättighetsförfrågningar hanteras.
   Hashning är inte i sig ett generellt bevis på anonymitet eller samtyckesfrihet.
3. **Granska leverantörerna.** Dokumentera personuppgiftsbiträdesavtal där det behövs,
   underbiträden, lagringsregion och eventuella tredjelandsöverföringar. Att välja
   en EU-lagringsregion räcker inte ensamt som bedömning av hela dataflödet.
4. **Publicera riktig information på sajten.** En lättåtkomlig integritetssida och,
   där relevant, kak-/lagringsinformation länkas från sidfoten i Sveriges E-handel.
   Beskriv verkliga ändamål, uppgifter, mottagare, rättsliga grunder, lagringstider,
   rättigheter och kontaktväg. Policytexten granskas mot faktisk implementation.
5. **Samtycke där det krävs.** Bygg eller anslut en lösning med tydliga och lika
   lättåtkomliga ”Godkänn valfria” och ”Avvisa valfria”, specifika ändamålsval och
   inga förkryssade val. Valfria skript/händelser får inte skickas innan samtycke.
   En permanent ”Integritetsinställningar”-länk gör det lika enkelt att återkalla.
   Cookie-fri analys bedöms utifrån faktisk teknik och data, inte bara etiketten.
6. **Eventuella heatmaps blir ett nytt beslut.** Börja med klick/scroll enbart på
   publika vyer om de senare godkänns. Maskera inmatning och känslig text; undanta
   alltid CMS, inloggning, kontakt-/ansökningsuppgifter och privata meddelanden.
   Sessionsinspelning ingår inte. Bedöm behov av konsekvensbedömning före start.
7. **Verifiera och godkänn.** Nätverkskontroll ska visa noll valfri insamling före
   samtycke, vid avslag och efter återkallande. Prova maskering, behörighet,
   gallring och avstängning. Först därefter kan beställaren godkänna aktivering.

En policy eller banner ensam gör inte behandlingen korrekt. Teknisk spärr,
verkliga avtal, dokumenterade beslut och testad gallring måste stämma överens.
Juridiskt ansvarig behöver godkänna upplägget; underlaget är inte juridisk rådgivning.

## Källor

- [Vercel Blob och offentlig prislista](https://vercel.com/pricing)
- [Web Analytics-priser och teamgemensam användning](https://vercel.com/docs/analytics/limits-and-pricing)
- [Web Analytics integritet och insamlade datapunkter](https://vercel.com/docs/analytics/privacy-policy)
- [PTS: kakor, information och giltigt samtycke](https://pts.se/internet-och-telefoni/kakor-cookies/)
- [IMY: personuppgiftsansvariga och biträden](https://www.imy.se/verksamhet/dataskydd/det-har-galler-enligt-gdpr/personuppgiftsansvariga-och-personuppgiftsbitraden)
- [IMY: personuppgiftsbiträdesavtal](https://www.imy.se/verksamhet/dataskydd/det-har-galler-enligt-gdpr/personuppgiftsansvariga-och-personuppgiftsbitraden/personuppgiftsbitradesavtal/)

Priser och produktfunktioner kontrollerade vid framtagningen; kontrollera igen vid aktivering.
