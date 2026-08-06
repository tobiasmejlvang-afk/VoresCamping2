# Testrapport – Vores Camping v23

## Statiske kontroller

- `app.js`: JavaScript-syntaks godkendt.
- `maps.js`: JavaScript-syntaks godkendt.
- `ors.js`: JavaScript-syntaks godkendt.
- `manifest.webmanifest`: gyldig JSON.
- Ferie-Vagt-billeder: PNG-filer med gennemsigtig baggrund.
- Openrouteservice-referencepakke: inkluderet både i projektroden og under `/docs/resources`.
- `.nojekyll`, `_config.yml`, `404.html` og `status.html`: inkluderet.

## Runtime-test

Testet i isoleret Chromium med lokal lagerplads simuleret:

- 11 hoved-, formular- og redigeringsruter.
- Alle 24 indstillingsundersider.
- Start og afslutning af Ferie Vagten.
- Ingen registrerede JavaScript-fejl eller tomme visninger.

## Eksterne funktioner

Live vejr, geolocation, MapLibre-kort og Openrouteservice kræver internetadgang. ORS-funktioner kræver brugerens egen API-nøgle.
