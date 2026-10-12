# PADOVA AFTER HOURS

**Un open world 3D ambientato tra Padova e Venezia.** Un progetto giocabile in continua evoluzione: città, strade, veicoli, esplorazione e attività, con una mappa ispirata alla geografia reale.

[**Gioca su GitHub Pages ↗**](https://dreamer-archalo.github.io/padova-open-world/) · [Stato del progetto](docs/PROJECT_STATUS.md) · [Novità](CHANGELOG.md) · [Come contribuire](CONTRIBUTING.md)

> **Progetto in sviluppo attivo.** La versione online è un prototipo giocabile, non un prodotto finito. Alcune funzionalità possono avere difetti: i test automatici non sostituiscono la prova nel browser.

---

## Il gioco

| Esplora | Guida | Scopri |
| --- | --- | --- |
| Padova, Venezia e collegamenti regionali | Auto, moto, taxi, camion e imbarcazioni | Villa della Mandria, aeroporti, concessionari e luoghi urbani |
| Strade e sagome ispirate a OpenStreetMap | Gare, modifiche ai mezzi e salti | NPC, traffico, missioni e sistemi sperimentali |

L'esperienza combina dati cartografici, ambienti stilizzati e sistemi di gioco costruiti progressivamente. L'obiettivo è ampliare la libertà di esplorazione migliorando, release dopo release, **prestazioni, stabilità e interazioni**.

## Inizia a giocare

Apri la **[versione pubblica](https://dreamer-archalo.github.io/padova-open-world/)** su un browser moderno compatibile con WebGL. Non è necessario installare il gioco.

**Comandi principali:** `WASD` / frecce per movimento e guida; `E` per interagire o salire/scendere; `M` per la mappa; `C` per la telecamera; `9` per il salto speciale quando disponibile; `Esc` per la pausa. Altri comandi sono contestuali al mezzo e all'attività.

La partita e alcune impostazioni sono memorizzate localmente nel browser: cancellare i dati del sito può rimuoverle.

## Stato attuale

L'ultimo aggiornamento pubblicato nella cronologia verificata è **R43 — miglioramenti delle prestazioni della Villa**, dell'**11 ottobre 2026**, preceduto da **R42 — guida sui tetti** e dalla pubblicazione cumulativa **R35–R41 — veicoli, concessionari e officine**. Consulta la [cronologia](CHANGELOG.md) per i dettagli.

Il manifest tecnico `dist/version.json` mantiene ancora il numero storico **1.2.1**: le sigle **R31–R43** identificano successive fasi di lavoro e non una nuova versione semantica già certificata. Il [manifest pubblico](https://dreamer-archalo.github.io/padova-open-world/version.json) e le [esecuzioni di deploy](https://github.com/Dreamer-archalo/padova-open-world/actions/workflows/github-pages.yml) consentono di verificare la distribuzione.

**Da perfezionare:** fluidità su hardware diversi, geometria di strade e ponti, alcuni comportamenti dei veicoli e degli NPC, esperienze online e controlli manuali. I problemi aperti sono distinti dalle funzioni già distribuite nella [pagina di stato](docs/PROJECT_STATUS.md).

## Per chi vuole seguire lo sviluppo

- [Stato verificato e limiti noti](docs/PROJECT_STATUS.md)
- [Cronologia delle pubblicazioni](CHANGELOG.md)
- [Organizzazione del lavoro e delle PR](docs/REPOSITORY_WORKFLOW.md)
- [Archivio delle vecchie PR e dei lavori da riesaminare](docs/PR_ARCHIVE.md)
- [Guida per i contributori](CONTRIBUTING.md)

**Branch pubblico:** `main`. Le anteprime dei vecchi branch non sono necessariamente aggiornate; **non** rappresentano automaticamente il gioco pubblicato. Nel repository le *Issues* sono attualmente disabilitate: il backlog è mantenuto nella documentazione.

## Crediti e dati

**Una produzione di Federico Scandolara e Ricardo Roza Rui.** Progetto derivato da [scandolo/padova-open-world](https://github.com/scandolo/padova-open-world), con attribuzione e cronologia conservate.

Dati cartografici © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), ODbL 1.0. Altre fonti del terreno sono descritte in [mobilità e terreno](docs/mobility-terrain.md). Three.js è distribuito secondo licenza MIT, presente in [THREE-LICENSE.txt](dist/vendor/THREE-LICENSE.txt). **Il codice originale del progetto non ha una licenza generale pubblicata:** non presumere che sia liberamente riutilizzabile.
