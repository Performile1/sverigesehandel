# Medlemmar, företagsredaktörer och communitymoderation

## Omfattning

En adminvy **Medlemmar & Community** i CMS samlar medlemsbeslut, företagskopplingar,
ändringsförslag/borttagningsbegäranden, communityinställningar, anmälningar,
blockeringar och en begränsad beslutslogg. En separat **Min företagsyta** visas
för verifierat inloggade användare utan global CMS-adminroll. Detta ger aldrig
företagsredaktören åtkomst till hela CMS:et, andra företags privata uppgifter,
alla kontaktärenden, medlemsregistret eller moderationsinformationen.

## 1. Registrering och koppling

1. Personen loggar in med befintlig Firebase/Google-inloggning och registrerar
   en medlemsprofil i Community. Servern använder tokenens verifierade e-post
   och Firebase-UID, inte en adress/roll/UID i formulärpayloaden.
2. Sveriges E-handel granskar personen/företagstillhörigheten och godkänner
   medlemsprofilen i CMS. Äldre obundna profiler behöver kopplas genom verklig
   inloggning och därefter granskas; ingen företagstillhörighet gissas via domän.
3. Admin väljer medlem + befintlig partner/transportör, 3PL/logistik eller e-handlare.
   Varje koppling har egen status och rättigheterna **föreslå ändringar**,
   **ta emot intro**, **ta emot kontaktmeddelanden** och **historisk inkorgsåtkomst**.
   En person kan kopplas till flera poster och en post till flera personer.
4. Enbart godkänd medlem med verkligt UID kan få aktiv koppling. Återkallad koppling,
   avslaget/borttaget medlemskap eller blockering tar bort åtkomsten vid nästa API-
   begäran. Redan nedladdade uppgifter kan naturligtvis inte återtas från en webbläsare.
5. Återkalla via kopplingens dedikerade knapp även om en tidigare medlem blivit
   blockerad eller borttagen. Inget behöver först avblockeras för att ta bort åtkomst.

Gamla medlemsprofiler och eventuellt tidigare manuellt tilldelad adminbehörighet
måste granskas före användning. Denna PR tilldelar eller uppgraderar ingen
befintlig användares globala CMS-behörighet. Företagsredaktörer får aldrig läggas
i det globala `admins/{uid}`-registret bara för att få tillgång till företagsytan.

## 2. Ändringsförslag – inget publiceras direkt

Företagsytan visar enbart kopplade poster och tillåtna redigeringsfält:

- Partner/transportör: namn, domän, ort/ursprung, erbjudande/teknik, beskrivning,
  prismodell, införandetid och lämplig kundtyp.
- 3PL/logistik: namn, domän, huvudkontor, lageryta, automation, WMS,
  minsta ordervolym, stopptid, prismodell och beskrivning.
- E-handlare: namn, domän, ort, plattform, betalpartner, transportör och beskrivning.

Rättighetsfält, status/publicering, intro-routing, privata e-postadresser,
medlemskopplingar, statistik och bilder ingår inte i företagsredaktörens patch.
Dessa är adminstyrda; företagsbildförslag är en framtida separat förbättring.

- Redaktören lämnar motivering och skickar förslaget. Originalposten ligger kvar.
- Förslaget sparar de ändrade fältens tidigare värden, ny patch, UID, tid och status.
- Admin granskar skillnaderna och **godkänner eller avslår med kommentar**.
- Vid godkännande kontrolleras fortfarande aktiv koppling, godkänt medlemskap och
  att användaren inte blockerats. Om ett berört fält ändrats sedan förslaget
  avbryts godkännandet med konflikt, i stället för att skriva över adminens ändring.
- Godkännande tillämpar enbart godkända fält och ändrar inte befintlig publicerings-
  status. En utkastpost blir inte automatiskt publicerad av att beskrivningen godkänns.
- Företagsredaktören kan **begära borttagning**, aldrig själv DELETE:a en post.
  Godkänd borttagningsbegäran **avpublicerar** posten men raderar inte fysiskt
  företag, kontaktärenden eller historik. Fysisk radering är fortsatt en separat
  global adminåtgärd enligt befintligt flöde.

Det finns högst tio väntande förslag per UID och 300 sparade förslag totalt i
denna lågvolymversion. Gamla ärenden måste senare arkiveras enligt beslutad
lagringspolicy; inga väntande förslag kastas automatiskt för att få plats.

## 3. Företagsinkorg och intro

Företagsinkorgen återanvänder kontakt-/introärenden men returnerar en avgränsad
vy, aldrig hela CMS-inboxen:

- Endast ärenden till en **serverupplöst partner/logistikpost** som faktiskt har
  `direct-partner`-routing kan synas. Redaktionella (`self`) eller custom-email-
  ärenden delas inte med företagsredaktörer.
- Routing väljs fortsatt enligt CMS-formulärets och företagets befintliga inställning,
  inklusive formulärets eventuella uttryckliga valmöjlighet. Företag med
  `introRoutingMode: self` delar inga sådana ärenden. Det går inte att få åtkomst
  till en annan mottagare genom att ändra mål-ID i en inkorgsbegäran.
- Intro och vanliga kontaktmeddelanden har separata mottagarrättigheter per koppling.
  Merchant/e-handlare kan få redigeringskoppling, men befintliga kontaktformulär
  har bara partner/logistik som företagsmottagare – inget merchant-intro gissas.
- När en direktstyrd post saknar intro-mejl men har en godkänd aktiv inkorgsmottagare
  levereras ärendet i företagsinkorgen. Befintlig redaktionsadress används då som
  e-postnotisens reservdestination om Resend redan är konfigurerat. Ingen personlig
  medlemsadress gissas och inga nya notifierings-/mailleverantörer aktiveras.
- Utan historikrätt ges bara tillgång från kopplingens aktuella behörighetstidpunkt.
  Vid återaktivering eller ändrade rättighetsflaggor sätts en ny tidpunkt.
  **Historisk inkorgsåtkomst** är ett separat uttryckligt admingodkännande.
- Läskvitto är per användare; företagsredaktörer kan markera ett eget tilldelat
  meddelande läst men inte radera, omdirigera, svara som annan person eller ändra
  global handläggningsstatus. Personliga Community-DM är en separat befintlig funktion.
- Ingen automatisk e-postnotis till varje kopplad användare införs. Befintlig
  CMS/Resend-routing fungerar som tidigare. Den nya leveransen är den skyddade
  inkorgen, inte ett nytt e-postutskicks-/svarssystem.

Admin behöver säkerställa att formulärens information om direkt delning och
behandling av kontaktuppgifter är korrekt före verklig företagsåtkomst.

## 4. Communityinställningar och anmälningar

CMS kan pausa hela Community eller var för sig: nya trådar/röster, kommentarer,
medlemsansökningar, medlemskatalog, privata meddelanden/företagsinkorg och anmälningar.
Defaults bevarar befintligt öppna communityfunktioner. Reglagen kontrolleras på
servern och i berörda klientkontroller, inte enbart genom dolda knappar.
Communitypaus ändrar inte fakturering eller separat e-postrouting i kontaktformulär.

- Inloggad, verifierad och oblockerad användare kan anmäla tråd/kommentar för
  **stötande innehåll/trakasserier**, **felaktig information**, **spam** eller annat,
  med kompletterande text. Anmälan är inte anonym för plattformsadmin men är
  osynlig för allmänhet, företagsredaktörer och den anmälda användaren.
- En öppen anmälan per UID/innehåll och högst 20 per UID/dygn begränsar missbruk.
  En anmälan gömmer aldrig innehåll automatiskt. Detta är inte ett komplett
  nätverks-/bot-/rate-limit-skydd för en högvolymcommunity.
- Admin kan dölja/återställa innehållet eller avsluta anmälan utan åtgärd,
  med motivering. Dolda trådar/kommentarer tas bort ur publika API-svar och
  portalvisningen, även för adminens portal. Originalet finns kvar i CMS.
- Kommentarer/röster på dold tråd nekas. Vanliga mutationssvar filtreras också så
  att dolda kommentarer/författar-UID:n inte läcker via svar på en ny kommentar/röst.
- Anmälningar som avser redan borttaget innehåll kan avslutas utan innehållsåtgärd.

## 5. Blockera konto

Blockering är ett **administrativt applikationsbeslut för ett Firebase-UID**.
Blockerat konto kan inte använda autentiserade API:er, skicka förslag/intro/DM,
registrera sig igen med samma UID, läsa företagsinkorg eller kringgå pausen med
direkta API-anrop. Ett blockerat konto undantas också som mottagare av nya DM.
Anonym läsning av publikt innehåll genom att logga ut är fortfarande möjlig.
Detta är inte IP-blockering, Firebase-kontoradering eller automatisk moderering
av allt historiskt innehåll. Dölj tidigare innehåll separat efter granskning.

- Admin kan blockera en känd medlem eller en författare från en anmälan.
- Motivering och avblockering loggas. Eget administratörskonto kan inte blockeras
  av misstag med den egna inloggningen. Fler än en återställningsväg bör ändå finnas.
- Blockering utvärderas vid varje autentiserad API-begäran, och vid centrala
  communityskrivningar även i samma transaktion som operationen. Det medför en
  extra läsning av det lilla CMS-snapshotet för autentiserade begäranden.
- Detta återkallar inte Firebase-refresh-tokens eller direkt klientåtkomst till
  andra tidigare auktoriserade Firestore-profiler/sessionsdata. En global
  Firebase-avstängning/tokenspärr är en separat IAM/Auth-åtgärd. Företagskopplingar,
  företagsinbox och moderation använder bara det serverkontrollerade CMS-API:t.
- Ingen personlig ”blockera denna person för mig”-lista införs; det är global
  plattformsmoderation i CMS. Om personliga DM-blockeringar behövs är det nästa steg.

## 6. Logg, lagring och säkerhet

Företagskopplingar, förslag, rapporter, blockeringar, dolda innehålls-ID:n och
läskvitton ligger i ett validerat `memberGovernance`-fält i befintligt snapshot.
Fältet returneras **aldrig** i publikt/vanligt medlems-CMS-svar. Företagsytan har
separata serverfiltrerade läsningar. Bara ofarliga publika funktionsflaggor exponeras.

- Beslut och ändringar får aktör-UID, åtgärd, mål, tid och relevant motivering.
  Senaste 500 loggrader behålls; detta är en begränsad adminlogg, inte en extern,
  manipulationssäker revisions-/complianceprodukt eller full historik för alltid.
- Max 300 kopplingar/förslag/rapporter/blockeringar, 500 dolda mål och läskvitton.
  Ny mutation nekas vid fulla register eller före snapshotets 900 kB-gräns.
- Adminrestore av en privat backup kan återställa äldre rättigheter, blockeringar
  och status. Kontrollera dessa efter återställning. För stora organisationer,
  mer trafik eller bindande revisionskrav krävs separata samlingar, paginering,
  retention/gallring, export och förbättrade rate limits före fortsatt utbyggnad.
- Ingen bulkändring av befintliga roller, importer av verkliga medlemmar,
  produktionsärenden eller automatiska notifieringsutskick görs av kodleveransen.

## 7. 2FA

2FA är **inte aktiverad eller påstådd obligatorisk genom denna PR**. Befintlig
Google/Firebase-inloggning bevaras. Firebase TOTP med Identity Platform,
registrering/återautentisering, återställning och serververifierat MFA-krav måste
implementeras och testas separat, med kontrollerad utrullning så att admin inte
låses ute. Google-kontots egen tvåstegsverifiering är bra men är inte i sig ett
appverifierat Firebase-MFA-krav. Ingen global auth-/faktureringskonfiguration ändras.

## Verifiering före drift

Isolerade API-/Firestore-adaptertester täcker tvärföretagsnekning, adminskydd,
förslag utan direkt publicering, besluts-/konfliktkontroll, borttagningsbegäran,
inkorgens behörigheter/historik/läskvitton, återkallning/avslag/blockering,
kontots verifierade e-postkoppling, communityreglage, privata anmälningar,
dölj/återställ, filtrering av dolda kommentarer även i mutationssvar och
backupvalidering. Inga verkliga konton, kontaktärenden eller tokens används.

Inloggad admin-/företagsredaktörsverifiering i browser kräver minst två isolerade
företag, separata testkonton, testdatabas och testmeddelanden. README innehåller
ingen testidentitet eller auth-bypass. Skapa inte en produktionsbypass och använd
inte delad produktionsdatabas för moderation/blockerings-/raderingstester.
