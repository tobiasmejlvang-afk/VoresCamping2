# Changelog – Vores Camping v26 FINAL

## Openrouteservice og kort

- Migreret til de serviceopdelte `api.heigit.org`-adresser for Routing, Pelias, POI, Elevation og VROOM.
- Maks. 50 rutepunkter håndhæves før ORS-kald.
- POI-søgning begrænses til maks. 2 km.
- Store campinglister håndteres med automatisk Matrix-batching.
- `avoid_features` filtreres efter transportprofil.
- Ekstra rutedata vælges efter transportprofil.
- Gennemsnitshastighed beregnes robust ud fra samlet distance/tid og segmentdata.
- Stigning/fald suppleres via Elevation Service, når Directions ikke allerede leverer brugbare højdedata.
- Seks-punkts ORS-systemtest indbygget i appen.
- Ferie-Vagtens POI-søgning bruger nu samme sikre punkt/radius-model som kortværkstedet.

## Stort kortværksted

- Kortfilter nulstilles korrekt ved genåbning.
- Flytning, Snap, profilskift, rutevalg og undgå-valg nulstiller forældet rutestatistik.
- Nærmeste campingpladser analyserer hele den gemte liste i batches frem for kun de første 20.
- Nyt **“+ Valgt sted”** gør søgte steder, aktuelle placeringer og valgte kortpunkter nemme at føje direkte til en rute.
- Klik på POI-resultater og nærmeste campingpladser gør nu stedet til aktivt analyse-/rutepunkt.
- Profilspecifikke checkbokse deaktiveres automatisk, når de ikke giver mening.

## Ruteværksted

- Automatisk stop bruger nu koordinaterne fra det korrekte mellempunkt.
- Rutepunkter kan trækkes direkte på kortet.
- Flyttede mellempunkter opdaterer tilhørende stop.
- **Fortryd sidste punkt** tilføjet.
- **Undgå trapper** tilføjet for relevante cykel-, gang- og kørestolsprofiler.
- Gamle distance-/tidsdata kan ikke længere blive gemt efter en uberegnet ruteændring.

## Brugerflade og sidste polering

- Ingen login eller Supabase i denne release.
- “Kompakt layout” virker nu reelt og kan skiftes til et mere luftigt layout.
- Stemningsbilledets valg **øverst / nederst / skjult** virker nu på forsiden.
- Ur-indstillinger kan styre dato, vejr og brug af aktuel placering.
- Lokal lagerstatus er tilføjet under System.
- Bedre keyboard focus, touchmål, disabled-tilstande og `prefers-reduced-motion`.
- Cache-versioner og PWA-manifest opdateret til v26.

## Test

- 77/77 automatiske release-checks bestået.
- ORS-unit-test: PASS.
- Kort/runtime-integration: PASS.
- CRUD- og knap-integration: PASS.
