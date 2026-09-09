# Padova 2026: aeroporto, villa e inseguimenti

Questa estensione parte da `405ae9c6659e03e391cbb680ce4e288427b39336` del repository personale `Dreamer-archalo/padova-open-world`. I sistemi sono attivati dal caricatore moderno. Il caricatore Galileo, i suoi salvataggi e i suoi file di gioco non vengono sostituiti.

## Dove iniziare e comandi

La partita moderna inizia davanti alla villa inventata nel Parco Treves. Sono selezionabili **Scando, Mattia, Marchese, Milo e Nico**; la scelta viene salvata nel browser insieme al denaro e alle attività completate. I salvataggi precedenti senza personaggio usano Scando.

Aprire **M → Aeroporto · ingresso** per raggiungere l'area. La minimappa indica **A** per gli aerei, **H** per gli elicotteri e **T** per i carri. Questi mezzi si trovano fisicamente nel mondo: il menu Vehicles mantiene la selezione precedente.

| Mezzo | Dove | Comandi |
| --- | --- | --- |
| Bastione, carro verde originale | Tre esemplari nella piccola sezione militare; unità nemiche a cinque stelle | E entra/esce; W/S marcia; A/D sterzo cingolato anche da fermo; TAB cannone |
| Libellula, aereo leggero originale | Due esemplari sul piazzale civile | E entra/esce a terra; W accelera, S rallenta; A/D virata; Space sale dopo 72 km/h; Shift scende |
| Airone, elicottero esistente ottimizzato | Due piazzole aeroportuali, oltre alle piazzole esterne già presenti | E entra/esce a terra; WASD movimento; Space sale; Shift scende |
| Paracadute | Disponibile quando si è a bordo di un velivolo oltre 10 m dal suolo | F apre il paracadute ed espelle dal mezzo; WASD guida la planata |
| Fortezza, portavalori originale | Attività CATTURA PORTAVALORI | Inseguire e immobilizzare; restare vicini e fermi per 2,5 secondi |

Il pulsante touch TAB cambia da TURBO a SPARA secondo il mezzo; discesa e paracadute hanno pulsanti touch dedicati. Il turbo della Cinquecento mantiene il countdown di sei secondi già presente.

## Aeroporto e terreno

Il riferimento geografico è l'ARP pubblicato dall'aeroporto: N45°23.8', E011°50.9', pista 04/22, 1122 × 30 m. Il perimetro di gioco segue quel centro e orientamento; edifici e distribuzione interna sono originali e interpretativi, non un rilievo dell'aeroporto.

La pista, i raccordi, il piazzale civile, il piccolo terminal, l'amministrazione, la torre, officina/deposito, carburante stilizzato, parcheggio, recinzioni e cancelli formano un'area continua. Quattro hangar sono aperti verso il raccordo: due civili e due militari. Le collisioni comprendono le pareti e i tetti alla loro quota, lasciando accessibili i portali e lo spazio sottostante.

Solo le due aree di gameplay sostituiscono gli edifici cartografici interni. I collegamenti di servizio si connettono a vertici stradali esistenti. Una quota locale continua raccordata con una transizione quintica di 30 m stabilizza pista e proprietà, senza modificare il dataset altimetrico. Acqua, ponti e profili stradali generali continuano a utilizzare il sistema esistente. La vegetazione procedurale esclude pista, piazzali e portali.

Gli edifici e le superfici entrano nei batch dei chunk esistenti, con scaricamento a distanza. Le linee dipinte hanno una quota separata dall'asfalto per evitare superfici sovrapposte che lampeggiano.

## Cannone, ricercato e respawn

TAB genera un proiettile, con cooldown di **1,25 secondi**. Un piccolo aiuto alla mira, limitato a un cono frontale di circa cinque gradi, permette di colpire le auto basse; la traiettoria resta fisica e gli ostacoli la fermano. Gli impatti rimuovono o disabilitano i veicoli e mandano KO i pedoni senza gore. Gli edifici rimangono invariati: vengono mostrati soltanto gli effetti dell'impatto.

I crimini possono ora aumentare realmente il ricercato fino a cinque stelle. Le pattuglie aumentano fino a cinque, con velocità crescente; a cinque stelle si aggiungono al massimo **due carri nemici**. Seguono il grafo stradale, si distribuiscono su punti di intercettazione diversi e recuperano fuori dalla vicinanza immediata del giocatore se restano bloccati. Il cannone nemico prevede il movimento del bersaglio e usa proiettili a 150 m/s con cooldown di 2,4 secondi. Pareti, tetti e altre coperture bloccano i colpi, anche quando sono attraversati interamente nell'intervallo di un frame.

La distruzione durante l'inseguimento a cinque stelle interrompe l'attività, elimina le unità e i proiettili e riporta a piedi davanti alla villa: salute 100, ricercato zero, personaggio conservato e 12 secondi di tregua. Le pattuglie a terra non possono arrestare un pilota semplicemente perché sorvola la stessa posizione.

## Portavalori

L'attività si avvia già con un portavalori in movimento su una strada principale vicina. Il percorso di fuga iniziale supera 850 m; il mezzo accelera fino a 44 m/s sui tratti idonei, rallenta nelle curve, sceglie nuovi percorsi e tenta manovre di recupero. Un recupero tramite riposizionamento è consentito soltanto oltre 85 m dal giocatore: non annulla un'intercettazione ravvicinata.

La ricompensa mostrata è **Ricompensa: €1.000**. Il completamento aggiunge esattamente €1.000 una volta e rimuove l'unità della missione. Collisioni, danni e guida pericolosa continuano ad attivare il sistema Wanted. La missione rimane un inseguimento arcade.

## Budget e limiti

- Mezzi parcheggiati: niente navigazione o simulazione di volo; rotori immobili. Controllo di recupero dei mezzi fissi al massimo una volta al secondo, lontano dal giocatore.
- Elicotteri: tre mesh per modello con geometrie/materiali condivisi e rotori separati.
- Carri e aerei: due mesh per modello; portavalori: una mesh. Non vengono create nuove geometrie a ogni sparo.
- Cannone: massimo 12 proiettili, otto effetti di impatto e 12 particelle per effetto, riutilizzati in due `InstancedMesh`.
- Rendering degli attori: interpolazione delle quote simulate; eliminati i ricampionamenti altimetrici per ciascun attore a ogni frame e l'aggiornamento delle pose dei mezzi parcheggiati.
- Infrastrutture: batch per chunk, niente interni complessi, niente distruzione strutturale o luci dinamiche per ogni lampada.

Non sono inclusi una simulazione aeronautica, edifici aeroportuali fedeli al reale, rottami deformabili, nuovi posti di blocco fisici o un elicottero della polizia. La difficoltà delle cinque stelle deriva dalle pattuglie esistenti e dai due carri con mira predittiva. Le ottimizzazioni non costituiscono una garanzia di FPS: serve una prova sul dispositivo finale.

## Verifica

`npm run test:airport` esercita i controller del gioco e i modelli Three.js contro la mappa reale: pista completa, accessi, hangar, ingresso/uscita, carro, cannone, coperture, volo, paracadute, cinque stelle, respawn e portavalori. Il risultato riproducibile viene scritto in `docs/airport-test-results.json`. Include un confronto della sola interpolazione CPU tra il codice base e quello aggiornato, eseguito sugli stessi attori; non è una misura di FPS o del renderer GPU.

`npm run test:modern` conserva la scansione generale strade/acqua/ponti, la percorrenza del controller su almeno dieci ponti, telecamera, turbo, traffico e pedoni. `npm test` verifica gli altri sistemi e la modalità storica.

L'audit delle carreggiate non rileva errori sui 2.194.777 campioni e 467 attraversamenti controllati; il controller percorre 12 ponti. Lo scanner cartografico generico conserva le stesse 10 segnalazioni di terminazioni nell'acqua e tre candidati di distanza insufficiente tra livelli già presenti in `main`, alle medesime coordinate. Non sono stati risolti in questa estensione aeroportuale; i due report sono mantenuti distinti e non equivalgono a una certificazione dell'intera cartografia.

**Verifica visiva ancora necessaria:** nella preview di questa sessione Chrome carica l'interfaccia e i moduli, ma segnala `GL_RENDERER=Disabled` e non crea un contesto WebGL. Non è quindi stata completata una prova grafica di guida/volo né una misurazione FPS su browser o telefono. La PR resta in bozza fino a questa verifica.

## Riferimenti

- Aeroporto di Padova, dati ARP e piste: https://airportpadova.com/navigazione/
- Comune di Padova, Parco Treves de' Bonfili: https://www.comune.padova.it/vivere-il-comune/luoghi/parco-treves-de-bonfili
- Cartografia derivata OpenStreetMap già contenuta nel repository, attribuzione e licenza invariate.

Nessuna immagine Street View o texture commerciale è stata copiata.
