# Padova moderna — aggiornamento progressivo

Repository esclusivo: `Dreamer-archalo/padova-open-world`.
Base: `main` a `4d789440082c30c4556350f7269fa42af073ef9a`.
Branch unico: `feat/modern-city-life`. Una sola PR; nessun merge senza richiesta esplicita.

## Modalità di consegna concordata

Ogni blocco completato e testato viene salvato in commit tematici e preparato per la pubblicazione. Quando pratico viene pubblicato sullo stesso Site, senza chiedere di ripetere i comandi. La pubblicazione di un blocco non autorizza il merge della PR. Le funzionalità ancora in lavorazione non devono entrare nell'archivio pubblicato.

## Blocco 1

- Taglio della geometria effettiva di terreno, aree e pavimentazioni lungo le carreggiate; conservazione del terreno sotto impalcati sopraelevati. Quote e collisioni condividono il profilo stradale.
- Scansione automatica delle sovrapposizioni distribuita su tutta la mappa, con verifica dei poligoni risultanti.
- Guardrail laterali e spartitraffico sulle carreggiate a doppio senso sufficientemente larghe; aperture arcade di 12 metri e interruzioni agli incroci. Profili semplificati per contenere collisioni e geometria.
- Segnaletica orizzontale aggiuntiva sulle tangenziali.
- Dodici autovelox con segnaletica, indicazione vicina sulla minimappa, attraversamento direzionale, multa singola di 25 e cooldown. Posizioni adattate alle strade reali presenti nell'estratto OSM, con progressive approssimate: non sono coordinate rilevate sul posto.
- Rotazione continua con tastiera, frecce e gli stessi input touch; camminata e corsa con frequenze e ampiezze distinte.
- Cappello da Merlino alto e appuntito, con falda e spazio sopra la testa.
- Budget traffico 24/36/52/72 nelle modalità Iper Performance/Performance/Balanced/Detailed; aggiornamenti AI a frequenza ridotta e proxy distanti.
- Tram 2/3/4/4, ciascuno con due elementi.
- Distretto universitario Portello, scooter con scudo e carrozzeria arrotondati, Notturna selezionabile, sportive a cuneo.

Fonte autovelox: [Polizia Locale di Padova](https://www.polizialocalepadova.it/index.php/2013-06-25-09-00-27/2013-07-02-09-57-13/rilevamenti-sanzionatori-elettronici/autovelox), consultata il 12 settembre 2026. I limiti di gioco sono 90 km/h, salvo Curva Boston a 70 km/h. La sanzione di gioco è arcade.

## Verifiche del blocco

- `node verify-surface-layers.mjs`: 142.098 campioni, 9.524 celle candidate, verifica distribuita su 251 celle, nessun errore rilevato.
- `node verify-city-life-core.mjs`: collisioni guardrail, aperture, Velox/direzione/limite/cooldown/quote, rotazione mantenuta per 20 secondi, animazione corsa, cappello e convogli.
- `node verify-airport.mjs`: pista, accessi, hangar, tutti gli ingressi/uscite, carri e proiettili, volo, paracadute, cinque stelle, respawn e pagamento singolo Portavalori di 1.000.
- `node verify-performance.mjs`: budget, proxy, riuso mesh, commutazione grafica, streaming, salvataggi/personaggi e telecamera.
- `node verify-fullscreen.mjs`: API standard/WebKit, errori, uscita e clic ripetuti.

Misure CPU e conteggi di geometria non misurano gli FPS sul PC dell'utente. La verifica grafica del nuovo blocco non è ancora stata eseguita.

## Parti ancora da completare nella stessa PR

- Gruppi/ruoli/reazioni NPC, cani e attività studentesca; distribuzione del traffico più ricca.
- Landmark, mura, basiliche, piazze/Riviera, collina PADOVA e vegetazione differenziata.
- Nuova villa Mandria/Armistizio e garage; ripristino Parco Treves e migrazione HOME/respawn.
- Sicurezza alleata, mercenari, pattuglie normali/militari, elicotteri della polizia.
- Aeroporto animato, traffico aereo, area militare e UFO.
- Barche, taxi abusivo, gara in tangenziale.
- Test e regressioni delle parti successive e riepilogo completo prima di qualsiasi merge.

Padova 1500/Galileo, missile, razzo, spazio e Luna restano esclusi da questo aggiornamento.
