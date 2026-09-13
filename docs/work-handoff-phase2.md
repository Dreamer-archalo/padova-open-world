# Phase 2 — handoff ChatGPT / Work

Questo file serve a coordinare modifiche concorrenti sul branch `feat/modern-padova-phase-2` senza duplicare blocchi già completati. Non autorizza il merge della PR #6.

## Stato sintetico

| Blocco | Stato | Note |
|---|---|---|
| Streaming predittivo / worker / F3 | FATTO | Core prima dei dettagli, prefetch e pressione dinamica già presenti. |
| Guardrail / svincoli / aperture tangenziale | FATTO | Accessi verificati, aperture centrali e collisioni già trattati. |
| Rampe / salti / fisica in aria | FATTO | Rampe periferiche e dinamica airborne presenti. |
| Traffico multicorsia / accelerazione progressiva | FATTO | Corsie, cambi corsia, frenata/accelerazione e curve già presenti. |
| Taxi abusivo | FATTO | Taxi fisico, autista, destinazioni, caricamento, curiosità, spawn vicino, layout e blocco UI/runtime con fondi insufficienti collegati al gioco. |
| Portello | FATTO | Porta passabile ad arco, ponte, parapetti, argini, scalinate, spalle delle mura veneziane, studenti, bici/scooter, bar e wayfinding universitario. |
| Bici / monopattini per zone | PARZIALE | Sistema dinamico presente soprattutto a Portello; manca distribuzione coerente nel resto della città. |
| NPC / città viva | PARZIALE | Pedoni con intenti, gruppi e distretti esistono; mancano ancora reazioni più ricche, cani e lavoratori aeroportuali dedicati. |
| Smart spawn | PARZIALE | Spawn già filtrato per strada/densità/distanza; manca un blocco finale dedicato e testato. |
| Minimap | PARZIALE | Minimap esistente e funzionante; nessun grande redesign Phase 2 ancora dedicato. |
| Indicatore zona | FATTO | Banner transitorio collegato a distretto/località esistenti; Portello mostra esplicitamente `QUARTIERE UNIVERSITARIO`. |
| Audio | PARZIALE | Motore/audio base esistente; manca un blocco ambientale completo. |
| Danno visivo veicoli | MANCANTE | Danno numerico esiste, deformazione/segni visivi no. |
| Camere veicolo | PARZIALE | Più modalità camera esistono; manca rifinitura dedicata Phase 2. |
| Interni selezionati | MANCANTE | Nessun blocco dedicato. |
| Missioni brevi/random | PARZIALE | Delivery/race/escape/Portavalori esistono; manca generazione/randomizzazione nuova. |
| TRASPORTO STUPEFACENTI (€3,50) | MANCANTE | Da mantenere astratto/ironico, senza dettagli operativi realistici. |
| Posti di blocco polizia | MANCANTE | Nessun blocco dedicato. |
| Eventi urbani random | PARZIALE | Sistema incidenti già presente; manca pacchetto eventi cittadini dedicato. |
| Nuova villa SW / Treves pubblico | MANCANTE | HOME è ancora l'area villa di Parco Treves; richiesta di ripristinare Treves pubblico e spostare la grande proprietà non ancora chiusa. |
| Sicurezza / mercenari | MANCANTE | Nessun blocco dedicato. |
| Polizia | PARZIALE | Wanted, pattuglie e carri armati esistono; richieste extra non ancora chiuse come blocco. |
| Aeroporto vivo | PARZIALE | Aeroporto strutturato già esiste; mancano lavoratori/attività ambientali dedicati. |
| Area militare / UFO | PARZIALE | Easter egg e mezzi militari esistono; nessun nuovo blocco Phase 2 completo. |
| Barche | MANCANTE | Nessun sistema dedicato. |
| Vegetazione | PARZIALE | Vegetazione e streaming esistono; manca rifinitura/variazione dedicata. |
| Mura veneziane | PARZIALE | Portello è collegato visivamente alle mura; manca un trattamento più ampio del circuito cittadino. |
| Chiese | PARZIALE | Basilica del Santo, Duomo e Santa Giustina già esistono; manca passata finale dedicata. |
| Piazza dei Signori | PARZIALE | Torre dell'Orologio e piazza esistono; manca rifinitura dedicata. |
| Palazzo Ragione / Erbe-Frutta | PARZIALE | Palazzo della Ragione e fontana Erbe già modellati; manca passata finale piazze/mercati. |
| Università / Riviera | PARZIALE | Portello universitario ora è forte; manca estensione alle altre aree universitarie/Riviera. |
| Collina + scritta PADOVA | MANCANTE | Nessun blocco dedicato. |
| Gara tangenziale dedicata | MANCANTE | Mancano conferma, snapshot stato, turbo x3, premi e ripristino esatto. |
| Militari rari fuori aeroporto | MANCANTE | Nessun blocco dedicato. |
| Preservazione sistemi esistenti | IN CORSO | Non rompere Wanted5, carri, Portavalori1000, Cinquecento Turbo, aerei, paracadute, aeroporto, tram, acqua, respawn, fullscreen, Performance/Hyper, personaggi e salvataggi. |
| Audit finale strade/terreno | IN CORSO | Audit intermedi esistono; quello finale va fatto solo dopo gli ultimi blocchi. |
| Test globali finali | IN CORSO | Suite parziali presenti; rieseguire tutto a chiusura Phase 2. |

## Regole di coordinamento

- Prima di ogni modifica rileggere l'HEAD del branch: Work e ChatGPT possono avanzare in parallelo.
- Preferire micro-blocchi indipendenti e committabili.
- Non rifare Portello: il rebuild è già sul branch.
- Non creare un nuovo Site.
- Non mergiare la PR #6 senza richiesta esplicita dell'utente.
- Esclusi da questa PR: Padova 1500/Galileo, missili/razzi, spazio/Luna e multiplayer.

## Modifiche aggiunte da ChatGPT dopo l'audit

- `taxi-affordability.js`: impedisce la conferma di una corsa quando il saldo è inferiore alla tariffa e mostra il saldo richiesto/disponibile.
- `zone-indicator.js`: mostra un banner breve quando cambia distretto/località; Portello viene identificato come quartiere universitario.
- `phase2-ui.css`: stile isolato per i due sistemi sopra, senza modificare la logica principale del controller.

## Prossimi blocchi a basso conflitto

1. Estendere micromobilità e vita studentesca per zona senza aumentare troppo il budget attori.
2. Rifinire progressivamente mura veneziane e identità urbana senza duplicare i landmark già esistenti.
3. Valutare un pacchetto separato per lavoratori aeroportuali e reazioni NPC, mantenendo i budget di performance.
4. Lasciare a un blocco strutturale dedicato villa SW/Treves, missioni, barche e gara tangenziale perché toccano più sistemi contemporaneamente.
