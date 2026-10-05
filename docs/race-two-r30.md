# Gara 2 avanzata R30

La difficoltà precede il garage con 30 modelli reali e quattro barre percentuali. La seconda gara usa sette mezzi distinti, comprese le stesse specifiche bilanciate, i tre turbo SHIFT e i danni della gara 1. Il taxi abusivo resta selezionabile. La preparazione online mantiene il percorso di lobby precedente.

| Elemento | Facile | Medio | Difficile |
|---|---:|---:|---:|
| Rampe | 6 | 8 | 10 |
| Rampe trappola con atterraggio lento | 1 | 2 | 3 |
| Zone lente lunghe | 2 × 30 m | 3 × 44 m | 4 × 60 m |
| Serie di tre sprint | 2 | 3 | 4 |
| Piattaforme sprint sulle due carreggiate | 12 | 18 | 24 |
| Mezzi fermi | 3 | 5 | 7 |
| Tifosi sul tracciato reale | 140 | 270 | 412 |

Gli eventi fisici sono collocati sui rettilinei sicuri, senza ponti o gallerie; le zone lente lasciano una corsia libera. Gli sprint rinnovano un incremento limitato dalla specifica del mezzo e non consumano SHIFT. Le rampe trappola hanno colore rosso, segnalazione preventiva e zona di atterraggio lenta. Gli stessi sprint e rallentamenti si applicano a giocatore e bot.

Il corridoio riconosce la carreggiata parallela in senso opposto in tutti i 130 campioni della gara. Il progresso è una proiezione continua, senza vincoli di senso di marcia, e il traguardo comprende entrambe le carreggiate. La verifica delle superfici impedisce di accettare una strada sotto un ponte. Una vettura sana che esce dal percorso conserva i danni dopo il recupero, senza avanzare il checkpoint; una vettura distrutta viene riparata. I vecchi recuperi che avanzavano i piloti e la cancellazione degli eventi negli ultimi 1.350 metri sono esclusi dalla versione avanzata.

Verifiche locali effettuate sul vero mondo e controller:

- Sei gare complete con sei bot: tre difficoltà a 30 e 60 Hz, senza recuperi falsi per cambi di segmento stradale.
- 520 controlli di carreggiata e direzione per difficoltà, più esclusione delle strade sottostanti e attraversamento del traguardo su entrambe le carreggiate.
- Stesse zone lente e catene sprint per giocatore e bot, senza consumo delle cariche SHIFT.
- Gara difficile con 500 Turbo e reali comandi di sterzo e acceleratore sulla carreggiata opposta: 58,50 s, secondo posto dietro il primo bot a 57,97 s, nessun recupero, resistenza finale 99,07%.
- Rimozione di vetture, rampe, pubblico e props temporanei e ripristino dello stato precedente a fine gara.

`npm run test:race-two` esegue il percorso reale e il riferimento con i comandi. `PADOVA_R30_HZ=30 node tools/verify-race-two-r30.mjs` ripete il percorso a 30 Hz. Il playtest Chromium verifica garage, immagini, geometria delle rampe, pubblico, entrambe le carreggiate e tre gare complete; la pubblicazione ufficiale esegue anche le regressioni del resto del gioco.
