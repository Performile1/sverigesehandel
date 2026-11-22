# Verifierad företagsadministration och 2FA – aktiveras inte av merge

Detta är **administrationsrätt**, inte juridiskt ägande av sidan/varumärket.
Sveriges E-handel behåller plattformsansvaret. Domän, organisationsnummer och
adress är underlag; kontroll över en mejladress bevisar inte företrädarrätt.

## Levererat flöde

I **Företagssidor** eller **Min arbetsyta** finns den hopfällda panelen
**Verifierad företagsadministration & 2FA**. Den nya panelen ersätter inte
sidlistan eller den befintliga medlems-/behörighetsadministrationen.

1. Personen loggar in med sin företagsadress, verifierad av Firebase, och
   autentiseringsapp. Befintlig Firebase-e-postlänk kan användas – ingen egen
   mejlkodstjänst eller ny leverantör har införts. Socialt verifierad e-post
   accepteras också. Inget klientfält kan ersätta den tokenverifierade adressen.
2. Godkänd medlem ansöker för ett befintligt publicerat företag, med namn,
   position, organisationsnummer, adress, motivering och uttrycklig bekräftelse.
   Ansökan kräver TOTP-inloggning under senaste tio minuterna. Enbart registrerad
   faktor eller ett klientpåstående om MFA räcker inte. Högst tre nya ansökningar
   per UTC-dygn/UID och en väntande/godkänd per företag/UID. Avslag kräver ny ansökan.
3. Admin granskar företagets exakta mejldomäner och registeruppgifter mot oberoende
   källa/officiell kontakt. Domäner gissas inte från webbplats eller användarinput.
   `klarna.com` matchar varken `evil-klarna.com` eller `sub.klarna.com`; en separat
   företagsdomän läggs uttryckligen till. IDN/punycode måste läggas in som ASCII.
4. Admin granskar personen och företrädarrätten självständigt. Inget godkänns
   automatiskt. Domän-, orgnr- eller adressavvikelse kräver extra uttryckligt
   undantag och granskningsmotivering. Gmail/konsulter är därför möjliga som
   manuella undantag – en privat adress blir aldrig automatiskt ett företagsbevis.
5. Vid beslut krävs admin med TOTP-inloggning under senaste tio minuterna,
   revisionskontroll och manuell gransknings-/företrädarbekräftelse. Admin kan inte
   godkänna sin egen ansökan. Servern hämtar dessutom aktuell Firebase Auth-användare
   och kontrollerar UID, samma verifierade e-post, ej disabled och registrerad TOTP.
   Provideruppgifter från klienten accepteras aldrig. Fel vid Firebase-uppslag
   avbryter utan delskrivning. Medlemsstatus och blockering recheckas i transaktionen.
6. Admin måste redan ha reserverat företagssidan. Om den förvaltas av Sveriges
   E-handel måste överlämning uttryckligen bekräftas. Företag kan inte själva ta
   en slug eller skapa en publik sida. Saknas företaget/sidan kontaktas admin för
   katalogutkast och adressreservation; självbetjänad nyföretagsregistrering ingår
   inte. Befintlig sida med annan företagsansvarig kan inte kapas genom ny ansökan.
7. Godkännande skapar aktiv företagskoppling med **endast canPropose**. Ingen
   publicerings-/raderings-/global admin-/medlems-/inkorgs-/historikrätt. Sidan
   övergår från plattformsförvaltning till verifierad ansvarig UID, men ändringar
   kräver fortfarande Sveriges E-handels publiceringsbeslut. En befintlig aktiv
   koppling skrivs inte över: admin måste först utreda den separat.
8. Admin återkallar godkännandet med ny 2FA och motivering. Den skapade kopplingen
   återkallas och sidan återtas under plattformsförvaltning när personen är ansvarig.
   Nästa begäran nekas företagsåtkomst; inga utkast/innehåll/ärenden raderas. Äldre
   kopplingsformulär bevarar verifieringsbindningen och kan inte återaktivera en
   återkallad verifiering utan ny granskning.

## 2FA-klient

Firebase SDK-versionerna i projektet har kontrollerats för TOTP/MultiFactorResolver.
Ingen ny dependency krävs. När klientflaggan nedan är på visas registrering i
inloggningsdialogen för verifierad inloggad person. Den privata setupnyckeln visas
endast för användaren i komponentminnet för manuell inmatning i autentiseringsapp.
Ingen extern QR-tjänst används. Nyckel/kod sparas inte i CMS, URL, loggar eller
webbläsarlagring. Efter registrering ska personen logga ut och in med appkoden.
Firebase kräver recent login vid känslig registrering; vid fel visas ny-login-instruktion.

Google-popup/redirect, e-postlänk och konfigurerade sociala popupmetoder fångar
Firebase MFA-required och visar separat kodsteg med val bland TOTP-faktorer.
Koden skickas bara till Firebase SDK. Fel eller saknad stödd faktor kringgår aldrig
MFA. Avbryt/utloggning städar pending resolver i minnet. SMS-MFA, passkeys och
självbetjänad borttagning/återställning av faktorer ingår inte.

## Serverpolicy och gränser

`CmsIdentity.mfaFactor` och `authTime` hämtas från verifierade Firebase-tokenclaims,
aldrig requestbody. Känsliga beslut kräver exakt `totp`, verifierad e-post och
`auth_time` inom tio minuter (token-refresh gör inte en gammal inloggning ny).
TOTP-sessioner och aktiverad MFA-policy kontrollerar även tokenrevokering/disabled
via Firebase Admin. Detta kräver faktiska Auth-läsbehörigheter som måste testas.

Verifierade nya företagskopplingar kräver alltid TOTP och samma verifierade mejl
vid åtkomst genom CMS-/företags-API:t, även om det globala rolloutkravet är av.
Mejlbyte kräver ny adminutredning; profilen ger inga rättigheter i sig.

När `REQUIRE_PRIVILEGED_MFA=true` kräver admin-API och företagsarbetsytor TOTP.
`/api/access/me` förblir tillgängligt för att upptäcka roller/inloggningsbehov och
inloggningsdialogen kan alltid öppnas från felvyn. Privata bootstrapdata skyddas
också av serverkravet. Vanliga offentliga formulärsvar ger ingen adminrätt.

**Detta är inte ett organisationsomfattande MFA-krav hos Google eller en ändring
av direktåtkomst i befintliga Firestore Security Rules.** Admin SDK använder IAM,
och äldre klientkollektioners regler har inte ändrats/deployats här. Den gränsen
måste granskas innan man kallar hela Firebase-projektet MFA-skyddat. Nya verifierings-
poster ligger i det privata CMS-snapshotfältet; offentlig projektion saknar dem.

Granskade domänpolicyer och ansökningar är ett valfritt validerat fält. Gamla
snapshots utan fält fungerar. Max 100 företagspolicyer, 200 ansökningar och befintliga
byte-/audit-/kopplingsgränser gäller; fullt register stoppar utan tyst radering.
Lagrings- och raderingsrutiner behövs före insamling av verkliga ansökningar.

## Stegvis aktivering – manuellt externt arbete kvarstår

Ingen flagga, Firebase-provider, betalplan, IAM, faktor eller användarroll ändras av
merge. **Företagsverifieringsåtgärder är avstängda utan serverflaggan.**

1. Skapa isolerad Auth/Firestore-testmiljö, ordna testinkorgar, backup och två
   administratörer med dokumenterad återställningsrutin. Granska databehandling,
   ändamål, organisationsansvar och lagringstider först.
2. Behörig Firebase-administratör konfigurerar Authentication with Identity Platform,
   TOTP och inloggningsmetoder enligt Firebase-dokumentationen. Kostnadsgodkännande
   och IAM/auktoriserade domäner sker separat. Skicka inga nycklar i chatten.
3. Sätt `VITE_FIREBASE_TOTP_ENABLED=true` och `FIREBASE_TOTP_ENABLED=true` endast i
   testmiljön, bygg om, registrera app för separata testkonton, logga ut/in och
   prova hela kedjan med riktiga Firebase-tokens. Låt globalkravet vara av först.
4. Testa registrering, fel kod, utgången session, avbrott, Google/redirect/e-postlänk,
   annan mejl, kontoblockering, MFA-removal/tokenrevokering, alla rollback- och
   cross-company-fall samt tappad autentiseringsapp. Providerfel ska neka skrivning.
5. Testa `REQUIRE_PRIVILEGED_MFA=true` i testmiljön och kontrollera alla äldre admin-
   API:er och privata projektioner. Separat Firestore Rules/IAM-granskning krävs.
6. Före produktion: båda admin ska kunna logga in med TOTP och återställningsrutinen
   vara provad av behörig operatör. Sedan separat godkänd produktionsaktivering.

Förlorad app: stoppa/återkalla berörda företagskopplingar och utred med oberoende
kontaktväg. Behörig Firebase-operatör gör eventuell faktorreset och revokerar
sessioner efter identitetskontroll; e-post ensam räcker inte. Ny inloggning och
nyregistrerad faktor krävs. Att bara stänga av globalkravet är **inte** en säker
återställning och ändrar inte Firebase-användarens registrerade faktor.

## Verifieringsnivå

Isolerade API-/domäntester verifierar exakta domäner, tokenbaserad andra faktor,
recent login, manuellt godkännande, Auth-lookup-kontroll, begränsade grants,
återkallelse, mejlbindning, privata projektioner och rolloutgrind. De ersätter inte
riktiga TOTP/Firebase/inbox-/browsertester. Ingen sådan testidentitet finns i repo.
