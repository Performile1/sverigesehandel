# Lägg till användare i CMS

## Arbetsgång

1. Sveriges E-handels globalt verifierade admin öppnar **Medlemmar & Community →
   Lägg till användare**.
2. Ange e-postadressen till personens Google-konto, namn och valfria telefon-,
   positions-, företags-, anställnings- och kompetensuppgifter.
3. Bekräfta skapandet. Servern slår upp adressen i det befintliga Firebase-projektets
   Auth. Finns inget konto skapas ett konto med Firebase-genererat UID,
   `emailVerified: false`, utan lösenord eller claims. Finns kontot redan lämnas
   dess Auth-profil, verifieringsstatus och rättigheter oförändrade.
4. En CMS-medlem skapas med status **pending** och dold medlemskatalogspost samt
   en privat personalprofil. Ingen global adminroll eller företagskoppling skapas.
5. Be personen logga in med rätt Google-konto i befintlig portalinloggning.
   Kontrollera att Firebase ger samma UID och verifierad e-post. Appen inför
   inte ett nytt lösenords-/magic-link-flöde och märker inte adressen verifierad.
6. Granska/godkänn medlemskapet och lägg därefter till eventuell företagskoppling
   och intro-/meddelandebehörighet genom befintligt CMS-flöde. En profil ger ingen
   åtkomst till företagsärenden utan dessa separata rättigheter.

**Inget inbjudningsmejl skickas automatiskt.** Formuläret säger detta före och
efter sparning. Dela den vanliga portaladressen separat, inte lösenord, API-nycklar
eller privilegierade inloggningslänkar. Det finns ingen lösenordshantering i CMS.
Detta är att lägga till en användare, inte att utse en ny plattformsadministratör.

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
  Auth-användare. Testa Google-inloggning/kontolänkning mot projektets verkliga
  account-per-email-/providerkonfiguration; förutsätt inte att alla externa
  företagsadresser är användbara Google-konton.
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
