# Padova After Hours — cronologia delle versioni

**Repository canonico:** [`Dreamer-archalo/padova-open-world`](https://github.com/Dreamer-archalo/padova-open-world), ramo `main`. **Sito ufficiale:** [GitHub Pages](https://dreamer-archalo.github.io/padova-open-world/). La versione effettivamente pubblicata è indicata nel [manifest del sito](https://dreamer-archalo.github.io/padova-open-world/version.json), non soltanto dal numero in GitHub.

## Aggiornamenti di ottobre 2026 · sviluppo R31–R43

Queste sigle identificano pacchetti di sviluppo pubblicati su `main`; il manifest mantiene temporaneamente il numero tecnico **1.2.1**. Non costituiscono automaticamente nuove release semantiche.

- **11 ottobre · R43:** pubblicate ottimizzazioni del rendering e dell'avvio della Villa della Mandria ([commit](https://github.com/Dreamer-archalo/padova-open-world/commit/bda197a99c8012c76a88952a0169e445a4830c13)).
- **10 ottobre · R42:** pubblicata la guida sui tetti con atterraggio e salto ripetuto ([commit](https://github.com/Dreamer-archalo/padova-open-world/commit/685f6f1d4b155c64e046949b1ce0dcd333d52c0f)).
- **9 ottobre · R35–R41:** pubblicazione cumulativa di veicoli, officine, personalizzazioni, concessionari e collegamenti di gameplay ([commit](https://github.com/Dreamer-archalo/padova-open-world/commit/738d43fb3482a6668b0a602d9bd732df8be0870cd)).
- **6 ottobre e successivi · R31–R34:** integrazioni successive della linea NPC/traffico, nuovi mezzi e HUD. L'archivio delle PR distingue le proposte originali da quanto effettivamente pubblicato.

**Limiti:** la pubblicazione automatica non prova da sola ogni meccanica. Rimangono controlli manuali e problemi tecnici da verificare, dettagliati nello [stato del progetto](docs/PROJECT_STATUS.md). Le PR storiche sono classificate in [PR_ARCHIVE.md](docs/PR_ARCHIVE.md).

## 1.2.1 — Villa della Mandria v11 · 22 settembre 2026

Pacchetto predisposto per la pubblicazione su GitHub Pages, senza utilizzare Netlify:

- Conserva le funzionalità e la grafica già presenti nella versione unificata [PR #53](https://github.com/Dreamer-archalo/padova-open-world/pull/53): Villa Mandria v10, aeroporto, missione Caccia aerea, Monoblocco, taxi, gare, online e primi raccordi stradali.
- Integra i cambiamenti della [Villa Mandria v11](https://github.com/Dreamer-archalo/padova-open-world/pull/54): geometria della strada esterna controllata rispetto a confini, acqua ed edifici, correzione/fallback del percorso non sicuro, tratte sterrate di servizio delle Ape Car soltanto in punti percorribili, controllo dei sentieri dei cavalli, personale con zone e routine, riduzione delle ombre a distanza.
- Conserva l'anteprima v11 con menu F8 per il collaudo; i controlli della release includono il test geometrico v11 e i test Chromium/WebGL precedenti e v11.
- Imposta GitHub Pages come indirizzo ufficiale nel manifest e README e aggiorna i gate che richiedevano letteralmente la versione 1.2.0.

**Chiarimento grafica:** il miglioramento grafico aggiuntivo annunciato il 22 settembre non è stato identificato in un commit o PR del repository. Questa release conserva la grafica già presente in `main`, ma non dichiara integrato un sorgente grafico non verificabile.

**Difetti non risolti:** l'audit della #53 segnala ancora 6.505 anomalie ai margini delle strade. Il collaudo automatico non sostituisce test su diversi dispositivi né una reale gara sincronizzata su due dispositivi. I vecchi rami sperimentali di terreno e ponti non sono stati uniti indiscriminatamente.

## Integrazione del 21 settembre 2026 — [PR #53](https://github.com/Dreamer-archalo/padova-open-world/pull/53)

Villa Mandria fino alla v10 e primi interventi di continuità urbana della [PR #52](https://github.com/Dreamer-archalo/padova-open-world/pull/52) incorporati in `main`: strada esterna della proprietà, cavalli/animali/lavoratori, hangar e pattuglie; raccordi di terreno, marciapiedi e rampe selezionate. Collaudo unificato Node e 11 prove Chromium/WebGL superati. Restano anomalie geometriche citywide documentate, senza asserzioni disabilitate.

## Aggiornamenti del 17–19 settembre 2026

- [PR #46](https://github.com/Dreamer-archalo/padova-open-world/pull/46): versionamento, inventario e controlli di regressione.
- [PR #47](https://github.com/Dreamer-archalo/padova-open-world/pull/47): bici e monopattini NPC nei quartieri di Padova.
- [PR #48](https://github.com/Dreamer-archalo/padova-open-world/pull/48): pista Monoblocco sui tetti, diramazioni, ponti, rampe, moto, piloti e tifosi.
- [PR #50](https://github.com/Dreamer-archalo/padova-open-world/pull/50): aeroporto, comandi dei jet, indicatori nemici e missione Caccia aerea.
- [PR #40](https://github.com/Dreamer-archalo/padova-open-world/pull/40) e [#41](https://github.com/Dreamer-archalo/padova-open-world/pull/41): limitazioni delle ricerche taxi e prevenzione di blocchi fuori strada.

## 1.2.0 — baseline del 16 settembre 2026

Release originaria al commit [`c4a29e3`](https://github.com/Dreamer-archalo/padova-open-world/commit/c4a29e33e5bdbbe77113ad2d8ce904d4d0f71b34), conservata in [`release/v1.2`](https://github.com/Dreamer-archalo/padova-open-world/tree/release/v1.2). Include Padova moderna, sistemi di guida, aeroporti e mezzi iniziali, missioni e prime gare. Le integrazioni successive a questa baseline non costituiscono automaticamente versioni numerate autonome. La vecchia indicazione '2.1' era errata.

**Cronologia completa:** [commit di `main`](https://github.com/Dreamer-archalo/padova-open-world/commits/main) · [PR con stato effettivo](https://github.com/Dreamer-archalo/padova-open-world/pulls?q=is%3Apr) · [audit delle regressioni](docs/regression-and-feature-audit-2026-09-17.md).
