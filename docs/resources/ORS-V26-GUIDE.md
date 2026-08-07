# Openrouteservice 26 – Vores Camping

Vores Camping v26 bruger HeiGITs nye API-struktur og er klar til udfasningen af `api.openrouteservice.org`.

## API-nøgle

Indsæt din egen nøgle i **Indstillinger → Ruteplanlægning**. Nøglen gemmes kun lokalt i browseren sammen med appens øvrige lokale indstillinger.

## Tjenester

- Routing, Matrix, Snap og Isochrones: `api.heigit.org/openrouteservice/v2/...`
- Geocoding / Pelias: `api.heigit.org/pelias/v1/...`
- POI: `api.heigit.org/openpoiservice/v0/pois`
- Elevation: `api.heigit.org/openelevationservice/v0/...`
- Optimization / VROOM: `api.heigit.org/vroom/v0`

## Beskyttelse i appen

- Højst 50 rutepunkter pr. rute.
- POI-søgning begrænses automatisk til højst 2 km radius.
- Store lister over campingpladser opdeles automatisk i Matrix-batches.
- Undgå-valg filtreres efter transportprofil, så cykelprofiler ikke sender bilspecifikke `tollways/highways`.
- Ekstra rutedata vælges efter profil for at undgå unødvendige ORS-advarsler.
- Ruteoversigten markeres som forældet, så snart et rutepunkt eller en profil ændres.
- Højdeprofil bruges som reserve til beregning af samlet stigning/fald, når Directions-svaret ikke allerede indeholder tallene.

## Indbygget kontrol

Under **Indstillinger → Ruteplanlægning → Kør komplet ORS-test** testes:

1. Adresse/geocoding
2. Ruteberegning
3. Reverse geocoding
4. Højdedata
5. POI
6. Matrix

## Referencepakke

`openrouteservice-reference-v26.zip` er den komplette referencepakke, der blev gennemgået ved opbygningen af v26. Den indeholder eksempelsvar for Directions, GPX, Snap, Matrix, Isochrones, Geocoding, POI, Elevation og Optimization.
