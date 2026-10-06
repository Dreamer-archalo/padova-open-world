# Piova R33: barche, velivoli e collisioni

Modifiche implementate sulla stessa versione che comprende il club delle moto. Salvataggio locale; pubblicazione non eseguita.

## Cosa cambia

- Ricostruiti tutti i 13 modelli nautici: scafi sagomati con fondo a V, prua rastremata, ponti in legno, sedili, vetrature, battagliole, motori e dettagli diversi per ciascun tipo. Il catamarano ha due scafi. Ogni modello usa al massimo tre mesh per la struttura.
- Aggiunti **Scia 110** (motoscafo offshore, 110 km/h), **Dardo 145** (catamarano sportivo, 145 km/h) e **Jet R** (moto d’acqua racing, 120 km/h). Disponibili nel catalogo; velocità massima con W + SHIFT.
- Il varo verifica lo spazio davanti e dietro allo scafo e un corridoio di uscita dalla darsena. Può invertire la direzione o spostare il punto di partenza di massimo 12 metri lungo il canale. Una darsena completamente ostruita viene rifiutata. La navigazione veloce verifica le sponde e i ponti con passi di massimo mezzo metro.
- Le anteprime e i velivoli consegnati dall’hangar usano i modelli dell’aeroporto. Gli aerei aggiunti non ricadono più nel modello generico dei camion. Inquadratura adattata alle ali, esclusione degli effetti nascosti e corretta visualizzazione dei modelli scuri, compreso il Blackbird.
- Gli urti ordinari non causano esplosioni al superamento di una soglia di velocità. Danno e risposta dipendono dalla componente della velocità diretta contro la superficie. Gli impatti frontali producono un rimbalzo; le strisciate conservano il movimento lungo il muro e mostrano un graffio sulla fiancata.
- Gli urti tra auto considerano direzione, velocità relativa e massa. La pausa fra i danni non disattiva la risposta fisica.
- A resistenza zero, un’auto ordinaria resta visibile e fuori uso. E permette di scendere senza neutralizzare il conducente; R ripara l’auto e azzera graffi e moto residuo. Il comportamento riguarda anche le auto regionali. La cisterna conserva la sua esplosione specifica.

## Verifiche eseguite

| Verifica | Esito |
| --- | --- |
| `npm run test:boats-collisions` | PASS: 13 modelli nautici, 10 fabbriche di velivoli, velocità delle nuove barche, sponde e ponti, varo, urti frontali/laterali/retromarcia a 30/60/120 Hz, facciate ruotate, gravità durante il contatto e urti fra auto |
| `npm run test:boats-hangar-browser` | PASS: Chromium/WebGL, tutte le 17 anteprime dei velivoli e le 13 delle barche, consegna dell’aereo passeggeri e navigazione dei tre nuovi mezzi su acqua mappata |
| `npm test` | PASS: controller, geometria, terreno, percorsi e spawns |
| `npm run test:vehicle-damage` e `npm run test:jumps` | PASS: danni visivi, resistenza, rampe, gravità e atterraggio |
| `npm run test:npc-traffic` e `node verify-regional-npc-r14.mjs` | PASS: spawn, corsie, attraversamenti, traffico regionale, mezzi fuori uso e cisterna |
| `npm run test:biker-club` | PASS: tre prove, premi, impennate, rampe e gruppo |
| `npm run test:race-immersion` e `npm run test:race-two` | PASS: entrambe le gare con guida e rivali fisici |
| `npm run test:airport`, `npm run test:elevation-harmony` e `npm run test:phase3-runtime` | PASS: velivoli, combattimento, recupero locale, dislivelli e rampe |
| `node verify-feature-preservation.mjs` e `node tools/verify-mandria-hangar.mjs` | PASS: funzionalità esistenti e catalogo |
| Browser R31 e R32 | PASS: densità pedoni, impennata B, apertura del paracadute solo con 0/Numpad0, cisterna, tutte le prove del club, sblocchi e persistenza |

Nel test del controller nel browser, un impatto frontale iniziale a 126 km/h lascia circa il 76% di resistenza e fa rimbalzare l’auto. La prova di strisciata lascia il 99,85%, conserva la direzione e mostra il graffio senza rompere il parabrezza. Le due auto del test frontale restano entrambe visibili, con circa il 69% di resistenza. Dopo urti ripetuti, l’auto fuori uso rimane visibile, il conducente può uscire e il recupero ripristina il 100%.

Le collisioni del browser usano il controller effettivo con una superficie piana controllata; le prove di navigazione usano le darsene e l’acqua della mappa. Rendering verificato con Chromium headless e WebGL SwiftShader a 1280 × 800. Questi controlli non misurano il frame rate su hardware del giocatore.

Risultati dettagliati: `boats-collisions-r33-results.json` e `boats-hangar-collisions-browser-results.json`. Anteprime renderizzate: `test-artifacts/r33/water-models.png` e `test-artifacts/r33/air-models.png`.

Il test dell’aeroporto è stato allineato al recupero locale già presente nel gioco: prima richiedeva ancora il vecchio ritorno alla villa. Le esplosioni da proiettile restano verificate. Il test regionale ora verifica il veicolo ordinario fuori uso e distingue il mezzo con carburante esplosivo.
