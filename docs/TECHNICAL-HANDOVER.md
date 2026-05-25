# Star Citizen Collector MVP

Collector locale Windows-friendly per leggere `Game.log` di Star Citizen e inviare eventi quasi real-time al backend ODK.

## Flusso rapido

1. entra nel sito ODK con Discord
2. apri `Star Citizen -> Entity Live`
3. genera un token collector
4. installa il collector sulla macchina client
5. avvia `Configura Collector`
6. seleziona la cartella Star Citizen che contiene `Game.log`
7. inserisci token e client ID generati dal sito
8. avvia `Avvia Collector`

## Comandi

### Inizializzare la config da sorgente

```powershell
npm run collector:init -- --server-url https://app.odkclan.it --client-id <client_id> --collector-token <token>
```

Nel pacchetto Windows per tester non serve usare `npm`: si avvia
`Configura Collector` dal menu Start o dalla cartella installata.

`serverUrl` puo essere sia:

- `https://app.odkclan.it`
- `https://app.odkclan.it/api/starcitizen/collector`

Non usare:

- link Discord OAuth o bot invite
- URL con query string tipo `...?client_id=...`
- pagine interne non API

Il comando salva la config in:

```text
%APPDATA%\odk-control-center\starcitizen-collector.json
```

### Avviare il collector

```powershell
npm run collector:run
```

## Pacchetto Windows

Per i tester esistono due formati:

- `ODK-StarCitizen-Collector-Setup.exe`: installer consigliato
- `ODK-StarCitizen-Collector-Portable.zip`: fallback portabile

Nel pacchetto finale si usano:

- `Configura Collector`
- `Avvia Collector`

La configurazione guidata apre una finestra per selezionare la cartella del
gioco. Se l'utente seleziona `...\StarCitizen\LIVE`, il collector salva:

```text
...\StarCitizen\LIVE\Game.log
```

Il file JSON non si lancia: viene letto automaticamente dal collector.

## File

- `config.example.json`
- `src/cli.ts`
- `src/config.ts`
- `src/http.ts`
- `src/parser.ts`

## Cosa fa in questa versione

- legge `Game.log` in polling robusto
- rileva reset/rotazione del file
- crea eventi sintetici `session_started` e `session_ended`
- deriva in modo affidabile:
  - `server_joined`
  - `location_changed`
  - `ship_changed`
  - `quantum_started`
  - `quantum_ended`
  - `client_error`
- aggiunge anche:
  - `mission_accepted`
  - `mission_objective_updated`
  - `mission_completed`
  - `mission_failed`
  - `mission_abandoned`
  - `hauling_objective_created`
  - `loadout_item_attached`
  - `insurance_claim_requested`
  - `insurance_claim_completed`
  - `player_spawned`
  - `combat_actor_death`
  - `screenshot_captured`
  - `quantum_target_selected`
  - `quantum_route_calculated`
  - `quantum_error`
- usa il timestamp presente nella riga di log come `observedAt` quando disponibile
- controlla la cartella `ScreenShots` e carica al server gli screenshot prova:
  - nome file
  - path relativo
  - dimensione
  - SHA-256
  - binario immagine JPG/PNG
- invia `hello`, `heartbeat`, `events`, `goodbye` al backend
- invia `proofs` al backend per archiviazione centrale degli screenshot
- parser default aggiornato a `mvp-0.3.0`

## Limiti attuali

- parser ancora euristico per presence/location/ship, anche se calibrato su sample reali per missioni, quantum, claim e loadout
- gli screenshot vengono caricati come immagini JPG/PNG fino al limite configurato; se l'upload fallisce resta comunque l'evento `screenshot_captured` con `uploadStatus: failed`
- `Game.log` non espone in modo affidabile payout aUEC, valore vendita, quantita esatta del cargo venduto o loot finale di sessione
- niente installer GUI
- niente service Windows persistente
- niente retry disk queue locale ancora

## Guardrail attuali

- il collector ora rifiuta `serverUrl` che non sia il root ODK o la base collector
- se l'endpoint risponde `200` ma con HTML o JSON non conforme, il collector fallisce con errore esplicito invece di fingersi connesso
- se la lettura di `Game.log` fallisce, il collector non termina in silenzio: continua a girare e logga l'errore in console
- se il `logPath` configurato e sbagliato ma esiste uno dei path noti (`Program Files` o `C:\RSI\StarCitizen\...`), il collector passa automaticamente al fallback corretto
- non promuove piu a eventi utili i falsi positivi piu rumorosi visti in produzione:
  - HUD armistice tipo `Combat` / `Caution`
  - asset load `StatObjLoad ... Orison/Lorville`
  - build che sono in realta IPv4
  - `SerializedOverwrite` come errore live
  - route guard rerouted usate come falsa nave attiva
- prova anche a estrarre:
  - location reali da pattern tipo `Location[Nyx_Levski]`
  - hint nave da righe quantum/starmap tipo `AEGS_Redeemer_...`
- dai log reali 2025-2026 riconosce in modo piu affidabile:
  - `Contract Accepted` da notifiche HUD reali
  - `MissionEnded` con `MISSION_STATE_COMPLETED` / `MISSION_STATE_FAILED`
  - obiettivi completati/falliti da `ObjectiveUpserted` / `ObjectiveComplete`
  - kill/death da `Actor Death` / `CActor::Kill`
  - screenshot dichiarati dal log o trovati nella cartella `ScreenShots`

## Evoluzione naturale

1. raccogliere sample reali di `Game.log`
2. aggiungere parsing dedicato per freight elevator / refinery / ASOP se servono al sito
3. rendere il parser piu patch-aware su location e cambi nave
4. aggiungere queue locale SQLite
5. impacchettare come exe o service Windows
