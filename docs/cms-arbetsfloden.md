# Grupperad CMS-meny och redaktionella arbetsflöden

## Levererat i kod

### Kortare vänstermeny

Alla 17 tidigare CMS-sektioner bevaras, plus nya arbetsflödespanelen. Menyn har
fem utfällbara grupper, normalt bara aktiv grupp öppen, och meny-sökning:

- **Företag & upptäckt**: Sök & Lägg till, E-handlare, Tech & Partners, 3PL & 4PL.
- **Innehåll & marknad**: Sidtexter & Kontakt, Nyheter, Blogg & Insikter,
  Paketindex & Marknad, Historia.
- **Affärer & möjligheter**: Startguide & Köp/sälj, Event & Mässor, Jobb.
- **Medlemmar & ärenden**: Medlemmar & Community, Formulär & Intro,
  Annons, Data & Inkorg (äldre samlad sektion bevaras).
- **Drift & säkerhet**: Historik, papperskorg & ärenden, Firebase: Bilder & Statistik,
  Översikt & Backup.

Menygrupper ändrar inga behörigheter och raderar/flyttar inte lagrade poster.

### Historik, återställning och konfliktvarning

Infört för **köp-/säljannonser, startguidekapitel och Blogg & Insikter**, inklusive
bildändringar på annonser/insikter. Detta är inte full versionshantering av alla
äldre katalog-/nyhets-/event-/jobb-/inställningsformulär.

Varje ändring av befintlig post sparar föregående version privat med handling,
aktör, tid och mål-ID. Nuvarande revision följer posten. Servern kräver matchande
revisionsnummer för sparning, bildändring, papperskorg och återställning. En gammal
flik ger HTTP 409, inte last-write-wins. Kopiera texten, ladda om, jämför och gör
om ändringen med aktuell revision. Ingen automatisk innehållssammanslagning görs.
Gamla poster har revision 0 tills första ändringen. Backup/export tar med historik.

Panelen **Historik, papperskorg & ärenden** visar föregående versioner och låter
admin återställa. Den nuvarande posten sparas då som en ny historikversion;
återställd post får nytt revisionsnummer och blir alltid **utkast utan schema**.
Annonsens aktuella kontakt-/skapandeidentitet behålls, inte en gammal identitet.

Versionshistoriken ligger i samma snapshot med gränsen **120 versioner totalt**
och befintlig 900 KB bytegräns (skrivvakt 890 KB). När den är full stoppas nya
versionsskapande ändringar med fel; inga gamla versioner kastas bort. Detta är en
startlösning, inte obegränsad historik. Innan hög volym: separata Firestore-
samlingar, verifierad export/återläsning och beslutad arkivering. Det finns ingen
ny automatisk gallring eller dold rensknapp i denna leverans.

### Schemalagd synlighet och slutdatum

Samma tre innehållstyper har valfri **publicera tidigast** och **avpublicera vid**.
Status måste vara Publicerad. Tider matas in i browserns lokala tidszon och sparas
som UTC. Sluttiden måste ligga efter starttiden när båda finns. Tom start betyder
omedelbar synlighet; tom slut betyder tills vidare.

Serverns publika API filtrerar poster efter status, schema och papperskorg på
varje läsning. Framtida/utgångna poster går inte heller att skicka annonsintresse
till. Detta är **inte ett cronjobb som ändrar poststatus eller skickar utskick**.
En redan öppen vy behöver laddas om för att återspegla passerad tidsgräns. Ny
publicering sker inte genom att schema läggs på ett utkast.

### Papperskorg utan dataradering

Annonser, guidekapitel och insikter kan flyttas till papperskorg och återställas.
Det finns ingen permanent radering i dessa nya flöden. Bloggens tidigare
raderingsknapp är nu mjuk borttagning. Innehåll, historik och bildreferenser
bevaras och döljs server-side. Återställning kräver ny granskning före publicering.
Övriga äldre innehållstypers raderingsflöden har inte byggts om i denna PR.

### Annonsbilder, sökning, duplicering och förhandsvisning

Köp/sälj kan ha upp till fem PNG/JPEG/WebP-bilder via befintlig Firebase Storage.
Serverns befintliga format-/storleks-/pixelkontroll och EXIF/GPS-rensning återanvänds.
Alt-text krävs. Bilder visas responsivt i den publika annonsen och admin kan
ändra ordning/bortkoppla. Endast befintliga referenser får väljas vid omordning;
nya bildadresser kan inte postas via det formuläret. Bildändringar är versions-
och konfliktskyddade. Innehållssparning skriver inte över samtidigt uppladdade bilder.

**Lagringen aktiveras inte av denna PR.** Kontrollen kräver redan fungerande
CMS_FIREBASE_MEDIA_ENABLED och bucket/IAM enligt tidigare Firebase-checklista.
Uppladdade länkar är publika även när posten är utkast. Bortkoppling raderar inte
filen eftersom historik/backup/andra poster kan använda den. Vid konflikt efter
uppladdning kan oanvänd fil finnas kvar; inget automatiskt omförsök/radering görs.
Fysiskt filarkiv, filbackup/återläsning och säker städning återstår separat.

CMS-annonskön har sökning/statusfilter och duplicering som öppnar ett nytt
förifyllt formulär: ny referens, privata kontakter/uppdragsbekräftelser/granskning
fylls i på nytt och utkast är standard. Textförhandsvisning finns för guide och
annonsredigering; bloggkortens befintliga preview kvarstår. Detta är inte komplett
SEO-/serverrenderad sidpreview eller egna artikeladresser.

### Tilldelning och uppföljning av köp-/säljärenden

Nya panelen listar befintliga affärsförfrågningar från privata CMS-inkorgen.
Admin kan tilldela registrerad, ej blockerad personalprofil, sätta Ny/Pågår/
Inväntar svar/Avslutad, uppföljningsdatum och privat anteckning. Försenad uppföljning
markeras. Även dessa sparningar är revisionsskyddade. Denna uppföljningsstatus
är separat från den äldre kontaktinkorgens hanteringsstatus och senaste ändring
sparas; full ärenderevisionshistorik ingår inte.

**Tilldelning är inte åtkomstdelegering.** Endast CMS-admin kan läsa/ändra denna
panel; en tilldelad person utan admin får ingen ny rättighet. Ingen automatisk
mejl-/medlemsnotis, vidarebefordran eller exponerad personuppgift skapas. Historik,
ärendeanteckningar och privata kontakter ingår aldrig i publik CMS-projektion.

## Driftarbete som fortfarande är blockerat/kräver beslut

- **Firebase-betalning/bucket/IAM och provideraktivering:** inte ändrade här.
  Kräver behörig konfiguration i Firebase/Google Cloud och tidigare kostnadsbeslut.
- **Obligatorisk 2FA:** inte aktiverad och komplett registrerings-/login-/
  återställningsflöde är inte infört. Kräver Identity Platform/providerbeslut,
  säker utrullning och återställningsmetod så att nuvarande admin inte låses ute.
- **Verklig backup/återställning:** CMS JSON-export/import finns och valideras,
  men verklig filbackup och återläsning från Storage måste testas separat med
  isolerad bucket och beslut om lagringstid. Inga produktionsfiler raderas.
- **Juridisk information:** ansvarig organisation, ändamål, lagringstider och
  godkänd integritetsinformation saknas fortfarande. Ingen ny spårning startas.
- **Inloggade browserflöden:** kräver isolerat Firebase Auth-projekt/testkonton,
  admin och testdata. README innehåller ingen testidentitet eller auth-bypass.

Senare tidigare diskuterade etapper (egna artikel-/företagsadresser, SEO,
gemensam sökning, notifieringar, konto-MFA och full historik för alla äldre
CMS-entiteter) är inte påstått färdiga av denna PR. Detta dokument avgränsar de
fem konkreta redaktionella förbättringarna och menygrupperingen.
