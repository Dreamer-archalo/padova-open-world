# Auto R35 — revisione estetica in preview

Base: main 4475ce9, con gli aggiornamenti approvati NPC R31, moto/Biker Club, barche/hangar/collisioni R33 e HUD R34. Integra i 30 modelli stradali della preview R33, senza ripristinare la sua vecchia interfaccia.

- Carrozzerie sagomate da sezioni, passaruota e spalle arrotondate; proporzioni distinte per city car, hatchback, berlina, fastback, wagon, shooting brake, SUV, monovolume, van, pickup, coupé e spider.
- Dopo la prima revisione delle immagini WebGL sono stati arrotondati abitacoli e vetri dei modelli moderni, corretti i frontali e aggiunti appoggi alle barre sul tetto.
- Quattro classi di materiale condivise: vernice con grana procedurale locale, vetro, metallo e gomme/finiture. Riflesso ambientale locale del cielo su vetro, vernice e metallo. UV, normali, colori e maschera vernice sopravvivono al batching. Nessun asset esterno.
- Ruote con pneumatici, battistrada, recessi e raggi; finitura standard 70%, grafite 22%, nero 5,5%, bronzo 1,9%, bianco 0,4%, oro 0,2%. Livree adatte alle famiglie: bicolore, filetto o doppia striscia; mezzi commerciali senza strisce sportive casuali.
- Cache delle varianti limitata: dopo 80 allestimenti si usa l'allestimento standard per gli ulteriori modelli. La densità del traffico e le specifiche di guida restano quelle del gioco.
- Anche le auto base, MiTo e Cinquecento usano il nuovo costruttore. Le auto da collezione R26, il taxi caratteristico, le moto e i mezzi speciali conservano le loro identità.
- Hangar e concessionari condividono i modelli reali; la verniciatura conserva cerchi, pneumatici, vetri e tetto bicolore.
- Il livello grafico semplificato conserva la sagoma e i colori invece di usare il parallelepipedo generico. Modello normale: 4 draw call; distante: 1. Meno di 5.000 triangoli per auto ordinaria.

Verifica specifica: tutti i 30 modelli, dimensioni e dati finiti, quattro superfici, texture presente, silhouette LOD, verniciatura, parità concessionario/hangar, 200.000 estrazioni delle finiture e blocco delle moto premio nel traffico. Verifica Chromium: tutte le auto renderizzate, vista anteriore/posteriore e varianti, avvio del gioco e miniatura GPU nell'hangar.

Il test generale di performance falliva già su main 4475ce9: includeva la scenografia fissa nel rapporto richiesto per la riduzione degli attori. Il controllo ora misura le chiamate degli attori per quel rapporto, mantenendo nel report anche le chiamate e i triangoli totali. Le misure CPU/draw call non costituiscono una promessa di FPS sui dispositivi degli utenti.

Solo anteprima: nessun merge del gameplay in main.
