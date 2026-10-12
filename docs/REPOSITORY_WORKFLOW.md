# Organizzazione repository e flusso di rilascio

## Un riferimento pubblico

- **Codice di produzione:** `main` di `Dreamer-archalo/padova-open-world`.
- **Gioco pubblicato:** [GitHub Pages](https://dreamer-archalo.github.io/padova-open-world/).
- **Versione effettiva:** confrontare il commit e il [manifest distribuito](https://dreamer-archalo.github.io/padova-open-world/version.json).
- **Sviluppi storici:** [archivio delle PR](PR_ARCHIVE.md); non fare merge cumulativi di rami vecchi.

## Una PR, uno scopo

1. Partire dall'ultimo `main`, con nome `feat/<tema>`, `fix/<tema>`, `perf/<tema>` o `docs/<tema>`.
2. Esplicitare problema, modifica, test e impatto su elementi esistenti.
3. Aprire una PR **Draft** per codice incompleto, pubblicando solo anteprime isolate.
4. Evitare di riutilizzare una PR vecchia per un cambiamento totalmente nuovo.
5. Integrare dopo verifica dei controlli pertinenti e prova del gameplay. Non usare il verde di GitHub Actions come prova che tutte le interazioni funzionino.
6. Dopo il rilascio, chiudere/archiviare la PR superata e scrivere il riferimento nel changelog. Non cancellare branch sperimentali senza controllo delle modifiche residue.

## Come verificare

- `npm test` — verifiche di base di città e terreno.
- `npm run test:initial-world` — avvio e strutture iniziali.
- `npm run test:taxi` — taxi.
- `npm run test:tangenziale-race` — gare.
- `npm run test:geometry-integrity` — test geometria; gli errori vanno esaminati, non ignorati.
- `npm run test:villa-performance` — verifica R43.

Alcuni test browser richiedono Playwright/Chromium e dati regionali recuperati dalla distribuzione; documentare prerequisiti, durata e ambiente della prova. I workflow specializzati esistono per scopi storici: evitare di farli girare tutti su modifiche puramente documentali, ma mantenere copertura reale quando cambia il runtime.

## Standard pubblico

- README breve, link pubblici funzionanti, descrizione accurata dello stato.
- Changelog per le release **pubblicate**, non per ogni anteprima.
- Una sola destinazione ufficiale di deploy; Netlify storico non equivale a Pages.
- I test falliti devono rimanere visibili con una causa tracciabile.
- Evitare nuove PR prive di descrizione, vecchi rami come base e dichiarazioni di feature «risolta» senza collaudo.

Per ora GitHub Issues è disabilitato per questo repository: la lista delle verifiche residue si trova in [PROJECT_STATUS.md](PROJECT_STATUS.md).
