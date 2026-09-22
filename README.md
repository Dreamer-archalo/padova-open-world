# PADOVA AFTER HOURS

**Padova Open World · Gioco 3D open world ambientato a Padova**  
**Versione 1.2.1 · Villa della Mandria v11**

[**▶ GIOCA — VERSIONE DEFINITIVA SU GITHUB PAGES**](https://dreamer-archalo.github.io/padova-open-world/) · [Controlla la versione distribuita](https://dreamer-archalo.github.io/padova-open-world/version.json) · [Cronologia](CHANGELOG.md) · [Repository](https://github.com/Dreamer-archalo/padova-open-world)

Esplora una reinterpretazione giocabile di Padova contemporanea: centro e quartieri, veicoli, aeroporto, luoghi della città, gare e missioni. La mappa usa strade e sagome OpenStreetMap insieme ad ambienti e modelli 3D originali e stilizzati.

**Distribuzione:** il solo indirizzo ufficiale gestito per questa release è GitHub Pages. Il workflow pubblica la cartella `dist` di `main` dopo test automatici; non utilizza né aggiorna Netlify. Controllare il manifest pubblico per distinguere una pubblicazione riuscita da un semplice commit GitHub.

## Contenuto della versione 1.2.1

- **Villa della Mandria v11:** villa, hangar con categorie, mezzi e colori, animali, cavalli, lavoratori, pattuglie e consegne già integrati in v10; raccordi esterni della strada verificati rispetto a proprietà e ostacoli, nuove corsie di servizio sterrate solo dove sicure, controllo interferenze con i cavalli, attività dei lavoratori distribuite per zone e ombre alleggerite a distanza.
- **Viabilità e grafica già presenti in `main`:** primi raccordi strada/terreno/marciapiedi, sei rampe e interventi sui ponti, integrazione della Villa con la mappa; resta incompleto il risanamento dell'intera città. Nessuna revisione grafica del 22 settembre è dichiarata qui come incorporata senza un commit sorgente identificato.
- **Aeroporto e mezzi:** pista, strutture e mezzi aeroportuali, aerei, elicotteri, carri armati, combattimento e missione Caccia aerea.
- **Attività:** portavalori, taxi, due gare tangenziali, circuito motociclistico Monoblocco con rampe e ponti.
- **Città:** traffico, tram, pedoni, bici e monopattini NPC nei quartieri, polizia e modalità di qualità grafica.
- **Online sperimentale:** personaggi Scando, Mattia, Marchese, Milo, Nico; lobby e gare condivise. La prova sincronizzata completa su due dispositivi resta aperta.

I test Villa v11 (geometria e WebGL) sono documentati nella [PR #54](https://github.com/Dreamer-archalo/padova-open-world/pull/54). Il rilascio unificato è soggetto ai controlli GitHub Actions; le verifiche automatiche non equivalgono a un collaudo manuale su ogni dispositivo.

## Stato della geometria e limiti noti

I dislivelli della città non sono tutti risolti. L'audit della [PR #53](https://github.com/Dreamer-archalo/padova-open-world/pull/53) riporta 6.505 campioni problematici ai margini delle strade. Non disabilitare o mascherare le verifiche. Le vecchie PR sperimentali di terreno e ponti non devono essere unite alla cieca perché potrebbero sovrascrivere modifiche successive. Persistono limiti da verificare per prestazioni su dispositivi reali, trasferimenti taxi e multiplayer multi-dispositivo.

## Controlli di base

`WASD` e frecce per movimento/guida; `E` per entrare e uscire; `M` per la mappa; `J` per le attività; `C` per la telecamera; `Esc` per la pausa. I tasti per volo, armi e mezzi cambiano in base al veicolo. Serve un browser compatibile WebGL. Progressi e impostazioni sono conservati localmente nel browser.

Il menu di collaudo F8 della Villa v11 è intenzionalmente accessibile nell'[anteprima di test](https://dreamer-archalo.github.io/padova-open-world/preview/mandria-v11/) o tramite `?estateDebug=1` e non è una funzione del gameplay ordinario.

## Sviluppo, crediti e dati

La baseline 1.2.0 è conservata nel ramo [`release/v1.2`](https://github.com/Dreamer-archalo/padova-open-world/tree/release/v1.2). Il [CHANGELOG](CHANGELOG.md) documenta le modifiche e l'[audit delle regressioni](docs/regression-and-feature-audit-2026-09-17.md) riporta i limiti precedenti.

**Una produzione di Federico Scandolara e Ricardo Roza Rui.** Il progetto deriva da [`scandolo/padova-open-world`](https://github.com/scandolo/padova-open-world), preservandone attribuzione e cronologia. Dati cartografici © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), ODbL 1.0; fonti del terreno Mapzen / Copernicus EU-DEM / USGS, dettagli in [`docs/mobility-terrain.md`](docs/mobility-terrain.md). Three.js: MIT, vedere [`dist/vendor/THREE-LICENSE.txt`](dist/vendor/THREE-LICENSE.txt). Nessuna licenza generale per il codice originale è dichiarata.
