# Widgets etapp 3 – marknadsytan

Senare gemensamt layoutsystem för alla publika sidor: se `alla-sidor-widgets.md`.
Detta dokument beskriver den tidigare startsidesetappen.

## Leverans

CMS → Innehåll & marknad → Startsida – widgets får tre tillåtna widgettyper:

1. **Karta, regioner & gränshandel**: befintlig karta och dess intilliggande
   import-/exportpanel hålls tillsammans som en sammanhängande sektion.
2. **Branschdiagram & marknadstrend**: befintliga flikar för branscher,
   marknadstrend och snabbväxande e-handlare.
3. **Konsumentinsikter & demografi**: befintliga generations-, betal- och leveransval.

Totalt tolv widgets i fem fasta ytor. De tre nya sektionerna kan visas/döljas
eller ordnas **sinsemellan**, på samma marknadsyta mellan de övre kontakt-/
annonsmodulerna och order-/fraktekonomin. Ingen flytt mellan ytor, fri kod,
privat widget eller godtyckligt innehåll.

## Bevarande

Sektionernas JSX, event handlers och diagramdefinitioner har lyfts oförändrade
in i befintlig HomeWidgetZone. En lokal källjämförelse mot föregående commit
kontrollerar att blocken är identiska bortsett från omgivande widgetnycklar.
Alla hooks, beräkningar och data i MarknadView ligger kvar. Recharts/React-
beroenden ändras inte. Kartpolygoner, orter, färger och datamodell ändras inte.

React-nycklarna är stabila widget-ID:n och renderaren lägger inte till DOM-wrappers.
Samma ordning och synlighet som tidigare är standard. Att byta ordning flyttar
befintliga sektioner; att dölja är inte dataradering eller avpublicering av
underliggande uppgifter. Andra sidor/API kan fortsatt visa publicerade data.
Lokal komponentstate kan återställas vid avmontering eller när portalen lämnas;
widgetlayouten är inte en funktion för att spara besökarens kart-/flikval.

Marginalkalkylator, frakt-/orderekonomi, täckningsdata, juridiksektioner, äldre
Paketindexsammanfattning och övriga sidsektioner lämnas som tidigare. Kartans
länk till densitetssektionen leder fortfarande till den icke-widgetstyrda
sektionen längre ned. Detta är ännu inte hela portalen som widgets.

## Layoutversioner och lagring

homeWidgets v1 (fyra moduler) och v2 (nio) är fortsatt giltiga för databas/backup.
Renderuppgradering till v3 behåller gamla dolda/synliga val och ordningen inom
alla tidigare ytor. Nya marknadssektioner visas i tidigare fasta ordning.
Gamla inställningar muteras inte vid rendering. Först en bekräftad admin-sparning
skriver v3 och ökar revisionen; stale revision ger 409. Ingen automatisk skrivning
till produktionsdatabas sker när PR:n mergas.

Validering kräver exakt kända ID:n för respektive version, unika ordningstal och
boolesk synlighet. Okänd/felaktig runtime-layout ger standardrendering. Felaktiga
lagrade snapshots/importer avvisas fortsatt, inte tyst omkonvertering. Allt ingår
i befintlig backup/export och samma snapshotstorleksgräns. Det gör inte verklig
filbackup eller produktionsåterställning automatiskt verifierad.

## Kontroller

Lokalt: typkontroll, check:cms, check:startup, produktionsbygge, diff-check.
Regressionskontroller täcker v1/v2→v3, bevarade tidigare enabled-val/ordningar/
revisioner, standardordning för nya ytan, omordning, döljning, ingen mutation av
indata, adminskydd/konflikt samt bevarade region-/företags-/Paketindexdata.
Serverrenderade kontroller säkerställer att de tre sektionerna döljs när valt,
medan kalkylator och gamla jobb-/historieingångar fortfarande finns kvar.

Previewkontroll ska testa desktop/mobil, kartregion, branschflik, konsumentflik,
kalkylator, blogg och standardlayout. Faktisk inloggad layoutredigering kräver
admin och isolerad Firebase Auth/databas; README har inga testkonton eller bypass.
Ingen produktionslayout eller testinnehåll ändras för verifiering. Genomförda och
blockerade kontroller rapporteras separat i PR och chatt.

SEO-/serverrenderade artikeladresser, visuell WYSIWYG-redigerare, kvarvarande
widgets för övriga stora sektioner och tidigare drift-/MFA-/backupfrågor är inte
påstått lösta av denna etapp. Ingen spårnings- eller betalaktivering införs.
