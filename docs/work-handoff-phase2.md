# Phase 2 — handoff ChatGPT / Work

Questo file coordina modifiche concorrenti sul branch `feat/modern-padova-phase-2` senza duplicare blocchi completati. Non autorizza il merge della PR #6.

## Stato sintetico

| Blocco | Stato | Note |
|---|---|---|
| Streaming predittivo / worker / F3 | FATTO | Core prima dei dettagli, prefetch e pressione dinamica presenti. |
| Guardrail / svincoli / aperture tangenziale | FATTO | Accessi verificati, aperture centrali e collisioni trattati. |
| Rampe / salti / fisica in aria | FATTO | Rampe periferiche e dinamica airborne presenti. |
| Traffico multicorsia / accelerazione progressiva | FATTO | Corsie, cambi corsia, frenata/accelerazione e curve presenti. |
| Taxi abusivo | FATTO | Taxi fisico, autista, caricamento, curiosità, spawn vicino, blocco fondi e prefetch robusto. 10 destinazioni, `SCEGLI TU` primo, zoom/pan interno 1×–4×. |
| Portello | FATTO | Porta passabile ad arco, ponte, parapetti, argini, scalinate, mura, studenti, micromobilità, bar e identità universitaria. |
| Motorini / micromobilità | PARZIALE | Profili NPC `group`, `wheelie`, `zigzag` e normale; Time Attack moto separato presente. Distribuzione specifica per quartiere ancora ampliabile. |
| NPC / città viva | FATTO | Gruppi, seduti, musicisti, skater, cani, reazioni differenziate, ingressi/uscite virtuali dagli edifici e 18 micro-eventi urbani leggeri. |
| Inseguimenti autonomi | FATTO | Eventi sospetto + Polizia indipendenti dal giocatore, limitati e annullati se il player entra in Wanted/missione. |
| Smart spawn | FATTO | Spawn traffico/pedoni pesa campo visivo, direzione e velocità. |
| Minimap | FATTO | Rifinita per contrasto/leggibilità. |
| Indicatore zona | FATTO | Banner transitorio per distretto/località. |
| Ingressi quartiere / segnaletica | FATTO | Gateways leggeri per Arcella, Portello, Forcellini, Madonna Pellegrina, Sacra Famiglia, San Giuseppe, Brusegana, Guizza, Sacro Cuore. |
| Audio / clacson | FATTO | Ambience procedurale + clacson `H`; il suono rispetta il toggle Sound, mentre gli NPC reagiscono comunque. |
| Danno visivo veicoli | FATTO | Vetro/faro rotto, pannelli, paraurti piegati, cofano sollevato, ruota proxy storta, fumo e lieve perdita prestazioni a danno critico; nascosto in Iper Performance. |
| Camere veicolo | FATTO | Free-look/recentraggio/retromarcia rifiniti. |
| Velocità automatica / cruise | FATTO | `K` e HUD memorizzano la velocità corrente, `−5/+5 km/h`, ritorno immediato manuale. |
| Semafori adattivi | FATTO | La fase verde può estendersi sull'asse con più domanda/accodamento vicino all'incrocio. |
| Parcheggi NPC | FATTO | Auto parcheggiate ai margini su strade idonee, con budget per qualità e despawn lontano. |
| Viabilità intorno a ostacoli | FATTO | Bypass laterale leggero per veicoli bloccati dietro un mezzo fermo; mantiene la viabilità senza teletrasporto. |
| Tram vivo | FATTO | Passeggeri instanziati alle fermate, attesa e avvicinamento virtuale durante la sosta. |
| Ambulanza / Vigili del Fuoco | FATTO | Mezzi di emergenza rari con sirene visive, percorso autonomo e durata limitata. |
| Incidenti autonomi | FATTO | Veicolo incidentato + coni, durata/cadenza limitate e possibile arrivo mezzo di emergenza. |
| Vita nei bar | FATTO | Sei punti di aggregazione leggeri in zone ad alta probabilità di passaggio: Portello, Signori, Erbe, Prato, Università, Arcella. |
| Eventi cittadini | FATTO | 18 micro-eventi/camei: studenti, musicisti, mercatino, skater, consegne, lavori, cani, gatti e piccioni. |
| Acqua più viva | FATTO | Riflessi/linee leggere e piccole barche decorative solo a dettaglio medio/alto; riduzione marcata in Performance e zero extra in Iper Performance. |
| Ponti differenziati | FATTO (prima passata) | Ponte Molino: identità romana a cinque campate; Portello: accenti in pietra d'Istria; San Lorenzo: trattato come ponte romano interrato/marker, non come ponte moderno visibile. Rifinitura visuale browser ancora da validare. |
| Modalità VISITA CITTÀ | FATTO | Pulsante iniziale, nessun Wanted/missioni, badge dedicato; Play normale ripristina il gioco standard. |
| Fondale schermata iniziale | FATTO | Salva fino a 3 screenshot reali ridotti del gameplay e li riutilizza come slideshow sfocato ai caricamenti successivi, senza download asset aggiuntivi. |
| Tetti | FATTO | Layer pitched/hipped/gable coerente col footprint, più presente nel centro e progressivo per qualità; escluso in Iper Performance. |
| Moto Time Attack `J` | FATTO | Quattro piste, slalom, rampe, salti, checkpoint, timer e record locali per pista. |
| Auto da corsa autonome | FATTO | Fulmine/Zenit rare, una alla volta, durata e distanza limitate, velocità molto superiore al traffico ordinario. |
| Interni selezionati | MANCANTE | Nessun blocco dedicato. |
| Missioni brevi/random | PARZIALE | Delivery/race/escape/Portavalori + Time Attack moto; manca generazione random nuova. |
| TRASPORTO STUPEFACENTI (€3,50) | MANCANTE | Da mantenere astratto/ironico, senza dettagli operativi realistici. |
| Posti di blocco polizia | FATTO | Dinamici a 3–4 stelle; controlli normali passabili lentamente a zero stelle. |
| Progressione Wanted | FATTO | Salita stelle cadenzata. |
| Wanted 5 / sopravvivenza | FATTO | Grazia iniziale, carri ritardati, colpi non one-shot, elicotteri Polizia orbitanti. |
| Nuova villa SW / Treves pubblico | MANCANTE | HOME ancora da spostare e Treves da restituire a parco pubblico. |
| Sicurezza / mercenari | MANCANTE | Nessun blocco dedicato. |
| Aeroporto vivo | PARZIALE | Distretto e mezzi coerenti; mancano lavoratori animati dedicati. |
| Area militare / UFO | PARZIALE | Easter egg e mezzi esistenti; nessun nuovo blocco completo. |
| Barche guidabili | MANCANTE | Presenti solo piccole barche decorative; nessun sistema di navigazione player. |
| Vegetazione | PARZIALE | Streaming presente; manca passata dedicata. |
| Mura veneziane | PARZIALE | Portello e Porta Savonarola migliorati; manca circuito più esteso. |
| Chiese | FATTO | Santo, Santa Giustina, Duomo e numerose parrocchie centro/primissima periferia. |
| Centro storico | FATTO | Piazza dei Signori, Pedrocchi, Palazzo Moroni/Municipio, Palazzo Bo, portici attraversabili e accenti Erbe/Frutta/Duomo. |
| Stadio Euganeo | FATTO | Campo, pista, tribune, illuminazione e 18 calciatori leggeri; destinazione Taxi `Stadio`. |
| Palazzo Ragione / Erbe-Frutta | FATTO | Palazzo/fontana e mercati stilizzati presenti. |
| Università / Riviera | PARZIALE | Palazzo Bo e Portello dedicati; Riviera ampliabile. |
| Collina + scritta PADOVA | FATTO | Collina arcade periferica con culling. |
| Gara tangenziale dedicata | MANCANTE | Mancano conferma, snapshot stato, turbo x3, premi e ripristino esatto. |
| Militari rari fuori aeroporto | MANCANTE | Nessun blocco dedicato. |
| Preservazione sistemi esistenti | IN CORSO | Non rompere Wanted5, carri, Portavalori1000, Turbo, aerei, paracadute, aeroporto, tram, acqua, respawn, fullscreen, qualità, personaggi e salvataggi. |
| Audit finale strade/terreno | IN CORSO | Da chiudere dopo gli ultimi blocchi strutturali. |
| Test / budget prestazioni | IN CORSO | Aggiunti `test:phase3-runtime` e `test:phase3-city`; suite completa + prova WebGL/FPS reale obbligatorie prima del merge. |

## Regole di coordinamento
- Prima di ogni modifica rileggere HEAD: Work e ChatGPT possono avanzare in parallelo.
- Preferire micro-blocchi indipendenti e committabili.
- Non creare un nuovo Site.
- Non mergiare PR #6 senza richiesta esplicita.
- Niente meteo, ciclo giorno/notte o illuminazione monumentale dinamica in questa passata.
- Esclusi: Padova 1500/Galileo, missili/razzi, spazio/Luna, multiplayer.

## Ultimi file/blocchi aggiunti da ChatGPT
- `roof-upgrades.js`: tetti pitched/hipped/gable a costo progressivo.
- `phase3-runtime.js`: quattro Time Attack moto + record + rare auto da corsa autonome.
- `phase3-city-systems.js`: clacson, semafori adattivi, parcheggi, ingressi edifici, bar, eventi, emergenze, incidenti, bypass traffico, gateways, ponti, acqua, VISITA CITTÀ, screenshot intro.
- `phase3-tram-fix.js`: fermate vive/passeggeri instanziati e sostituzione sicura dell'update tram.
- `phase3-polish.js`: HUD clacson, reset Tour su Play normale, reazioni NPC differenziate e micro-animazioni eventi.
- `vehicle-damage.js`: danni fisici visualmente più leggibili mantenendo il budget e l'API dei test esistenti.
- `verify-phase3-runtime.mjs` / `verify-phase3-city-systems.mjs`: controlli statici/sintassi dedicati.

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
10. Audit finale globale, suite completa e test browser prima del merge.
