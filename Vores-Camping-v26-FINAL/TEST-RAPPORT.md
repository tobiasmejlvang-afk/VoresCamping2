# Testrapport – Vores Camping v26 FINAL

Denne rapport gælder den endelige v26-pakke uden brugerlogin.

## Resultat

**77/77 automatiske valideringer bestået.**

Der er ikke fundet nogen blokerende JavaScript-, routing-, kort-, navigations- eller filreferencefejl i release-pakken.

## Statisk kontrol

- `app.js`, `maps.js` og `ors.js`: JavaScript-syntaks valideret med Node.
- `manifest.webmanifest`: gyldig JSON.
- Alle lokale filer, ikoner og billedreferencer fra appen findes.
- `docs/.nojekyll`, `404.html`, `_config.yml` og `status.html` er med.
- Ingen Supabase/login-kode indlæses i denne version.
- Ingen eksekverbar kode bruger det udfasede `api.openrouteservice.org`.
- 52 knapper med faste ID'er er kontrolleret for tilknyttede handlers; dynamiske navigations- og listeknapper håndteres via appens centrale eller lokale event-handlers.

## Referencepakken `openrouteservice(6).zip`

- 124 filer gennemgået.
- 99 JSON/GeoJSON-filer parser korrekt.
- 8 GPX-filer valideret.
- 10 kendte `null`-referencefiler identificeret og ikke brugt som svarskema.
- Ingen korrupte JSON/GeoJSON/GPX-referencefiler fundet.
- Alle POI-kategori- og gruppe-ID'er, som appens presets bruger, findes i referencepakkens `categories.yml`.
- Directions, Snap, Matrix, Isochrones, Geocoding, POI, Elevation og Optimization er sammenholdt med appens klientkode.

## ORS-unit-tests

Mock-baseret klienttest kontrollerer blandt andet:

- Pelias-, Routing-, POI-, Elevation- og VROOM-adresser.
- Profilsikre `avoid_features`.
- POI-radius på maks. 2 km.
- Matrix-batching over 24 destinationer pr. kald.
- Ruteopsummering og gennemsnitshastighed.
- Elevation-fallback til stigning/fald.
- Afvisning af mere end 50 rutepunkter før API-kald.

**Resultat: PASS.**

## Runtime- og korttest

Appen er kørt i isoleret Chromium med simuleret MapLibre og simulerede svar fra de eksterne tjenester. Testen gennemgår blandt andet:

- Alle 24 indstillingsundersider.
- ORS' seks-punkts diagnostik.
- Stort kortværksted.
- Søg sted → vælg sted → tilføj som rutepunkt.
- Direkte rutepunkter på kortet.
- Flytbare rutepunkter.
- Beregn rute, Snap, POI, Isochrone, Reverse Geocoding og Elevation.
- Markering af rutedata som forældet efter ændringer.
- Ruteeditorens automatiske stopkoordinater.
- Fortryd sidste rutepunkt.
- Stigning/fald via elevation-fallback.
- Gemning af ruter.
- Ferie-Vagtens lokale POI-søgning.
- Kompakt/luftigt layout.
- Dato/vejr-indstillinger.
- Stemningsbillede øverst/nederst/skjult.
- Lokal lagerstatus.

**Resultat: PASS.**

## CRUD- og knaptest

En ekstra browsertest gennemgår:

- Alle 8 hovedmenu-knapper.
- Hurtighandlinger.
- Opret, redigér og slet campingplads.
- Besøgt/ønskeliste.
- Søgning og sortering.
- Nominatim-reservesøgning uden ORS-nøgle.
- Personer og cykler.
- Bedømmelseskategorier.
- Menu-rækkefølge og layoutindstillinger.
- Billedupload til Ferie Album.
- Backup-knappen og slettebekræftelse.

**Resultat: PASS.**

## Eksterne live-tjenester

De automatiske tests bruger simulerede netværkssvar, så ingen privat API-nøgle er nødvendig under bygningen. Rigtige Openrouteservice-kald kan testes fra appens **Indstillinger → Ruteplanlægning → Kør komplet ORS-test**, efter API-nøglen er indsat.

MapLibre/OpenFreeMap, Open-Meteo, geolocation og Nominatim-reserven kræver internetforbindelse på den enhed, hvor appen bruges.

## Lokal lagring

Denne første version kører bevidst uden login/cloud-sync. Appen har derfor fået en lagerkontrol under **Indstillinger → System**, og backup kan eksporteres manuelt. Billeder komprimeres før lagring, men store feriealbum kan stadig bruge mærkbar browserplads.
