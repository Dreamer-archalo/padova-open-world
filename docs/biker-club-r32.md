# La banda delle impennate — R32

Missione aggiunta alla versione locale di R31. Il sito pubblico non è stato aggiornato.

## Come provarla

Avviare `npm run dev`, aprire il gioco e selezionare **J → La banda delle impennate**. Si può accettare una prova anche a piedi; il pulsante **Richiedi una Prato 800** usa la consegna dei mezzi già presente. Raggiungere il marker del raduno in **Via Austria**, fermarsi sulla corsia indicata e allinearsi al percorso. Tre motociclisti aspettano il giocatore prima della partenza; segue un conto alla rovescia di tre secondi.

- **Ruota a ruota**: mantenere la formazione per 18 secondi, a 8–24 m dal capogruppo; velocità suggerita circa 43 km/h. Premio iniziale €250 e Prato 800 Club Oro.
- **Una ruota sola**: tenere **B** e percorrere 20 m consecutivi in impennata fra le due linee verdi. Restare fra 30 e 85 km/h. Premio iniziale €350 e Argine 450 Club Petrolio.
- **Due salti, zero cadute**: centrare entrambe le rampe a 35–90 km/h e atterrare sulla propria corsia. Vengono verificati il decollo e l’atterraggio della fisica reale, oltre a velocità, direzione e danni. Premio iniziale €500 e Saetta 1000 Club Viola.

Le tre edizioni Club mantengono la guida delle rispettive moto base; hanno livree e dettagli distinti. Diventano disponibili sia in **V → Moto e bici** sia nell’**hangar**, dopo aver superato la prova corrispondente. Le ricompense monetarie sono assegnate una sola volta; le prove restano ripetibili e salvano il tempo migliore nel browser.

Dopo tutte e tre le prove, **Richiama il gruppo** crea tre motociclisti dietro il giocatore, da fermo su una strada libera. Seguono il percorso effettivamente guidato, usando la fisica dei mezzi e frenando davanti agli ostacoli. Non vengono teletrasportati per recuperare distanza. **Congeda il gruppo** rimuove i tre NPC. Cambio mezzo, discesa dalla moto, recupero o trasferimento interrompono il giro; se il gruppo resta molto lontano viene congedato e può essere richiamato.

Lasciare la moto, cambiare mezzo, subire danni, uscire dalla corsia, recuperare con **R** o esaurire il tempo interrompe la prova. Annullamento e completamento rimuovono NPC e rampe della missione. Le moto premio sono escluse dagli spawn del traffico casuale. I precedenti Time Attack vengono interrotti quando parte un’altra attività, evitando due percorsi contemporanei. Il pannello della missione è visibile anche con HUD compatto.

## Verifica

- `npm run test:biker-club`: controller reale a 30 e 60 Hz, tutte le prove, progressi persistenti, ricompense iniziali, annullamenti e pulizia, gruppo limitato a tre, movimento senza teletrasporti, frenata davanti all’ingombro della cisterna, conservazione della moto presa dal giocatore, dati salvati corrotti.
- `PADOVA_CHROMIUM_EXECUTABLE=… node tools/test-biker-club-browser.mjs`: caricamento WebGL, menu J e V, tasto B reale, tutte le prove con il controller, catalogo hangar, HUD compatto, recupero R, richiamo/congedo e persistenza dopo ricarica. Controlla inoltre che le superfici delle rampe visibili corrispondano alla fisica.
- `npm test`, `npm run test:npc-traffic`, `npm run test:multilane`, `npm run test:phase3-runtime`, `npm run test:vehicle-damage`, `npm run test:jumps`: regressioni della città, traffico, pedoni, precedenti attività moto, danni e salti.

Risultati dettagliati in `biker-club-results.json` e `biker-club-browser-results.json`. Non viene dichiarato un benchmark FPS su dispositivi reali. La versione resta locale e non è ancora pubblicata.
