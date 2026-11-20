# Paketindex: mottaget källunderlag och utkast till import

Fem bifogade textrapporter har identifierats: K4 2023/helår 2023,
K4 2024/helår 2024, K4 2025/helår 2025, K2 2026 och K3 2026.
Avsändare enligt rapporttexterna: Transportföretagen i samarbete med HUI.
Original-PDF:er, exakta publiceringsdatum och bekräftade original-URL:er är inte
bifogade. Dessa får inte hittas på. Bilagornas SHA-256 identifierar exakt underlag.

## Vad som har strukturerats

- `paketindex-kvartal.csv`: 73 observationer av e-handelspaket per kvartal.
- `paketindex-ar.csv`: 19 års-/hittills-i-år-observationer av e-handelspaket.
- Varje rad har både mätperiod och rapportversion. Inga rapportversioner slås ihop.
- Kvartalsvärdena är avlästa ur diagram i **tusen paket**, alltså avrundade värden.
  Årstalen är rapportens angivna heltal i **paket**. Summera inte avrundade
  kvartalsvärden och skriv över exakta årsvärden. YTD är inte ett helår.
- Allt har status `utkast`. Detta är ett gransknings-/importunderlag i repositoryt,
  inte en genomförd CMS-import, ett nytt offentligt arkiv eller en datamigrering.

## Historik skiljer sig mellan rapportversioner

Exempel på e-handelspaket helår 2025:

| Rapportversion | Angivet antal paket |
| --- | ---: |
| K4 2025 | 228 002 461 |
| K2 2026 | 256 183 415 |
| K3 2026 | 255 731 509 |

Även 2023 och 2024 har olika historiska värden i senare rapporter.
Det går inte att enbart från de bifogade texterna avgöra orsaken till alla
skillnader. Påstå därför inte att det säkert är en viss metodändring eller revision.

Det framtida CMS-arkivet måste behålla både period och rapportutgåva och erbjuda
ett uttryckligt val av jämförelseserie. Använd i första hand en sammanhängande
serie inom samma utgåva. Räkna inte tillväxt mellan perioder från olika utgåvor
utan att underlaget först stämts av. Ingen befintlig CMS-siffra ersätts av CSV:erna.

## Segment och metod måste hållas isär

- E-handelspaket definieras som paketbrev/paket upp till 20 kg till privatpersoner
  i Sverige; inrikes och utland utgör ursprungsdelar av totalen.
- Större varuförsändelser över 20–100 kg är ett separat segment i äldre rapporter.
  Blanda inte total inklusive dessa med e-handelspaket upp till 20 kg.
- Second hand får inte adderas ovanpå totalen som om det vore en fristående
  extra total. Returer och export redovisas separat, inte som svenska mottagna B2C-paket.
- K2 och K3 2026 redovisar leveranssätt via konsumentundersökning för juni respektive
  september, med 898 respektive 829 respondenter. Det är inte samma sak som en
  transportörrapporterad kvartalsandel eller andel av varje skickat paket.
- K2 2026: undersökningens huvudgrupper 40 % utlämningsställe inklusive Click & Collect,
  37 % hemleverans och 23 % paketskåp. K3 2026: 41 %, 33 % och 26 %.
- Instabox/Budbee uppskattades till och med mars 2025; därefter rapporterar de enligt
  2026-texterna. Historiken anges inte ha reviderats för just dessa volymer.
  Best Transport ingår inte efter juni 2025, ICA Paket inte efter december 2025.

## Nästa steg före publicering

1. Bekräfta original-PDF:er eller rapportlänkar och rätt att återanvända uppgifterna.
2. Redaktör stämmer av CSV mot originalens tabeller/diagram och dokumenterar
   skillnader mellan utgåvor. Inkludera övriga segment med samma källprecision.
3. Använd det nu implementerade periodarkivet i CMS för förhandsgranskning och
   uttrycklig import som utkast. CSV:erna laddas inte in vid merge/start.
   Version, period, mått och metod utgör nyckel; ingen historik blandas automatiskt.
4. Publicera först efter granskning. Framtida rapporter ska kunna importeras som
   nya utgåvor utan att äldre utgåvor raderas.

Inga löneunderlag ingår i bilagorna. Lönespann kan inte härledas ur Paketindex.
