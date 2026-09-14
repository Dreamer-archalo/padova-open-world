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

## Blocco 2 — accessi e guardrail

- Interruzioni calcolate sull'intero segmento del guardrail, comprese immissioni quasi parallele, estremità e raccordi altimetrici.
- Aperture da 12 metri allineate sulle carreggiate parallele: 51, distanziate di almeno 850 metri sulla rete completa.
- Profilo visivo dei guardrail raccordato alla pendenza. 13.564 elementi rispetto ai 19.505 precedenti.
- Audit indipendente: 260.024 campioni sui bordi, zero campioni di accessi bloccati. Risultati in `motorway-access-results.json`.
- Il reset della telecamera azzera anche la rotazione continua del personaggio dopo respawn/teletrasporto. Sagoma dello scooter riportata entro il suo ingombro di collisione.
- Aggiornati i test ereditati per i budget della Fase 1 e per il completamento differito dei dettagli grafici.

Test del blocco 2: `npm test`, `test:city-life`, `test:guardrails` e `git diff --check`: PASS. Pubblicato sul Site esistente come versione 6.

## Blocco 3 — rampe, salto e sterzo veloce

- Quattro rampe arcade distribuite sulle tangenziali e autostrade periferiche, selezionate automaticamente solo con avvicinamento e atterraggio liberi.
- Il guardrail viene interrotto soltanto in corrispondenza della rampa; gli svincoli e le aperture centrali del blocco precedente restano indipendenti.
- Stato fisico airborne per le auto: inerzia orizzontale, gravità, assetto in volo, controllo ridotto, collisioni spazzolate e atterraggio sul terreno effettivo.
- I mezzi non vengono più incollati alla strada quando lasciano una rampa o un dislivello ad alta velocità.
- Sterzo progressivamente più morbido con la velocità, ma ancora efficace con Cinquecento Turbo; moto e scooter mantengono maggiore agilità.
- Teletrasporto, recupero, respawn ed entrata nel veicolo azzerano qualsiasi inerzia di salto residua.

Test del blocco 3: `test:jumps`, `test:guardrails`, `test:airport`, `npm test` e `git diff --check`: PASS. Quattro lanci e quattro atterraggi verificati sulla mappa reale; risultati in `vehicle-jump-results.json`.

## Blocco 4 — traffico multicorsia e dinamica NPC

- Una, due o tre corsie per senso in base a larghezza e senso unico della strada; posizione laterale reale, non una sola fila centrale.
- Cambi corsia con controllo dello spazio anteriore e posteriore: sorpasso, rientro, corsia meno congestionata e preparazione alla svolta/svincolo.
- Solo una parte delle auto libera la corsia quando il giocatore arriva molto più velocemente da dietro.
- Accelerazione e frenata progressive con inerzia longitudinale; sportive, compatte e camion raggiungono la velocità con tempi differenti.
- Rallentamento proporzionale alla curva e nuova accelerazione in uscita; velocità stradali e risposta differenziate per categoria.
- Rimosso il filtro distrettuale che spegneva una seconda volta le auto: Iper Performance conserva 24 veicoli e Performance 36, affidandosi a LOD e frequenza AI.

Test del blocco 4: `test:multilane`, `test:city-life`, `test:airport`, `npm test` e `git diff --check`: PASS. Risultati in `multilane-results.json`.

## Blocco 5 — Taxi abusivo e caricamento pixel-art

- Il vecchio teletrasporto diretto è rimosso dalla mappa: i luoghi impostano un indicatore, mentre **CHIAMA TAXI ABUSIVO** fa arrivare fisicamente il mezzo sulla rete stradale.
- Taxi giallo originale, tassista visibile con occhiali da sole e interazione **E · PARLA**.
- Dieci destinazioni compatte, prezzo proporzionale alla distanza e tetto assoluto di €100; il denaro viene sottratto solo dopo la conferma.
- **SCEGLI TU** permette di indicare un punto direttamente sulla mappa e confermare il prezzo calcolato.
- Schermata nera con inseguimento 2D pixel-art animato su otto fotogrammi. Le curiosità su Padova avanzano con clic/tap.
- Il loading ha funzione reale: il focus dello streaming passa alla destinazione, con prefetch compatto di 260 metri e trasferimento soltanto quando il nucleo immediatamente visibile di terreno, acqua, strade, ponti e collisioni risulta pronto. Il dettaglio secondario si completa dopo il fade-in.
- Durante il caricamento vengono sospesi traffico, pedoni e sistemi ambientali secondari.

Test del blocco 5: `test:taxi`, `test:streaming`, `test:multilane`, `test:jumps`, `test:city-life`, `test:airport`, `npm test` e `git diff --check`: PASS. Risultati in `taxi-results.json`.

## Blocco 6 — Portello e micromobilità

- Porta Ognissanti sostituita da una struttura leggera con vera apertura fisica: il passaggio centrale non usa più la vecchia collisione rettangolare piena.
- Ponte del Portello con parapetti continui fuori dalla carreggiata e centro del ponte verificato percorribile.
- Gradinate leggibili su entrambe le rive, appoggiate alla rete pedonale esistente senza aggiungere collisioni trasversali.
- Arredi universitari, panchine, cartelloni e sei biciclette/monopattini parcheggiati.
- Micromobilità NPC su percorsi pedonali e ciclabili del Portello: bici urbana, bici con cestino e monopattino elettrico, con accelerazione morbida e arresto davanti agli ostacoli.
- Budget scalabile: 2 attori in Iper Performance, 4 in Performance, 6 in Balanced e 8 in Detailed; simulazione sospesa sotto pressione di streaming.
- Correzione emersa durante la prova: il taxi non precarica più un intero settore. Il nucleo richiesto è stato ridotto e la destinazione riceve priorità esclusiva durante il nero.

Test del blocco 6: `test:portello`, `test:taxi`, `test:streaming`, sintassi e `git diff --check`: PASS. Risultati in `portello-results.json`, `taxi-results.json` e `streaming-results.json`.

## Blocco 7 — vita urbana e spawn intelligente

- Spawn di pedoni e veicoli pesato su distanza, direzione della telecamera e velocità del giocatore: fortemente ridotto nel cono frontale vicino, favorito dietro e lateralmente.
- Profili universitari dedicati al Portello: studenti in cammino, in attesa, seduti, in gruppi, skater e musicisti.
- Sei sedute reali associate agli arredi del Portello, su punti asciutti e liberi da collisioni.
- Profili cittadini più vari: passeggiatori, conversazioni, attese, attraversamenti e lavoratori.
- Cani semplici con proprietario, guinzaglio leggibile e animazione leggera; assenti dal proxy di Iper Performance.
- Pose sedute e attività animate solo nel livello di dettaglio vicino; nessun nuovo loop costoso per gli attori lontani.

Test del blocco 7: `test:urban-life`, `test:city-life`, `npm test`, sintassi e `git diff --check`. Risultati in `urban-life-results.json`.

I primi sei blocchi sono pubblicati progressivamente sul Site esistente. Il blocco 7 è pronto per la pubblicazione. Nessun merge della PR #6.

## Blocchi ancora in lavorazione

- [x] Audit completo guardrail/accessi e aperture centrali.
- [x] Rampe, salto dei veicoli e sterzo ad alta velocità.
- [x] Multicorsia, cambi corsia, accelerazione NPC, sorpassi e sterzo ad alta velocità.
- [x] Taxi fisico, tassista, scelta destinazione su mappa, conferma/prezzo e loading pixel-art con attesa del nucleo.
- [x] Portello: porta e ponte percorribili, gradinate e micromobilità leggera.
- [x] Portello: gruppi di studenti e attività occasionali leggere.
- [x] Distribuzione/socialità NPC, cani e spawn fuori visuale.
- [ ] Lavoratori aeroportuali e reazioni NPC avanzate a incidenti/polizia.
- [ ] Minimap, ingresso nei quartieri, audio, danni visivi e telecamere per mezzo.
- [ ] Nuova proprietà Mandria/Armistizio, garage/hangar, ripristino Treves e migrazione HOME/respawn.
- [ ] Sicurezza privata, mercenari, pattuglie e ricerca della polizia con contatto visivo; militari rari.
- [ ] Aeroporto vivo, velivoli autonomi, piccola area militare e UFO fisico pilotabile.
- [ ] Barche veloci/turistiche con rive e ponti.
- [ ] Missioni dinamiche, carico illegale astratto da €3,50, checkpoint, eventi urbani e gara tangenziale con ripristino completo.
- [ ] Vegetazione varia, mura, basiliche, Signori, Ragione/Erbe/Frutta, Riviera/Università e collina PADOVA.
- [ ] Audit finale globale strade/terreno e regressioni di tutti i sistemi esistenti.

Esclusi da questa PR: Padova 1500/Galileo, missile, razzo, spazio, Luna e multiplayer online.
