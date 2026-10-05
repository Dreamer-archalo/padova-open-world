# R29 — garage visivo, turbo e gara equa

Gara 1 passa dalla scelta della difficoltà a un garage separato, prima del countdown. Offre esattamente 30 modelli distinti, incluso il Taxi abusivo e tutti i 15 veicoli da collezione. Le immagini sono render dei modelli reali del gioco, generate con un unico contesto WebGL temporaneo. La selezione mostra velocità, maneggevolezza, turbo e resistenza con barre percentuali accessibili; ogni valore deriva dalle specifiche utilizzate in gara.

SHIFT consuma una delle tre cariche: impulso iniziale di 8 m/s, accelerazione 2,2 volte superiore e limite di velocità realmente aumentato per 2,6 secondi. I profili danno +26–32% di velocità massima. La fisica principale utilizza questo limite, evitando che il fotogramma successivo annulli il boost. La Cinquecento non riceve il turbo illimitato di TAB durante la gara.

In difficile i bot usano il 94–98% del limite del proprio mezzo e non superano la sua accelerazione o autorità di sterzo. Il turbo e i danni sono condivisi con il giocatore. La gara non assegna tempi finti e non teletrasporta gli avversari avanti per recuperare uno svantaggio. Le collisioni tra mezzi vengono controllate durante i sottopassi di movimento dei bot; gli urti riducono velocità e salute, con 0,8 secondi di protezione dal conteggio ripetuto dello stesso contatto. I mezzi robusti subiscono meno danni, mentre moto e scooter sono più delicati. A salute zero, giocatore e bot tornano al proprio checkpoint. Un impatto rapido non fa esplodere immediatamente il giocatore fuori dalla gara.

I gruppi di tifosi aumentano da 12 a 28 a 48 secondo la difficoltà, con fino a 10 spettatori per gruppo. Ogni posizione viene controllata contro tutte le strade vicine, edifici e acqua. Ponti e gallerie vengono esclusi. I tifosi, le rampe e i segnali restano in un'unica mesh statica.

## Verifica

- `npm run test:race-immersion`: sei gare complete a 30/60 Hz con modelli diversi, posizione dei tifosi, collisioni e pulizia dello stato; 24 casi di decollo/atterraggio su rampe reali; prova dell'acceleratore e SHIFT nel controller principale, quattro modelli; collisione reale di bot contro ostacolo; resistenza, cariche e checkpoint.
- `node tools/verify-race-one-r27.mjs`: nove gare con la stessa auto a 20/30/60 Hz, progressione della difficoltà e geometria dei ponti.
- `npm run test:tangenziale-race`: regressioni di entrambe le gare, rampe, ponti e traguardo.
- Chromium: due fasi del menu, 30 immagini reali, quattro barre, gare complete facile/medio/difficile, rampe visuali e fisiche, spettatori e seconda gara.

Misura locale sulla Cinquecento a piena salute, con acceleratore premuto: 62 → 81,84 m/s (223 → 295 km/h), 132,14 → 179,67 metri in 2,4 secondi. Taxi, Fiamma e Cobalto mostrano circa 45–47 metri aggiuntivi nello stesso test. I risultati di una gara con ostacoli possono variare: anche i bot sbagliano e subiscono danni reali.

Anteprima: https://dreamer-archalo.github.io/padova-open-world/preview/race-selection-r29/
