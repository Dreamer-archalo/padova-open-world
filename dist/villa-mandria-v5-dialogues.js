// Self-contained fictional conversations: no mission state, money or save data is modified.
// The selected estate workers alone offer E conversations; other E interactions retain priority.
import {ModernGameplay} from './modern-gameplay.js';
import {VILLA} from './gameplay-areas.js';

export const MANDRIA_CONVERSATIONS = [
 ['Patrón, il camion del mangime è fermo all’Arcella. Lo aspettiamo o improvvisiamo?',
  ['Lo mando a recuperare con calma.','Perfetto. Nessuna corsa contro il tram, allora.'],['Usiamo le scorte della scuderia.','Ci penso io. I cavalli non salteranno il pranzo.'],['Chiama il fornitore, ma con educazione.','Gli dirò che il patrón apprezza la puntualità.'],['Oggi digiuno per tutti!','Anche per lei, jefe? Allora preferisco la prima opzione.']],
 ['Il mio trattore fa più rumore del tram al Portello. Lo portiamo in officina?',
  ['Prenota la revisione.','Ricevuto. Niente trattori in sciopero.'],['Controlla prima il filtro.','Lo farò senza sporcare la fontana.'],['Chiedi un preventivo a Padova.','Ne cerco uno che non costi come una villa.'],['Dagli un nome, magari si calma.','Da oggi si chiamerà Don Diesel.']],
 ['A Prato della Valle vogliono le nostre zucche per una festa. Che faccio?',
  ['Prepara una consegna ordinata.','Partiamo all’alba, con i documenti in regola.'],['Seleziona solo le più belle.','Queste finiranno in prima fila, patrón.'],['Invia un campione prima.','Una zucca diplomatica, ottima idea.'],['Fai una foto: voglio vedere le reazioni.','La zucca avrà il suo momento di gloria.']],
 ['Jefe, una capra è entrata nel deposito delle scope. La nomino responsabile?',
  ['Riportala al recinto.','Subito. Cercherò di non offenderla.'],['Metti un chiavistello migliore.','Un piano degno della sicurezza privata.'],['Dalle una carota e negozia.','La capra è una trattatrice severa.'],['Promuovila, ma senza stipendio.','Allora abbiamo già un nuovo direttore.']],
 ['Il ragazzo della stalla vuole imparare a cavalcare. Gli diamo un turno?',
  ['Sì, con un istruttore.','Grazie, patrón. Prima la sicurezza, poi il galoppo.'],['Che inizi dalla cura dei cavalli.','Gli farà bene conoscere i suoi colleghi a quattro zampe.'],['Solo nel recinto ovale.','Farò preparare la pista.'],['Chiedigli prima se sa stare in sella.','Ha risposto «più o meno». Forse meglio l’istruttore.']],
 ['Mia nonna dice che le rose della Mandria vogliono musica. Che playlist scelgo?',
  ['Un po’ di salsa.','La siepe si muove già, jefe.'],['Musica classica di Padova.','Le rose sembreranno molto rispettabili.'],['Silenzio, lasciamo cantare gli uccelli.','Le api approvano la decisione.'],['Chiedi alle rose.','Ci ho provato. Pretendono un concerto privato.']],
 ['Ho trovato un casco da cowboy nel fienile. Lo metto per controllare i pomodori?',
  ['È l’uniforme ufficiale.','Finalmente un incarico all’altezza del cappello.'],['Solo quando lavori con i cavalli.','Giusto. I pomodori non sono ancora selvaggi.'],['Tienilo per le feste.','Lo luciderò per l’occasione.'],['Prima fammi una foto.','La mando con la didascalia «Sheriff del basilico».']],
 ['Al Ghetto mi chiedono se il nostro miele è davvero della tenuta. Rispondo io?',
  ['Mostra l’origine con precisione.','Preparerò etichette e informazioni vere.'],['Invitali a visitare le arnie.','Con abiti adatti, naturalmente.'],['Porta un piccolo assaggio.','Le api avranno nuovi fan.'],['Digli che è dolce come il patrón.','Me lo segno, ma sulle etichette scriverò il vero.']],
 ['Una delle Ape Car ha perso uno specchietto vicino al cancello. Chi la sistema?',
  ['Mandala in officina.','Subito: una pattuglia deve vedere dove va.'],['Controlla tutta la flotta.','Farò una lista prima del prossimo giro.'],['Metti il mezzo fuori servizio.','Ricevuto. Niente ronde alla cieca.'],['Con uno specchio da bagno?','Divertente, jefe, ma scelgo il ricambio giusto.']],
 ['Il cavallo più veloce si ferma davanti alle carote. È talento o negoziazione?',
  ['Allena il percorso senza premi a metà.','Vediamo se il campione ha disciplina.'],['Premialo a fine giro.','Un accordo cavalleresco.'],['Fai controllare la sua salute.','Ottima idea: prima il benessere.'],['Assumilo come commercialista.','Contratta già meglio di me.']],
 ['Da Via Roma chiedono una consegna di fiori per un anniversario. La prepariamo?',
  ['Un bouquet elegante e puntuale.','Pronto, patrón. Nessuna rosa in ritardo.'],['Aggiungi un biglietto gentile.','La discrezione è compresa.'],['Chiama per confermare il colore.','Eviteremo una crisi diplomatica floreale.'],['Mandiamo un cactus gigante.','Ne parliamo, jefe. Forse non tutti lo capirebbero.']],
 ['Il guardiano dice che i pioppi fanno ombra all’orto. Li potiamo?',
  ['Prima un controllo agronomico.','Così proteggiamo alberi e raccolto.'],['Sposta le colture più delicate.','Un piano sensato per la prossima stagione.'],['Verifica le ore di sole.','Porto taccuino e pazienza.'],['Metti gli occhiali da sole ai pomodori.','Il pomodoro più maturo vuole già i Ray-Ban.']],
 ['Un turista si è perso sulla strada per Albignasego e chiede del nostro cancello.',
  ['Indicagli la strada pubblica.','Lo accompagniamo fuori con cortesia.'],['Chiedi se serve assistenza.','Un gesto da veri padroni di casa.'],['Avvisa l’ingresso, niente confusione.','Le guardie saranno informate.'],['Digli che la villa è un miraggio.','Meglio il navigatore, patrón.']],
 ['La cucina vuole basilico fresco per stasera, ma il raccolto è in ritardo.',
  ['Raccogli solo quello pronto.','Il cuoco apprezzerà la qualità.'],['Avvisa la cucina subito.','Cambio menu senza drammi.'],['Cerca un fornitore locale.','Ne conosco uno molto bravo.'],['Facciamo pasta senza basilico.','Coraggioso, jefe. Lo riferisco al cuoco.']],
 ['La famiglia del fattore vuole venire a vedere i cavalli domenica. Va bene?',
  ['Sì, con una visita organizzata.','Preparo un percorso sicuro.'],['Meglio dopo il lavoro mattutino.','Così i cavalli saranno tranquilli.'],['Chiedi quanti sono.','Prenotiamo abbastanza sedie.'],['Solo se portano dolci.','Questa regola mi sembra negoziabile.']],
 ['Al Portello raccontano che qui abbiamo cavalli più veloci delle moto. Confermi?',
  ['Facciamo una dimostrazione in recinto.','Una prova senza mettere nessuno in pericolo.'],['Nessun confronto: sono animali.','Parole sagge, patrón.'],['Mostra solo la scuderia.','Le foto parleranno da sole.'],['Le moto almeno non mangiano fieno.','Ma i cavalli non pagano il bollo!']],
 ['Devo assumere un aiutante. Meglio chi arriva puntuale o chi parla bene ai cavalli?',
  ['Cerca entrambe le qualità.','Mi toccherà fare un vero colloquio.'],['Dai priorità all’esperienza.','Verificherò le referenze.'],['Proponi una giornata di prova pagata.','Vedremo come lavora davvero.'],['Assumi un cavallo come assistente.','Per ora non sa compilare i turni.']],
 ['Il recinto dei bovini cigola di notte. Le guardie pensano sia un fantasma.',
  ['Fai controllare i cardini.','Addio leggenda della Mandria.'],['Metti una luce sul sentiero.','La ronda vedrà meglio.'],['Organizza un controllo con due persone.','Niente missioni solitarie nel buio.'],['Chiama il fantasma al colloquio.','Se sa saldare, lo assumiamo.']],
 ['Il fioraio di Prato della Valle vuole sapere chi disegna i nostri giardini.',
  ['Dagli il contatto del giardiniere.','Sarà felice di parlarne.'],['Invitalo a vedere le aiuole.','Prepariamo un percorso ospiti.'],['Mandagli qualche foto.','Scelgo quelle senza la capra sullo sfondo.'],['Di’ che le ha progettate il cavallo.','Il cavallo pretenderà i diritti d’autore.']],
 ['Il cuoco dice che il personale ha bisogno di una festa. Che ne pensa il patrón?',
  ['Organizza una cena per tutti.','Grande! Ognuno porterà qualcosa.'],['Chiedi prima le preferenze.','Evitiamo tre menu diversi all’ultimo.'],['Facciamo una merenda in giardino.','Più semplice, ma comunque bella.'],['Una gara di ballo tra Ape Car?','I conducenti chiedono già il premio.']],
 ['Abbiamo ricevuto cinque casse di bottiglie. Le porto al poligono o alla cucina?',
  ['Controlla prima cosa contengono.','Giusto, jefe. Meglio leggere le etichette.'],['Quelle vuote al riciclo.','Una scelta sensata.'],['Chiedi al responsabile del poligono.','Pronti solo bersagli autorizzati.'],['Metti un cartello «non sono tutte uguali».','Il messaggio sembra destinato a me.']],
 ['Il guardiano nuovo saluta tutti con «Hola patrón», perfino il postino.',
  ['Insegnagli a riconoscere gli ospiti.','Gli faccio un corso accelerato.'],['L’importante è che sia cortese.','Resterà il più gentile della squadra.'],['Alterna i saluti in italiano e spagnolo.','Finalmente un vocabolario nuovo.'],['Nominalo ambasciatore della tenuta.','Il postino chiederà un passaporto.']],
 ['Mio fratello vuole aprire un banchetto al mercato di Padova con i nostri ortaggi.',
  ['Aiutalo con un piano e i permessi.','Un progetto serio, gracias patrón.'],['Partiamo con pochi prodotti.','Meglio imparare senza sprechi.'],['Calcola costi e trasporto.','Mi servirà una calcolatrice.'],['Vendi anche i miei cappelli.','Prima le zucchine, poi l’alta moda.']],
 ['Una giornalista vuole fotografare i giardini, ma non il personale. Come rispondo?',
  ['Concorda un percorso e chiedi consenso.','Tutti sapranno cosa aspettarsi.'],['Fotografa solo le piante.','La privacy viene prima.'],['Rimanda a quando la tenuta è pronta.','Fisserò una data ragionevole.'],['Fai intervistare il cane da guardia.','Non parla, ma ha uno sguardo convincente.']],
 ['Patrón, i cowboy propongono un piccolo torneo a cavallo. Come lo organizziamo?',
  ['Percorso ovale e istruttore presente.','Sicuro e spettacolare: mi piace.'],['Solo dimostrazione, senza gara.','Nessuno dovrà strafare.'],['Premia la cura degli animali.','Un trofeo anche per chi lavora bene.'],['Il premio è una carota d’oro?','Il cavallo vuole sapere se è commestibile.']]
];

let current=null,dialog=null,prompt=null,activeWorker=null;
const workerNames=['Mateo · campi','Lucía · fattoria','Rafael · raccolto','Inés · scuderia','Diego · orto','Camila · tenuta'];
function nearest(g){if(!g?.state?.started||g.state.paused||g.state.mode!=='foot'||!g.villaLife?.root.visible||Math.hypot(g.state.x-VILLA.x,g.state.z-VILLA.z)>260)return null;
 let best=null,dist=4.1;for(const p of g.villaLife.people){if(p.role!=='worker'||!p.obj?.visible)continue;const d=Math.hypot(p.obj.position.x-g.state.x,p.obj.position.z-g.state.z);if(d<dist){dist=d;best=p;}}return best;}
function setup(){if(dialog)return;
 const style=document.createElement('style');style.textContent=`
 #mandriaWorkerPrompt:not([hidden]){position:fixed;left:50%;bottom:23%;transform:translateX(-50%);z-index:65;border:2px solid #d8b574;border-radius:12px;background:#172b29f2;color:#fff0cf;padding:11px 20px;font:700 15px system-ui;cursor:pointer}
 #mandriaWorkerDialog{width:min(680px,94vw);max-height:85vh;overflow-y:auto;padding:0;border:3px solid #caa46c;border-radius:18px;background:#f8f0d9;color:#253333;box-shadow:0 20px 90px #000b;font:16px/1.5 system-ui}
 #mandriaWorkerDialog::backdrop{background:#07141bdc}
 #mandriaWorkerDialog .mw-head{display:flex;justify-content:space-between;gap:16px;align-items:center;background:#213c3c;color:#fff2cf;padding:13px 19px}
 #mandriaWorkerDialog h2{margin:0;font-size:19px}#mandriaWorkerDialog .mw-close{background:#f5d8a4;color:#1a3030;border:0;border-radius:8px;padding:6px 13px;cursor:pointer;font-size:20px}
 #mandriaWorkerDialog .mw-body{padding:18px 22px}#mandriaWorkerDialog .mw-question{font-size:19px;font-weight:650;margin:0 0 16px}
 #mandriaWorkerDialog .mw-choices{display:grid;grid-template-columns:1fr 1fr;gap:10px}
 #mandriaWorkerDialog .mw-choices button,#mandriaWorkerDialog .mw-next{border:2px solid #bd955a;border-radius:10px;background:#fffaf0;color:#233c40;padding:12px;text-align:left;font:650 14px/1.35 system-ui;cursor:pointer}
 #mandriaWorkerDialog .mw-choices button:hover,#mandriaWorkerDialog .mw-choices button:focus{background:#e8d19c}
 #mandriaWorkerDialog .mw-reply{background:#e3eacb;border-left:4px solid #63825a;padding:12px;margin:16px 0 0}
 #mandriaWorkerDialog .mw-next{display:block;margin:14px 0 0 auto;background:#234a45;color:white}
 @media(max-width:550px){#mandriaWorkerDialog .mw-choices{grid-template-columns:1fr}#mandriaWorkerDialog .mw-body{padding:14px}}
 `;document.head.appendChild(style);
 prompt=document.createElement('button');prompt.id='mandriaWorkerPrompt';prompt.type='button';prompt.hidden=true;prompt.textContent='E · PARLA CON IL CONTADINO';prompt.addEventListener('click',()=>{if(current){const p=nearest(current);if(p)open(p);}});document.body.appendChild(prompt);
 dialog=document.createElement('dialog');dialog.id='mandriaWorkerDialog';dialog.innerHTML='<div class="mw-head"><h2 id="mwName"></h2><button class="mw-close" type="button" aria-label="Chiudi il dialogo">×</button></div><div class="mw-body"><p class="mw-question" id="mwQuestion"></p><div class="mw-choices" id="mwChoices"></div><p class="mw-reply" id="mwReply" hidden></p><button class="mw-next" type="button" hidden>Un’altra richiesta →</button></div>';
 dialog.querySelector('.mw-close').addEventListener('click',()=>dialog.close());dialog.querySelector('.mw-next').addEventListener('click',()=>showTopic());dialog.addEventListener('close',()=>{activeWorker=null;});document.body.appendChild(dialog);
}
function showTopic(){if(!dialog||!activeWorker||!current)return;const i=(current.villaConversationIndex||0)%MANDRIA_CONVERSATIONS.length;current.villaConversationIndex=i+1;
 const [question,...choices]=MANDRIA_CONVERSATIONS[i];const workers=current.villaLife.people.filter(p=>p.role==='worker');
 dialog.querySelector('#mwName').textContent=(workerNames[Math.max(0,workers.indexOf(activeWorker))%workerNames.length]||'Contadino')+' · conversazione '+(i+1)+'/25';
 dialog.querySelector('#mwQuestion').textContent=question;const list=dialog.querySelector('#mwChoices');list.replaceChildren();
 for(const [n,[label,reaction]] of choices.entries()){const b=document.createElement('button');b.type='button';b.textContent=(n+1)+'. '+label;b.addEventListener('click',()=>{list.hidden=true;const reply=dialog.querySelector('#mwReply');reply.textContent=reaction;reply.hidden=false;dialog.querySelector('.mw-next').hidden=false;});list.appendChild(b);}
 list.hidden=false;dialog.querySelector('#mwReply').hidden=true;dialog.querySelector('.mw-next').hidden=true;
}
function open(p){setup();if(dialog.open||document.querySelector('dialog[open]')||!current?.state?.started)return;activeWorker=p;showTopic();prompt.hidden=true;dialog.showModal();}
const previousPopulate=ModernGameplay.prototype.populate,previousUpdate=ModernGameplay.prototype.update;
if(!ModernGameplay.prototype.__mandriaV5Dialogues){ModernGameplay.prototype.__mandriaV5Dialogues=true;
 ModernGameplay.prototype.populate=function(...args){const out=previousPopulate.apply(this,args);this.villaConversationIndex=0;current=this;if(dialog?.open)dialog.close();return out;};
 ModernGameplay.prototype.update=function(dt){previousUpdate.call(this,dt);current=this;setup();if(!prompt)return;const p=nearest(this),r=this.villaRange;
  const competing=!!r?.ready&&this.state.mode==='foot'&&Math.hypot(this.state.x-r.station.x,this.state.z-r.station.z)<6;
  prompt.hidden=!p||competing||!!document.querySelector('dialog[open]');
 };
}
if(typeof window!=='undefined')window.addEventListener('keydown',event=>{
 if(dialog?.open){if(event.code==='Escape'){dialog.close();event.stopImmediatePropagation();return;}
  const n=Number(event.key);if(n>=1&&n<=4){const button=dialog.querySelectorAll('#mwChoices button')[n-1];if(button&&!button.parentElement.hidden){button.click();event.preventDefault();event.stopImmediatePropagation();}}return;
 }
 if(event.code!=='KeyE'||event.repeat||document.querySelector('dialog[open]')||!current)return;
 const p=nearest(current),r=current.villaRange;if(!p||r?.ready&&Math.hypot(current.state.x-r.station.x,current.state.z-r.station.z)<6)return;
 event.preventDefault();event.stopImmediatePropagation();open(p);
},true);
