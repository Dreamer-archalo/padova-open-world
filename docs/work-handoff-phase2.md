# Phase 2 — handoff ChatGPT / Work

Questo file serve a coordinare modifiche concorrenti sul branch `feat/modern-padova-phase-2` senza duplicare blocchi già completati. Non autorizza il merge della PR #6.

## Stato sintetico

| Blocco | Stato | Note |
|---|---|---|
| Streaming predittivo / worker / F3 | FATTO | Core prima dei dettagli, prefetch e pressione dinamica già presenti. |
| Guardrail / svincoli / aperture tangenziale | FATTO | Accessi verificati, aperture centrali e collisioni già trattati. |
| Rampe / salti / fisica in aria | FATTO | Rampe periferiche e dinamica airborne presenti. |
| Traffico multicorsia / accelerazione progressiva | FATTO | Corsie, cambi corsia, frenata/accelerazione e curve già presenti. |
| Taxi abusivo | FATTO | Taxi fisico, autista, destinazioni, caricamento, curiosità, spawn vicino, layout e blocco fondi insufficienti. `CityStream.coreReady()` mantiene inoltre vivo il prefetch finché la destinazione non è pronta. |
| Portello | FATTO | Porta passabile ad arco, ponte, parapetti, argini, scalinate, spalle delle mura veneziane, studenti, bici/scooter, bar e wayfinding universitario. |
| Bici / monopattini per zone | PARZIALE | Sistema dinamico forte a Portello; traffico per distretto usa già scooter, ma manca una distribuzione micromobilità dedicata in più quartieri. |
| NPC / città viva | PARZIALE | Reazioni a veicoli veloci, inseguimenti con ricercato alto e profilo `avoid` migliorati. Mancano cani e lavoratori aeroportuali animati dedicati. |
| Smart spawn | PARZIALE | Spawn missioni/polizia/militari evita meglio punti dietro al giocatore; distretto aeroporto separato con traffico/people budget coerenti. Manca audit globale di ogni categoria di spawn. |
| Minimap | FATTO | Minimap esistente mantenuta e rifinita per contrasto/leggibilità senza aumentare il costo di rendering. |
| Indicatore zona | FATTO | Banner transitorio collegato a distretto/località; Portello mostra `QUARTIERE UNIVERSITARIO`, aeroporto ora ha profilo distretto dedicato. |
| Audio | FATTO | Audio motore esistente + ambience procedurale leggera per distretto, collegata al toggle Sound e senza asset esterni. |
| Danno visivo veicoli | PARZIALE | Danno numerico esistente + feedback visivo HUD/vignetta in base alla salute; deformazione della mesh non ancora implementata. |
| Camere veicolo | FATTO | Recentraggio dinamico in base a velocità/retromarcia, mantenimento più lungo del free-look e feedback della modalità camera. |
| Velocità automatica / cruise | FATTO | `K` attiva/disattiva il mantenimento automatico; se quasi fermi parte da 70 km/h, altrimenti blocca la velocità corrente arrotondata. Pulsanti `−10/+10` nel HUD. W/S/SPACE tornano subito alla guida manuale. |
| Interni selezionati | MANCANTE | Nessun blocco dedicato. |
| Missioni brevi/random | PARZIALE | Delivery/race/escape/Portavalori esistono; manca generazione/randomizzazione nuova. |
| TRASPORTO STUPEFACENTI (€3,50) | MANCANTE | Da mantenere astratto/ironico, senza dettagli operativi realistici. |
| Posti di blocco polizia | FATTO | A 3–4 stelle compaiono posti di blocco dinamici; a 4 stelle la frequenza aumenta. A zero stelle possono comparire controlli stradali passabili lentamente senza fermarsi. |
| Progressione Wanted | FATTO | Salita delle stelle cadenzata: non può saltare più livelli nello stesso momento. Le richieste successive vengono accettate solo dopo una breve finestra crescente. La missione Escape mantiene l'avvio dedicato. |
| Wanted 5 / sopravvivenza | FATTO | 8 s di grazia all'ingresso nelle 5 stelle, un solo carro iniziale e secondo carro ritardato, colpi non più one-shot e breve cooldown tra impatti. Uno/due elicotteri di Polizia orbitano senza sparare. |
| Eventi urbani random | PARZIALE | Incidenti + posti di blocco presenti; manca un pacchetto più ampio di eventi civili casuali. |
| Nuova villa SW / Treves pubblico | MANCANTE | HOME è ancora l'area villa di Parco Treves; richiesta di ripristinare Treves pubblico e spostare la grande proprietà non ancora chiusa. |
| Sicurezza / mercenari | MANCANTE | Nessun blocco dedicato. |
| Polizia | FATTO | Wanted, pattuglie, controlli stradali, posti di blocco, pacing delle stelle, elicotteri alle 5 stelle e carri armati con ingresso più graduale. |
| Aeroporto vivo | PARZIALE | Aeroporto strutturato + distretto dedicato con traffico/people/veicoli di servizio più coerenti; mancano lavoratori aeroportuali animati dedicati. |
| Area militare / UFO | PARZIALE | Easter egg e mezzi militari esistono; nessun nuovo blocco Phase 2 completo. |
| Barche | MANCANTE | Nessun sistema dedicato. |
| Vegetazione | PARZIALE | Vegetazione e streaming esistono; manca rifinitura/variazione dedicata. |
| Mura veneziane | PARZIALE | Portello più spalle visuali dedicate anche a Porta Savonarola; manca ancora un circuito cittadino più esteso. |
| Chiese | PARZIALE | Basilica del Santo, Duomo e Santa Giustina già esistono; manca eventuale passata finale. |
| Piazza dei Signori | FATTO | Torre dell'Orologio già presente; aggiunti ritmo di lampioni e arredo leggero della piazza. |
| Palazzo Ragione / Erbe-Frutta | FATTO | Palazzo/fontana esistenti; aggiunte isole mercato stilizzate Erbe/Frutta per rendere le piazze meno vuote. |
| Università / Riviera | PARZIALE | Portello universitario è forte; manca estensione dedicata a Riviera/Bo oltre alla città esistente. |
| Collina + scritta PADOVA | FATTO | Aggiunta collina arcade periferica con grande scritta PADOVA e culling per distanza. |
| Gara tangenziale dedicata | MANCANTE | Mancano conferma, snapshot stato, turbo x3, premi e ripristino esatto. |
| Militari rari fuori aeroporto | MANCANTE | Nessun blocco dedicato. |
| Preservazione sistemi esistenti | IN CORSO | Non rompere Wanted5, carri, Portavalori1000, Cinquecento Turbo, aerei, paracadute, aeroporto, tram, acqua, respawn, fullscreen, Performance/Hyper, personaggi e salvataggi. |
| Audit finale strade/terreno | IN CORSO | Audit intermedi esistono; quello finale va fatto solo dopo gli ultimi blocchi strutturali. |
| Test globali finali | IN CORSO | Suite parziali presenti; `npm run test:phase2-polish` ora include anche syntax check di `modern-gameplay.js` e `cruise-control.js` e verifica wiring Wanted/cruise. Rieseguire tutto a chiusura Phase 2. |

## Regole di coordinamento

- Prima di ogni modifica rileggere l'HEAD del branch: Work e ChatGPT possono avanzare in parallelo.
- Preferire micro-blocchi indipendenti e committabili.
- Non rifare Portello: il rebuild è già sul branch.
- Non creare un nuovo Site.
- Non mergiare la PR #6 senza richiesta esplicita dell'utente.
- Esclusi da questa PR: Padova 1500/Galileo, missili/razzi, spazio/Luna e multiplayer.

## Modifiche aggiunte da ChatGPT dopo l'audit

- `taxi-affordability.js`: impedisce una corsa senza saldo sufficiente.
- `zone-indicator.js`: banner ingresso zona.
- `modern-gameplay.js`: smart spawn direzionale, controlli stradali normali, posti di blocco 3–4 stelle, pacing Wanted, grazia 5 stelle, danno carri ridotto e elicotteri di Polizia orbitanti.
- `modern-driving.js`: reazioni pedoni più vive a traffico e inseguimenti.
- `camera-rig.js`: rifinitura free-look/recentraggio/retromarcia.
- `cruise-control.js`: modalità velocità automatica con target regolabile e ritorno immediato alla guida manuale.
- `ambient-audio.js`: ambience procedurale per distretto legata al toggle Sound.
- `phase2-runtime.js` + `phase2-ui.css`: feedback camera, danno, rifinitura minimap e UI cruise.
- `districts.js`: distretto aeroporto dedicato.
- `city-details.js`: Piazza dei Signori, mercati Erbe/Frutta, spalle di Porta Savonarola e collina PADOVA.
- `verify-phase2-polish.mjs`: verifica statica del wiring dei nuovi sistemi.

## Blocchi che richiedono ancora lavoro strutturale

1. Nuova villa SW e restituzione di Parco Treves a parco pubblico.
2. Gara tangenziale dedicata con snapshot/ripristino esatto dello stato e turbo x3.
3. Barche e navigazione sull'acqua.
4. Interni selezionati.
5. Missioni brevi/random, incluso `TRASPORTO STUPEFACENTI` da €3,50 in forma puramente arcade/ironica.
6. Sicurezza/mercenari.
7. Lavoratori aeroporto animati, cani/NPC speciali e micromobilità multi-zona.
8. Militari rari fuori aeroporto.
9. Deformazione/segni di danno direttamente sulle mesh dei veicoli.
10. Audit finale globale e suite completa prima del merge.
