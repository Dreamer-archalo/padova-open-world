# Statistiche di accesso — Padova After Hours

## Stato

L'integrazione Umami e' predisposta ma **inattiva** fino alla configurazione dell'ID del sito.
Non basta pubblicare il codice: senza ID non si invia alcun evento e non esiste una dashboard con dati reali.

## Attivazione

1. Crea un account su [Umami Cloud](https://cloud.umami.is/).
2. Crea un website chiamato `Padova After Hours` con dominio `dreamer-archalo.github.io` (senza `https://` e senza percorso).
3. Copia il **Website ID** (UUID pubblico, non una API key o una password).
4. Inseriscilo in `dist/analytics-config.js` e pubblica dopo test/merge della PR.
5. Visita il sito pubblico e verifica la pagina `Realtime` della dashboard Umami, con eventuale ritardo o blocco ad-blocker.
6. Prima dell'attivazione, verifica con il titolare del progetto che l'informativa sulle statistiche e la documentazione privacy siano adeguate al trattamento effettivo.

## Dati previsti

| Fonte | Misura | Dove consultarla |
| --- | --- | --- |
| Pagine pubbliche | Visualizzazioni, visitatori stimati, provenienza/referrer, campagne UTM, dispositivo, paese approssimativo | Dashboard Umami |
| Gioco | `game_load_requested`: primo click sul bottone principale per il caricamento | Eventi Umami |
| Gioco | `game_entered`: interfaccia del mondo 3D effettivamente mostrata | Eventi Umami |
| Repository GitHub | View, visitatori unici, siti di provenienza del repository, clone negli ultimi 14 giorni | [GitHub Insights → Traffic](https://github.com/Dreamer-archalo/padova-open-world/graphs/traffic) |

Il tracker non identifica persone fisiche o account GitHub e **non e' retroattivo**. Il conteggio dei visitatori e' una stima, non un elenco di utenti autenticati; ad blocker e segnali di privacy possono causare sottoconteggi.

## Link di provenienza

Il referrer del browser non e' sempre disponibile (es. molte aperture da app di messaggistica). Per distinguere la campagna usa link con parametri UTM, senza introdurre nuovi domini o redirect:

- GitHub: `https://dreamer-archalo.github.io/padova-open-world/?utm_source=github&utm_medium=repository`
- WhatsApp: `https://dreamer-archalo.github.io/padova-open-world/?utm_source=whatsapp&utm_medium=share`
- Instagram: `https://dreamer-archalo.github.io/padova-open-world/?utm_source=instagram&utm_medium=social`

Una visita diretta senza parametri puo' risultare come `Direct / None`; non attribuire automaticamente l'accesso a un social.

## Aspetti tecnici

- `dist/analytics-config.js`: URL dello script e Website ID.
- `dist/analytics.js`: carica lo script solo sul dominio di produzione e con ID valido. Non usa cookie, identificatori propri, localStorage o storage persistente; rispetta DNT/GPC.
- `dist/index.html`, `dist/about.html`, `dist/ricardo-roza-rui.html`: misurazione pageview; la home traccia anche due eventi di gioco.
- `dist/privacy.html`: informazione specifica sulle statistiche, da verificare prima dell'attivazione.
- L'errore di caricamento di Umami non deve provocare l'overlay fatal-error di `dist/index.html`.
- Le anteprime storiche copiate da altre revisioni restano **non tracciate**. Lo strumento misura le pagine pubblicate contenenti lo script, non altre copie del progetto su domini diversi.

Non salvare token amministrativi nel codice. Il Website ID non e' una chiave segreta. Il tracker non puo' accedere ai dati GitHub Insights: sono due sistemi distinti.
