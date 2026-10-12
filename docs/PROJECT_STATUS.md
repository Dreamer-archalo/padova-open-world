# Stato del progetto · 12 ottobre 2026

Questa pagina distingue **codice in produzione**, **verifiche automatiche** e **problemi ancora da testare**. Non è una certificazione di perfetta funzionalità.

## Versione pubblica

- Repository: [Dreamer-archalo/padova-open-world](https://github.com/Dreamer-archalo/padova-open-world), branch `main`.
- Sito di gioco: [GitHub Pages](https://dreamer-archalo.github.io/padova-open-world/).
- Ultimo commit di pubblicazione verificato durante la revisione: [`bda197a`](https://github.com/Dreamer-archalo/padova-open-world/commit/bda197a99c8012c76a88952a0169e445a4830c13), **11 ottobre 2026** (R43). Il deploy GitHub Pages relativo risulta **riuscito**.
- Numero di versione nel manifest: **1.2.1** (identificatore precedente, non aggiornato alle sigle R).
- Sito Netlify storico: non assumere che sia sincronizzato con GitHub Pages.

## Funzioni pubblicate negli ultimi aggiornamenti

| Fase | Area di lavoro | Stato documentato |
| --- | --- | --- |
| R31–R34 | Traffico, mezzi, NPC e HUD contestuale | Integrazioni della linea di sviluppo pubblicate in `main` |
| R35–R41 | Varietà veicoli, concessionari, officine e servizi | Pubblicazione cumulativa del 9 ottobre |
| R42 | Atterraggio e guida sui tetti, salti consecutivi | Pubblicazione del 10 ottobre |
| R43 | Ottimizzazione avvio e rendering della Villa | Pubblicazione dell'11 ottobre |

**«Pubblicato» non significa «privo di bug».** Una PR storica può avere contenuti divergenti anche quando la sua funzionalità è stata ripresa in una pubblicazione più recente.

## Punti da verificare prima di definirli risolti

- **Geometria:** quote di strade e marciapiedi, ponti, sottopassi, rampe e dislivelli. Gli audit storici hanno evidenziato errori; vanno rieseguiti sull'ultima `main`.
- **Mobilità e collisioni:** atterraggi sui tetti, camion-rampa, comando 9, interazioni moto/barche e danni.
- **Concessionari e officine:** posizione dei personaggi, anteprima delle modifiche, spawn e guidabilità dei veicoli acquistati.
- **Prestazioni:** tempi di caricamento e stabilità del frame rate nella Villa e nella regione di Venezia su PC e dispositivi differenti.
- **Online:** test reali con due dispositivi per gare, lobby e sincronizzazione.
- **Release pipeline:** riduzione dei workflow storici e verifica dei job con errori reali, senza rimuovere i test che proteggono la produzione.

I documenti [problemi noti 1.2](release-v1.2-known-issues.md) e [audit delle regressioni](regression-and-feature-audit-2026-09-17.md) sono **storici** e non descrivono automaticamente lo stato di ottobre.

## Regole di verifica

1. Controllare il **commit pubblicato**, non soltanto l'esistenza di un ramo o di una PR.
2. Distinguere passaggio dei test Node e collaudo manuale WebGL.
3. Non disabilitare un test rosso per simulare una release stabile: annotare il problema e correggere la causa.
4. Prima di dichiarare un bug risolto, registrare scenario riproducibile, commit, browser e test eseguiti.

[Gioca](https://dreamer-archalo.github.io/padova-open-world/) · [Deploy Pages](https://github.com/Dreamer-archalo/padova-open-world/actions/workflows/github-pages.yml) · [Archivio PR](PR_ARCHIVE.md)
