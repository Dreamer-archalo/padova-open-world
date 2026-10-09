# Mappa, riparazioni a casa e consegna privata R41

Base R40 (42f8f27e). Anteprima separata `preview/map-home-services-r41/`.

La mappa M raggruppa officine, concessionari, casa/garage, luoghi e destinazioni in schede chiuse. Ogni categoria usa lo stesso colore e simbolo nella legenda e nei marcatori. Meno HUD nasconde punti, posizione, destinazione, percorso, legenda ed elenco; Più HUD li ripristina. La preferenza viene conservata; la scelta destinazione del taxi resta utilizzabile. Zoom, trascinamento, indicatore e spostamenti rapidi sono mantenuti.

A casa compare il pulsante Garage di casa · Riparazioni · V. Nel menu V ogni mezzo danneggiato disponibile nel garage ha un preventivo di riparazione, con lo stesso costo dell'officina. Una vettura ferma e danneggiata nel garage mostra anche E · Ripara. Saldo e vita sono aggiornati e salvati; nessuna riparazione a distanza o di relitti distrutti.

Il configuratore offre ritiro incluso nel salone oppure trasporto privato a casa (€350 di gioco). Il totale comprende il trasporto prima della conferma. Il mezzo acquistato arriva in un posto libero verificato nel garage e viene salvato immediatamente, con tutti gli optional. Nessun duplicato di mezzi posseduti; se non c'è spazio oppure denaro sufficiente, l'acquisto non viene addebitato. Il giocatore rimane al concessionario.

Verifiche: suite R41 sui posti reali della villa, consegna auto/camion senza sovrapposizioni, addebito esatto, doppio acquisto bloccato, riparazioni a piedi e alla guida, rifiuto di saldo insufficiente/relitti/riparazioni remote/garage pieno. Browser desktop e telefono per categorie, legenda, HUD mappa, percorso officina, acquisto con trasporto e salvataggio, riparazione domestica. Regressioni R40/R39/R37 e npm test.

## Camion rampa e salto con 9

Tre camion rampa permanenti nel traffico, con pianale percorribile, bordi gialli, frecce e accesso posteriore a filo strada. La fisica e il modello condividono le stesse misure; la salita e il distacco funzionano anche in movimento. Gli urti sui lati e frontali restano attivi.

Alla guida, **9** o **9 del tastierino** avvia un salto verticale di **50 metri** sopra la quota iniziale, mantenendo il moto orizzontale. L’atterraggio del salto speciale sottrae **un punto vita**, anche con protezioni aggiuntive, senza danno da caduta o esplosione. Non è riattivabile in volo e non modifica i danni dei salti normali.

Verifica: `npm run test:truck-jumps`, `npm run test:jumps`, test R36 e controllo Chromium integrato nel test R41. La pubblicazione aggiorna lo stesso URL di prova R41.
