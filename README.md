# PADOVA AFTER HOURS

**Padova Open World · Gioco 3D open world ambientato a Padova**  
**Release dichiarata: 1.2 · Prossima versione: 2.1, in sviluppo**

[**▶ GIOCA ONLINE — GitHub Pages**](https://dreamer-archalo.github.io/padova-open-world/) · [Verifica la versione pubblicata](https://dreamer-archalo.github.io/padova-open-world/version.json) · [Aggiornamenti](https://github.com/Dreamer-archalo/padova-open-world/commits/main)

Esplora una reinterpretazione giocabile della **Padova contemporanea**: percorri il centro e i quartieri, guida e pilota veicoli, scopri i luoghi della città e affronta gare e missioni. La mappa combina strade e sagome degli edifici derivate da OpenStreetMap con ambienti tridimensionali originali e ricostruzioni stilizzate.

> **Quale versione sto giocando?** Il collegamento principale porta alla pubblicazione GitHub Pages di questo repository. Il numero effettivamente distribuito è indicato nel file *Verifica la versione pubblicata*: un aggiornamento di `main` non equivale automaticamente a un deploy completato. L'[altro sito esistente su Netlify](https://padova-open-world.netlify.app/) può essere meno aggiornato; non viene indicato come versione più recente senza una verifica del deploy.

## Il mondo di gioco

- **Padova da esplorare:** centro storico, quartieri, strade, ponti, corsi d'acqua, monumenti e navigazione sulla mappa.
- **Mobilità:** automobili, moto, scooter, camion, elicotteri, piccoli aerei e carri armati; traffico, tram, pedoni e pattuglie.
- **Luoghi e servizi:** aeroporto, villa iniziale nell'area di Parco Treves, taxi e punti di interesse.
- **Attività:** consegne, portavalori, sfide in moto, due gare sulla Tangenziale, checkpoint e fughe dalla polizia.
- **Online sperimentale:** cinque personaggi selezionabili, mappa condivisa e codice per lobby e gare. L'esperienza con più dispositivi e i risultati sincronizzati richiedono ancora collaudo.

**Personaggi:** Scando · Mattia · Marchese · Milo · Nico.

## Verso la versione 2.1

Il lavoro per la **2.1** si concentra su quattro interventi di rilievo, senza trasformare ogni correzione tecnica in una nuova funzione pubblicizzata:

1. **Viabilità e geometria:** continuità tra terreno, strade, marciapiedi, ponti e collisioni; restano verifiche da completare, in particolare nella zona di Bassanello.
2. **Aeroporto e spostamenti:** collegamento stradale effettivo con la città, navigazione e affidabilità del servizio taxi.
3. **Gare e traffico:** due percorsi sulla Tangenziale, difficoltà dei bot e miglioramenti a partenza, gestione del traffico e stabilità.
4. **Multiplayer:** selezione dei cinque personaggi, lobby e gare condivise; occorrono prove reali con due o più giocatori prima di considerarle completate.

**Stato:** il ramo `main` contiene aggiornamenti successivi alla release 1.2, ma il [manifest di versione](dist/version.json) dichiara ancora `1.2.0`. **La 2.1 non viene presentata come una release già pubblicata o interamente collaudata.** La cronologia completa rimane nei [commit](https://github.com/Dreamer-archalo/padova-open-world/commits/main), non in questa presentazione.

## Come giocare

| Comando | Funzione |
| --- | --- |
| `WASD` / frecce | Camminare e guidare |
| `E` · `V` | Entrare/uscire · scegliere un veicolo |
| `J` · `M` | Attività · mappa |
| `Shift` · `Spazio` | Scatto/boost · salto/freno (variano in volo) |
| `C` · `R` · `Esc` | Telecamera · recupero · pausa |
| `Tab` · `F` | Turbo speciale/cannone · paracadute, secondo il mezzo |

Serve un browser compatibile con **WebGL**. Progressi e impostazioni sono salvati localmente nel browser.

## Sviluppo e trasparenza

Il progetto è in evoluzione: la presenza di una funzionalità nel codice non garantisce che sia stata provata graficamente o su più dispositivi. Lo [stato documentato della release 1.2](docs/release-v1.2-completeness-audit.md) distingue le funzioni integrate da quelle incomplete; i [problemi noti](docs/release-v1.2-known-issues.md) riportano i limiti ancora aperti. Conserviamo la documentazione tecnica e i test senza sovraccaricare questa pagina.

**Tecnologie:** JavaScript, Three.js, dati OpenStreetMap. Il gioco statico è in [`dist/`](dist/); i test, le istruzioni per contribuire e i dettagli di distribuzione sono in [`CONTRIBUTING.md`](CONTRIBUTING.md) e [`docs/`](docs/). Repository di riferimento: **`Dreamer-archalo/padova-open-world`, ramo `main`**.

## Crediti e attribuzioni

**Una produzione di Federico Scandolara e Ricardo Roza Rui.** Progetto derivato dall'[originale `scandolo/padova-open-world`](https://github.com/scandolo/padova-open-world), di cui restano visibili attribuzione e cronologia.

Dati cartografici © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), ODbL 1.0. Fonti del terreno: Mapzen / Copernicus EU-DEM / USGS; dettagli in [`docs/mobility-terrain.md`](docs/mobility-terrain.md). Three.js: MIT, vedere [`dist/vendor/THREE-LICENSE.txt`](dist/vendor/THREE-LICENSE.txt). Non è stata dichiarata una licenza generale per il codice originale del progetto.
