# Sveriges E-handel: förslag för bildlagring, statistik och integritet

Status: beslutsunderlag, inte aktiverad tjänst eller färdig juridisk policy.
Gäller Sveriges E-handel och dess CMS. Inga externa dashboards behöver vara den
normala arbetsytan för redaktionen: bildhantering och rapporter ska nås i CMS med
serverkontrollerad adminbehörighet. Externa leverantörer kan fortfarande behandla
data och ska redovisas öppet.

## Uppdaterat teknikval: Firebase

Beställaren har valt att gå vidare med Firebase i stället för det tidigare
förslaget Vercel Blob/Web Analytics. Den nya CMS-integrationen och dess
[aktiveringschecklista](firebase-bilder-statistik.md) är avstängda som standard.

- **Bilder:** Cloud Storage for Firebase i befintligt projekt, med adminskyddad
  uppladdning genom servern. Kräver separat godkänd Blaze-fakturering, bucketregion,
  IAM, budgetövervakning och objektbackup. Filerna är avsedda att vara publika.
- **Statistik:** befintliga Google Analytics/GA4-data kan läsas med Data API och
  visas i CMS. Rapportläsning aktiverar ingen insamling. Ny insamling är inte
  implementerad och behöver separat integritets-/samtyckesbeslut.
- **Budget:** tidigare föreslagna 10 USD/månad är fortsatt endast diskussionsunderlag,
  inte ett konfigurerat tak eller godkänd debitering. Ta fram region- och
  trafikbaserad Storage-kalkyl innan aktivering. Vercels eventpriser gäller inte
  Firebase/GA4 och ska inte användas för denna kalkyl. GA4-/API-kvoter och eventuell
  framtida BigQuery-användning måste bedömas separat.

Inga resurser, köp, behörighetsändringar, faktureringsplaner eller spårningsskript
aktiveras av kodleveransen. Kontrollerad konfiguration och separat godkännande krävs.

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

- [Firebase-priser](https://firebase.google.com/pricing)
- [Firebase Storage och krav på Blaze](https://firebase.google.com/docs/storage/web/start)
- [Google Analytics för Firebase](https://firebase.google.com/docs/analytics/reports)
- [PTS: kakor, information och giltigt samtycke](https://pts.se/internet-och-telefoni/kakor-cookies/)
- [IMY: personuppgiftsansvariga och biträden](https://www.imy.se/verksamhet/dataskydd/det-har-galler-enligt-gdpr/personuppgiftsansvariga-och-personuppgiftsbitraden)
- [IMY: personuppgiftsbiträdesavtal](https://www.imy.se/verksamhet/dataskydd/det-har-galler-enligt-gdpr/personuppgiftsansvariga-och-personuppgiftsbitraden/personuppgiftsbitradesavtal/)

Priser och produktfunktioner kontrollerade vid framtagningen; kontrollera igen vid aktivering.
