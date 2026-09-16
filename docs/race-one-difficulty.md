# Gara 1 — difficoltà dei bot

La schermata di conferma della prima gara permette di scegliere **Facile**, **Medio** (predefinito) o **Difficile**. La scelta viene applicata solo alle tre auto controllate dall'IA nella gara 1. Non vengono alterati veicolo, specifiche o turbo del giocatore; la gara 2 conserva il suo regolamento separato e le auto remote dell'online restano controllate dai rispettivi utenti.

- Facile: abilità 0,72–0,80, senza turbo IA, accelerazione 9,4.
- Medio: abilità 0,975–1,012, tre turbo, accelerazione 14,4; comportamento di riferimento.
- Difficile: abilità 1,045–1,105, tre turbo, accelerazione 16,5.

In Facile/Difficile è disattivato il recupero artificiale delle auto in ritardo ('rubberband') che renderebbe i livelli troppo simili. Restano attivi il controllo collisioni e il ripristino di un bot realmente fuori pista.

Test automatici: `node verify-race-one-difficulty.mjs`, `npm run test:tangenziale-race`, test online. Prova manuale indispensabile: aprire Attività → Gare in tangenziale → Gara 1, scegliere ciascuna difficoltà, controllare countdown, bot e arrivo; ripetere con due giocatori online e con gara 2. I test statici non certificano WebGL reale.
