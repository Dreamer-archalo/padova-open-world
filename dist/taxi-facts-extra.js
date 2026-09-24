const EXTRA_TAXI_FACTS = [
  'Sapevi che il sistema base dei veicoli urbani definisce 11 famiglie diverse, prima ancora di contare velivoli e mezzi speciali?',
  'Durante il viaggio in taxi il gioco precarica strade e collisioni della zona di arrivo, poi continua a costruire i dettagli mentre riprendi a giocare.',
  'Nella primissima versione del gioco c’era praticamente un solo modello di auto. Adesso il parcheggio ha sviluppato una personalità propria.',
  'All’aeroporto puoi trovare tre tipi diversi di aerei: Rondone, Albatros e Libellula. Sì, hanno tutti nomi da fauna locale non autorizzata.',
  'Falco e Levante sono gli elicotteri del gioco. Uno sembra professionale, l’altro sembra sapere cose che tu non sai.',
  'La Cinquecento Turbo ti concede circa 6 secondi di gloria. Il settimo è una questione tra te, il motore e la fisica.',
  'A cinque stelle la polizia smette di discutere: nel gioco possono arrivare anche i carri armati.',
  'Il Portavalori paga €1.000. Il Taxi abusivo, invece, prende i soldi prima di farti riflettere sulle tue scelte.',
  'Il Cargo Duo ha due rimorchi. Perché uno solo sarebbe stato un segno di moderazione.',
  'Il Cargo 16 non ha fretta. È la strada che deve imparare ad aspettare lui.',
  'La Notturna è una cruiser. Perfetta per attraversare Padova con l’energia di chi ha detto “faccio solo un giro”.',
  'Il Bastione è il carro armato verde. La sua filosofia di parcheggio è: “spostatevi voi”.',
  'Nel gioco puoi aprire il paracadute in volo e provare ad atterrare sui tetti. Il Comune non ha approvato il regolamento.',
  'Premendo F3 c’è un pannello tecnico nascosto. Non rende il gioco più veloce, ma ti permette di guardare i numeri con aria competente.',
  'Le rampe sulle tangenziali sono state aggiunte perché rispettare sempre il codice della strada era diventato ripetitivo.',
  'Alcune auto NPC adesso sorpassano, rientrano e cambiano corsia. Altre mantengono viva la tradizione del “io resto qui”.',
  'Se arrivi molto più veloce da dietro, qualche NPC può lasciarti la corsia. Qualche altro difende il territorio.',
  'Il traffico distingue sportive, compatte e mezzi pesanti. Il camion continua a non avere alcun interesse per la tua fretta.',
  'Prato della Valle nel gioco è grande quasi quanto la discussione su quale uscita prendere dalla rotatoria.',
  'Portello: studenti, ponte, università e la sensazione che qualcuno abbia sempre un esame domani.',
  'Bassanello nelle ore di punta è già praticamente una missione secondaria, anche senza HUD.',
  'Arcella non è un DLC. È già nella mappa.',
  'La Zona Industriale è il posto perfetto per scoprire quanto può sembrare piccolo un veicolo accanto a un camion.',
  'A Padova le biciclette sono trasporto. Nel gioco, prossimamente, saranno anche un ottimo motivo per guardare prima di sterzare.',
  'La mappa usa una scala vicina a 1:1: un metro nel mondo reale vale circa un metro nel gioco. Anche quando vorresti che la strada fosse più corta.',
  'Il mondo giocabile copre grossomodo 13 × 13 km. Il Taxi abusivo considera comunque tutto “qua vicino”.',
  'Il taxi ha un limite tariffario di €100. L’autista ha invece un limite di pazienza non documentato.',
  'Il tassista porta gli occhiali da sole anche quando non servono. Fa parte della certificazione professionale.',
  'Il caricamento del Taxi abusivo è una vera fase di prefetch. La pixel-art serve a distrarti mentre la città prova a materializzarsi.',
  'Il tram è formato da due elementi. Bloccarlo con l’auto resta una pessima idea scientificamente verificabile.',
  'Cadere in acqua non sblocca Venezia: il gioco ti recupera automaticamente sulla terraferma.',
  'L’aeroporto contiene hangar, pista, piazzali e mezzi pilotabili. Il duty free non è ancora stato implementato.',
  'Se vedi un Albatros sulla pista, ricordati che “sembra abbastanza largo” non è una procedura di decollo.',
  'Il Rondone è l’aereo sportivo. Ideale per trasformare “faccio un giro sopra Padova” in un problema logistico.',
  'La Libellula è leggera. Il nome è elegante; l’atterraggio dipende interamente da te.',
  'Nel gioco esistono veicoli che non compaiono nel menu: devi trovarli fisicamente. È il metodo ufficiale “vediamo cosa c’è dietro quell’hangar”.',
  'La villa è il punto di partenza e respawn. In altre parole: casa dolce casa, soprattutto dopo cinque stelle.',
  'Il Taxi abusivo non giudica la destinazione. Il codice, a volte, sì.',
  'Il vero boss finale di Padova non è la polizia: è arrivare a destinazione senza dire “ma questa strada dove porta?”.'
];

let extraTaxiFactIndex = Math.floor(Math.random() * EXTRA_TAXI_FACTS.length);

function showExtraTaxiFact() {
  const fact = document.getElementById('taxiFact');
  if (!fact) return;
  extraTaxiFactIndex = (extraTaxiFactIndex + 1) % EXTRA_TAXI_FACTS.length;
  fact.textContent = EXTRA_TAXI_FACTS[extraTaxiFactIndex];
}

function installExtraTaxiFacts() {
  const loading = document.getElementById('taxiLoading');
  const next = document.getElementById('taxiNext');
  const meme = document.getElementById('taxiMeme');
  if (!loading || !next || !meme) return;

  const afterGameHandler = () => setTimeout(showExtraTaxiFact, 0);
  next.addEventListener('click', afterGameHandler);
  meme.addEventListener('click', event => {
    if (event.target !== next) afterGameHandler();
  });

  new MutationObserver(() => {
    if (!loading.hidden) setTimeout(showExtraTaxiFact, 0);
  }).observe(loading, {attributes: true, attributeFilter: ['hidden']});
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installExtraTaxiFacts, {once: true});
else installExtraTaxiFacts();
