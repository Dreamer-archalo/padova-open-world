# Phase 2 — handoff ChatGPT / Work

Questo file coordina modifiche concorrenti sul branch `feat/modern-padova-phase-2` senza duplicare blocchi completati. Non autorizza il merge della PR #6.

## Aggiornamento prioritario — loader iniziale e terreno
- `initial-loader.js` + `initial-loader.css`: `GameLoaderManager` con `Promise.all()` sui 9 chunk dello spawn (chunk centrale + anello 3×3). Un chunk conta come pronto solo con `coreReady`, `detailReady` e root già inserita nella scena WebGL. Overlay 0–100% = chunk completi / chunk iniziali.
- `streaming.js`: hard gate iniziale con priorità assoluta per i 9 chunk; core di tutti i chunk prima dei detail, poi detail fino a completamento. Metriche `initialLoaded/initialTotal`.
- `terrain.js`: road/terrain carving con falloff `1 - smoothstep` su 9 m dal bordo carreggiata verso la heightmap naturale; guardia quote impossibili `Y < -10` / `Y > 100` / non finite con fallback alla quota base.
- `surface-layers.js`: la pelle del terreno moderno resta continua sotto l'asfalto quando non serve un taglio topologico, eliminando i buchi visibili ai bordi.
- `modern-roads.js`: i deck rialzati/bridge ricevono fasce laterali per non apparire come piani a spessore zero.
- `verify-initial-world.mjs` + `npm run test:initial-world`: regressione dedicata. Test aggiunto, non ancora dichiarato eseguito in questa chat.

## Stato sintetico
- Streaming predittivo / worker / F3: FATTO.
- Loader iniziale 3×3: FATTO, da validare visivamente nel browser.
- Guardrail / svincoli / aperture tangenziale: FATTO.
- Rampe / salti / fisica in aria: FATTO.
- Traffico multicorsia / accelerazione progressiva: FATTO.
- Taxi abusivo: FATTO.
- Portello: FATTO.
- Motorini / micromobilità: PARZIALE (profili group/wheelie/zigzag + Time Attack presenti).
- NPC / città viva: FATTO.
- Inseguimenti autonomi: FATTO.
- Smart spawn: FATTO.
- Minimap: FATTO.
- Indicatore zona: FATTO.
- Ingressi quartiere / segnaletica: FATTO.
- Audio / clacson: FATTO.
- Danno visivo veicoli: FATTO.
- Camere veicolo: FATTO.
- Cruise: FATTO.
- Semafori adattivi: FATTO.
- Parcheggi NPC: FATTO.
- Viabilità intorno a ostacoli: FATTO.
- Tram vivo: FATTO.
- Ambulanza / Vigili del Fuoco: FATTO.
- Incidenti autonomi: FATTO.
- Vita nei bar: FATTO.
- Eventi cittadini: FATTO.
- Acqua più viva: FATTO.
- Ponti differenziati: FATTO prima passata, rifinitura browser da validare.
- Modalità VISITA CITTÀ: FATTO.
- Fondale schermata iniziale: FATTO.
- Tetti: FATTO.
- Moto Time Attack `J`: FATTO.
- Auto da corsa autonome: FATTO.
- Chiese: FATTO.
- Centro storico: FATTO; porticati artificiali rimossi.
- Stadio Euganeo: FATTO.
- Palazzo Ragione / Erbe-Frutta: FATTO.
- Terrain / road carving: FATTO strutturale, da validare visivamente nel browser.
- Audit finale strade/terreno: IN CORSO.
- Test / budget prestazioni: IN CORSO.

## Blocchi strutturali ancora aperti
1. Nuova villa SW e restituzione di Parco Treves a parco pubblico.
2. Gara tangenziale dedicata con snapshot/ripristino e turbo x3.
3. Barche guidabili e navigazione.
4. Interni selezionati.
5. Missioni brevi/random incluso `TRASPORTO STUPEFACENTI` €3,50 puramente arcade/ironico.
6. Sicurezza/mercenari.
7. Lavoratori aeroporto animati e ulteriore micromobilità per zone.
8. Militari rari fuori aeroporto.
9. Estensione Riviera/mura/vegetazione.
10. Suite completa e test WebGL/FPS prima del merge.

## Regole di coordinamento
- Prima di ogni modifica rileggere HEAD: Work e ChatGPT possono avanzare in parallelo.
- Preferire micro-blocchi indipendenti e committabili.
- Non creare un nuovo Site.
- Non mergiare PR #6 senza richiesta esplicita.
- Niente meteo, ciclo giorno/notte o illuminazione monumentale dinamica in questa passata.
- Esclusi: Padova 1500/Galileo, missili/razzi, spazio/Luna, multiplayer.
