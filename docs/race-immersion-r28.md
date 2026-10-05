# Gara 1: percorso progressivo e mezzi variabili (R28)

Base: `c28f0244cbeceaf741ab5f8451cbeb4a37b1739b` (R27, PR #71). Anteprima autonoma; nessun merge in main.

| Livello | Rampe facoltative | Rallentatori | Mezzi fermi | Mezzi lenti | Gruppi di pubblico |
| --- | ---: | ---: | ---: | ---: | ---: |
| Facile | 1, alta 0,85 m | 0 | 1 | 0 | 2 |
| Medio | 2, alte 1,25 m | 1 | 3 | 1 | 5 |
| Difficile | 3, alte 1,65 m | 2 | 5 | 2 | 8 |

I punti sono scelti solo su tratti rettilinei senza ponti, gallerie o dislivelli bruschi. Ogni evento lascia una corsia alternativa. Gli ultimi 520 m sono esclusi. Se la mappa cambia e non offre un punto valido, l'evento viene omesso. Segnali fisici, avvisi di distanza/lato e marcatori sulla minimappa accompagnano gli eventi. Pubblico e segnaletica sono geometrie statiche aggregate in un'unica mesh. I mezzi lenti partono quando il primo concorrente si avvicina e percorrono un tratto finito, senza teletrasporti ciclici.

Il menu prima della gara permette di scegliere un mezzo stradale dal catalogo esistente. Restano modello e dimensioni; le specifiche della sola auto di gara sono copiate e bilanciate. Profili: agile (62 m/s, accelerazione 16,2), equilibrato (65/15), veloce (68/13,8), stabile (63,5/14,8). Tutti hanno tre turbo di gara; niente vantaggio speciale con il turbo TAB della Cinquecento. Le specifiche globali e i mezzi posseduti non vengono modificati. Aerei, barche, cingolati, blindati e mezzi troppo grandi non sono idonei a questo percorso.

Tre bot con modelli distinti e preferenza per modelli non usati nella gara precedente. Catalogo più tranquillo in facile, più sportivo in difficile; il controller R27 mantiene accelerazione, curve e turbo crescenti per difficoltà. I bot considerano anche le rampe/rallentatori nella scelta della corsia e possono evitarli. Ogni rallentatore applica la stessa penalità a giocatore e bot, una sola volta; nessuna penalità a un mezzo che lo sorvola.

Uscita e risultati ripristinano la situazione precedente e rimuovono mezzi, rampe e decorazioni temporanee. Gara 2 mantiene le sette auto e il proprio regolamento. L'ingresso tradizionale resta in modalità locale; il vecchio multiplayer non riceve allestimenti R28.

Verifiche riproducibili:
- `npm run test:race-immersion`: catalogo, prestazioni, griglie variabili, eventi su dati reali, completamento bot a 30/60 Hz, ripristino, penalità e 24 salti con fisica reale.
- `node tools/test-race-immersion-r28-browser.mjs`: avvio WebGL, selettore, tre gare complete, superfici renderizzate delle rampe, pulizia e conservazione della gara 2.
- Workflow `race-immersion-r28-preview.yml`: regressioni R27, sottopassi e strade R25; pubblicazione isolata con confronto byte per byte della produzione.

La QA sul telefono dell'utente e la valutazione soggettiva del bilanciamento restano da fare nella preview.
