# Padova moderna — Fase 2

Base verificata: `a2c202b4d331da771ded196b4c89f649c8d5c7b8`, ultimo `main` del repository **Dreamer-archalo/padova-open-world** all'avvio. La PR #5 ha già integrato la Fase 1: questo branch non la duplica.

Branch: `feat/modern-padova-phase-2`. Una nuova PR, nessun merge senza richiesta esplicita. I blocchi indipendenti, testati e stabili vengono committati e pubblicati progressivamente sul **Site esistente**. Pubblicazione e merge della PR restano operazioni distinte.

## Blocco 1 — streaming e diagnostica

- Geometria prodotta da un worker che riutilizza le quote stradali già risolte dal controller. Nessuna seconda simulazione altimetrica divergente.
- Primo livello: terreno, acqua, carreggiate, ponti, strutture e sagome degli edifici. Secondo livello: finiture stradali, facciate, tetti e vegetazione. La prima geometria resta visibile fino alla sostituzione.
- Prefetch secondo velocità, direzione, mezzo e quota; priorità alla zona corrente e alla traiettoria futura. I lavori divenuti lontani vengono annullati.
- Destinazioni precaricabili con un controllo esplicito di disponibilità del nucleo essenziale, utilizzabile dal futuro loading del taxi.
- Al massimo un gruppo di geometrie completate viene installato per frame. Mesh lontane eliminate; nessun caricamento permanente dell'intera città.
- AI ambientale meno frequente e dettagli secondari sospesi quando manca il nucleo dei settori vicini. Collisioni e controlli essenziali conservati.
- Overlay tecnico nascosto, attivabile con **F3**: FPS, chunk, code, tempi, prefetch, popolazioni e qualità.

Verifiche: `npm run test:streaming`, `npm run test:city-life`, `npm run test:airport`, `npm run test:performance`, `npm run test:fullscreen`, sintassi e diff. I risultati numerici dello streaming sono in `streaming-results.json`.

Limiti: sono misure CPU/worker del controller effettivo, non FPS GPU. L'avvio iniziale del worker e una destinazione molto densa possono superare cinque secondi. Il percorso cooperativo di compatibilità, usato quando Worker non è disponibile, può ancora avere singole operazioni lunghe. La prova grafica su un browser con WebGL non è stata eseguita in questo blocco.

## Blocchi ancora in lavorazione

- [ ] Audit completo guardrail/accessi, aperture centrali, rampe e salto dei veicoli.
- [ ] Multicorsia, cambi corsia, accelerazione NPC, sorpassi e sterzo ad alta velocità.
- [ ] Taxi fisico, tassista, scelta destinazione su mappa, conferma/prezzo e loading meme con attesa del nucleo.
- [ ] Portello: porta e ponte percorribili, gradinate, studenti, attività occasionali, bici e monopattini.
- [ ] Distribuzione/socialità NPC, cani, spawn fuori visuale e lavoratori aeroportuali.
- [ ] Minimap, ingresso nei quartieri, audio, danni visivi e telecamere per mezzo.
- [ ] Nuova proprietà Mandria/Armistizio, garage/hangar, ripristino Treves e migrazione HOME/respawn.
- [ ] Sicurezza privata, mercenari, pattuglie e ricerca della polizia con contatto visivo; militari rari.
- [ ] Aeroporto vivo, velivoli autonomi, piccola area militare e UFO fisico pilotabile.
- [ ] Barche veloci/turistiche con rive e ponti.
- [ ] Missioni dinamiche, carico illegale astratto da €3,50, checkpoint, eventi urbani e gara tangenziale con ripristino completo.
- [ ] Vegetazione varia, mura, basiliche, Signori, Ragione/Erbe/Frutta, Riviera/Università e collina PADOVA.
- [ ] Audit finale globale strade/terreno e regressioni di tutti i sistemi esistenti.

Esclusi da questa PR: Padova 1500/Galileo, missile, razzo, spazio, Luna e multiplayer online.
