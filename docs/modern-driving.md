# Padova 2026 — percorribilità e mezzi

Questa modifica è attiva soltanto nel controller moderno (`game.js`). `Terrain` e
`makeRoadGraph` mantengono il comportamento precedente per impostazione predefinita;
il mondo moderno passa rispettivamente `modern: true` e `separateLevels: true`.
I file della modalità storica/Galileo sono preservati, comprese le correzioni
arrivate su `main` durante il lavoro. La configurazione di pubblicazione è invariata.

## Strade, ponti e acqua

Il problema dei gradini aveva più cause: selezione della quota di un segmento
vicino invece di quello più vicino della stessa strada; interpolazione lineare
senza raccordi di pendenza; collisioni di lastre orizzontali sulle rampe; nodi
condivisi tra cavalcavia e strada sottostante anche quando hanno livelli diversi.

- Le quote vengono filtrate sul grafo stradale con vertici condivisi, prima della
  generazione degli oggetti. Il filtro riduce il rumore del DEM e conserva i vincoli
  di sostegno sopra l'acqua e le strutture sopraelevate.
- Un limite del 5,5% sulle corde dei segmenti lascia margine alla curva cubica
  monotona: raccordi continui, senza overshoot, con pendenza campionata sotto l'8,5%.
  Le scale pedonali mantengono una regola distinta.
- I nodi interni di strade a livelli diversi sono separati anche se hanno le stesse
  coordinate cartografiche. Le transizioni tra estremi compatibili rimangono connesse.
  Anche la navigazione moderna usa questa distinzione, evitando svolte inventate
  dalla strada inferiore sul cavalcavia.
- Le superfici parallele sullo stesso ponte sono raccordate. Dopo lo smoothing
  viene ricontrollata la luce libera sulle strade inferiori carrabili.
- Le lastre hanno collisioni sotto il piano di marcia; il controllo dell'ingombro
  considera il dislivello longitudinale sotto il veicolo. Gli oggetti sotto il ponte
  continuano ad avere collisioni verticali.
- Parapetti e piloni vengono controllati sull'intera estensione, per non chiudere
  raccordi e strade vicine. I corridoi dei ponti vengono sottratti dalle estrusioni
  generiche senza nome che li invadono, conservando i frammenti esterni. I monumenti
  nominati non vengono ritagliati. È una correzione geometrica, non un rilievo edilizio.
- Il controllo dell'acqua riconosce la carreggiata che sostiene il mezzo. Il terreno
  vicino alla strada non scava nuovamente il canale sotto una superficie carrabile.
- Il riposizionamento conserva la quota del tratto scelto, compresi i cavalcavia.

Le strade moderne hanno fasce laterali, marciapiedi dove c'è spazio, asfalto e
segnaletica differenziati, raccordi agli angoli e binari a due rotaie. Le linee di
corsia si interrompono vicino agli incroci. Le geometrie sono aggregate nei chunk
esistenti; non viene aggiunto un oggetto per ogni linea dipinta. Le rotatorie
mantengono il percorso cartografico e il senso unico; non vengono trasformate in
incroci semaforizzati. Non è inclusa una ricostruzione completa delle isole spartitraffico.

## Traffico, pedoni e polizia

I semafori derivano dagli accessi degli incroci, con posizione a bordo carreggiata,
orientamento verso i veicoli in arrivo, linea di arresto e attraversamento. I punti
cartografici vengono associati a incroci plausibili. Le fasi mantengono il ciclo
urbano semplificato già presente; non sono i tempi reali degli impianti comunali.

Il traffico limita le svolte incoerenti, preferisce uscite meno congestionate,
calcola la frenata prima della linea di arresto e mantiene distanza dal veicolo
precedente. I mezzi fermi in coda a un verde per un intervallo prolungato vengono
ricollocati lontano dal giocatore; il rosso non viene scambiato per un guasto.
La flotta precedente rimane presente. Non è implementato un sorpasso libero tra corsie.

Dieci profili pedonali combinano destinazioni, passeggiate, soste, attraversamenti,
attese, piccoli gruppi, corsa, cambi di direzione, evitamento e soste vicino ai POI.
Le collisioni, l'acqua e la reazione al traffico restano vincoli del movimento.
Le pattuglie usano percorsi sulla rete carrabile, obiettivi anticipati differenti,
distanza dalle altre pattuglie e recupero quando bloccate. Non tagliano direttamente
attraverso gli edifici per raggiungere il giocatore nelle vicinanze.

## Veicoli incontrabili in città

I 24 modelli originali sono Nido Mini, Tessera E, Rondine, Botanica Hybrid, Porto 80,
Ambra 72, Argine, Meridiana EV, Viaggio, Familia XL, Selva, Altavia, Officina Van,
Corriere L, Comitiva, Campo Pickup, Saetta S, Vortice GT, Fulmine R, Zenit V,
Doge Grand, Aurora Royale, Lido Spider e Sestante Executive.

Sono famiglie procedurali con proporzioni, tetti, carrozzerie, dettagli e prestazioni
variabili: city car, compatte, classiche, berline, station wagon, SUV, van, monovolume,
pickup, sportive, supercar, luxury e cabriolet. Non hanno loghi commerciali.

Il menu Vehicles conserva soltanto MiTo/Milano, Cinquecento, moto, scooter e camion.
I nuovi modelli si possono guidare trovandoli nel traffico o parcheggiati e premendo
**E** quando sono fermi o abbastanza lenti. Le probabilità dipendono dal quartiere;
i modelli costosi sono rari, i commerciali più frequenti in zona industriale.

## Turbo

**TAB + accelerazione** attiva il turbo speciale della Cinquecento. A circa
350 km/h parte il countdown **6, 5, 4, 3, 2, 1**, mostrato nell'HUD vicino a TURBO.
L'esplosione avviene soltanto dopo sei secondi continuativi sopra la soglia. Scendere
sotto la soglia azzera il timer. Uscita, recupero e riposizionamento lo azzerano.
Il rilascio del turbo riduce la velocità gradualmente. La pausa sospende il tempo di
simulazione. L'esplosione usa il sistema esistente di disabilitazione e respawn locale.

## Elicotteri

Quattro Airone H2 si trovano in spazi aperti vicino ad aeroporto, stadio, zona
industriale est e periferia sud. I punti vengono scelti dopo aver verificato
edifici, carreggiate, acqua e pendenza; non rappresentano elisuperfici ufficiali.
La minimappa li indica con **H** quando sono nel raggio visualizzato.

- **E**: entra/esci; l'uscita richiede atterraggio e bassa velocità.
- **W/S**: avanti/indietro; **A/D**: ruota.
- **Space**: sali; **Shift**: scendi. La camera segue il mezzo anche in quota.

Il volo è arcade, con accelerazione e velocità verticale smorzate, collisioni della
fusoliera, limite di quota di 180 m sopra il terreno e protezione dall'atterraggio
in acqua. Non è un simulatore aeronautico: i rotori non hanno collisioni dettagliate.
Gli elicotteri sono esclusi dal menu Vehicles e dalle missioni automobilistiche.

## Verifiche e limiti

- `npm test`: suite preesistenti aggiornate al countdown, movimento a varie frequenze,
  camera, missioni, salvataggi/HUD, collisioni, acqua e respawn, tram e geometria.
- `npm run test:modern`: controller reale senza renderer, 24 ingressi/uscite con E,
  elicotteri (decollo, spostamento, discesa, atterraggio, tetto di quota), countdown e
  reset, traffico, pedoni, pattuglie, almeno dieci ponti e separazione dei livelli.
- `npm run audit:modern`: campionamento di tutta la rete carrabile e di tutti i tratti
  classificati come ponti/attraversamenti; quote, acqua e collisione dell'intero veicolo.
- `docs/modern-test-results.json`, `docs/modern-road-audit.json` e
  `docs/modern-clearance-audit.json` riportano i risultati riproducibili.

La prova nel browser cloud ha raggiunto l'applicazione ma il renderer non ha potuto
avviarsi: `GL_VENDOR = Disabled`, `GL_RENDERER = Disabled`, errore di creazione del
contesto WebGL. Non viene quindi dichiarata superata una prova visiva del gameplay,
né una misurazione FPS su computer o tablet. La PR resta in bozza per questa verifica.

I test fisici non garantiscono l'assenza di difetti su ogni traiettoria possibile:
la scansione usa il centro della carreggiata con l'ingombro di un'auto; il controllo
in movimento percorre un sottoinsieme di ponti reali. Geometrie, idrologia, rampe e
modelli restano stilizzati. I punti cartografici dubbi segnalati nell'audit di luce
libera richiedono una valutazione distinta dai passaggi carrabili già verificati.
