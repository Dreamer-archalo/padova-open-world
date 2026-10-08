# Mappa, riparazioni a casa e consegna privata R41

Base R40 (42f8f27e). Anteprima separata `preview/map-home-services-r41/`.

La mappa M raggruppa officine, concessionari, casa/garage, luoghi e destinazioni in schede chiuse. Ogni categoria usa lo stesso colore e simbolo nella legenda e nei marcatori. Meno HUD nasconde punti, posizione, destinazione, percorso, legenda ed elenco; Più HUD li ripristina. La preferenza viene conservata; la scelta destinazione del taxi resta utilizzabile. Zoom, trascinamento, indicatore e spostamenti rapidi sono mantenuti.

A casa compare il pulsante Garage di casa · Riparazioni · V. Nel menu V ogni mezzo danneggiato disponibile nel garage ha un preventivo di riparazione, con lo stesso costo dell'officina. Una vettura ferma e danneggiata nel garage mostra anche E · Ripara. Saldo e vita sono aggiornati e salvati; nessuna riparazione a distanza o di relitti distrutti.

Il configuratore offre ritiro incluso nel salone oppure trasporto privato a casa (€350 di gioco). Il totale comprende il trasporto prima della conferma. Il mezzo acquistato arriva in un posto libero verificato nel garage e viene salvato immediatamente, con tutti gli optional. Nessun duplicato di mezzi posseduti; se non c'è spazio oppure denaro sufficiente, l'acquisto non viene addebitato. Il giocatore rimane al concessionario.

Verifiche: suite R41 sui posti reali della villa, consegna auto/camion senza sovrapposizioni, addebito esatto, doppio acquisto bloccato, riparazioni a piedi e alla guida, rifiuto di saldo insufficiente/relitti/riparazioni remote/garage pieno. Browser desktop e telefono per categorie, legenda, HUD mappa, percorso officina, acquisto con trasporto e salvataggio, riparazione domestica. Regressioni R40/R39/R37 e npm test.
