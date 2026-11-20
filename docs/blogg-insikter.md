# Blogg & Insikter

Startsidan/Marknad har nu redaktionella insiktsinlägg i stället för tre hårdkodade
kort. Detta är en **enkel blogg-/artikelmodul**: kort med ingress och en utfällbar
fulltext, inte ännu en separat SEO-blogg med egna artikel-URL:er, RSS, kommentarer,
schemaläggning eller revisionshistorik. Externa originalnyheter fortsätter hanteras
separat under CMS Nyheter, med sitt befintliga granskningsflöde.

## Redigering i CMS

Öppna **Blogg & Insikter** i CMS. Där kan en administratör:

- skapa ett nytt inlägg eller välja ett befintligt,
- redigera rubrik, kategori/etikett, ingress och fullständig artikeltext,
- ange författare, visningsdatum, käll-/vidareläsningslänk,
- välja ljus/mörk kortdesign och sorteringsordning,
- välja medföljande bild och alt-text,
- ange knapptext med antingen en intern portalflik eller extern HTTPS-länk,
- spara som utkast, publicera/avpublicera, förhandsgranska lokalt och ta bort.

Fulltext visas med **Läs hela artikeln**. Tom rad ger stycke; rader med `-`, `*`
eller `•` ger punktlista. All text escap:as av React; ingen HTML/script exekveras.
Redigerings-/förhandsvisningskontroller ligger bara i CMS, aldrig på portalen.
Utkast filtreras på servern och renderas inte publikt, även om en administratör
öppnar portalen med adminpayload.

Visningsdatum är en redaktionell uppgift, inte en schemaläggare. Publicerad-status
gör posten synlig direkt efter sparning. Källor och faktapåståenden granskas av
redaktören; URL-validering är inte en kontroll av faktainnehållet.

## Bilder

De tre befintliga bilderna finns som valbara medföljande bilder och importeras nu
som Vite-tillgångar så att produktionsbygget får riktiga versionshanterade bild-URL:er.
Man kan skapa ett inlägg utan bild eller välja någon av dessa utan ny lagring.

Egen uppladdad bild:

1. Spara inlägget, gärna som utkast.
2. Öppna CMS **Firebase: Bilder & Statistik** och välj bildtyp **Inläggsbild**.
3. Välj inlägget, fil och alt-text. Förhandsgranska och ladda upp/koppla.
4. Ladda om inlägget i Blogg & Insikter och kontrollera före publicering.

Detta återanvänder det tidigare adminskyddade bild-API:t: PNG/JPEG/WebP, max 350 kB,
format-/pixelvalidering på server, WebP-omkodning och borttagen EXIF/GPS. Uppladdad
bild prioriteras framför medföljande bild. Textredigering bevarar den aktuella
bildreferensen så att en nyare bilduppladdning från en annan admin inte tappas.

**Uppladdning förblir avstängd** tills Firebase Storage/bucket/Blaze/IAM har
konfigurerats och separat godkänts enligt `firebase-bilder-statistik.md`.
Ingen ny betaltjänst, flagga eller molnresurs aktiveras av denna PR. Länkar till
uppladdade filer är publika även för inläggsutkast: endast avsedda publika bilder.
Bortkoppling/radering av inlägg raderar inte filobjekt; säker filstädning/backup är
fortsatt ett separat driftskrav. En innehållsbackup innehåller referenser, inte bilder.

## Befintliga kort och migrering

- De tre tidigare kortens texter, bilder, länkar, teman och ordning bevaras som
  startposter vid läsning av äldre snapshot som helt saknar `insightPosts`.
- Uppgraderingen gör ingen databasskrivning i sig. Nästa vanliga CMS-transaktion
  kan spara fältet. Äldre backupimport får samma kompatibilitetsuppgradering.
- Befintliga texter innehåller påståenden som ”34 %” och framtida eventdatum.
  **De är bevarade, inte nyverifierade fakta.** Redaktören bör kontrollera källa,
  datum och formulering; CMS visar en påminnelse om detta.
- En uttryckligt tom lista förblir tom. Borttagna startposter återskapas inte vid
  läsning eller följande redigeringar. Publicerad lista kan också vara tom.
- I denna lilla CMS-version gäller max 50 inlägg, 15 000 tecken fulltext per inlägg
  och snapshotets befintliga storleksgräns. Större blogg kräver separata dokument,
  paginering och en planerad lagringsmigrering, inte obegränsad JSON-tillväxt.

## Verifiering och återstående kontroll

Isolerade API-/Firestore-adaptertester kontrollerar adminskydd, CRUD/readback,
utkastfilter, bevarad migrering, tom lista, otillåtna länkar, bildkrav, metadata/
backupvalidering och bildkoppling/bortkoppling för inlägg. Riktig bildvalidering
används, men lagringstjänsten ersätts i testerna; ingen produktionsdata ändras.

Inloggad browserredigering, faktisk bilduppladdning och publicering behöver
behörig testanvändare och isolerad databas/Storage. README dokumenterar ingen
testidentitet/auth-bypass. Ingen sådan bypass införs för att förenkla verifiering.
