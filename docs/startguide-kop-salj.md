# Startguide och modererad Köp & sälj

Uppdatering: direkt adminskapande samt Köpes/Säljes finns i `cms-annonskapande.md`.
Äldre poster utan annonstyp räknas som Säljes. Kontaktpersoner som admin registrerar
blir inte automatiskt verifierade användare. Nedan beskrivs ursprungligt medlemsflöde.

## Omfattning

- `#starta`: tio planeringskapitel: idé/målgrupp, ekonomi, produkter/dropshipping,
  företag/grundkrav, plattform, checkout, lager/transport/3PL, emballage/returer/
  kundservice, innehåll/förtroende och lansering/uppföljning.
- `#starta/guide-<id>` kan delas som kapitellänk (portalens befintliga hashmodell,
  inte serverrenderade SEO-artikeladresser). Checklistans kryss är endast i vyns
  minne, inte en permanent medlemsfunktion. Kapitlen har titel, ingress, text,
  checklista, granskningsdatum, frivillig källa och katalog-/kontaktmål.
- CMS → **Startguide & Köp/sälj**: skapa/redigera guidekapitel, ordna och publicera/
  spara utkast. Utkast avpublicerar utan att radera. Ren text renderas escapad med
  stycken/listor. Inga betalda partnerrekommendationer eller rankningar införs.
- Starta e-handel ligger under **Insikter**, Köpa & sälja under **Hitta företag**.
  Fyra huvudgrupper behålls. Startsidan får en fjärde målgruppsingång; den tidigare
  jobb-/kunskapsingången och alla tidigare data/sidor finns kvar.

## Guideinnehåll

Guiden är allmänt planeringsstöd, inte individuell rådgivning eller komplett
regelverk. Kontrollera aktuella rättsliga, skatte-, produkt- och branschkrav med
relevanta myndigheter och rådgivare före lansering. Inga kostnadsgarantier,
leverantörsbetyg eller påhittade lönsamhetsbelopp ges.

Konsumentverkets företagsvägledning stödjer beskrivningen av dropshipping:
säljaren är konsumentens avtalspart även när tredje part levererar, kontaktuppgifter
och korrekt produktinformation krävs och leverans från tredje land ska beskrivas.
https://www.konsumentverket.se/marknadsratt-foretag/dropshipping-regler-for-foretag/

Startkapitlens redaktionella granskningsdatum är 2026-11-22. Det är datum för denna
innehållsgenomgång, inte ett påstående om en extern juridisk kvalitetssäkring.
Kapitel kan ändras/avpubliceras av redaktionen. Källfältet är vidare läsning,
inte ett påstående att en myndighet stödjer alla portalens råd.

## Annonsflöde

1. Verifierad, ej blockerad användare lämnar förslag för varumärke, webshop/
   verksamhet eller varulager/restparti. Inget automatiskt medlems-/företagsgodkännande.
2. Offentliga fält: rubrik, typ, beskrivning, vad som ingår/inte ingår, ort,
   prisindikation och för lager även antal/skick. Undvik personuppgifter och
   kundregister; inga filer, länkar eller konfidentiella dokument kan bifogas.
3. Användaren bekräftar att hen har rätt att företräda säljaren och att de offentliga
   fälten får publiceras. Detta är en **försäkran från säljaren, inte verifierad
   äganderätt eller Firebase-verifierad anställning**.
4. Servern skapar `pending`, kopplar UID/e-post från verifierad identitet och ignorerar
   inskickade status-, ägar-, granskar- och anteckningsfält. Max tre väntande förslag
   per UID. Ett stabilt slump-ID för formuläret gör återförsök idempotenta medan
   samma formulär är öppet. Vid osäkert svar efter omladdning: kontakta redaktionen
   med visad referens innan nytt förslag lämnas. Referensen är inte en åtkomstnyckel.
5. Endast global CMS-admin kan granska/redigera, spara utkast, avslå eller publicera.
   Publicering kräver uttrycklig granskningsbekräftelse vid varje sådant sparande.
   Servern behåller säljarens identitet och försäkran. Senaste granskare/tid och
   intern anteckning sparas privat; separat full revisionshistorik införs inte.
6. Affärsstatus: tillgänglig, dialog pågår eller såld. Sålda annonser kan ligga kvar
   som historik, men tar inte emot nya intresseförfrågningar. Utkast/avslagna/
   väntande poster visas inte i publikt API, inte bara i frontend.
7. Säljaren kan inte direkt ändra eller radera publicerad annons; rättelse och
   borttagningsbegäran skickas till redaktionen med referens. I denna första version
   finns ingen egen säljaröversikt eller automatiskt godkännande av ägaranspråk.

## Intresseförfrågan

- Verifierad, ej blockerad användare kan lämna namn och meddelande för en publicerad,
  ej såld annons. E-post/UID kommer från serververifierad identitet, inte formuläret.
- Förfrågan sparas i **CMS → Formulär & Intro**, med ämnet `Köp & sälj: <rubrik>`
  och annons-ID som referens. Den går inte till företagsinkorg, annan medlem eller
  säljarens e-post automatiskt. UI säger att den är sparad i CMS, inte mejllevererad.
- Privat meddelandetext, kontaktuppgifter och interna anteckningar tas aldrig med
  i publika annonsfält. Säljardata exponeras enbart för CMS-admin. Admin behöver
  hantera vidare kontakt och eventuell informationsdelning på ett korrekt sätt.
- Förfråge-ID gör återförsök idempotenta; UID/annons måste matcha. Max tio nya
  intresseförfrågningar per UID och UTC-dygn. Detta är inte ett komplett bottförsvar.
- Redan sparat underlag raderas inte automatiskt. Ändamål, rättslig grund,
  behörighet och lagringstid för privata sälj-/köpförfrågningar behöver inkluderas
  i sajtens kommande integritetsinformation. Ingen ny mail- eller analysleverantör.

## Lagring, gränser och verifiering

Nya valfria snapshotfält: `startGuide`, `saleListings`. Gamla snapshots får nya
guidekapitel vid uppgradering om fältet saknas helt; en befintlig tom guide
återskapas aldrig. Inga säljannonser seedas. Backup/export bevarar innehållet,
import validerar guide och annonsregister. Nya data skrivs först vid användarens
bekräftade åtgärd; merge skriver inte produktionsdata.

Max 25 kapitel, 80 säljposter och befintlig 900 KB snapshotgräns (skrivvakt 890 KB).
Fullt register ger fel **utan att kasta bort äldre poster**. Den nya intressevägen
vägrar full kontaktinkorg i stället för att trunkera. Vid tillväxt behövs separata
Firestore-samlingar och beslutad arkivering innan gränserna höjs.

Tester använder isolerade snapshots, verifierings-/adminfakes och riktig API-routing.
De täcker privata fält, överpostning, utkast, publiceringskontroll, källvalidering,
lagringsåterläsning, stabila återförsök, slutsålda/avpublicerade annonser, blockerad/
overifierad användare och att befintliga företag/Paketindex bevaras. Browser-
verifiering och inloggad CMS-verifiering redovisas i PR:n, inte som bevisade av build.

Inte inkluderat: betalning, escrow, värdering, juridisk överlåtelse, kundregister-
överlåtelse, verifierad äganderätt, dokumentrum, medlemsnotiser eller automatisk
mejlförmedling. Råa IP-adresser, heatmaps och ny statistikinsamling förblir avstängda.
