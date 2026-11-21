# Personalprofiler och tilldelning av företagsärenden

## Vad som redan fanns och vad som läggs till

Tidigare medlemsprofil innehöll namn, e-post, roll, företag, ort och vissa
intressefält, men inte en komplett privat personalprofil för handläggning.
Denna leverans lägger till `staffProfiles`, separata från offentlig medlemskatalog
och från Firebase Auths egen användarpost.

Varje personalprofil har:

- verkligt Firebase-UID och verifierad inloggningsadress (serverstyrda),
- namn, telefon, position/befattning,
- företag som profiluppgift, anställd sedan och beräknad tid på företaget,
- ansvarsområden/kompetens för att välja rätt handläggare,
- valfri profilbild och senaste uppdateringstid.

## Egen profil och adminredigering

- Verifierat inloggad användare når **Min användarprofil** i sin företagsyta.
  Admin når samma egenprofilformulär i **CMS → Medlemmar & Community**.
- Profilen skapas vid uttryckligt sparande, inte vid sidvisning. Den kan finnas
  även om personen ännu saknar godkänt medlemskap/företagskoppling. Det ger ingen
  rätt att föreslå företagsändringar eller läsa företagsärenden.
- `/api/staff/me` härleder UID, e-post och adminstatus från verifierad identitet.
  Klientens `uid`, `email` och `admin` ignoreras. Inga globala roller kan ändras
  genom profilformuläret. Blockerade konton får inte läsa/ändra profilen.
- Admin kan redigera en känd UID-bunden medlems/personprofil. Det skapar inte ett
  Firebase-inloggningskonto, skickar inte inbjudan och ger inte personen en roll.
- Position och anställningstid är beskrivande, själv-/adminangivna uppgifter,
  inte verifierad arbetshistorik. Företagskopplingen godkänns fortfarande separat.
  Denna version har ett aktuellt företag/startdatum per profil, inte en full
  historik eller flera parallella anställningar. Flera företagsbehörigheter kan
  ändå finnas i den redan separata kopplingsmodellen.
- Ändringar loggas med aktör, mål och tid, utan att telefon/bildlänk kopieras till
  beslutsloggen. Max 300 profiler och befintlig snapshotstorleksgräns gäller.

## Ägaradministratören

Den redan konfigurerade ägaradressen från `shared/firebaseSettings.ts` visas nu
uttryckligen i CMS som **administratör för Sveriges E-handel**. Detta är en
redovisning av befintlig regel: e-post måste komma från verifierad inloggning;
man blir inte admin genom att skriva adressen i ett formulär.

Det går inte från repositoryt att bevisa att en viss användare faktiskt finns i
Firebase Auth eller har en färdig CMS-personprofil. Koden skapar därför inget
Auth-konto och gissar inget UID. När en verkligt inloggad admin sparar sin egen
personalprofil kopplas den till den verifierade identiteten. Saknas en UID-bunden
medlem skapas samtidigt en **intern godkänd registerpost dold i medlemskatalogen**,
så att adminpersonen går att hitta i CMS. Den ger inga nya globala behörigheter.
Inga verkliga person-/medlemsdata skapas av kodleveransen eller vid vanlig GET.

## Profilbilder och integritet

- Profilregistret returneras endast till global admin eller den egna personen.
  Det tas bort ur `/api/cms/store` för publik/vanlig medlemsåtkomst.
- Telefonnummer, anställningsdatum, position, profilbild och kompetens läggs inte
  automatiskt ut i Community-katalogen och delas inte med andra företagsredaktörer.
- Profilbild kan väljas uttryckligen från den inloggade användarens Google-bild
  eller anges som redan existerande Firebase-/Google-HTTPS-bildadress. Bara fasta
  godkända bildvärdar accepteras; inte valfri extern tracking-URL, script, data-URL
  eller inbäddade inloggningsuppgifter. Ingen serverhämtning av URL:en görs.
- Det här är **inte ett nytt filuppladdningsflöde**. Firebase Storage-aktivering,
  filrättigheter, backup och gallring behövs fortfarande för egna nya filer.
  Ingen fakturering, lagring eller bilduppladdningsflagga ändras av PR:n.
- Bildreferensen kan tas bort utan att en fysisk fil raderas. En Google-/Firebase-
  bild kan vara publikt åtkomlig via sin länk hos leverantören även när profilen
  i CMS är privat. Detta framgår i formuläret före val/förhandsvisning. Använd
  en bild som personen har rätt att dela och inkludera behandlingen i policyn.

## Specifik mottagare för ett företagsärende

Admin får ett nytt tilldelningsavsnitt i **Medlemmar & Community**. Alla redan
registrerade direktstyrda partner-/logistikärenden kan visas med företag, ämne,
typ och datum; välj en behörig person utifrån profilens position/kompetens.

- För att tilldelas krävs fortfarande aktiv koppling till **exakt målföretag**,
  godkänt UID-bundet medlemskap, rätt intro-/kontaktflagga, eventuell historikrätt
  och ett oblockerat konto. Tilldelningen i sig ger aldrig behörighet.
- Endast `direct-partner`-ärenden kan tilldelas företagskontakter. Redaktionella
  `self`-/`custom-email`-ärenden skickas inte ut via denna funktion.
- En adminvald `assignedStaffUid` begränsar företagsinkorgen till den personen;
  andra behöriga personer på samma företag ser inte längre ärendet där.
  Sveriges E-handels globala admin behåller sin vanliga CMS-inkorgsåtkomst.
- Läskvitto använder samma filter. Ett gissat meddelande-ID kringgår inte
  tilldelning, företag, historik eller blockering.
- Återkallad/blockerad person tappar åtkomst. Ärendet delas **inte automatiskt**
  med kollegor; admin väljer ny mottagare eller återställer gemensam inkorg.
- Tom mottagare betyder **gemensam företagsinkorg enligt befintliga rättigheter**.
  Det är en faktisk åtkomständring och loggas. UI visar om tidigare vald mottagare
  inte längre har behörighet innan tilldelningen ändras.
- Tilldelning gäller den skyddade CMS/företagsinkorgen. Den återkallar inte
  e-post som redan skickats och ändrar inte befintlig Resend-/formulärrouting.
  Ingen ny e-postnotifiering eller automatisk AI-/ämnesklassificering införs.
- Vanliga avsändare kan inte välja ett godtyckligt `assignedStaffUid` genom
  kontaktpayloaden; attributet sätts bara via serverkontrollerat adminbeslut.

## Testning och driftskrav

Isolerade API-/Firestore-adaptertester verifierar ägarskap för profiler,
nekad tväranvändarredigering, tokenbunden e-post/UID/adminstatus, validerade
telefon-/datum-/bildfält, dolda personuppgifter i publika svar, adminens explicita
profilregistrering, katalogdold intern adminpost, och att tilldelade ärenden/
läskvitton inte går att läsa av kollegor eller personer utan företagsbehörighet.
Även återställd gemensam inkorg, återkallning och beslutslogg testas.

Live-Firebase, riktiga personprofiler, inloggad adminredigering, Google-bildvisning
och företagsinkorg kräver behöriga testkonton och isolerad databas. README har
ingen testidentitet/auth-bypass. Ingen identitet låtsas vara användarens verkliga
admin och inga produktionsdata eller roller ändras under test.

2FA är fortfarande ett separat kvarstående säkerhetsarbete; denna PR ändrar inte
Firebase Auth, IAM, MFA, globala adminregler, fakturering eller annan aktivering.
