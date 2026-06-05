# physioplus-project

Frontend React/Vite di Humotion / PhysioPlus.

## Stack attivo

- React 18 + TypeScript
- Vite
- Tailwind CSS
- Firebase Web SDK
- React Three Fiber / Three.js

## Percorsi principali

- `src/`: codice applicativo attivo
- `public/`: asset statici e runtime config pubblica
- `scripts/write-runtime-config.ps1`: scrittura runtime config per staging/production

## Deploy

- `deploy_frontend_staging.bat`: build + runtime config + deploy Hosting su staging
- `deploy_frontend_prod.bat`: build + runtime config + deploy Hosting su production

## Note repository

- `dist/` e i file temporanei locali non fanno parte del sorgente applicativo.
- I backup locali come `*.bak` e i dump temporanei sono esclusi dal repository.
- Il frontend usa come path canonico i client API in `src/services/api.ts`; i moduli Firestore diretti legacy per patients/visits non sono piu il percorso standard.
