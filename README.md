# PADOVA AFTER HOURS

**Padova Open World · Gioco 3D open world ambientato a Padova**  
**Versione dichiarata: 1.2.0 · Prossima patch dopo verifica: 1.2.1 · Obiettivo funzionale: 1.3.0**

[**▶ GIOCA ONLINE — GitHub Pages**](https://dreamer-archalo.github.io/padova-open-world/) · [Verifica la versione pubblicata](https://dreamer-archalo.github.io/padova-open-world/version.json) · [**Cronologia completa / CHANGELOG**](CHANGELOG.md) · [**Audit delle funzionalità e regressioni**](docs/regression-and-feature-audit-2026-09-17.md)

Esplora una reinterpretazione giocabile della **Padova contemporanea**: percorri il centro e i quartieri, guida e pilota veicoli, scopri i luoghi della città e affronta gare e missioni. La mappa combina strade e sagome degli edifici derivate da OpenStreetMap con ambienti tridimensionali originali e ricostruzioni stilizzate.

> **Quale versione sto giocando?** GitHub Pages pubblica da `main` solo dopo i test del workflow. Il numero dichiarato si legge nel [manifest distribuito](https://dreamer-archalo.github.io/padova-open-world/version.json). `main` contiene già commit successivi alla baseline 1.2.0, ma non sono ancora una release numerata 1.2.1. Il [vecchio sito Netlify](https://padova-open-world.netlify.app/) è risultato fermo al commit del 14/09/2026: non usarlo per verificare le ultime funzionalità senza sincronizzarlo. Il sito ChatGPT precedente è un altro ambiente ancora.

## Il mondo di gioco

- **Padova da esplorare:** centro storico, quartieri, strade, ponti, corsi d'acqua, monumenti e navigazione sulla mappa.
- **Mobilità:** automobili, moto, scooter motorizzati, camion, elicotteri, piccoli aerei e carri armati. Biciclette e monopattini elettrici sono previsti soprattutto come NPC nell'area Portello, non come mezzi selezionabili in tutta la città.
- **Luoghi e servizi:** aeroporto, villa iniziale nell'area di Parco Treves, taxi e punti di interesse.
- **Attività:** consegne, portavalori, quattro percorsi moto Time Attack, due gare sulla Tangenziale, checkpoint e fughe dalla polizia.
- **Online sperimentale:** cinque personaggi selezionabili, mappa condivisa, lobby e gare con giocatori e bot. Il test completo con almeno due veri dispositivi e i risultati sincronizzati resta da certificare.

**Personaggi:** Scando · Mattia · Marchese · Milo · Nico.

## Aggiornamenti, versioni e stato dei lavori

La baseline [**1.2.0**](https://github.com/Dreamer-archalo/padova-open-world/tree/release/v1.2) è conservata; il [confronto 1.2 → ultima `main`](https://github.com/Dreamer-archalo/padova-open-world/compare/c4a29e33e5bdbbe77113ad2d8ce904d4d0f71b34...main) mostra cosa è cambiato davvero. La nuova numerazione sarà **1.2.1, 1.2.2, ... fino alla 1.3.0**, assegnata a pacchetti pubblicati e verificati, non alle PR ancora aperte. La precedente indicazione **2.1 era un errore**.

Il lavoro per la **1.3** riguarda: quote coerenti fra strade/terreno/marciapiedi/ponti, viabilità aeroportuale collegata alla città, taxi realmente verificato nel browser, gare e multiplayer collaudati, ripristino e completamento delle funzionalità richieste. [Leggi il registro delle modifiche](CHANGELOG.md) e la [matrice richieste → codice → test → pubblicazione](docs/regression-and-feature-audit-2026-09-17.md) per distinguere ciò che funziona, ciò che esiste solo nel codice e ciò che non è ancora integrato.

**Problemi noti:** audit altimetrico completo non superato a Bassanello; prove WebGL, Mac M2 e gara online con due dispositivi incomplete. Il taxi ha ricevuto più correzioni, ma le segnalazioni del giocatore non vanno considerate chiuse senza riprodurre il viaggio reale. La nuova viabilità aeroporto, i sostegni aggiuntivi dei ponti, il circuito moto sul grande Monoblocco e la revisione totale della geometria sono ancora in PR non integrate: non vanno presentati come release completate.

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

Le modifiche partono sempre dall'ultima `main` del repository personale, mantenendo i miglioramenti recenti. [CHANGELOG](CHANGELOG.md), [audit della baseline 1.2](docs/release-v1.2-completeness-audit.md), [problemi noti](docs/release-v1.2-known-issues.md) e [audit di regressione](docs/regression-and-feature-audit-2026-09-17.md) distinguono le funzioni integrate dalle richieste incomplete. I test automatici non sostituiscono la verifica visiva su WebGL né la prova multiplayer reale.

**Tecnologie:** JavaScript, Three.js, dati OpenStreetMap. Il gioco statico è in [`dist/`](dist/); test, istruzioni e dettagli di distribuzione sono in [`CONTRIBUTING.md`](CONTRIBUTING.md) e [`docs/`](docs/). Repository di riferimento: **`Dreamer-archalo/padova-open-world`, ramo `main`**.

## Crediti e attribuzioni

**Una produzione di Federico Scandolara e Ricardo Roza Rui.** Progetto derivato dall'[originale `scandolo/padova-open-world`](https://github.com/scandolo/padova-open-world), di cui restano visibili attribuzione e cronologia.

Dati cartografici © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), ODbL 1.0. Fonti del terreno: Mapzen / Copernicus EU-DEM / USGS; dettagli in [`docs/mobility-terrain.md`](docs/mobility-terrain.md). Three.js: MIT, vedere [`dist/vendor/THREE-LICENSE.txt`](dist/vendor/THREE-LICENSE.txt). Non è stata dichiarata una licenza generale per il codice originale del progetto.
