# R31 — Popolazione e traffico

Base: main 76fb1f37, comprendente R30 e le due gare. Implementazione verificata localmente e in Chromium. Invio su GitHub e pubblicazione della preview in attesa di autorizzazione esplicita richiesta dalla revisione automatica. URL previsto della preview:
https://dreamer-archalo.github.io/padova-open-world/preview/npc-traffic-r31/

I pedoni arrivano gradualmente (massimo 1,5 nuovi attori/s), con limiti distinti per centro, università, quartieri, industria e campagna. Il pool non viene ricreato dopo un timer mentre gli attori sono visibili. Ogni spawn e passo viene confrontato con carreggiate, acqua, edifici, rotonde e svincoli alla corretta quota. I passaggi su strade carrabili usano gli attraversamenti segnalati del direttore urbano, con attesa del rosso per le auto e controllo del traffico in arrivo; una volta iniziato il passaggio il pedone continua fino al marciapiede.

Le corsie sono numerate dalla destra di marcia verso sinistra. Il traffico tiene la propria metà delle strade a doppio senso, usa le corsie disponibili sulle carreggiate autostradali, prepara le svolte e supera/rientra quando c'è spazio. I veicoli parcheggiati hanno slot separati e non vengono piazzati sulla mezzeria. I motociclisti condividono le svolte del capogruppo, rallentano per ricompattarsi e si ricollocano insieme quando un percorso è bloccato.

Nuovi mezzi, disponibili anche nel menu V: Brenta Fuel (cisterna), Salto (camion rampa), Saetta 1000 (supersport), Argine 450 (enduro), Prato 800 (naked), Laguna 1200 (touring). Restano trail, cruiser, scooter e moto standard. I modelli conservano la propria forma anche nella qualità Iper Performance.

- B tenuto premuto in moto: impennata; rilascio, frenata, sterzata forte o salto abbassano la ruota. B continua ad aprire il menu barche quando non si guida una moto.
- E in volo: uscita in caduta libera, senza apertura automatica.
- 0, anche sul tastierino: apertura manuale del paracadute, sopra 4 m. 0 dall'aeromobile consente anche espulsione con apertura immediata. Il pulsante touch usa la stessa funzione.
- Colpire la cisterna con velocità relativa di almeno 2 m/s: esplosione singola e danni ai mezzi vicini entro 16 m.
- Avvicinarsi al camion rampa da dietro e nella sua direzione: salita e salto fisico, anche quando si muove. L'urto laterale resta una collisione.

Verifica: `npm run test:npc-traffic`, `npm run test:multilane`, `npm run test:urban-life`, test R17/R14, danni, salti, entrambe le gare, taxi, continuità e conservazione delle funzioni. Chromium usa i veri tasti B/E/F/0, verifica modelli, quota renderizzata del camion rampa, popolazione periferia/centro e collisione fisica con la cisterna; risultati e screenshot nell'artifact npc-traffic-r31-tests.

Ricontrollo del 6 ottobre 2026: corretta la convenzione delle corsie confrontandola con la sterzata fisica D/destra in quattro orientamenti; preparazione delle svolte solo con corsia libera, prosecuzione diritta senza passaggio forzato a sinistra, parcheggio destro calcolato dalla mezzeria e respawn regionale già nella corsia. La cisterna regionale danneggia anche il veicolo che la colpisce. I pedoni mantengono lo stesso marciapiede quando cambia l'ordine dei vertici OSM; un raccordo non sicuro annulla l'intera transizione e fa tornare il pedone lungo il tratto precedente, senza teletrasporto. I segmenti regionali conservano i divieti di accesso e i tag delle rotonde; quota fisica e modello dei pedoni coincidono. Un attraversamento già iniziato viene completato anche in presenza di allarmi o scadenze delle attività. Corretto anche l'ascoltatore E delle scale della villa quando il gioco non è ancora inizializzato.

La suite comprende `tools/verify-npc-traffic-r31-review.mjs` e un campionamento del traffico sulla mappa reale. Il browser prova inoltre E prima dell'inizializzazione, abbassamento della ruota al rilascio di B e apertura con Numpad0. Eseguita anche la suite generale `npm test`; gli esiti sono nei report R31. La prova Chromium finale non presenta errori JavaScript. Questi controlli verificano gli scenari automatizzati, non costituiscono un benchmark FPS su dispositivi reali.

Il sistema resta una simulazione locale con pool e budget per qualità: non simula tutta la popolazione della mappa contemporaneamente. Gli attraversamenti segnalati con semaforo sono gestiti a Padova; i pedoni regionali seguono i percorsi sicuri senza attraversamenti stradali arbitrari. La preview conserva integralmente la precedente pubblicazione e aggiunge solo la directory R31.
