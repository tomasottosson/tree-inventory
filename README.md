# Äppelodlingen — Fältapp

Intern fältapp för inventering och skötsel av en äppelodling (~700 positioner) nära Kivik, Skåne.

## Förutsättningar

- Node.js 20+
- [Azure Functions Core Tools v4](https://learn.microsoft.com/en-us/azure/azure-functions/functions-run-local#install-the-azure-functions-core-tools)
- [Azure CLI](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli) (för deploy)

## Kom igång

### 1. Installera beroenden

```bash
npm install
cd api && npm install && cd ..
```

### 2. Konfigurera Cosmos DB

Kopiera och redigera `api/local.settings.json` med dina Cosmos DB-uppgifter:

```json
{
  "Values": {
    "COSMOS_ENDPOINT": "https://<ditt-konto>.documents.azure.com:443/",
    "COSMOS_KEY": "<din-nyckel>",
    "COSMOS_DATABASE": "appelodlingen"
  }
}
```

### 3. Starta API:t

```bash
cd api
npm run build
func start
```

API:t körs på `http://localhost:7071`.

### 4. Seed:a databasen

Kör en gång för att skapa alla 700 positioner och 3 användare:

```bash
curl -X POST http://localhost:7071/api/seed
```

### 5. Starta frontend

```bash
npm run dev
```

Öppna `http://localhost:5173`. Vite proxyar `/api`-anrop till Functions-backend.

### 6. Logga in

Välj ditt namn och ange PIN-kod (standard: `1234` för alla användare).

## Infrastruktur (IaC)

All Azure-infrastruktur definieras med Bicep i `infra/`. Resurser:

- **Cosmos DB** — serverless-konto, databas med 3 containers (positions, events, users)
- **Static Web App** — hostar frontend + API, konfigurerad med Cosmos-nycklar

### Provisionera

```bash
# Logga in
az login

# Skapa resursgrupp (en gång)
az group create --name tree-inventory --location westeurope

# Deploya infrastruktur
az deployment group create \
  --resource-group tree-inventory \
  --template-file infra/main.bicep \
  --parameters infra/main.bicepparam
```

Outputsen visar Cosmos-endpoint och SWA-URL. Använd Cosmos-värdena i `api/local.settings.json` för lokal utveckling, eller kör `az cosmosdb keys list` för att hämta nyckel.

## Projektstruktur

```
├── src/                  # React frontend
│   ├── components/       # UI-komponenter
│   │   ├── layout/       # AppShell, BottomNav
│   │   ├── map/          # OrchardMap, PositionDot
│   │   └── inventory/    # RowWalker, PositionCard
│   ├── pages/            # Sidkomponenter
│   ├── hooks/            # React hooks (useAuth, usePositions)
│   └── lib/              # API-klient, typer, konstanter
├── api/                  # Azure Functions backend
│   └── src/
│       ├── functions/    # HTTP-funktioner
│       └── lib/          # Cosmos DB-klient, auth-hjälpare
├── infra/                # Bicep IaC
│   ├── main.bicep        # Alla Azure-resurser
│   └── main.bicepparam   # Parametrar (region, miljö)
├── CLAUDE.md             # AI-instruktioner och specifikation
└── package.json
```

## API-endpoints

| Metod | Route | Beskrivning |
|-------|-------|-------------|
| POST | `/api/auth/login` | Logga in med PIN |
| GET | `/api/positions` | Lista positioner (filter: `?quarterId=`) |
| GET | `/api/positions/:id` | Hämta en position |
| PATCH | `/api/positions/:id` | Uppdatera position |
| GET | `/api/stats` | Aggregerad statistik |
| POST | `/api/seed` | Skapa seed-data (700 positioner + 3 användare) |

## Tech stack

- **Frontend:** React 19, Vite, TypeScript, Tailwind CSS 4, React Router, TanStack Query
- **Backend:** Azure Functions v4, TypeScript
- **Databas:** Azure Cosmos DB (NoSQL)
