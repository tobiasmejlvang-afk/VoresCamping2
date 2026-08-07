# Vores Camping v26 FINAL

Den afsluttende v26-release af den personlige campingdagbog til GitHub Pages. Appen er statisk og publiceres direkte fra `main`-branchens `/docs`-mappe uden npm-build og uden et separat projekt-workflow.

## Det vigtigste

- Stort MapLibre-kortværksted med søgning, campingpladser, ønskesteder, geolocation, ruter, POI, rækkeviddekort, matrix og højdedata.
- Openrouteservice-klient til de nye `api.heigit.org`-services.
- Bil, HGV/autocamper, fire cykelprofiler, gang, vandring og kørestol.
- Flytbare rutepunkter, Snap, GPX, stop, billeder, flere cykler og elcykelrækkevidde.
- Ferie-Vagt og Ferie Album.
- Indbygget ORS-systemtest.
- Lokal backup og lagerkontrol.
- Ingen brugerlogin/cloud-sync i denne første release.

## GitHub Pages

1. Brug indholdet fra release-pakkens `docs/` som repositoryets `/docs`.
2. Sørg for at `docs/.nojekyll` er med.
3. GitHub Pages skal pege på `main` → `/docs`.
4. Åbn `status.html` efter publicering og derefter appens forside.

Ved opgradering fra den tidligere v25 bør den gamle `docs/supabase-sync.js` slettes for at holde repositoryet rent. Den bruges ikke af v26.

## Openrouteservice

Indsæt API-nøglen under **Indstillinger → Ruteplanlægning**. Nøglen ligger kun lokalt i browseren og er ikke indbygget i repositoryet.

Efter nøglen er gemt, kør **Kør komplet ORS-test**. Den tester adresse, rute, reverse geocoding, højde, POI og matrix.

Se også:

- `docs/resources/ORS-V26-GUIDE.md`
- `CHANGELOG-v26.md`
- `TEST-RAPPORT.md`
