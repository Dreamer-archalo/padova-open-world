# Contribuire e pubblicare · Padova After Hours 1.2

## Un solo repository di riferimento

La sorgente ufficiale del progetto è **[`Dreamer-archalo/padova-open-world`](https://github.com/Dreamer-archalo/padova-open-world)**, ramo **`main`**. Questa edizione deriva da `scandolo/padova-open-world`, ma le nuove modifiche e le Pull Request devono avere come destinazione `Dreamer-archalo/padova-open-world:main`.

Una modifica va proposta su un ramo derivato dall'ultimo `main`, verificata in modo mirato e integrata senza sovrascrivere modifiche successive. I rami sperimentali o non aggiornati non vanno uniti indiscriminatamente.

## Dove si gioca

- **[GitHub Pages](https://dreamer-archalo.github.io/padova-open-world/)** — pubblicazione collegata a `main`, tramite [workflow GitHub Pages](.github/workflows/github-pages.yml). [Controlla la versione effettivamente pubblicata](https://dreamer-archalo.github.io/padova-open-world/version.json).
- **[Netlify — sito storico del progetto](https://padova-open-world.netlify.app/)** — destinazione ufficiale prevista dalla documentazione della release, ma da sincronizzare con il `main` canonico. Non dedurre che un deploy Pages aggiorni anche Netlify.
- **ChatGPT Site precedente:** indirizzo separato, da non confondere con la distribuzione canonica o con il deploy Netlify.

Non creare un altro sito per pubblicare questo progetto. Conservare gli identificativi e i domini degli ambienti esistenti.

## Flusso di aggiornamento

1. Modificare il codice in un ramo creato dall'ultimo `main` di questo repository.
2. Eseguire i test specifici e aprire una PR breve, indicando novità e limiti.
3. Integrare in `main` solo i cambiamenti verificati. GitHub Pages si aggiorna tramite workflow **solo se il deploy supera i controlli**.
4. Per Netlify, verificare che il progetto esistente sia collegato al repository e al ramo corretti; controllare che il suo commit pubblicato corrisponda al commit che si intende distribuire.
5. Confrontare il commit effettivamente pubblicato e [`dist/version.json`](dist/version.json). I test automatici non sostituiscono il collaudo WebGL, il test su due dispositivi per l'online e le verifiche di geometria su strada.

Il sito distribuisce l'intera cartella `dist/`, comprese dipendenze locali, dati, CSS e moduli. Non mescolare file appartenenti a commit diversi.

Riferimenti: [documento di rilascio 1.2](docs/release-v1.2.md), [inventario delle funzionalità](docs/release-v1.2-completeness-audit.md), [problemi noti](docs/release-v1.2-known-issues.md).
