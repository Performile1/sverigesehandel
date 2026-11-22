# Skapa annonser direkt i CMS

Senare implementation av menygrupper, historik, konfliktskydd, annonsgalleri,
publiceringsperioder, papperskorg och ärendeuppföljning beskrivs i
`cms-arbetsfloden.md`. Nedan finns ursprunglig genomgång och prioritering.

CMS → **Startguide & Köp/sälj → Skapa köp- eller säljannons**.

- Global admin kan registrera annons för varumärke, webshop/verksamhet eller
  varulager/restparti. Välj **Köpes** eller **Säljes**. En tidigare annons utan
  intent är fortsatt Säljes; inget äldre innehåll skrivs om.
- Fyll i de offentliga annonsfälten och privata kontaktperson/e-post/anteckningar.
  Köpes kan beskriva budget och vad som efterfrågas; Säljes vad som erbjuds.
- Bekräfta annonsörens uppdrag/behörighet och godkännande av offentliga fält.
  Utkast är standard. Direkt publicering kräver dessutom redaktionell bekräftelse.
- Efter sparning väljs annonsen i samma granskningspanel. Admin kan ändra offentliga
  fält, avpublicera och sätta dialog pågår eller avslutad/såld, utan radering.
- Kontakten är **inte** automatiskt en verifierad säljare, medlem eller Firebase-
  användare. Inget UID gissas utifrån adressen och inga företagsrättigheter skapas.
  CMS-skapade poster har origin=cms och createdByUid från verifierad admin;
  sellerUid är tomt eftersom ingen faktisk annonsörsidentitet har autentiserats.
  Privata kontaktfält och administrativ skapare exponeras inte publikt.
- Befintliga medlemsskapade annonser behåller sitt riktiga sellerUid. Medlemsvägen
  kan inte göra anspråk på CMS-post, CMS-skapande kan inte skriva över befintlig
  medlemsannons. Ett återförsök i samma formulär returnerar sparad status utan att
  ändra innehåll eller råka publicera ett sparat utkast. Vid osäkert resultat efter
  omladdning, kontrollera referensen i CMS innan nytt förslag skapas.
- Samma 80-posters-/snapshotgräns, backup och importvalidering. Fullt register ger
  fel utan att historik tas bort. Inga verkliga annonser skapas under kodarbetet.
- E-postuppgiften är handinmatad och normaliserad, inte verifierad genom utskick.
  Inga inbjudningar eller andra automatiska mejl skickas av detta flöde.

## CMS-funktioner som fortfarande saknas eller inte är driftverifierade

Detta är en avgränsad granskning av aktuella annons-/guide-/insiktsredigerare,
CMS-skalet och befintliga driftchecklistor, inte ett komplett säkerhetsutlåtande.

1. **Driftverifiering:** riktiga isolerade tester för Firebase, login/inbjudningar,
   CMS-behörigheter, filbackup/återställning samt färdigt administratörs-MFA.
   Kod/previewbygge är inte bevis att aktivering/leverans fungerar.
2. **Redaktionell historik:** full ändringshistorik, återställ tidigare version och
   konfliktvarning vid samtidig redigering. Senaste beslutstid/granskare räcker
   inte som komplett historik. Backup/export finns redan och ersätts inte här.
3. **Annonshantering:** bilder/bildgalleri för Köp/sälj, slutdatum/automatisk
   avpublicering, duplicera annons och bredare sök/filter i CMS-annonskön.
   Köp/sälj har inget nytt uppladdningsflöde i denna PR; befintlig Firebase-
   bildhantering för andra innehållstyper ändras inte.
4. **Planerad publicering och säkrare borttagning:** schemaläggning och papperskorg
   med återställning för berörda redaktionella innehållstyper. Annonsflödet här
   undviker radering och använder utkast/avslutad i stället.
5. **Länkar och förhandsvisning:** egna artikel-/annonsadresser, SEO-fält och
   full sidförhandsvisning innan publicering. Bloggen har redan lokal kortpreview;
   egna hashvyer är inte samma sak som kompletta delbara/SEO-sidor.
6. **Handläggning:** tilldelning och uppföljning för Köp/säljärenden, notifieringar
   och sammanhållen annonsörsvy. Befintlig individuell företagsinkorgstilldelning
   finns, men den gör inte automatiskt affärsförfrågningar till företagsärenden.

Förslagen 1–6 är **inte implementerade av denna PR**. Rekommenderad ordning:
drift/behörigheter → historik/konfliktskydd → annonsbilder/slutdatum → övrig automation.
Ansvarig organisation och integritetsinformation om ändamål, rättslig grund och
lagringstider behöver fortfarande beslutas för privata annonskontakter.
