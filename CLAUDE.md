# CLAUDE.md — Äppelodlingen Fältapp

## Projektöversikt

En intern fältapp för inventering och löpande skötsel av en äppelodling (ca 1,7 ha, ~700 positioner) nära Kivik, Skåne. Tre ägare ska kunna gå runt i odlingen med telefonen, inventera träd position för position, och över tid logga åtgärder (gödsling, beskärning, m.m.) per träd. Samma data ska vara tillgängligt på desktop.

**Användare:** 3 namngivna personer (Tomas, Mats, Jonas). Ingen publik åtkomst.

---

## Tech Stack

| Lager | Teknologi |
|-------|-----------|
| Frontend | React + Vite + TypeScript |
| Styling | Tailwind CSS |
| Data-fetching | React Query (TanStack Query) |
| Routing | React Router |
| API | Azure Functions v4 (Node.js 20, TypeScript) |
| Databas | Azure Cosmos DB (NoSQL, serverless tier) |
| Hosting | Azure Static Web Apps (Free tier) |
| Deploy | GitHub Actions |

### Varför Cosmos DB?
- Serverless tier = betala per request, nära noll kostnad vid låg trafik (3 användare)
- Schemaflexibelt — nya fält/statustyper kan läggas till utan migrering
- Integreras smidigt med Azure Functions

### Alternativ om Cosmos DB känns för tungt
Byt till **Azure Table Storage** (ännu enklare, billigare, men sämre query-möjligheter). Datamodellen nedan fungerar med båda.

---

## Datamodell

### `positions` (container, partitionKey: `/quarterId`)

Alla positioner i odlingen — varje punkt i rutnätet, oavsett om det står ett träd där eller inte.

```json
{
  "id": "gv-1-1",
  "quarterId": "gravensteiner",
  "row": "G1",
  "position": 1,
  "type": "tree | empty | stump | landmark",
  "species": "Gravensteiner | Cox Orange | Ingrid Marie | Okänd | null",
  "condition": "healthy | weak | dead | unknown",
  "notes": "Fri text",
  "inventoriedAt": "2026-03-17T10:30:00Z",
  "inventoriedBy": "tomas",
  "createdAt": "2026-03-17T10:30:00Z",
  "updatedAt": "2026-03-17T10:30:00Z"
}
```

### `events` (container, partitionKey: `/positionId`)

Alla händelser/åtgärder kopplade till en position. Append-only logg.

```json
{
  "id": "evt-uuid",
  "positionId": "gv-1-1",
  "quarterId": "gravensteiner",
  "type": "fertilization | pruning | observation | harvest | treatment | other",
  "date": "2026-03-17",
  "details": {
    "fertilizer": "YaraMila Promagna 11-5-18",
    "amount_kg": 0.75,
    "method": "Manuell spridning"
  },
  "notes": "Fri text",
  "createdBy": "tomas",
  "createdAt": "2026-03-17T10:30:00Z"
}
```

`details`-objektet är flexibelt per event-typ:

| type | details-fält |
|------|-------------|
| fertilization | fertilizer, amount_kg, method |
| pruning | pruning_type (restaurering/underhåll/röjning), severity (lätt/normal/kraftig) |
| observation | leaf_color, shoot_growth_cm, flowering (none/sparse/normal/rich), disease |
| harvest | amount_kg, quality (A/B/C/foder/must), usage |
| treatment | treatment_type, product, reason |

### `users` (container, partitionKey: `/id`)

Enkel användarhantering — ingen lösenordshantering, bara identifiering.

```json
{
  "id": "tomas",
  "name": "Tomas Ottosson",
  "email": "tomas.ottosson@gmail.com",
  "role": "owner",
  "pin": "1234"
}
```

**Autentisering:** Enkel PIN-kod per användare. Inga lösenord, ingen OAuth. Appen är intern och skyddas av att URL:en inte delas. PIN:en är bara för att veta *vem* som loggar, inte för säkerhet.

---

## Kvarter och positioner (seed data)

Alla positioner ska skapas som seed data vid första deploy. Strukturen:

### Gravensteiner (quarterId: "gravensteiner")
- 6 huvudrader (G1–G6), 38 positioner per rad
- 4 pumphus-rader (P1–P4) med 12, 11, 10, 8 positioner
- ID-format: `gv-{rad}-{position}` (1-indexerat), pumphus: `gv-p{rad}-{position}`
- Totalt: 228 + 41 = 269 positioner

### Cox Orange (quarterId: "cox-orange")
- 5 rader (C1–C5), 19 positioner per rad
- ID-format: `co-{rad}-{position}` (1-indexerat)
- Totalt: 95 positioner

### Ingrid Marie (quarterId: "ingrid-marie")
- 12 rader × 23 positioner + 3 rader × 20 positioner (I1–I15)
- ID-format: `im-{rad}-{position}` (1-indexerat)
- Totalt: 336 positioner

**Totalt: 700 positioner**

### Landmärken

Följande positioner ska seed:as som `type: "landmark"`:
- Jordkällare — upptar ett antal positioner i Gravensteiner (exakt antal TBD vid inventering)
- Solitär-ek — stor ek med stolar centralt i odlingen, mellan Gravensteiner och Cox Orange
- Pumphus — borrad brunn i nordöst

Exakta positioner att markera bestäms vid första fältinventering.

---

## Vyer / Sidor

### 1. Inloggning (`/`)
- Visa 3 namnknappar (Tomas, Mats, Jonas)
- Klicka → ange 4-siffrig PIN
- Spara session i localStorage
- Ingen timeout — man loggar ut manuellt

### 2. Översikt / Dashboard (`/dashboard`)
- Sammanfattning: antal inventerade / ej inventerade positioner per kvarter
- Stapel eller cirkel per kvarter: fördelning träd/tomt/stubbe
- Senaste händelser (10 senaste events)
- Snabbknappar: "Inventera", "Logga åtgärd"

### 3. Kartvyn (`/map`)
- Spatial layout av alla positioner, liknande den React-artefakt vi byggt (se referensimplementation nedan)
- Varje punkt färgkodad efter condition/type
- Klick → öppna positionsdetaljvy
- Filterbar: visa bara ej inventerade, bara gödslade, bara ett kvarter, etc.
- Zoom/pan med touch-gester på mobil

### 4. Inventeringsläge (`/inventory`)
- **Det viktigaste fältverktyget.**
- Välj kvarter → visa rader → gå igenom position för position
- Per position: snabbval för type (träd/tomt/stubbe) och condition (frisk/svag/död)
- "Nästa"-knapp → hoppa till nästa position i raden
- Möjlighet att ange sort om den är känd
- Progress bar per rad och per kvarter
- Optimerat för en hand + stående i gräs

### 5. Positionsdetalj (`/position/:id`)
- All info om en position: type, species, condition, notes
- Historik: alla events sorterade nyast först
- Knapp: "Logga åtgärd" → modal/sheet med eventformulär
- Redigera grunddata (type, species, condition, notes)

### 6. Logga åtgärd (`/log` eller modal)
- Välj position (sök/dropdown, eller kom hit från positionsdetalj)
- Välj event-typ → visa relevanta fält
- Datum (default: idag)
- Spara → tillbaka till föregående vy

### 7. Kvarters-lista (`/quarter/:id`)
- Lista alla positioner i ett kvarter
- Sorterbara kolumner: rad, position, type, condition, senaste event
- Filtrerbar

---

## Mobile-first design

Appen ska primärt användas stående i en äppelodling med en hand. Designa därefter:

- **Stora touch-targets** (minst 44×44px)
- **Bottom navigation** (4 tabs: Översikt, Karta, Inventera, Logga)
- **Inga horisontella scrolls** i inventeringsvyn
- **Snabba interaktioner** — minimera antal klick för vanliga arbetsflöden
- **Offline-indikator** — visa tydligt om data inte kan synkas (men offline-first är inte MVP)
- Färgerna ska vara synliga i solljus (hög kontrast, inga pasteller som primärfärger)

Desktop: samma app men med bredare layout, kartvyn får mer plats, tabeller istället för kort.

---

## API-endpoints (Azure Functions)

```
GET    /api/positions?quarterId=gravensteiner
GET    /api/positions/:id
PATCH  /api/positions/:id
GET    /api/events?positionId=gv-1-1
GET    /api/events?quarterId=gravensteiner&type=fertilization
POST   /api/events
GET    /api/stats
GET    /api/users
POST   /api/auth/login   { userId, pin }
POST   /api/seed          (skapar alla positioner, körs en gång)
```

---

## Referensimplementation (kartvy)

Filen `orchard_map_v3.jsx` innehåller en fungerande spatial kartlayout. Använd den som referens för:

- **Kvarterens rumsliga placering:**
  - Gravensteiner (6 huvudrader + 4 pumphusrader) i norr/väst — det största kvarteret
  - Pumphusrader till höger om Gravensteiners huvudrader, mot nordöst
  - Cox Orange i mitten/öster, startar vid Gravensteiners position 19 och slutar vid position 38
  - Ingrid Marie i söder, börjar exakt där Gravensteiner/Cox Orange slutar (position 38)
- **Färgkodning:** Gravensteiner=#f59e0b, Cox Orange=#ef4444, Ingrid Marie=#22c55e
- **Raderna löper vertikalt** (norr → söder), kolumner placeras horisontellt
- **Landmärken** (Jordkällare, Solitär-ek, Pumphus) visas som etiketter på sina ungefärliga positioner
- **Cell-storlek och zoom-logik** — baserad på 14px × zoom-faktor

---

## Prioriteringsordning

### Fas 1 — Grundinventering (klar)
1. ~~Seed data (alla 700 positioner)~~
2. ~~Inloggning (PIN)~~
3. ~~Inventeringsvy (gå rad för rad, sätt type + condition)~~
4. ~~Kartvy (se resultat)~~
5. ~~Dashboard (sammanfattning)~~

### Fas 2 — Åtgärdslogg (klar)
6. ~~Event-systemet (logga gödsling, beskärning etc.)~~
7. ~~Positionsdetalj med historik~~
8. ~~Filtrera karta efter event-typ~~

### Fas 3 — Analys & export
9. CSV-export av positioner och events
10. Jämförelsevy (gödslade vs ogödslade)
11. Årsöversikt

---

## Konfiguration och miljövariabler

```env
VITE_API_BASE_URL=https://<static-web-app>.azurestaticapps.net/api
COSMOS_ENDPOINT=https://<account>.documents.azure.com:443/
COSMOS_KEY=<key>
COSMOS_DATABASE=appelodlingen
```

---

## Projektstruktur

```
appelodlingen/
├── .github/
│   └── workflows/
│       └── deploy.yml
├── api/                          # Azure Functions
│   ├── src/
│   │   ├── functions/
│   │   │   ├── positions.ts
│   │   │   ├── events.ts
│   │   │   ├── auth.ts
│   │   │   ├── stats.ts
│   │   │   └── seed.ts
│   │   └── lib/
│   │       ├── cosmos.ts         # Cosmos DB client
│   │       └── auth.ts           # PIN-validering
│   ├── host.json
│   ├── package.json
│   └── tsconfig.json
├── src/                          # Frontend
│   ├── components/
│   │   ├── layout/
│   │   │   ├── BottomNav.tsx
│   │   │   └── AppShell.tsx
│   │   ├── map/
│   │   │   ├── OrchardMap.tsx    # Spatial kartvy
│   │   │   ├── QuarterView.tsx
│   │   │   └── PositionDot.tsx
│   │   ├── inventory/
│   │   │   ├── InventoryFlow.tsx
│   │   │   ├── RowWalker.tsx     # Stega igenom rad
│   │   │   └── PositionCard.tsx
│   │   └── events/
│   │       ├── EventForm.tsx
│   │       └── EventList.tsx
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── MapPage.tsx
│   │   ├── InventoryPage.tsx
│   │   ├── PositionDetailPage.tsx
│   │   ├── QuarterPage.tsx
│   │   └── LogEventPage.tsx
│   ├── hooks/
│   │   ├── usePositions.ts
│   │   ├── useEvents.ts
│   │   └── useAuth.ts
│   ├── lib/
│   │   ├── api.ts
│   │   ├── types.ts
│   │   └── constants.ts         # Kvarter-definitioner, statusar
│   ├── App.tsx
│   └── main.tsx
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── vite.config.ts
└── CLAUDE.md
```

---

## Seed-data generator

Funktionen `/api/seed` ska generera alla positioner enligt denna logik:

```typescript
const QUARTERS = {
  gravensteiner: {
    mainRows: Array.from({ length: 6 }, (_, i) => ({
      label: `G${i + 1}`, count: 38
    })),
    pumpRows: [
      { label: "P1", count: 12 },
      { label: "P2", count: 11 },
      { label: "P3", count: 10 },
      { label: "P4", count: 8 },
    ],
    idPrefix: "gv",
    pumpPrefix: "gv-p",
  },
  "cox-orange": {
    rows: Array.from({ length: 5 }, (_, i) => ({
      label: `C${i + 1}`, count: 19
    })),
    idPrefix: "co",
  },
  "ingrid-marie": {
    rows: [
      ...Array.from({ length: 12 }, (_, i) => ({ label: `I${i + 1}`, count: 23 })),
      ...Array.from({ length: 3 }, (_, i) => ({ label: `I${i + 13}`, count: 20 })),
    ],
    idPrefix: "im",
  },
};
// ID-format: {prefix}-{rad}-{position}, allt 1-indexerat
// Exempel: gv-1-1, gv-1-38, gv-p1-12, co-3-19, im-15-20
```

---

## Viktiga designbeslut

1. **Alla positioner skapas upfront** — man inventerar genom att uppdatera befintliga positioner, inte genom att skapa nya. Detta gör det enkelt att se vad som är inventerat och vad som återstår.

2. **Events är append-only** — inga uppdateringar eller borttagningar av events. Om något loggats fel, lägg till en ny event med korrigering.

3. **Inga bilder i MVP** — foton per träd vore värdefullt men ökar komplexiteten rejält. Lägg till i framtiden.

4. **Inget offline-first i MVP** — appen kräver uppkoppling. Mobilnätet i Kivik-området är tillräckligt. Om det visar sig vara ett problem, lägg till service worker + lokal cache i fas 3.

5. **Sorter per kvarter ≠ sorter per träd** — kvarteret heter "Gravensteiner" men enskilda träd kan vara andra sorter (insådd, omympad etc.). `species` på position-nivå kan skilja sig.

6. **Språk:** Allt användargränssnitt på svenska. Koden (variabelnamn, kommentarer) på engelska.