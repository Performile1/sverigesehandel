# E-postlänk, Google och valbara sociala inloggningar

## Leverans

Inloggningsknappar i navbar, CMS, medlemsansökan, formulär, intro och sparade
event öppnar nu samma tillgängliga dialog:

- **Fortsätt med Google** (befintlig metod) och Google via omdirigering.
- **Registrera / logga in med e-postlänk**, utan Google-konto eller lösenord.
- Facebook/LinkedIn först efter separata nedan beskrivna konfigurationsflaggor.

Firebase skickar e-postlänken genom Auths egen mejlfunktion, **inte Resend**.
`sendSignInLinkToEmail` begär mejlet; `signInWithEmailLink` slutför registrering/
inloggning och verifierar adressen. Verifierad inloggning ger inte automatiskt
godkänt medlemskap, koppling till företag eller tillgång till CMS.
Befintliga UID-/admin-/blockerings-/godkännanderegler bevaras.

Detta är kodstöd, inte en genomförd ändring av Firebase/Meta/LinkedIn-projekten.
Inga providerinställningar, credentials, Auth-användare, globala roller, IAM eller
betalplaner har ändrats i molnet av arbetet. Riktiga inloggnings- och mailtester
återstår efter kontrollerad konfiguration.

## Säker e-postcallback

1. Personen väljer e-post och anger adress. Returadressen byggs av den aktuella
   HTTPS-originens rot, utan att kopiera query, e-post, godtycklig retur-URL eller
   användarstyrd extern destination.
2. Firebase begär ett mejl med `handleCodeInApp: true`. UI visar att Firebase
   accepterat begäran, inte att mejlet säkert nått inkorgen. Kontrollera skräppost.
3. Callback känns igen av Firebase SDK. Den fullständiga engångslänken hålls bara
   i komponentminne och query tas bort ur adressfält/historik direkt efter laddning.
   Den sparas inte i localStorage/sessionStorage, skickas inte till CMS-API:t och
   loggas inte av vår felhantering. Initial HTTP-begäran kan fortfarande finnas i
   infrastrukturens requestloggar – behandla dem som känsliga och lägg inte
   analystaggar på callback före sanering.
4. Personen skriver den adress länken skickades till, **även på samma enhet**.
   Appen tar aldrig e-post från queryn som bevis. Firebase SDK kontrollerar att
   adress och kod stämmer. Ingen automatisk kontoväxling sker utan inskickning.
5. Felaktig, utgången eller förbrukad länk ger tydligt fel. Personen kan kasta den
   öppnade länken och begära en ny. När queryn rensats kräver full omladdning att
   länken öppnas från mejlet igen. Stängning av dialogen behåller länken enbart i
   den aktuella sidans minne tills den kastas eller sidan lämnas.
6. Registrering/inloggning följer befintlig Firebase-provider/account-per-email-
   policy. Inga klientstyrda kopplingar mellan konton, rollflyttar eller automatiska
   sammanslagningar görs. Fel om annan credential instruerar att använda det
   tidigare inloggningssättet; återställning/länkning kräver säker separat hantering.

UI spärrar samtidiga authförsök och har 60 sekunders väntan mellan mejlbegäranden
i samma dialog. Det är inte ett globalt rate limit eller bottförsvar. Firebase-
kvoter, missbruksskydd och eventuella kompletterande skydd måste granskas före drift.
HTTPS krävs av klientens e-postreturbyggare, även i preview; HTTP-localhost används
inte för detta flöde. Använd auktoriserad HTTPS-testdomän för end-to-end-testning.

## Verifierad adress vid social inloggning

En provider kan sakna e-post eller verifieringsuppgift. Appen markerar inte
adressen verifierad utifrån knappen/provider-namnet. Community, intro, kontakt och
server-API fortsätter kräva Firebase `emailVerified`/`email_verified`.

Dialogen kan skicka Firebase `sendEmailVerification` till det faktiskt inloggade
kontot och därefter låta personen uppdatera via `reload` och nytt ID-token.
Detta fungerar bara när Firebase-kontot har en mejladress att verifiera. Saknas
adress måste personen använda e-postalternativet eller kontakta administratören;
appen uppfinner eller sätter ingen adress för en social identitet.

## Konfiguration som användaren behöver göra

### E-postlänk

Enligt Firebase-dokumentationen:

1. Firebase Console → **Security > Authentication** → **Sign-in method**.
2. Aktivera **Email/Password** och **Email link (passwordless sign-in)**.
   Koden inför inget lösenordsformulär även om Firebase kräver båda providerreglagen.
3. Under **Security > Authentication > Settings → Authorized domains** läggs de
   faktiska produktions-/testdomänerna till. Auktorisera inte godtyckliga öppna
   redirectdomäner och använd separata testprojekt för preview.
4. Granska Firebase Auths mejlmall, avsändare, kvoter och dataskydd före riktig
   registrering. Ange inte privata OAuth-hemligheter i chatt, repository eller VITE_.
5. E-postknappen är tillgänglig som standard i denna kod. Vid ej aktiverad provider
   visas ett begripligt Firebase-fel; Google finns kvar. Sätt den icke-hemliga
   buildflaggan `VITE_FIREBASE_EMAIL_LINK_ENABLED=false` för att dölja knappen under
   utrullning. Saknad flagga eller `true` visar den. Flaggor kräver nytt bygge.

### Facebook (dolt som standard)

- Registrera/konfigurera Meta-app och Firebase Facebook-provider med rätt app-ID,
  app secret och OAuth-redirect enligt Firebase-guiden. Hemligheten anges endast
  i leverantörens avsedda konfiguration, aldrig i frontend.
- Efter provider-/redirect-/domän-/behörighetstest kan
  `VITE_FIREBASE_FACEBOOK_ENABLED=true` visa knappen.
- Koden använder Firebase `FacebookAuthProvider`, popup och email-scope.
  Den behåller inte någon Facebook-access-token i appens profil eller lagring.

### LinkedIn via OIDC (dolt som standard)

- Kräver ett godkänt LinkedIn OIDC-appupplägg och **Firebase Authentication with
  Identity Platform** för generell OIDC-provider. Ingen uppgradering görs av PR:n.
- Konfigurera provider med giltig issuer/discovery, authorization-code flow,
  klient-ID/secret och korrekta redirects enligt båda leverantörerna. Begär
  nödvändiga `openid`, `profile`, `email`-rättigheter i providerupplägget; SDK-
  klienten lägger till profile/email. Godkänn kostnader/villkor separat.
- Sätt enbart det icke-hemliga provider-ID:t, exempelvis `oidc.linkedin`, i
  `VITE_FIREBASE_LINKEDIN_PROVIDER_ID` efter test. Tomt/felaktigt ID ger ingen knapp.
  Klienthemligheten hör aldrig hemma i VITE_ eller browsern.
- LinkedIn anger att email/email_verified är valfria och att social sign-in inte
  är identitetskontroll. Kravet är verifierad konto-e-post i Firebase, inte ett
  påstående om att verklig identitet/anställning har verifierats av LinkedIn.

Sociala alternativ är förberedda, **inte live-aktiverade eller end-to-end-testade**.
Google behålls utan omkonfiguration. Providerfel och kontokonflikter ger sanerade
meddelanden, aldrig råa OAuth-/e-postlänkar. MFA-krav kringgås inte; komplett
MFA-registrering/återställning och MFA-sign-in är fortfarande separat arbete.

## Välkomstmejl från CMS

Nya CMS-välkomstmejl berättar nu om e-postlänk och anslutna sociala konton, inte ett
obligatoriskt Google-konto. Det vanliga välkomstmejlet från Resend är **inte** en
Firebase-verifieringslänk. Personen begär själv den verkliga inloggningslänken i
portalen. Tidigare frysta Resend-payloads saknar templateVersion och behåller
sin gamla ordalydelse vid retry för att inte bryta idempotensen. Nya payloads får
version 2. Ingen gammal inbjudan skickas om av denna kodändring.

## Verifiering före drift

Lokala tester täcker SDK-gränser med fakes, normaliserad adress, säker retur-URL,
callbacksanering, explicit e-postbekräftelse även på annan enhet, providerflaggor,
sanering av fel och modalens Google-/e-post-/social-/callbacklägen. Befintliga
server-/Firestore-behörighetstester inklusive nekad overifierad åtkomst gäller
fortfarande. Inga riktiga mejl, Google-/Meta-/LinkedIn-konton eller OAuth-koder
används i lokala tester.

Live-test kräver isolerat Firebase Auth-projekt/databas, auktoriserad HTTPS-domän,
testmailboxar och godkända sociala testappar. Testa skicka/länk/annan enhet/fel adress/
utgången och återanvänd kod, befintlig Google-person och admin-UID, kontokonflikt,
nekad overifierad ansökan, slutlig verifiering, blockering och medlems-/företags-
godkännande. En READY-build eller en visad knapp bevisar inte dessa flöden.
Ingen testidentitet eller auth-bypass finns dokumenterad i README.

## Källor

- https://firebase.google.com/docs/auth/web/email-link-auth
- https://firebase.google.com/docs/auth/web/account-linking
- https://firebase.google.com/docs/auth/web/facebook-login
- https://firebase.google.com/docs/auth/web/openid-connect
- https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2
