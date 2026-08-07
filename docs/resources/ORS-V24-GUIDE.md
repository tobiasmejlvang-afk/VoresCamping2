# Openrouteservice v24 i Vores Camping

## Hvad referencepakken indeholder

Den uploadede ZIP er ikke et færdigt JavaScript-bibliotek. Den indeholder:

- svarprøver fra Directions, Snap, Isochrones, Matrix, POI, Elevation, Geocoding og Optimization
- GPX- og GeoJSON-eksempler for flere transportprofiler
- Python-filer fra OpenPOIService til kategorier, databaseimport og OSM-parsing
- `categories.yml` med POI-grupper og kategori-id'er

De browserrelevante dele er derfor omsat til en ny JavaScript-klient i `docs/ors.js`.

## Nye funktioner i appen

- ni transportprofiler til bil, autocamper/tungt køretøj, cykling, gang, vandring og kørestol
- ruter som GeoJSON, JSON, GPX og enkel GET
- intelligente rutevalg: anbefalet, hurtigste og korteste
- mulighed for at undgå færger, betalingsveje og motorveje
- snap af kortpunkter til vejnettet som JSON eller GeoJSON
- tids- og afstandsisokroner
- distance- og tidsmatrix
- POI-søgning med campingegnede kategorier
- højdepunkt via GET og POST samt højdeprofil for linjer
- flåde-/stopoptimering
- rutedetaljer som overflade, stejhed, vejtype, gennemsnitshastighed og advarsler

## API-nøgle

1. Åbn **Indstillinger → Ruteplanlægning**.
2. Indsæt din Openrouteservice API-nøgle.
3. Behold normalt base-URL'en `https://api.openrouteservice.org`.
4. Tryk **Gem**.
5. Test først adressesøgning og derefter ruteberegning.

API-nøglen gemmes kun i browserens lokale lager på den enhed, hvor den indtastes.

## POI-kategorier

Appens faste presets bruger blandt andet:

- campingplads `103`
- autocamper-/caravanplads `104`
- drikkevand `166` og `565`
- toilet `179`
- apotek `208`
- hundepark `268`
- picnicbord `281`
- strand `332`
- cykelbutik `429`
- supermarked `518`
- restaurant `570`
- cykelparkering, udlejning og reparation `583–585`
- brændstof `596`
- parkering `601–603`
- attraktion, picnicsted og udsigtspunkt `622`, `625`, `627`

Den komplette kategorioversigt ligger i `ors-v24-poi-categories.json`.


## Nyt i 24.1

Se `ORS-V24.1-GUIDE.md` for det store kortværksted.
