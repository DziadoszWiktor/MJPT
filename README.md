# PT Manager

Dashboard leggera per personal trainer pensata per la pubblicazione su GitHub Pages. L'applicazione consente di gestire clienti, pagamenti, programmi di allenamento e reportistica mantenendo una banca dati in formato CSV.

## Funzionalità principali

- 👥 Gestione completa dei clienti con stato attivo/inattivo, recapiti e quota mensile.
- 💳 Tracciamento automatico dei pagamenti, con evidenza di scadenze e ritardi.
- 🗓️ Pianificazione dei programmi di allenamento, durata in settimane e controlli periodici.
- 📊 Dashboard con indicatori mensili e annuali, inclusi avvisi sul limite di 5.000€.
- 📁 Esportazione e importazione della base dati clienti in formato CSV compatibile.
- 📱 Interfaccia responsive ottimizzata per desktop e dispositivi mobili (iPhone 15/16 inclusi).
- 📲 Installabile come PWA grazie a manifest e service worker.

## Gestione del CSV

- I dati vengono sincronizzati su `localStorage` e generano automaticamente un CSV (`pt_manager_clienti_YYYY-MM-DD.csv`) scaricabile tramite il pulsante **Esporta CSV**.
- Il file di esempio `data/clients.csv` definisce le intestazioni attese e può essere usato per importare nuovi clienti.
- L'importazione CSV aggiunge o aggiorna i clienti esistenti (matching su `id` o email) e rigenera i relativi pagamenti.

## Sviluppo locale

1. Clona il repository e apri `index.html` con un browser moderno.
2. I dati rimangono nel browser grazie al `localStorage` e possono essere ripristinati importando il CSV esportato.

## PWA

- L'app registra automaticamente il service worker (`service-worker.js`).
- Da dispositivi mobili è possibile usare l'opzione "Aggiungi alla schermata Home" per installare l'app.
- Le icone richieste dal manifest sono incluse come data URI per evitare file binari nel repository.

## Deploy su GitHub Pages

È incluso un workflow GitHub Actions (`.github/workflows/deploy.yml`) che crea un pacchetto statico nella cartella `dist` e lo pubblica automaticamente su GitHub Pages ad ogni push sui branch `main` o `work`. Dopo il primo deploy ricordati di abilitare GitHub Pages nelle impostazioni del repository puntando all'ambiente `github-pages` generato dal workflow.

## Risoluzione dei problemi

- **Le tab non cambiano se cliccate:** è probabile che il `localStorage` contenga dati corrotti. Il sistema ora li ignora automaticamente, rigenera la base dati dal CSV di progetto e riattiva le tab in modo esplicito all'avvio; in caso di problemi persistenti cancella manualmente i dati del sito dal browser o usa l'opzione "Svuota dati di navigazione".
- **Vedo ancora la versione vecchia:** la nuova release aggiorna il service worker (`pt-manager-cache-v2`). Se l'interfaccia non si aggiorna esegui un hard refresh (Ctrl/Cmd+Shift+R) o rimuovi la PWA installata prima di riaprirla.
- **Il deploy fallisce o restituisce 404:** assicurati che il workflow "Deploy PT Manager" completi sia il job `build` sia il job `deploy`. In caso contrario controlla i log del workflow su GitHub; puoi rilanciare il deploy con l'azione manuale `workflow_dispatch` dopo aver risolto eventuali errori.

## Struttura del progetto

```
.
├── data/clients.csv          # CSV di riferimento con intestazioni
├── index.html                # Interfaccia principale
├── manifest.webmanifest      # Manifest PWA con icone inline in base64
├── script.js                 # Logica dell'applicazione
├── service-worker.js         # Cache offline
├── style.css                 # Stili responsivi
└── README.md                 # Documentazione
```

## Licenza

Distribuito secondo i termini della licenza del repository (specificare se presente).
