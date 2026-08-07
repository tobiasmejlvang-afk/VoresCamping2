# Openrouteservice 24.1 – stort kortværksted

Den uploadede ZIP er en referencepakke og ikke et browserbibliotek. Den indeholder Python-kode fra OpenPOIService, POI-kategorier samt svarprøver fra Directions, Snap, Isochrones, Matrix, POI, Elevation, Geocoding og Optimization.

## Sådan bruges det store kort

1. Åbn **Kort** i hovedmenuen.
2. Søg efter et sted, brug **Min placering**, eller klik direkte på kortet.
3. Brug det valgte punkt til POI, rækkevidde, nærmeste campingpladser, adresse og højde.
4. Tryk **Tilføj punkter**, og klik start, eventuelle stop og mål på kortet.
5. Vælg transportprofil og rutevalg.
6. Tryk **Beregn rute**.
7. Tryk **Gem i ruteværksted** for at fortsætte med navn, dato, cykler, billeder og noter.

## Funktioner

- geokodning, autocomplete, struktureret og omvendt geokodning
- Directions i GeoJSON, JSON, GPX og enkel GET
- Snap i JSON og GeoJSON
- tids- og afstandsisokroner
- distance- og tidsmatrix
- POI og POI-statistik
- højdepunkt GET/POST og højdeprofil
- Optimization/VROOM-klient
- overflade, stejhed, vejtype, OSM-id, advarsler og ruteattributter
- alternative ruter og round-trip-understøttelse i klienten

## API-nøgle

Indsæt nøglen under **Indstillinger → Ruteplanlægning**. Nøglen gemmes kun i browserens lokale lager på den aktuelle enhed.

POI-søgningen begrænser radius til højst 2 km, så den følger den offentlige ORS-tjenestes normale grænse.
