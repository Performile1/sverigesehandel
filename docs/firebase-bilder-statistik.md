# Firebase: bilder och rapporter i Sveriges E-handels CMS

## Vad denna leverans gör

CMS har en ny vy **Firebase: Bilder & Statistik** bakom befintlig administratörs-
kontroll. Där kan en administratör, efter separat aktivering, ladda upp en logga
för en befintlig partner eller en bild för en befintlig annons. Bilden visas i
partnervyer respektive aktiva annonsplaceringar. Textnamn och textannonser fungerar
som tidigare när bild saknas eller inte kan laddas.

Vyn kan också hämta redan existerande aggregerade GA4-data genom serverns Google
Analytics Data API. Ingen klient-SDK, Google-tagg, insamling, samtyckesbanner,
heatmap eller IP-statistik aktiveras av denna PR. Rapportåtkomst är en separat
funktion från insamling. Ingen kostnad eller ny molnresurs har aktiverats.

## Avstängt som standard

Servervariabler (inga `VITE_`-variabler):

| Namn | Standard | Betydelse |
| --- | --- | --- |
| `CMS_FIREBASE_MEDIA_ENABLED` | `false` | Måste vara exakt `true` för uppladdning. |
| `CMS_FIREBASE_STORAGE_BUCKET` | tom | Uttryckligt bucketnamn i det befintliga Firebase-projektet. Skapas inte av appen. |
| `CMS_GA4_REPORTS_ENABLED` | `false` | Måste vara exakt `true` för att CMS ska hämta befintliga rapporter. |
| `CMS_GA4_PROPERTY_ID` | tom | Numeriskt GA4-egendoms-ID, inte ett `G-`-mät-ID eller Firebase-projekt-ID. |

Att sätta enbart bucketnamn eller GA4-ID aktiverar ingenting. UI:t visar status,
men innehåller ingen knapp som ändrar fakturering, IAM eller flaggorna.
Användaren anger eventuella hemliga värden själv i projektets miljövariabler;
de ska aldrig klistras in i chatt eller committas. Befintliga
`FIREBASE_CLIENT_EMAIL`/`FIREBASE_PRIVATE_KEY` eller betrodd ADC används på servern.
Inga credentials skickas till webbläsaren.

## Bildlagring: aktiveringschecklista

1. Beställaren godkänner kostnad, Firebase Blaze-fakturering och vald bucketregion.
   Verifiera faktiska prisvillkor. En budgetvarning är inte ett hårt kostnadstak.
2. Skapa/välj separat bucket för CMS-bilder i samma Firebase-projekt. Använd separat
   previewlagring och databas om tester inte får ändra produktion. Bucketnamn och
   IAM måste verifieras före flaggan sätts.
3. Ge serverns servicekonto minsta nödvändiga objektbehörigheter för denna bucket
   (skapa objekt; metadatahantering om den krävs av vald IAM-policy). Uppladdningen
   använder unika namn och försöker aldrig göra bucket eller objekt publika via IAM.
4. Behåll klientskrivning till denna bucket nekad i Storage Rules. Uppladdning sker
   endast efter API:ts adminverifiering via Admin SDK/IAM, som inte skyddas av
   klientregler. Denna PR ändrar eller driftsätter inga Storage Rules.
5. Servern skapar en Firebase-downloadlänk för varje bild. **Alla med länken kan
   läsa bilden**, även om kopplad CMS-post är ett utkast. Det är avsikten för
   publika loggor/annonsbilder, inte lämpligt för personliga eller konfidentiella
   dokument. Lägg aldrig privata bilder här. Ingen bucketlistning exponeras.
6. Godkänn lagringspolicy, filbackup och städning. Därefter kan bucketnamnet och
   uppladdningsflaggan sättas på en isolerad preview och en ny deployment testas.
   Aktivera produktion först efter uttryckligt godkännande och verifierad readback.

### Begränsningar och säkerhet

- Max 350 000 byte indata, PNG/JPEG/WebP-stillbild; högst 6000 × 6000 och 16 megapixel.
  Ingen SVG, HTML, GIF eller animerad fil. MIME/filändelse är inte betrodd:
  servern avkodar med Sharp, granskar format/mått och kodar om till WebP.
- Bilder roteras utifrån orientering, begränsas till 2000 × 2000 utan uppskalning
  och sparas utan ursprunglig EXIF/GPS. Originalfilen laddas inte upp.
- Alt-text krävs (1–200 tecken), filnamn skapas på servern och gamla objekt skrivs
  inte över. Uppladdning och bortkoppling kräver CMS-admin, även vid direkt API-anrop.
- Bildreferensen kopplas i en CMS-transaktion utan att andra fält skrivs över.
  Storage och Firestore är två separata system, inte en gemensam transaktion.
  Om sparning misslyckas kan en oanvänd fil bli kvar. UI/API säger då att posten
  ska laddas om och kontrolleras innan en ny uppladdning görs.
- Byte och **Koppla bort bild** tar endast bort/ersätter CMS-referensen. Filen
  raderas inte automatiskt eftersom andra poster/backuper kan referera den.
  Ett återanvändbart filbibliotek och säker, fysisk filstädning är framtida arbete.
- Backupexport av CMS innehåller referenser, inte filerna. Objektbackup/återställning,
  gallring och hantering av delade länkar måste lösas före verklig publicering.
- Uppladdning är lågvolymfunktion för betrodda administratörer, inte publik
  användaruppladdning. Sätt övervakning och användningsbudget före aktivering.

## Rapportåtkomst: aktiveringschecklista

1. Kontrollera befintlig Firebase-/GA4-koppling och välj rätt GA4-egendom.
   Appen skapar ingen egendom eller historik. Använd isolerad testegendom i preview.
2. Aktivera Google Analytics Data API i avsett Google Cloud-projekt och ge serverns
   servicekonto **Viewer/läsåtkomst till just GA4-egendomen**. Firebase-adminbehörighet
   ger inte automatiskt GA4-läsbehörighet. Koden begär endast OAuth-scope
   `analytics.readonly`; rapportens dimensioner/mått/måladress är fasta på servern.
3. Kontrollera integritet och vilka redan insamlade uppgifter egendomen innehåller.
   Detta är inte ett godkännande att börja samla nya data. För ny insamling krävs
   det separata integritets-/samtyckes- och aktiveringsbeslutet nedan.
4. Ange numeriskt egendoms-ID och aktivera enbart rapportflaggan i isolerad preview.
   Testa 7/30/90 dagar, tomma data och nekad åtkomst. Ingen rapport hämtas automatiskt
   när CMS öppnas; administratören väljer **Hämta statistik**.

Rapporter visar högst 100 sidor efter antal sidvisningar: sidvisningar,
**aktiva användare per sida** och summerade engagemangssekunder. Aktiva användare
kan inte summeras till ett unikt totalantal över alla sidor och är inte samma
sak som det tidigare föreslagna måttet ”unik sidvisning”. Engagemangssekunder är
inte ett genomsnitt av lästid. Dessa skillnader beskrivs i CMS.

Endast fasta publika vägar (`/`, `/jobb`, `/partners` osv.) efterfrågas och lämnas
ut. CMS-, medlems-, community- och dynamiska personvägar undantas. Metadata om
tröskelvärden och radbegränsning visas. API-svar och rapporter är privata/no-store;
fel från Google normaliseras utan att credentials eller råa leverantörssvar loggas.

### Hashnavigering och framtida insamling

Sveriges E-handel växlar vyer via hash/flikstatus. Ingen ny insamlare är införd.
Om egendomen redan har en generisk sidtagg kan all trafik vara sammanförd under
`/` och måste märkas som sådan. Rapportpanelen kan inte återskapa flikhistorik.
Före ny insamling behöver ett separat, samtyckesstyrt flöde ge varje publik flik
en uttrycklig virtuell sidväg (exempelvis `/jobb`) utan dubbla sidvisningar.
Skicka inte fria söktermer, full URL med persondata, formulärinnehåll, användar-ID,
privata meddelanden eller e-post till GA4. Testa nej/före samtycke/återkallat
samtycke i nätverksloggen. Ingen insamlingsflagga kan slås på i denna PR.

## Integritet och godkännanden som kvarstår

[Integritetsunderlaget](integritet-och-drift.md) gäller fortsatt: verklig ansvarig
organisation, dataflöden, rättslig grund, biträdesavtal, tredjelandsöverföringar,
lagring/gallring, information och tekniskt verkställt samtycke där det krävs.
Google Analytics är inte ett generellt undantag från dessa krav.
Råa IP-adresser och heatmaps förblir avstängda även efter att rapportläsning eller
bildlagring senare godkänns. Hosting-/säkerhetsloggar är ett separat dataflöde.

## Verifiering

Lokala tester använder riktig bildavkodning/omkodning men injicerade Storage- och
GA4-tjänster samt isolerad Firestore-ersättning. De verifierar adminskydd,
avstängning utan leverantörsanrop, nekat filformat/storlek, metadata, bildkoppling/
bortkoppling/readback, bevarade måladresser, rapportperioder och filtrerade sidvägar.
De bevisar inte live-Storage-IAM, Blaze-status, GA4-läsbehörighet, bildhämtning i
produktion eller ett inloggat CMS-flöde. Detta kräver isolerad konfiguration och
en behörig testanvändare. Ingen testidentitet eller auth-bypass införs.

## Referenser

- https://firebase.google.com/docs/storage/web/start
- https://firebase.google.com/docs/reference/admin/node/firebase-admin.storage
- https://firebase.google.com/pricing
- https://firebase.google.com/docs/analytics/reports
- https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/properties/runReport
