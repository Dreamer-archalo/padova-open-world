# Archivio delle Pull Request · 12 ottobre 2026

Le PR storiche vengono **chiuse, non cancellate**. I branch, i commit e le discussioni rimangono consultabili. Questo elenco serve a evitare merge tardivi che sovrascrivano il lavoro pubblicato.

## Già contenute nella cronologia di `main`

Verifica Git: il branch della PR è antenato di `main` (nessun commit esclusivo non incluso).

| PR | Area |
| --- | --- |
| [#58](../pull/58) | Venezia, prima mappa |
| [#59](../pull/59) | Padova–Venezia e mondo continuo |
| [#61](../pull/61) | Mappa regionale integrata |
| [#62](../pull/62) | Caricamento Venezia |
| [#63](../pull/63) | Taxi regionale |
| [#66](../pull/66) | Concessionari nei fabbricati |
| [#67](../pull/67) | Quote e raccordi stradali R21 |

## Sviluppi poi sostituiti da release cumulative

| PR | Area | Motivo chiusura |
| --- | --- | --- |
| [#51](../pull/51) | Villa della Mandria v10 | Evoluta in pubblicazioni successive |
| [#76](../pull/76) | HUD R34 | Superata dall'integrazione corrente |
| [#77](../pull/77) | Sagome auto R33 | Superata dalla linea veicoli R35–R41 |
| [#78](../pull/78) | Pacchetto NPC/veicoli R31–R33 | Pubblicazione cumulativa successiva |
| [#82](../pull/82) | R37 officine e garage | Evoluta nei rilasci R35–R41 |

**Importante:** questi branch risultavano divergenti rispetto a `main`. La chiusura non certifica l'uguaglianza integrale dei file; eventuali dettagli mancanti vanno riproposti su branch nuovi.

## Esperimenti e interventi da riesaminare

Queste PR conservano sorgenti o idee che **non è corretto unire indiscriminatamente** nell'ultima versione.

| PR | Tema da valutare | Priorità di analisi |
| --- | --- | --- |
| [#13](../pull/13) | Avvio gare moto / chiese | Quando si rivedono le gare |
| [#33](../pull/33), [#43](../pull/43) | Accessi e viabilità aeroporto | Audit viabilità |
| [#35](../pull/35), [#45](../pull/45), [#49](../pull/49) | Quote, Bassanello, ponti, marciapiedi | **Alta: geometria e test** |
| [#38](../pull/38) | Impalcati e piloni | Audit ponti |
| [#39](../pull/39) | Tetto Monoblocco | Test fisico e collisioni |
| [#42](../pull/42) | Test browser avvio/taxi | Consolidamento QA |
| [#60](../pull/60) | Prototipo barche | Revisione navigazione |
| [#64](../pull/64) | NPC intelligenti Padova R17 | Revisione traffico e pedoni |

Per ciascuna proposta non completamente recuperata: verificare prima la funzionalità in `main`; se manca ancora, creare un ticket nell'eventuale tracker o una **nuova PR piccola, da `main`**, con prove attuali. Nessun branch storico deve essere cancellato come effetto di questo archivio.

Il repository ha attualmente le GitHub Issues disabilitate; i problemi aperti sono elencati in [PROJECT_STATUS.md](PROJECT_STATUS.md).
