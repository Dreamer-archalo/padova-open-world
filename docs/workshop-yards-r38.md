# Officine R38 · piazzali e vita quotidiana

Le sette officine della versione `preview/fleet-r36` mantengono il catalogo di prestazioni, sicurezza e riparazioni R37. L'indicatore sulla mappa punta ora all'imbocco sulla strada carrabile. Se il primo tratto vicino all'indirizzo è occupato da edifici, l'officina cerca un tratto libero nello stesso quartiere.

Ogni officina ha un cartello visibile dalla strada, pavimentazione collegata alla carreggiata, un garage aperto con pareti solide, una piazzola libera per il mezzo del giocatore e un'auto parcheggiata nell'altra. Due meccanici e due clienti si muovono e conversano. I loro piedi seguono la quota esatta del terreno, anche nei piazzali in pendenza. La zona per modificare e riparare resta raggiungibile fermandosi nella piazzola con un mezzo funzionante.

Verifiche: `node --max-old-space-size=3072 tools/verify-workshop-yards-r38.mjs` controlla tutti gli ingressi sulla mappa reale, parcheggi liberi da edifici e acqua, collisione delle pareti e altezza/movimento dei personaggi. La prova Chromium in GitHub Actions controlla anche i sette piazzali nel gioco e salva `workshop-yard.png` nell'artefatto di revisione visiva.
