# PADOVA AFTER HOURS

### Padova Open World · Versione 1.2 · Gioco 3D per browser

[**▶ GIOCA — GitHub Pages**](https://dreamer-archalo.github.io/padova-open-world/) &nbsp;·&nbsp; [Versione pubblicata](https://dreamer-archalo.github.io/padova-open-world/version.json) &nbsp;·&nbsp; [Codice e aggiornamenti](https://github.com/Dreamer-archalo/padova-open-world/commits/main)

**La tua Padova, un mondo da esplorare.** *Padova After Hours* è un progetto open world ambientato nella Padova contemporanea: esplora il centro e i quartieri, guida, pilota, scopri luoghi e affronta missioni e gare. La città utilizza strade e sagome degli edifici derivate da OpenStreetMap, insieme a elementi 3D originali e ricostruzioni stilizzate.

> **Versione del progetto: 1.2.** Il link principale è la pubblicazione GitHub Pages collegata a questo repository (`main`): gli aggiornamenti diventano visibili solo dopo un deploy riuscito. Il [sito Netlify preesistente](https://padova-open-world.netlify.app/) è un'altra distribuzione e potrebbe mostrare codice meno recente finché i deploy non saranno sincronizzati. Controlla il file «Versione pubblicata» per la versione effettivamente online.

---

## Il gioco in breve

- **Esplorazione urbana:** una mappa estesa di Padova con strade, ponti, quartieri, monumenti, acqua e navigazione verso i punti di interesse.
- **Veicoli e guida:** auto, moto, scooter, camion, elicotteri, piccoli aerei e carri armati; traffico, tram, pedoni e inseguimenti della polizia.
- **Aeroporto e base:** hangar, mezzi aeroportuali giocabili e partenza dalla villa nell'area di Parco Treves.
- **Attività:** consegne, missione portavalori, sfide in moto, **due gare sulla Tangenziale**, corse a checkpoint e fughe dalla polizia.
- **Modalità online sperimentale:** mappa condivisa con cinque personaggi selezionabili e codice per lobby e gare con altri giocatori. Il funzionamento su due dispositivi e le partenze/risultati sincronizzati necessitano ancora di verifiche pratiche.

**Personaggi disponibili:** Scando, Mattia, Marchese, Milo e Nico.

## Le principali novità della 1.2

| Area | Cosa cambia |
| --- | --- |
| Mondo e mobilità | Padova moderna consolidata, veicoli e attività ampliati, trasporti e traffico più articolati. |
| Gare | Due percorsi sulla Tangenziale, difficoltà dei bot nella prima gara e interventi su partenza e posizionamento. |
| Online | Prima implementazione della mappa condivisa e delle lobby; multiplayer ancora da collaudare in condizioni reali. |
| Servizi e luoghi | Taxi, aeroporto, villa iniziale, edifici e ambientazioni aggiornati, easter egg sul tetto dell'ospedale. |
| Stabilità | Miglioramenti ai caricamenti, ai percorsi del taxi e ai controlli di geometria; restano difetti noti da correggere. |

Il riepilogo raccoglie soltanto le modifiche di rilievo. Per la cronologia completa consulta i [commit di `main`](https://github.com/Dreamer-archalo/padova-open-world/commits/main); per lo stato verificato e le funzioni ancora mancanti consulta la [verifica della versione 1.2](docs/release-v1.2-completeness-audit.md).

## Comandi essenziali

| Tasto | Azione |
| --- | --- |
| `WASD` / frecce | Muoversi e guidare |
| `E` · `V` | Entrare/uscire dal mezzo · selezionare veicoli |
| `J` · `M` | Attività · mappa e destinazioni |
| `Shift` · `Spazio` | Scatto/boost · salto/freno; in volo, discesa/salita secondo il mezzo |
| `C` · `R` · `Esc` | Telecamera · recupero · pausa e impostazioni |
| `Tab` · `F` | Turbo speciale / cannone del carro · paracadute in volo |

Il gioco richiede un browser con WebGL. Progressi e impostazioni vengono salvati localmente nel browser.

## Stato dello sviluppo

La **1.2 identifica il codice del progetto**, non la garanzia che tutte le funzioni siano prive di errori. Sono ancora da validare completamente la continuità delle quote in alcune zone (in particolare Bassanello), la viabilità dell'accesso aeroportuale e le gare online su due dispositivi. Alcuni miglioramenti geometrici sono in rami di lavoro non ancora integrati: non vengono presentati come funzioni già pubblicate.

[Note di rilascio](docs/release-v1.2.md) · [Problemi noti](docs/release-v1.2-known-issues.md) · [Documentazione tecnica](docs/) · [Contribuire e pubblicare](CONTRIBUTING.md)

## Per gli sviluppatori

Il gioco usa **JavaScript e Three.js**. La cartella [`dist/`](dist/) contiene tutti i file della versione web, mentre [`dist/version.json`](dist/version.json) dichiara la versione distribuita. La branch di riferimento è **`Dreamer-archalo/padova-open-world:main`**; non pubblicare contenuti dell'altro repository o di un ramo non integrato.

```bash
npm run dev
# Apri http://localhost:4173
```

Le verifiche automatiche sono descritte nel [documento di rilascio](docs/release-v1.2.md). Non sostituiscono prove visive WebGL, test su dispositivi reali e verifica delle prestazioni.

## Crediti e licenze

**Una produzione di Federico Scandolara e Ricardo Roza Rui.** Progetto sviluppato a partire dall'originale [`scandolo/padova-open-world`](https://github.com/scandolo/padova-open-world), di cui vengono mantenuti attribuzione e storia.

Dati cartografici: © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), licenza ODbL 1.0. Elevazioni: fonti Mapzen / Copernicus EU-DEM / USGS documentate in [mobilità e terreno](docs/mobility-terrain.md). Three.js: licenza MIT, vedere [`dist/vendor/THREE-LICENSE.txt`](dist/vendor/THREE-LICENSE.txt). Non è dichiarata una licenza generale per il codice originale del progetto.
