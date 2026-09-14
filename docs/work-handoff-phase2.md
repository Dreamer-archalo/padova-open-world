# Phase 2 — handoff ChatGPT / Work

Questo file coordina modifiche concorrenti sul branch `feat/modern-padova-phase-2` senza duplicare blocchi completati. Non autorizza il merge della PR #6.

## Stato sintetico

| Blocco | Stato | Note |
|---|---|---|
| Streaming predittivo / worker / F3 | FATTO | Core prima dei dettagli, prefetch e pressione dinamica presenti. |
| Guardrail / svincoli / aperture tangenziale | FATTO | Accessi verificati, aperture centrali e collisioni trattati. |
| Rampe / salti / fisica in aria | FATTO | Rampe periferiche e dinamica airborne presenti. |
| Traffico multicorsia / accelerazione progressiva | FATTO | Corsie, cambi corsia, frenata/accelerazione e curve presenti. |
| Taxi abusivo | FATTO | Taxi fisico, autista, caricamento, curiosità, spawn vicino, blocco fondi e prefetch robusto. Lista ora ridotta alle 10 destinazioni richieste; `SCEGLI TU` è la prima opzione e la mappa ha zoom/pan interno 1×–4×. |
| Portello | FATTO | Porta passabile ad arco, ponte, parapetti, argini, scalinate, mura, studenti, micromobilità, bar e identità universitaria. |
| Motorini / micromobilità | PARZIALE | NPC scooter/moto ora hanno profili `group`, `wheelie`, `zigzag` e normale, con controlli di corsia/sicurezza; resta da estendere ulteriormente la distribuzione per quartiere. |
| NPC / città viva | PARZIALE | Reazioni e profili sociali migliorati; gruppi, seduti, musicisti, skater e cani al guinzaglio presenti. Mancano lavoratori aeroportuali dedicati. |
| Inseguimenti autonomi | FATTO | Eventi occasionali sospetto + Polizia indipendenti dal giocatore, uno alla volta, limitati nel tempo e annullati se il giocatore entra in Wanted/missione. |
| Smart spawn | FATTO | Spawn traffico e pedoni pesa campo visivo, direzione e velocità: evita il fronte ad alta velocità e preferisce lati/retro; missioni/polizia/militari mantengono filtri dedicati. |
| Minimap | FATTO | Rifinita per contrasto/leggibilità senza aumento sostanziale del rendering. |
| Indicatore zona | FATTO | Banner transitorio per distretto/località. |
| Audio | FATTO | Motore + ambience procedurale per distretto legata al toggle Sound. |
| Danno visivo veicoli | FATTO | Tre livelli leggeri: vetro incrinato, pannello/cofano e fumo; lieve perdita di prestazioni sotto il 35%, dettagli esclusi in Iper Performance. |
| Camere veicolo | FATTO | Free-look/recentraggio/retromarcia rifiniti. |
| Velocità automatica / cruise | FATTO | `K` e pulsante HUD memorizzano la velocità corrente; regolazione `−5/+5 km/h`; da quasi fermi chiede prima di raggiungere la velocità desiderata; W/S/SPACE tornano manuali. |
| Interni selezionati | MANCANTE | Nessun blocco dedicato. |
| Missioni brevi/random | PARZIALE | Delivery/race/escape/Portavalori esistono; manca generazione/randomizzazione nuova. |
| TRASPORTO STUPEFACENTI (€3,50) | MANCANTE | Da mantenere astratto/ironico, senza dettagli operativi realistici. |
| Posti di blocco polizia | FATTO | Dinamici a 3–4 stelle; controlli normali passabili lentamente a zero stelle. |
| Progressione Wanted | FATTO | Salita stelle cadenzata. |
| Wanted 5 / sopravvivenza | FATTO | Grazia iniziale, carri ritardati, colpi non one-shot, elicotteri Polizia orbitanti. |
| Eventi urbani random | PARZIALE | Incidenti, controlli e inseguimenti autonomi presenti; resta spazio per eventi civili. |
| Nuova villa SW / Treves pubblico | MANCANTE | HOME ancora da spostare e Treves da restituire a parco pubblico. |
| Sicurezza / mercenari | MANCANTE | Nessun blocco dedicato. |
| Polizia | FATTO | Wanted, pattuglie, controlli, posti di blocco, pacing, elicotteri e carri graduali. |
| Aeroporto vivo | PARZIALE | Distretto e mezzi coerenti; mancano lavoratori animati dedicati. |
| Area militare / UFO | PARZIALE | Easter egg e mezzi esistenti; nessun nuovo blocco completo. |
| Barche | MANCANTE | Nessun sistema dedicato. |
| Vegetazione | PARZIALE | Streaming presente; manca passata dedicata. |
| Mura veneziane | PARZIALE | Portello e Porta Savonarola migliorati; manca circuito più esteso. |
| Chiese | FATTO | Layer dedicato per Santo, Santa Giustina, Duomo e numerose parrocchie di centro/primissima periferia. |
| Centro storico | FATTO | Piazza dei Signori completa, Pedrocchi, Palazzo Moroni/Municipio, Palazzo Bo, portici selettivi attraversabili e accenti Erbe/Frutta/Duomo. |
| Stadio Euganeo | FATTO | Campo, pista, tribune, illuminazione e 18 calciatori leggeri in istancing; animazione solo entro 950 m. Destinazione Taxi esposta come `Stadio`. |
| Palazzo Ragione / Erbe-Frutta | FATTO | Palazzo/fontana e mercati stilizzati presenti. |
| Università / Riviera | PARZIALE | Palazzo Bo e Portello sono dedicati; Riviera può essere ancora ampliata. |
| Collina + scritta PADOVA | FATTO | Collina arcade periferica con culling. |
| Gara tangenziale dedicata | MANCANTE | Mancano conferma, snapshot stato, turbo x3, premi e ripristino esatto. |
| Militari rari fuori aeroporto | MANCANTE | Nessun blocco dedicato. |
| Preservazione sistemi esistenti | IN CORSO | Non rompere Wanted5, carri, Portavalori1000, Turbo, aerei, paracadute, aeroporto, tram, acqua, respawn, fullscreen, qualità, personaggi e salvataggi. |
| Audit finale strade/terreno | IN CORSO | Da chiudere dopo gli ultimi blocchi strutturali. |
| Test / budget prestazioni | IN CORSO | Presenti test Phase2, chiese, centro storico e budget centro storico. `test:street-life` aggiunge syntax/regressioni per Taxi, cruise, motorini, inseguimenti e stadio, poi richiama anche il budget storico. Va eseguita suite completa + prova WebGL reale prima del merge. |

## Regole di coordinamento
- Prima di ogni modifica rileggere HEAD: Work e ChatGPT possono avanzare in parallelo.
- Preferire micro-blocchi indipendenti e committabili.
- Non creare un nuovo Site.
- Non mergiare PR #6 senza richiesta esplicita.
- Esclusi: Padova 1500/Galileo, missili/razzi, spazio/Luna, multiplayer.

## Ultimi file/blocchi aggiunti da ChatGPT
- `taxi-service.js`: shortlist Taxi richiesta.
- `taxi-map-ui.js`: `SCEGLI TU` primo + zoom/pan interno mappa.
- `cruise-control.js`: memorizzazione velocità corrente con K e ±5.
- `traffic.js`: scooter `group` / `wheelie` / `zigzag` con lane-clearance.
- `ambient-pursuits.js`: inseguimenti Polizia non legati al player, uno alla volta.
- `stadium.js`: Stadio Euganeo leggero con calciatori instanziati e culling.
- `city-details.js`: wiring stadio.
- `verify-street-life.mjs`: regressioni statiche e guardrail di carico per questo blocco.
- `urban-life.js`: profili sociali, cani al guinzaglio e spawn fuori visuale.
- `vehicle-damage.js`: livelli visivi condivisi e degrado prestazionale critico.

## Blocchi strutturali ancora aperti
1. Nuova villa SW e restituzione di Parco Treves a parco pubblico.
2. Gara tangenziale dedicata con snapshot/ripristino e turbo x3.
3. Barche e navigazione.
4. Interni selezionati.
5. Missioni brevi/random incluso `TRASPORTO STUPEFACENTI` €3,50 puramente arcade/ironico.
6. Sicurezza/mercenari.
7. Lavoratori aeroporto animati e ulteriore micromobilità per zone.
8. Militari rari fuori aeroporto.
9. Audit finale globale e suite completa prima del merge.
