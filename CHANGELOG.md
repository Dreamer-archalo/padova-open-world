# Padova After Hours — versioni e cronologia verificabile

**Repository canonico:** `Dreamer-archalo/padova-open-world` → `main`. **Data ricognizione: 17 settembre 2026.**

[Gioca su GitHub Pages](https://dreamer-archalo.github.io/padova-open-world/) · [Manifest effettivamente distribuito](https://dreamer-archalo.github.io/padova-open-world/version.json) · [Tutti i commit di main](https://github.com/Dreamer-archalo/padova-open-world/commits/main) · [Tutte le PR](https://github.com/Dreamer-archalo/padova-open-world/pulls?q=is%3Apr) · [Audit regressioni 17/09](docs/regression-and-feature-audit-2026-09-17.md)

## Numerazione da adottare

- **`1.2.0`**: baseline reale, fissata il 16/09/2026 al commit [`c4a29e3`](https://github.com/Dreamer-archalo/padova-open-world/commit/c4a29e33e5bdbbe77113ad2d8ce904d4d0f71b34), conservata in [`release/v1.2`](https://github.com/Dreamer-archalo/padova-open-world/tree/release/v1.2). È la *release dichiarata*, non una certificazione dell'assenza di bug.
- **Dopo `1.2.0`, ma ancora senza nuova release numerata:** `main` integra l'audit #34, la ripresa del taxi #36, la difficoltà della Gara 1 #37, la protezione freeze taxi #40 e il guard fuori strada #41, oltre a documentazione. [Confronto esatto fra baseline e `main`](https://github.com/Dreamer-archalo/padova-open-world/compare/c4a29e33e5bdbbe77113ad2d8ce904d4d0f71b34...main). Non inventare retroattivamente `1.2.1`, `1.2.2`, ecc. per commit che non furono release distinte.
- **`1.2.1`, `1.2.2`, `1.2.3`, ...**: dal prossimo rilascio collaudato, un incremento per ogni pacchetto **pubblicato e verificato**, anche se contiene più piccoli fix. Le PR e i commit restano strumenti separati; non attribuire una versione nuova a ogni singolo commit tecnico o PR non mergiata.
- **`1.3.0`**: prossimo aggiornamento funzionale di rilievo, soltanto quando le caratteristiche incluse superano i controlli stabiliti. **`2.1` è una numerazione errata, da non usare.**

Per ogni nuova versione occorrono: SHA di `main` esatto, registro dei cambiamenti, confronto con l'ultima versione, `dist/version.json` aggiornato e mostrato nel sito, snapshot immutabile (tag Git/GitHub Release ove disponibile), esito CI e collaudo WebGL e/o due dispositivi pertinente. Aggiornare insieme i gate che oggi richiedono letteralmente `1.2.0` in `.github/workflows/github-pages.yml` e `.github/workflows/release-smoke.yml`. **Non cambiare solo il numero senza aggiornare i controlli.** Una PR aperta, una preview o un deploy riuscito non dimostrano da soli che il gioco funzioni.

## Cosa è confluito nella baseline 1.2.0 — inventario per blocchi

| Periodo / origine | Funzioni integrate in `main` | Tracciabilità |
| --- | --- | --- |
| 6–11 settembre, eredità progetto originale e riconciliazione Dreamer | Padova moderna, strade/ponti, 24 veicoli NPC, guida, tram, semafori, polizia, acqua/respawn. La modalità storica fu poi rimossa dalla build moderna. | [Audit storico](docs/release-v1.2-completeness-audit.md), [PR #3](https://github.com/Dreamer-archalo/padova-open-world/pull/3) |
| 9 settembre | Aeroporto iniziale, aerei/elicotteri/carro armato, paracadute, missione portavalori da €1.000, personaggi e Villa Treves. Non equivale a viabilità aeroportuale finale. | [PR #1](https://github.com/Dreamer-archalo/padova-open-world/pull/1) |
| 10–11 settembre | Iper Performance, ottimizzazione, fullscreen, altri veicoli e aggiornamenti villa. | [PR #2](https://github.com/Dreamer-archalo/padova-open-world/pull/2) |
| 12 settembre | Livelli stradali, guardrail, autovelox, Portello, scooter *motorizzato*, traffico e controlli. | [PR #5](https://github.com/Dreamer-archalo/padova-open-world/pull/5) |
| 12–14 settembre | Streaming, rampe/salti, multicorsia, taxi fisico e mappa, bici e monopattini NPC **solo Portello**, vita urbana, gare moto, edifici/tetti, città e servizi. Le descrizioni della PR vanno lette assieme ai limiti del collaudo. | [PR #6](https://github.com/Dreamer-archalo/padova-open-world/pull/6), [dettaglio Portello](docs/modern-phase2.md) |
| 14 settembre | Ripartenza loader; mappa/taxi/portafoglio; navigazione e bilanciamento IA; gara auto tangenziale con partenza, checkpoint e sottopassi; prezzo taxi a singolo addebito; allineamento centro storico e Villa. | [PR #8–12](https://github.com/Dreamer-archalo/padova-open-world/pulls?q=is%3Apr+is%3Amerged), [#19](https://github.com/Dreamer-archalo/padova-open-world/pull/19), [#21](https://github.com/Dreamer-archalo/padova-open-world/pull/21), [#24](https://github.com/Dreamer-archalo/padova-open-world/pull/24), [#25](https://github.com/Dreamer-archalo/padova-open-world/pull/25), [#27](https://github.com/Dreamer-archalo/padova-open-world/pull/27) |
| 14–15 settembre | Gara 1 accorciata, minimappa, rampe, recupero; seconda gara con sette sportive; correzioni del traguardo e degli avversari; rooftop easter egg iniziale. | [#29](https://github.com/Dreamer-archalo/padova-open-world/pull/29), [#30](https://github.com/Dreamer-archalo/padova-open-world/pull/30) |
| 15–16 settembre | Online fino a cinque giocatori, trasporto MQTT, selezione, lobby delle due gare, avvio coordinato, gestione giocatori/bot e correzioni griglia/modal. Test logici presenti, vera partita su due dispositivi non certificata. | [Commit multiplayer](https://github.com/Dreamer-archalo/padova-open-world/commit/3008ae64919335d31652364251eba36e3424e8bd), [race lobby](https://github.com/Dreamer-archalo/padova-open-world/commit/5e7393be74fc7fd13a159be212c72a9bc4d4eca5), [race 2](https://github.com/Dreamer-archalo/padova-open-world/commit/8794551ef2876c01c6fd87bcf1b3529f382ac3e7) |
| 16 settembre | Baseline distribuibile, manifest, test di rilascio, GitHub Pages; difetto Bassanello registrato come noto e non bloccante. | [#32](https://github.com/Dreamer-archalo/padova-open-world/pull/32), [commit 1.2.0](https://github.com/Dreamer-archalo/padova-open-world/commit/c4a29e33e5bdbbe77113ad2d8ce904d4d0f71b34) |

Nota: l'[audit di completezza 1.2](docs/release-v1.2-completeness-audit.md) documenta anche le richieste non consegnate; questa cronologia **non** le presenta come funzionalità realizzate.

## Modifiche dopo la baseline, prima di una nuova versione

- **16/09:** [#34](https://github.com/Dreamer-archalo/padova-open-world/pull/34) audit, [#36](https://github.com/Dreamer-archalo/padova-open-world/pull/36) recupero destinazione taxi, [#37](https://github.com/Dreamer-archalo/padova-open-world/pull/37) tre difficoltà bot nella Gara 1.
- **17/09:** [#40](https://github.com/Dreamer-archalo/padova-open-world/pull/40) limiti alle ricerche sincrone e pausa del mondo durante il taxi, [#41](https://github.com/Dreamer-archalo/padova-open-world/pull/41) protezione dalle ricerche fuori strada illimitate. Verifiche automatiche e merge non certificano il problema riferito sul Mac M2; [#42](https://github.com/Dreamer-archalo/padova-open-world/pull/42) è ancora una PR di test browser da controllare.
- **17/09:** documentazione del repository e [audit delle funzionalità e regressioni](docs/regression-and-feature-audit-2026-09-17.md). Il numero `1.2.0` resta invariato finché non c'è una release verificata.

**In lavorazione, NON incluse in 1.2.0 o automaticamente in `main`:** aeroporto [#33](https://github.com/Dreamer-archalo/padova-open-world/pull/33) e [#43](https://github.com/Dreamer-archalo/padova-open-world/pull/43); terreno [#35](https://github.com/Dreamer-archalo/padova-open-world/pull/35) e nuova preview [#45](https://github.com/Dreamer-archalo/padova-open-world/pull/45); ponti [#38](https://github.com/Dreamer-archalo/padova-open-world/pull/38); Monoblocco [#39](https://github.com/Dreamer-archalo/padova-open-world/pull/39); avvio gara moto [#13](https://github.com/Dreamer-archalo/padova-open-world/pull/13). La vecchia #44 è archivio chiuso senza merge. Non unire rami divergenti sopra i fix taxi, gare e multiplayer più recenti.

## Collegamenti definitivi

- [Cronologia integrale di ogni commit](https://github.com/Dreamer-archalo/padova-open-world/commits/main)
- [Differenze reali dalla baseline 1.2 a oggi](https://github.com/Dreamer-archalo/padova-open-world/compare/c4a29e33e5bdbbe77113ad2d8ce904d4d0f71b34...main)
- [Pull Request con stato merge/bozza](https://github.com/Dreamer-archalo/padova-open-world/pulls?q=is%3Apr)
- [Release GitHub](https://github.com/Dreamer-archalo/padova-open-world/releases) — nessuna release formale presente al momento di questa ricognizione; il ramo `release/v1.2` è il riferimento immutato disponibile.
