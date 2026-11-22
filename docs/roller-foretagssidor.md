# Roller, redaktionell arbetsyta och företagssidor

## Levererad kod och avgränsning

Ny gemensam arbetsyta under **CMS → Medlemmar & ärenden → Roller & företagssidor**.
Verifierade användare utan global admin når sin avgränsade roll-/företagsarbetsyta
via **Min arbetsyta** (tidigare Min företagsyta). Gamla företagsförslag, medlems-
profiler och företagsinkorg finns kvar. Ingen verklig användare får roll eller
företagskoppling av merge; inga Klarna-/DHL-sidor skapas automatiskt.

| Roll | Nya rättigheter | Ingår inte |
| --- | --- | --- |
| Skribent | Egna nya redaktionella utkast, skicka för granskning | Publicera, andras utkast, privata register, systeminställningar |
| Redaktör | Granska/skapa ändringsutkast, publicera/avpublicera blogg, guidekapitel och nyheter | Rolltilldelning, global CMS, privata ärenden, företagspublicering |
| Communityadministratör | Öppna forumets anmälningar, dölj/återställ, avsluta anmälan, communityinställningar, communityspecifik blockering | Privata DM, företagsärenden, redaktionell publicering, globala roller |
| Admin | Full plattformsadministration och tilldelning/återkallelse av roller | Åsidosätter inte befintliga verifierings-/blockeringskrav |
| Företagsadministratör | Separat aktiv företagskoppling med canPropose för egna sidor/utkast; mottagarbehörigheter styr inkorg | Ger ingen global roll eller rätt till annat företag; ingen direkt publicering/radering |

Roller är kombinerbara och lagras mot verklig Firebase-UID, inte fritt angiven
mejladress. Bara global admin kan tilldela dem och endast till godkänd UID-kopplad
medlem. Vid sparning ersätts hela rollistan, tom lista återkallar tilldelade roller.
Självändring nekas. Befintlig ägar-/Firebase-adminregel (`admins/{uid}`) finns kvar;
att tömma nytilldelade roller tar inte bort den ursprungliga adminvägen.

API kontrollerar aktuella roller och fortsatt godkänt medlemskap för delegerade
roller vid varje begäran. Ursprunglig ägar-/Firebase-admin kräver inte en ny
medlemsansökan för att behålla sin befintliga åtkomst. Nya domänoperationer läser dem
även i transaktionen och skiljer bootstrap-admin från delegerad admin. Att dölja
knappar är inte behörighetsskydd. En öppen UI-flik kan visa gammalt rollnamn tills
man läser om rättigheter; servern nekar nya åtgärder efter återkallelse. Ny auth-
kontext kan upptäcka tilldelad admin via `/api/access/me`; inga Firebase custom
claims/registry/IAM ändras av rollformuläret. MFA aktiveras inte av denna PR.

## Redaktionell publicering

Vid osäkert svar på skapande av ett nytt redaktionellt utkast ska arbetsytan läsas
om och kön kontrolleras före nytt försök; nya utkast har servergenererade ID:n
och skapande är inte ett mejlliknande idempotent utskicksflöde.

Skribenter skapar egna utkast för **blogg, guidekapitel och nyheter**, med titel,
ingress, fulltext där relevant, källa/direktlänk och datum. Fulltext använder den
befintliga säkra Markdown-redigeraren. De arbetar i separat utkastkö och kan inte
skriva direkt i publicerade poster. Redaktörer kan läsa kön, redigera och publicera
senast sparat utkast utan ytterligare adminbeslut. Datum ska vara giltigt och inte
framtida; vanliga sidors publiceringsscheman ändras inte av denna arbetsyta.

Ändringar av befintligt innehåll skapas av redaktör från listan över redaktionella
poster. Hash av aktuell källpost måste matcha både när ändringsutkast öppnas/sparas
och vid publicering. Utkastrevision nekar samtidiga ändringar. Publicering använder
befintliga serverfunktioner/validering, historik och bevarar övriga postfält/bilder.
Utkastet markeras publicerat atomärt med innehållsskrivningen. Valideringsfel
lämnar det tidigare utkastet och den publicerade posten oförändrade.

Nyheter kräver fortsatt artikelspecifik direktlänk och redaktörens uttryckliga
intygan om att rätt originalartikel öppnats/granskats. Inga reservlänkar eller
betalväggskringgångar införs. Nyhetsfulltext publiceras inte här – sammanfattning
länkar till källan. Blogg/guide kan publicera egen fulltext. Redaktörens nya UI
hanterar inte alla äldre jobb-/event-/katalog-/bild-/systemformulär och ger inte
generell adminrätt till dem. SEO-, schema- och övriga befintliga fält bevaras vid
ändring men alla kan inte redigeras i den avgränsade arbetsytan.

## Communityadministration

Moderatorprojektionen innehåller öppna trådar/kommentarer och anmälningar, inte
medlemsmejl, privata DM, privata kontaktärenden eller globala rollregister.
Moderatorn kan ändra befintliga communityinställningar och dölja/återställa innehåll
med motivering. Communityblockering lagras separat från äldre global appblockering:
den nekar community-API/funktioner, filtrerar medlemskatalog och blockerar nya DM
till/från kontot, inte Firebase-login eller hela portalen. Gamla forumtexter tas
inte bort automatiskt av en blockering. Skyddade personalkonton, tilldelade
plattformskonton och ägaradministratören får inte communityblockeras i denna
avgränsade funktion. Firebase-adminregistret kontrolleras server-side före en
delegerad blockering; fel vid den kontrollen ger inget blockeringsbeslut.
Global admin har kvar sitt äldre separata blockeringsflöde.

## Företagssidor och adresser

Admin reserverar en unik adress för en befintlig partner, transportör/3PL eller
handlare. Exempel är `/#klarna` och `/#dhl` – **exempel, inte skapade sidor**.
Hashar normaliseras till gemener så #DHL kan öppna en reserverad dhl-sida.
Befintliga portaladresser och administrativa namn är reserverade. ASCII-bokstav
först, gemener/siffror/bindestreck, 2–50 tecken. Ett företag kan ha en sida och en
adress kan inte tas av två företag. Adress/företagskoppling kan bara skapas av
admin; inga domänbaserade automatiska varumärkesanspråk. Hashadresser är fortsatt
inte serverrenderade SEO-rutter eller garanterad indexering/social preview.

Företagsadministration återanvänder redan godkänd medlem + aktiv företagskoppling
med canPropose, som Sveriges E-handel administrerar i **Medlemmar & Community**.
Dessa konton kan skapa egna sidutkast med upp till 15 tillåtna widgets:

- Text och tjänster (befintlig begränsad Markdown).
- Bild med alt-text och befintlig offentlig Firebase-bildreferens.
- Kontakttext med valfri HTTPS-webblänk.
- Eget formulär från samma sidutkast.

Inga skript, fria HTML/embeds, betalningsfält eller privata widgettyper tillåts.
Ordning och synlighet följer widgetlistan. Text/bildreferenser kan förhandsvisas
lokalt; formulär i förhandsvisning är avstängda. Ingen fil laddas upp av dessa
fält. Äldre bildlagringsaktivering och rättighetskontroller krävs fortsatt.

Utkast och publicerad version hålls isär. Företaget sparar utkast eller skickar
för granskning; **bara plattformsadmin publicerar företagssidor**, inte rollen
redaktör. Redaktörens publiceringsrätt gäller redaktionellt innehåll. Vid beslut
kontrolleras revision, inskickarens kvarvarande företagsrätt och mottagarnas aktuella
behörigheter. Avslag ändrar inte tidigare publicerad version. Avpublicering tar
bort den offentliga projektionen men raderar inte utkast eller privata ärenden.
Ingen direkt radering för företag; tidigare borttagningsbegäran finns kvar.

Godkända sidor länkas också från respektive partner-/3PL-/handlarkatalog när
en sådan sida finns; utan publicerade företagssidor är katalogernas standard
oförändrad. Företagsnavigering läser om offentlig sidprojektion.

Sidan visas bara om en godkänd publicerad version finns **och** företagsposten är
publicerad. Slug saknas/avpublicerad ger neutral inte-tillgänglig-vy. Offentlig
projektion är strikt allowlistad: inga utkast, inskickar-UID:n, interna roller,
mottagarlistor, ärenden eller audit. Dolda widgets/inaktiva formulär utesluts.

## Företagets egna formulär och inkorg

Högst fem formulär per sida och åtta fält per formulär. Ändamål: Bli kund/
introduktion, Begär offert eller Hjälp i ärende. Fälttyper: text, e-post, telefon,
textyta och val med redaktörsdefinierade alternativ. Required/options/längder
valideras på servern mot **publicerad** form, inte klientens påståenden. Endast
aktivt visade formulär accepterar inskick. Ingen filbilaga, egen mottagaradress,
extern webhook eller godtycklig routning.

Besökaren loggar in med verifierad e-post och bekräftar informationsdelning med
företagets behöriga mottagare/Sveriges E-handel. UID/e-post hämtas från server-
verifierad identitet, inte inskickade fält. Stabil request-referens gör återförsök
idempotenta för samma användare/sida/form; annat UID/mål ger konflikt. Max tio
nya förfrågningar per UTC-dygn/UID. UI varnar för lösenord/kort/personnummer/
känsliga uppgifter och informerar att inga automatiska mejl skickas. Detta är
inte komplett abuse-/bottförsvar eller godkänd juridisk samtyckestext i sig.

Företaget väljer mottagare från aktuellt godkända medlemmar med aktiv företags-
koppling och rätt receiveIntros (lead/quote) eller receiveMessages (support).
Ingen kan ge sig själv fler rättigheter genom ett formulär. Mottagarlistorna är
privata. Tom lista innebär att plattformsadmin handlägger; inget försvinner till
en påhittad extern mailbox.

Vid **varje läsning/ärendeåtgärd** kontrolleras företagskoppling, medlemsstatus,
blockering, community-/meddelandeinställningar, formulärets godkända mottagarlista,
historikrätt och eventuell tilldelning. Nyss tillagd person ser inte gamla ärenden
utan includeHistory. Återkallad koppling eller mottagarroll tar bort åtkomst vid
nästa begäran. Tilldelning måste vara till en redan behörig mottagare och minskar
åtkomst, inte ger den. Inkorgen visar bara det egna företagets behöriga ärenden.
Status: Ny/Pågår/Avslutad, revisionsskyddad. Huvudadmin kan läsa/handlägga alla.
Avpublicerat/borttaget godkänt formulär ger inte företag ny historikåtkomst;
admin kan fortfarande se sparade ärenden. Ingen automatisk e-post/notis införs.

## Lagring, gränser och driftgrindar

Nytt valfritt collaboration-snapshotfält med strikt importvalidering, befintlig
backup och bytegräns. Max 150 rolltilldelningar, 100 redaktionella utkast, 60
företagssidor, 200 formulärärenden, 150 communityblockeringar och 300 auditposter.
När registret/snapshot blir fullt stoppas nya skrivningar utan att kasta bort
historik. Detta kräver uppdelade Firestore-samlingar/arkivering vid verklig volym.
Inga roller, företagssidor, riktiga inlägg, konton, mejl eller privata ärenden
skapas av merge. Inga Auth custom claims, adminregistry, IAM, betalplaner,
providerinställningar, MFA eller spårningsinställningar ändras.

Före skarp insamling måste ni färdigställa ansvarig organisation, ändamål/rättslig
grund, information till avsändare och lagringstider för nya formulärsvar. Bestäm
också vad som ska skickas via portalen respektive direkt till företagets säkra
supportkanal. Frontendvarning ersätter inte juridisk granskning. Bild-/filbackup,
2FA och riktiga isolerade inloggningstester återstår enligt tidigare checklistor.

## Verifiering

Isolerade API-/Firestore-adaptertester täcker writer→editor-publicering, writer-
nekad publicering, ägande/revisionskonflikt, atomärt fel vid fel nyhetslänk,
rolltilldelning/återkallelse, delegerad admin kontra ursprunglig admin, moderator
utan privata data och communityblockering utan global appban. Företagstester
kontrollerar slugkonflikter/reserverade adresser, överpostning, canPropose,
godkännande endast av admin, bevarad publicerad version vid nytt utkast,
mottagarval/ärendetilldelning, andra företags/personers nekade åtkomst, signerad
avsändaradress, idempotens, avpublicering och återkallad koppling vid nästa läsning.

Alla äldre CMS- och 14 sidlayoutbaslinjer körs fortsatt. Standardpublicerade
företagssidor seedas inte för att få en snygg preview. Publik inte-tillgänglig-vy
kan browserkontrolleras; full roll-/företagsresa kräver isolerade Firebase Auth-
konton med godkända medlems-/företagskopplingar. README saknar testidentitet eller
auth-bypass. Den verkliga inloggade resan och fungerande externa Firebase-
behörigheter får inte påstås verifierade av mocktester/READY-build.

## Förberedda sidutkast: åtta företag

Admin kan använda **Förbered åtta företagssidor → Skapa saknade sidutkast**.
Paketet omfattar DHL, Klarna, Qliro, Bring, PostNord, Wetail, Synkka och Alignr.
Det är en explicit CMS-operation, inte automatisk migration eller publicering vid
merge. Inloggad admin blir ansvarig med verklig Firebase-UID; inga UID:n gissas.
Sidorna låses för företagskopplade konton (`managedByPlatform`) tills separat
överlämning kan byggas/testas. Övriga plattformsadmin behåller normal adminåtkomst.

Befintliga företag återanvänds via exakta namn/alias eller stabila ID:n. Saknade
företag får minimala katalogutkast utan domän, företagsfakta eller kontaktuppgifter.
Sidorna har neutral text och inga formulär, logotyper eller automatiska utskick.
Existerande sidor ändras inte, inte heller om de har en annan ansvarig eller adress.
Vid adresskonflikt/otydlig företagsmatchning stoppas hela paketet utan delskrivning.
Upprepad körning skriver inte över befintliga poster. Ansvarig UID hålls privat.

Inloggad skapandeoperation och överlämning till företag återstår att verifiera mot
isolerad Firebase. Detta paket gör inte PR #25 fullständigt driftgodkänd.

## Länkar från partnerkatalogen

Publicerade företagssidor länkas både i kataloghuvudet och via **Visa företagssida**
på rätt partnerkort och i sida-vid-sida-jämförelsen. Kopplingen använder företagets
stabila ID + typ, inte namn, domän eller antagen slug. Extern hemsida och introknapp
finns kvar separat. Utkast eller avpublicerade sidor ger ingen publik länk.
Att skapa sidutkasten räcker alltså inte: de behöver först fyllas i och publiceras.

## Sidlista, återläsning och adminutseende

I **Företagssidor** och **Roller & redaktion** visas nu en sökbar lista **Företagssidor** högt upp,
före roll-/moderationsformulären. Den listar alla behöriga sidor, även opublicerade,
med företagsnamn, adress, arbetsstatus, publik tillgänglighet och ansvarig.
Endast vald sida öppnas i redigeraren. Företagspostens egen publicering räknas in
i publik tillgänglighet: en godkänd sida till ett katalogutkast är inte offentligt
synlig. Inga sidor/utkast/företag publiceras för att lösa detta automatiskt.

**Förhandsvisa** visar sparat utkast eller godkänd version privat inne i CMS,
med mobilbredd som alternativ. Samma visningskomponent som offentligt används,
men kontaktformulär är avstängda och privata mottagarlistor lämnas inte vidare.
**Öppna publik sida** visas bara när sidan faktiskt kan visas offentligt.
Admin kan alltså se utseendet innan publicering, utan någon publik utkastadress.
Osparade redigeringsfält förhandsvisas fortsatt inne i redigeraren.

Skapandeknappen har en uttrycklig bekräftelseruta i sidan, laddningsspärr och
resultat med antal skapade/befintliga sidor. POST-svaret ger de åtta sparade
sidreferenserna. Klienten läser därefter om arbetsytan och matchar varje ID/adress
innan den visar att skapandet är bekräftat. Vid skriv-/återläsningsfel visas inget
falskt framgångsbesked; läs om listan före nytt försök. Befintliga sidor bevaras.

Vid felsökningen 2026-11-22 visade CDN-loggar tre skapandeförsök med HTTP 200 och
runtime-sökningen gav inga fel för det avgränsade tidsfönstret. Detta bevisar inte
innehållet i produktionsdatabasen. Isolerad testadapter kan skapa åtta sidor från
ett snapshot helt utan collaboration-fält och läsa tillbaka dem via separat GET.
Något misslyckat produktionssparande har därför inte reproducerats; tidigare UI
saknade framgångsbesked/översikt och utkastlänken gick till den publika saknad-vyn.
Den verkliga användarens poster har inte lästs/ändrats genom ett inloggat test.


### Enklare ingångar i CMS

**Företag & upptäckt → Företagssidor** öppnar sidlista, privat förhandsvisning,
redigering och adressreservering utan rollformulär, redaktionskö och moderation.
Fasta snabbval **Företagssidor**, **Medlemmar & Community** och **Sidor & layout**
ligger över menygrupperna. Tidigare arbetsyta finns kvar som **Roller & redaktion**;
företagsmedlemmars begränsade arbetsyta påverkas inte. Sidantal från den globala
CMS-vyn uppdateras vid omläsning; själva sidlistan hämtar aktuell arbetsyta direkt.

Beställaren bekräftade därefter att sidorna faktiskt skapats men hittades längre
ned. Åtgärden gäller därför i första hand upptäckbarhet och återkoppling, inte en
bevisad förlust av sparade produktionsdata. Inga poster återskapas automatiskt.
