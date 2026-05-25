ODK Star Citizen Collector - Guida rapida

Questo programma legge il file Game.log locale di Star Citizen e invia al sito ODK
solo eventi tecnici utili alla pagina Star Citizen / Entity Live.

Cosa fare:

1. Entra nel sito ODK con Discord.
2. Apri Star Citizen / Entity Live / Setup collector.
3. Genera il token collector.
4. Avvia "Configura Collector" dal menu Start.
5. Seleziona la cartella Star Citizen, di solito ...\StarCitizen\LIVE.
6. Inserisci Collector token e Client ID mostrati dal sito.
7. Avvia "ODK Star Citizen Collector".

La configurazione viene salvata qui:

%APPDATA%\odk-control-center\starcitizen-collector.json

Server URL consigliato:

https://app.odkclan.it

Non inserire:

- link Discord OAuth
- bot invite Discord
- URL con query string

Privacy e sicurezza:

- non legge la memoria del gioco
- non modifica file di Star Citizen
- non legge password o cookie del browser
- non contiene il token dentro al pacchetto
- il token viene salvato solo nella config locale dell'utente
- se abilitati, i nuovi screenshot nella cartella ScreenShots vengono caricati
  come prove operative sul sito ODK

Per fermare il collector:

Premi Ctrl+C nella finestra aperta.

Per disinstallare:

Usa "App installate" di Windows oppure "Disinstalla ODK Star Citizen Collector"
dal menu Start. La config locale resta in AppData se vuoi riutilizzarla.
