# Fluidità 2026, Iper Performance e completamento villa

Aggiornamento sul repository personale `Dreamer-archalo/padova-open-world`, a partire da `main` (`07a926ad3b7f2a9372a109fe4bc1b77ffb2613f5`). Il sito pubblico e il relativo identificativo rimangono gli stessi. Nessuna nuova GitHub Action, dipendenza o ricostruzione dei dati cartografici.

## Riduzione del carico

- Quattro profili disponibili prima di **Carica la mappa** e nel menu di pausa. La prima apertura usa Performance; i salvataggi esistenti conservano la propria scelta.
- **Iper Performance**: facciate senza texture delle finestre, materiali semplici, automobili rappresentate da un unico volume, pedoni con una sola sagoma monocromatica, niente ombre, vegetazione ridotta e distanza visiva più corta. Aerei, elicotteri e carri conservano una sagoma distinguibile.
- Limiti di traffico mobile e pedoni: Iper 8/12, Performance 16/32, Balanced 30/72, Detailed 48/120. Veicoli della proprietà, missioni e inseguimenti hanno limiti indipendenti; non spariscono mentre vengono usati.
- Cambiare qualità sospende o riattiva le popolazioni già create. Non occorre ricaricare la pagina e i cambi ripetuti non continuano ad aggiungere mezzi.
- AI pedonale a 10/15/20/30 aggiornamenti al secondo, distribuita fra fotogrammi. Interpolazione visiva tra le posizioni; controlli del giocatore, collisioni e guida restano a 60 Hz. Tentativi di spawn falliti distanziati di almeno due secondi.
- Controllo continuo del volume della telecamera contro gli spigoli degli edifici, senza migliaia di campioni lungo ogni spostamento. Mantiene i controlli prima e dopo il movimento morbido della camera.
- Creazione dei settori grafici suddivisa in passaggi cooperativi con un budget indicativo di 5 ms per fotogramma. Le singole operazioni atomiche possono superarlo; non è una promessa di 60 FPS. Cache delle quote condivise fra triangoli e strisce della stessa strada.
- Monumenti statici raggruppati per zona e materiali; un disegno per elemento del tram, con modello condiviso. Collocazione e ingombri originali vengono conservati.
- Risoluzione adattiva in caso di fotogrammi lenti, fino a 0,45 volte la densità standard in Iper Performance. HUD e testo mantengono la risoluzione del browser.
- Il caricamento pesante parte solo dopo la scelta grafica. L'anteprima dei personaggi usa lo stesso renderer del gioco, evitando cinque contesti WebGL separati. I rotori dei mezzi parcheggiati restano fermi.

## Villa, avvio e schermo intero

- Credito iniziale: **Una produzione di Federico Scandolara e Ricardo Roza Rui**.
- Dopo il caricamento si apre la scelta con cinque veri modelli 3D fluttuanti. Su schermi stretti viene mostrato il personaggio selezionato; i cinque pulsanti restano disponibili.
- **Fede**: cappello da Merlino e abito da mago. **Mattia**: mimetica militare. **Marchese**: giacca e cravatta. **Milo**: pantaloni corti rossi e maglietta bianca smanicata. **Nino**: vestiti neri.
- I vecchi identificativi `scando` e `nico` vengono convertiti in `fede` e `nino`, mantenendo denaro e attività. La conferma fa iniziare davanti alla villa.
- Recinzione completa in muratura e legno, siepi, 39 alberi fissi e cancello percorribile. Il terreno interno alla recinzione è una piattaforma coerente con l'area inventata della villa; fondazioni di contenimento raggiungono il terreno vicino al canale. Acqua e quote fuori dal perimetro restano governate dal sistema esistente.
- Flotta privata: Saetta S e Fulmine R, Falco scout e Levante utility, un Bastione, una moto e una cruiser. Camion e mezzi da lavoro vengono distribuiti nella città, non nella proprietà.
- Fullscreen tramite API standard o WebKit, chiamata direttamente dal gesto del giocatore. Pulsante aggiornato anche dopo Escape, protezione dai doppi clic e dai completamenti tardivi. Se il browser o il contenitore blocca la funzione, il messaggio resta visibile nella pausa e offre il collegamento diretto al gioco.

## Varietà di mezzi senza aumentare le simulazioni inutili

Restano le 24 automobili originali del catalogo, comprese city car, berline, station wagon, SUV, luxury e sportive. Le aggiunte sono:

| Mezzo | Disponibilità |
| --- | --- |
| Cargo 16, autoarticolato | Traffico sulle arterie ampie |
| Cargo Duo, due rimorchi | Arterie ampie e industria, raro |
| Cava, ribaltabile | Traffico, più probabile in industria |
| Impasto, betoniera | Traffico, più probabile in industria |
| Recupero, carro attrezzi | Traffico urbano/industriale |
| Sentiero, moto trail | Traffico per zona |
| Notturna, moto cruiser | Traffico e villa |
| Rondone, aereo sportivo | Aeroporto |
| Albatros, bimotore | Aeroporto |
| Falco, elicottero scout | Aeroporto e villa |
| Levante, elicottero utility | Aeroporto e villa |

Tutti sono stilizzati e originali. Nessuna aggiunta nel menu Vehicles: si trovano nel mondo e si prendono con **E**. La distanza di interazione considera l'ingombro del mezzo, così aerei e camion lunghi sono accessibili dal fianco. I camion con rimorchi usano un unico corpo fisico conservativo; non viene simulata una catena di giunti o una trasmissione pesante. La betoniera e gli altri mezzi da lavoro sono rappresentazioni arcade semplificate. Non ci sono loghi o riproduzioni di marchi commerciali.

## File principali

- `dist/quality.js`, `dist/render-batch.js`: profili, modelli leggeri, risoluzione adattiva e raggruppamento statico.
- `dist/game.js`, `dist/world.js`, `dist/modern-roads.js`, `dist/movement.js`, `dist/tram.js`, `dist/building-models.js`: integrazione, streaming, cache delle quote e riduzione del lavoro di rendering/AI.
- `dist/characters.js`, `dist/gameplay-areas.js`, `dist/special-vehicles.js`, `dist/modern-vehicles.js`: personaggi, villa e cataloghi.
- `dist/terrain.js`: solo la piattaforma interna alla villa moderna; nessuna modifica ai profili verticali della rete stradale o alla modalità storica.
- `dist/fullscreen.js`, `dist/index.html`, `dist/hud.css`: fullscreen, crediti e selezione iniziale.
- `tools/controller-harness.mjs`, `verify-*.mjs`, `package.json` e rapporti in `docs/`: controlli e documentazione.

## Verifiche e limiti

I rapporti leggibili dalla macchina sono `performance-results.json`, `modern-test-results.json`, `modern-road-audit.json` e `airport-test-results.json`.

Eseguiti: `npm test`, `npm run test:modern`, `npm run test:airport`, `npm run test:performance`, `npm run test:fullscreen`.

Le prove usano il controller effettivo, Three.js e la mappa del repository: guida a 396 km/h, countdown turbo di sei secondi, caduta in acqua e recupero, camera e movimento, traffico/semafori, dieci profili pedonali, inseguimenti, ingresso/uscita dai mezzi, pista e quattro hangar, volo/paracadute, cannonate, cinque stelle, respawn e ricompensa esatta di €1.000. La scansione moderna comprende **2.194.777 campioni**, **467 attraversamenti** e **12 ponti percorsi con il controller**, senza errori di percorribilità rilevati. Lo scanner cartografico generale conserva le 10 segnalazioni di estremità in acqua e 3 di sagoma già documentate nella versione precedente; non si afferma che tutti gli errori dei dati cartografici siano risolti.

Le nuove prove coprono 24.000 campioni lungo traiettorie della camera, conservazione della geometria durante il raggruppamento, profili grafici senza variazioni alle collisioni, riuso delle popolazioni, scelta dei cinque personaggi e migrazione, porta della villa e recinto, decollo/atterraggio dei quattro nuovi aeromobili e separazione delle flotte.

**Limite della verifica visiva:** nella preview interna sono stati verificati il caricamento della schermata iniziale, i crediti e la scelta Iper Performance. Il Chrome disponibile dichiara `GL_RENDERER=Disabled` e non crea contesti WebGL. Per questo non sono attestati FPS su PC o telefono, né una prova visiva della scena 3D. I tempi CPU e i conteggi di disegno nel rapporto sono misure del controller/scena, non un benchmark GPU o una garanzia di fluidità su ogni dispositivo.

Padova 1500 mantiene il controller, il percorso della telecamera e il caricamento dei settori precedenti. Le nuove flotte, la villa e i personaggi sono caricati dal controller moderno.
