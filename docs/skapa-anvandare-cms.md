# Lägg till användare i CMS

## Arbetsgång

1. Sveriges E-handels globalt verifierade admin öppnar **Medlemmar & Community →
   Lägg till användare**.
2. Ange e-postadressen personen ska verifiera och använda, namn och valfria telefon-,
   positions-, företags-, anställnings- och kompetensuppgifter.
3. Bekräfta skapandet. Servern slår upp adressen i det befintliga Firebase-projektets
   Auth. Finns inget konto skapas ett konto med Firebase-genererat UID,
   `emailVerified: false`, utan lösenord eller claims. Finns kontot redan lämnas
   dess Auth-profil, verifieringsstatus och rättigheter oförändrade.
4. En CMS-medlem skapas med status **pending** och dold medlemskatalogspost samt
   en privat personalprofil. Ingen global adminroll eller företagskoppling skapas.
5. Be personen logga in med e-postlänk eller ett konfigurerat socialt konto med rätt adress.
   Kontrollera att Firebase ger samma UID och verifierad e-post. Appen har nu ett separat Firebase-e-postlänksflöde efter provideraktivering;
   CMS-skapandet markerar inte adressen verifierad.
6. Granska/godkänn medlemskapet och lägg därefter till eventuell företagskoppling
   och intro-/meddelandebehörighet genom befintligt CMS-flöde. En profil ger ingen
   åtkomst till företagsärenden utan dessa separata rättigheter.

## Automatiskt välkomstmejl

Efter bekräftad CMS-registrering skickas ett välkomstmejl genom befintlig Resend-
integration om både `RESEND_API_KEY` och en verifierad `RESEND_FROM_EMAIL` finns.
Ingen ny leverantör aktiveras och inga miljövariabler ändras av denna kodleverans.
Mejlet innehåller namn, registrerad e-post, den fasta portaladressen
`https://sverigesehandel.se/` och instruktion att välja e-postlänk eller anslutet socialt konto med rätt adress. Ny mall har version 2; äldre frysta retry-payloads behålls.
Det innehåller inga lösenord, tokens eller privilegierade inloggningslänkar och
påstår inte att företagsåtkomst redan är godkänd.

CMS skiljer på användarregistrering och utskick:

- **Accepterat:** Resend accepterade anropet, inte en garanti om inkorgsleverans.
- **Redan accepterat:** sparad status stoppar automatiskt nytt utskick.
- **Ej konfigurerat:** användaren finns men inget mejl skickades; konfigurera
  avsändare/nyckel själv och försök igen med samma e-post, eller dela portaladressen.
- **Misslyckat/okänt:** konto/registrering behålls. Kontrollera mejltjänsten och
  återförsök med samma e-post inom 23 timmar; skapa inte ett andra konto.
- **Manuell granskning:** ett okänt utskick är äldre än 23 timmar eller adressen
  har ändrats. Ingen automatisk omsändning sker eftersom leverantörens
  idempotensfönster är begränsat till 24 timmar.

Mottagare, namn, avsändare och starttid fryses server-side före första försöket.
Payload och idempotensnyckel blir därför samma även om ett återförsök anger ett
annat namn eller serveravsändaren ändrats. Status finns privat på medlemsraden;
vanliga/publika API-svar visar inte inbjudningsmetadata. Ett timeout-/commitfel
kan fortfarande ge okänt leveransutfall; det finns ingen webhook för studs,
leverans, klick eller automatiska påminnelser i denna version. Inget utskick görs
vid vanlig profilredigering, sidvisning eller enbart merge/deployment.

Mejladressen skickas till Resend för leverans; inkludera det i dataskydds-
informationen och använd en godkänd avsändare. Ingen testinbjudan skickas till
verkliga personer under kodarbetet.

## Befintliga konton och återförsök

- Samma e-post slås alltid upp före skapande. Om en samtidig request skapat kontot
  mellan lookup och create fångas `auth/email-already-exists` och kontot läses igen.
- En person som redan är UID-registrerad i CMS får inte sina profiluppgifter,
  godkännandestatus, företagskopplingar eller katalogsekretess återställda av att
  ”läggas till” igen. Använd den vanliga profilredigeraren vid ändringar.
- Inaktiverat Firebase-konto återaktiveras inte. Blockering i CMS upphävs inte.
  Avslag och tidigare status återställs inte automatiskt.
- En äldre CMS-medlem med samma e-post men inget/motstridigt UID stoppas för
  manuell granskning. Registerägarskap flyttas inte automatiskt mellan konton.
- Firebase Auth och Firestore är inte en gemensam transaktion. Om kontot skapats
  men CMS-skrivning misslyckas kan Auth-kontot finnas kvar. Läs om register/Firebase
  och gör vid behov ett nytt försök med **samma e-post**; ingen osäker automatisk
  konto-radering sker. Misslyckad CMS-registrering ger inga företags-/adminrättigheter.
- Endpointen returnerar inte Auth-tokens, credentials eller råa leverantörssvar.
  Användaruppgifterna blir inte del av den publika CMS-payloaden/katalogen.

## Konfiguration och verifiering före drift

- Servern använder befintliga Firebase Admin-credentials eller betrodd ADC.
  Servicekontot behöver minsta tillräckliga Firebase Authentication-behörigheter
  för att läsa och skapa användare i rätt projekt, utöver befintlig Firestore-IAM.
  Denna PR ändrar inga IAM-policyer, faktureringsplaner eller projektinställningar.
- Verifiera på isolerad previewdatabas **och isolerat Auth-projekt** före riktiga
  inskickningar. En annan Firestore-databas i samma Firebase-projekt isolerar inte
  Auth-användare. Testa e-post-/social inloggning och kontolänkning mot projektets verkliga
  account-per-email-/providerkonfiguration; förutsätt inte att alla externa
  företagsadresser är Google-konton; använd e-postalternativet när det är konfigurerat.
- Använd aldrig produktionens medlems- eller Auth-data för raderingstest. Det
  finns inga dokumenterade testkonton eller auth-bypass i README.
- Lokala tester använder isolerade Auth-fakes och Firestore-adapter för skapande,
  redan existerande konto, konkurrerande skapande, avstängt konto, adminskydd,
  overifierad användare, validering före Auth-anrop, idempotent CMS-registrering,
  ingen profilöverskrivning/rolleskalering och ingen publik persondataläcka.
  De verifierar inte verklig IAM, Google-kontolänkning eller leverans av e-post.

Detta tillägg hanterar inte 2FA, inbjudningspåminnelser, CSV-bulkimport, mailutskick,
Firebase-avstängning, global adminrekrytering eller automatiskt godkännande.

Referens: https://firebase.google.com/docs/auth/admin/manage-users

E-post-/socialt inloggningsupplägg och konfiguration: se `epost-social-inloggning.md`.
