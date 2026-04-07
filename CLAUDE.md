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

Alla händelser/åtgärder kopplade till en position eller ett arbetspass. Append-only logg.

```json
{
  "id": "evt-uuid",
  "positionId": "gv-1-1",
  "quarterId": "gravensteiner",
  "type": "fertilization | pruning | observation | harvest | treatment | other | work_session",
  "date": "2026-03-17",
  "duration_hours": null,
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

#### `duration_hours` (nytt fält)

Toppnivå-fält på event-objektet. Obligatoriskt för `work_session`, valfritt/ignorerat för övriga event-typer. Anges i decimaltal (t.ex. `1.5` = 1 timme 30 minuter).

#### `details`-objektet per event-typ:

| type | details-fält |
|------|-------------|
| fertilization | fertilizer, amount_kg, method |
| pruning | pruning_type (restaurering/underhåll/röjning), severity (lätt/normal/kraftig) |
| observation | leaf_color, shoot_growth_cm, flowering (none/sparse/normal/rich), disease |
| harvest | amount_kg, quality (A/B/C/foder/must), usage |
| treatment | treatment_type, product, reason |
| work_session | activity, description |

#### Event-typ: `work_session`

Arbetspass loggas per person och dag. Om Tomas och Mats jobbar ihop i 5 timmar loggar var och en sitt eget pass (= 10 timmar totalt den dagen i exporten).

`positionId` sätts till kvarters-ID (`gravensteiner`, `cox-orange`, `ingrid-marie`) eller `"all"` om arbetet gäller hela odlingen. `quarterId` sätts till samma värde.

```json
{
  "id": "evt-uuid",
  "positionId": "gravensteiner",
  "quarterId": "gravensteiner",
  "type": "work_session",
  "date": "2026-04-15",
  "duration_hours": 4.5,
  "details": {
    "activity": "beskärning",
    "description": "Beskärning rad G1–G3, uppsamling av grenar"
  },
  "notes": "",
  "createdBy": "tomas",
  "createdAt": "2026-04-15T16:30:00Z"
}
```

##### `details.activity` — tillåtna värden

| Värde | Beskrivning |
|-------|-------------|
| `beskärning` | Beskärning av fruktträd |
| `gräsklippning` | Slåtter / gräsklippning |
| `uppsamling` | Uppsamling av grenar, gräs, fallfrukt |
| `jordkällare` | Restaureringsarbete på jordkällaren |
| `gödsling` | Gödsling (kompletterar positionsvisa fertilization-events) |
| `övrigt` | Annat arbete |

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
- 4 pumphus-rader (P1–P4) med 13, 12, 11, 10 positioner
- ID-format: `gv-{rad}-{position}` (1-indexerat), pumphus: `gv-p{rad}-{position}`
- Totalt: 228 + 46 = 274 positioner

### Cox Orange (quarterId: "cox-orange")
- 5 rader (C1–C5), 19 positioner per rad
- ID-format: `co-{rad}-{position}` (1-indexerat)
- Totalt: 95 positioner

### Ingrid Marie (quarterId: "ingrid-marie")
- 5 rader × 24 positioner (I1–I5) + 7 rader × 23 positioner (I6–I12) + 3 rader × 20 positioner (I13–I15)
- ID-format: `im-{rad}-{position}` (1-indexerat)
- Totalt: 341 positioner

**Totalt: 710 positioner**

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
- Snabbknappar: "Inventera", "Logga åtgärd", "Logga arbetspass"

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

### 8. Logga arbetspass (`/work-session`)
- **Används efter avslutat arbetspass för att logga tid till Länsstyrelsens redovisning.**
- Nåbar via snabbknapp på Dashboard eller som egen tab
- Formulär (5 fält, optimerat för snabb inmatning):
  1. **Datum** — datumväljare, default idag
  2. **Område** — dropdown: Hela odlingen / Gravensteiner / Cox Orange / Ingrid Marie
  3. **Aktivitet** — dropdown: beskärning / gräsklippning / uppsamling / jordkällare / gödsling / övrigt
  4. **Timmar** — nummerfält med steg om 0.5 (stepper-knappar −/+)
  5. **Beskrivning** — fritext (valfritt), t.ex. "Rad G1–G3, klart"
- Spara → bekräftelse → tillbaka till dashboard
- Data sparas som `work_session`-event via befintligt `POST /api/events`

### 9. Exportera redovisning (`/export`)
- **Genererar den redovisning Länsstyrelsen kräver för kulturmiljöbidraget.**
- Datumintervall (from/to), default 2026-01-01 till idag
- Förhandsvisning: tabell med alla work_sessions i intervallet
- Summa timmar längst ner
- Knapp "Ladda ner Excel" → triggar export-endpoint

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
GET    /api/events?type=work_session&from=2026-01-01&to=2026-10-15
POST   /api/events
GET    /api/export/work-sessions?from=2026-01-01&to=2026-10-15&format=xlsx
GET    /api/stats
GET    /api/users
POST   /api/auth/login   { userId, pin }
POST   /api/seed          (skapar alla positioner, körs en gång)
```

### Export-endpoint: `/api/export/work-sessions`

Hämtar alla `work_session`-events i datumintervallet och genererar en Excel-fil (xlsx) eller JSON.

**Query-parametrar:**
- `from` (ISO-datum, obligatoriskt)
- `to` (ISO-datum, obligatoriskt)
- `format` (`xlsx` eller `json`, default `xlsx`)

**Excel-output:** En flik med kolumner:

| Datum | Aktivitet | Område | Timmar | Person |
|-------|-----------|--------|--------|--------|
| 2026-04-15 | Beskärning | Gravensteiner | 4.5 | Tomas |
| 2026-04-15 | Beskärning | Gravensteiner | 5.0 | Mats |

Sorterad kronologiskt. Sista raden: **Summa timmar** (totalt).

Om xlsx-generering på servern är för tungt, använd CSV som fallback — det öppnas i Excel direkt.

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

### Fas 2b — Arbetspass & Länsstyrelse-export (klar)
9. ~~Lägg till `duration_hours` i event-datamodellen~~
10. ~~Bygg work_session-formuläret (`/work-session`, POST till befintligt `/api/events`)~~
11. ~~Bygg export-endpoint (`/api/export/work-sessions`)~~
12. ~~Bygg export-vy (`/export`) med förhandsvisning och nedladdning~~

**Bakgrund:** Odlingen har beviljats kulturmiljöbidrag från Länsstyrelsen Skåne (dnr 30557-2025, 59 000 kr). Redovisning krävs senast 15 oktober 2026 med logg över utförda åtgärder: datum, åtgärd, timmar, vem. Denna fas bygger exportfunktionen som genererar den redovisningen direkt ur appens data.

### Fas 2c — Event-overlay & säsongsfilter (klar)

##### Bakgrund

Åtgärdsvyn (`/maintenance`) låter användaren välja träd i en kartvy och logga events (beskärning, gödsling etc.). Problemet: kartan visar bara trädets *skick* (frisk/svag/död) — inte vilka träd som redan har fått en åtgärd denna säsong. Användaren kan inte se var "fronten" ligger, vilka rader som är klara, eller vilka träd som återstår.

Denna fas lägger till ett **overlay-läge** på kartorna i `/maintenance` och `/map` som färgkodar träd efter om de har events av en vald typ, med möjlighet att filtrera per säsong.

##### Vad som ska byggas

###### 1. Overlay-toggle på MaintenanceQuarterMap

Ovanför kartan i `MaintenanceQuarterMap` ska tre knappar (segmented control) visas:

| Knapp | Internt värde | Beskrivning |
|-------|--------------|-------------|
| **Skick** | `condition` | Nuvarande beteende — PositionDot färgas efter condition |
| **Beskärning** | `pruning` | Binärt grönt/rött: har/saknar beskärningsevent i valt datumintervall |
| **Gödsling** | `fertilization` | Binärt grönt/rött: har/saknar gödslingssevent i valt datumintervall |

Default: `condition` (befintligt beteende bevaras).

Visuellt: tre knappar i en rad, aktiv knapp har `bg-stone-800 text-white`, inaktiva har `bg-stone-100 text-stone-600`. Samma stil som befintliga knappar i appen.

###### 2. Säsongsfilter

Under overlay-togglen, synlig **bara när overlay !== `condition`**, visas ett säsongsfilter:

| Knapp | Logik |
|-------|-------|
| **Denna säsong** (default) | Visa events med `date >= YYYY-01-01` där YYYY = innevarande år |
| **Förra säsongen** | Visa events med `date >= (YYYY-1)-01-01` OCH `date < YYYY-01-01` |
| **Alla** | Ingen datumfiltrering |

Visuellt: tre små knappar under overlay-togglen, kompakt stil (text-xs). Aktiv markeras med understrykning eller `font-medium`, inte bakgrundsfärg (för att skilja dem visuellt från overlay-togglen).

###### 3. Färgkodning i event-overlay-läge

När overlay är `pruning` eller `fertilization` ändras PositionDots färgsättning:

| Typ | Har event i intervallet | Saknar event | Tom position | Stubbe |
|-----|------------------------|-------------|--------------|--------|
| **Fyllning** | `#22c55e` (grön) | `#fca5a5` (ljusröd) | transparent | `#92400e` (brun, oförändrat) |
| **Ram** | `#15803d` | `#dc2626` | `#a3a3a3` dashed | `#78350f` (oförändrat) |

Landmark-positioner visas oförändrat (`#8b5cf6`).

###### 4. Progressbar och radsummering

Synliga **bara när overlay !== `condition`**:

**Progressbar** (visas ovanför kartan, under säsongsfiltret):
- Text: `"{N} av {total} {beskurna|gödslade}"` till vänster, `"{X}%"` till höger
- Tunn bar (6px hög, rundade hörn) med grön fyllnad

**Radsummering** (visas under kartan):
- Grid med kort per rad (`grid-template-columns: repeat(auto-fit, minmax(120px, 1fr))`)
- Varje kort visar: radnamn, `{klara}/{totalt}`, tunn progressbar
- Rad med 100% klar: text i grönt (`#15803d`), grön bar
- Rad med <100%: text i `text-stone-500`, gul bar (`#f59e0b`)

###### 5. Positionsnumrering

Oavsett overlay-läge: visa positionsnummer vid var **10:e** position i raden, plus position 1. Visas som liten text (8px) till höger om pricken, färg `text-stone-300`. Gäller i `MaintenanceQuarterMap`.

###### 6. Event-overlay på OrchardMap (kartvyn)

Samma overlay-logik appliceras på den globala kartvyn (`/map`, `OrchardMap`-komponenten). Här visas alla tre kvarter samtidigt med samma toggle och säsongsfilter. Samma progressbar, men summerad per kvarter istället för per rad.

---

##### Datahämtning

###### Vilken data behövs

För att bygga overlay-settet behövs alla events av vald typ för valt kvarter (eller alla kvarter på `/map`). Det befintliga API:et stödjer detta redan:

```
GET /api/events?quarterId=gravensteiner&type=pruning
```

Returnerar alla events oavsett datum. Client-side filtreras sedan på `event.date` baserat på valt säsongsfilter.

###### Ny React Query hook

Skapa en ny hook `useEventOverlay` i `src/hooks/useEvents.ts`:

```typescript
export function useEventOverlay(
  quarterId: string | undefined,
  eventType: 'pruning' | 'fertilization' | undefined
) {
  return useQuery({
    queryKey: ['events', { quarterId, type: eventType }],
    queryFn: () => api.getEvents({ quarterId, type: eventType }),
    enabled: !!quarterId && !!eventType,
    staleTime: 60_000, // events ändras sällan under en session
  })
}
```

För OrchardMap (`/map`) behövs en variant utan quarterId-filter:

```typescript
export function useAllEventOverlay(
  eventType: 'pruning' | 'fertilization' | undefined
) {
  return useQuery({
    queryKey: ['events', { type: eventType }],
    queryFn: () => api.getEvents({ type: eventType }),
    enabled: !!eventType,
    staleTime: 60_000,
  })
}
```

###### Bygg overlay-set client-side

Hjälpfunktion (lägg i `src/lib/eventOverlay.ts`):

```typescript
import type { Event } from './types'

export type SeasonFilter = 'current' | 'previous' | 'all'
export type OverlayMode = 'condition' | 'pruning' | 'fertilization'

export function buildEventSet(
  events: Event[],
  seasonFilter: SeasonFilter
): Set<string> {
  const now = new Date()
  const currentYear = now.getFullYear()

  const filtered = events.filter((e) => {
    if (seasonFilter === 'all') return true
    const year = parseInt(e.date.slice(0, 4))
    if (seasonFilter === 'current') return year === currentYear
    if (seasonFilter === 'previous') return year === currentYear - 1
    return true
  })

  return new Set(filtered.map((e) => e.positionId))
}
```

---

##### Komponentändringar

###### PositionDot — ny optional prop

Lägg till en optional `overlayColor` prop. Om den är satt åsidosätter den condition-baserad färgning:

```typescript
interface Props {
  position: Position
  size: number
  onClick?: () => void
  overlayColor?: { bg: string; border: string; borderStyle?: string } | null
}
```

Logik: om `overlayColor` finns och positionen är av type `tree`, använd den istället för condition-färgerna. Empty, stump och landmark behåller sina befintliga färger oavsett overlay.

###### MaintenanceQuarterMap — nya props

```typescript
interface Props {
  positions: Position[]
  quarterId: string
  selected: Set<string>
  onChange: (selected: Set<string>) => void
  overlayMode: OverlayMode
  eventSet: Set<string> // positionIds som har event i valt intervall
}
```

Komponenten beräknar `overlayColor` per position och skickar ner till PositionDot. Den renderar också positionsnumrering och radsummering.

Overlay-togglen och säsongsfiltret renderas **inte** i MaintenanceQuarterMap — de renderas i MaintenancePage som hanterar state och datahämtning.

###### MaintenancePage — nytt state och hämtning

Nya state-variabler:

```typescript
const [overlayMode, setOverlayMode] = useState<OverlayMode>('condition')
const [seasonFilter, setSeasonFilter] = useState<SeasonFilter>('current')
```

Hämta events:

```typescript
const eventType = overlayMode !== 'condition' ? overlayMode : undefined
const { data: overlayEvents } = useEventOverlay(quarterId, eventType)
const eventSet = useMemo(
  () => overlayEvents ? buildEventSet(overlayEvents, seasonFilter) : new Set<string>(),
  [overlayEvents, seasonFilter]
)
```

Rendera overlay-toggle ovanför kartan, säsongsfilter under den (om relevant), och skicka `overlayMode` + `eventSet` till MaintenanceQuarterMap.

**Viktigt:** När användaren byter kvarter eller overlay, ska eventSet tömmas medan ny data laddas. React Query hanterar detta automatiskt via query key.

###### OrchardMap — samma logik

Lägg till overlay-toggle och säsongsfilter i MapPage. OrchardMap får en ny prop `overlayColorFn` som returnerar overlay-färg per positionId, alternativt null (condition-läge). Progressbar visas per kvarter.

---

##### Layout i MaintenancePage

Ordning uppifrån och ner:

1. Rubrik "Åtgärder"
2. Success/error-banners (befintligt)
3. Kvartersväljare (befintligt)
4. **Overlay-toggle** (ny) — tre knappar: Skick | Beskärning | Gödsling
5. **Säsongsfilter** (ny, bara om overlay !== condition) — Denna säsong | Förra | Alla
6. **Progressbar** (ny, bara om overlay !== condition)
7. Karta med positionsnumrering (modifierad MaintenanceQuarterMap)
8. **Radsummering** (ny, bara om overlay !== condition)
9. Event-formulär med trädval (befintligt, alltid synligt)

###### Invalidering efter event-loggning

När `batchCreate.mutate` lyckas (onSuccess) invalideras redan `['events', { quarterId }]`. Eftersom overlay-hooken använder samma query key-mönster uppdateras overlay-data automatiskt. Inga ändringar behövs.

---

##### Design-detaljer

- Overlay-knappar: samma storlek och stil som kvartersväljaren (px-3 py-2 rounded-xl text-sm)
- Säsongsfilter-knappar: kompaktare (text-xs, px-2 py-1), understrykning på aktiv (border-b-2 border-stone-800)
- Progressbar: 6px hög, `bg-stone-100` bak, grön fyllnad, `rounded-full`
- Radsummering: `bg-stone-50` kort, `rounded-xl`, 4px progressbar inuti
- Positionsnummer: 8px monospace, `text-stone-300`, absolut-positionerade till höger om pricken
- All text på svenska

##### Filer som berörs

| Fil | Ändring |
|-----|---------|
| `src/lib/eventOverlay.ts` | **Ny fil** — buildEventSet, typer |
| `src/hooks/useEvents.ts` | Lägg till useEventOverlay, useAllEventOverlay |
| `src/components/map/PositionDot.tsx` | Ny optional overlayColor prop |
| `src/components/maintenance/MaintenanceQuarterMap.tsx` | Nya props (overlayMode, eventSet), positionsnumrering, radsummering |
| `src/pages/MaintenancePage.tsx` | Overlay-toggle, säsongsfilter, state, datahämtning |
| `src/components/map/OrchardMap.tsx` | Overlay-stöd (lägre prioritet, kan göras efter MaintenancePage fungerar) |
| `src/pages/MapPage.tsx` | Toggle + filter för OrchardMap (lägre prioritet) |

##### Implementationsordning

1. `eventOverlay.ts` — typer och buildEventSet
2. `useEvents.ts` — nya hooks
3. `PositionDot.tsx` — overlayColor prop
4. `MaintenanceQuarterMap.tsx` — positionsnumrering + overlay-färgning + radsummering
5. `MaintenancePage.tsx` — toggle, filter, state, sammankoppling
6. Testa med riktig data
7. (Sedan) `OrchardMap.tsx` + `MapPage.tsx` — samma logik för global kartvy

##### Avgränsning

- Inga nya API-endpoints behövs
- Ingen ny datamodell — allt baseras på befintliga events
- OrchardMap-overlay är en bonus, inte ett krav för denna fas
- Offline-cache hanteras inte i denna fas

### Fas 3 — Analys & export
13. CSV-export av positioner och events
14. Jämförelsevy (gödslade vs ogödslade)
15. Årsöversikt

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
│   │   │   ├── seed.ts
│   │   │   └── export.ts        # Work session export
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
│   │   ├── LogEventPage.tsx
│   │   ├── WorkSessionPage.tsx   # Logga arbetspass
│   │   └── ExportPage.tsx        # Exportera redovisning
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
      { label: "P1", count: 13 },
      { label: "P2", count: 12 },
      { label: "P3", count: 11 },
      { label: "P4", count: 10 },
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
      ...Array.from({ length: 5 }, (_, i) => ({ label: `I${i + 1}`, count: 24 })),
      ...Array.from({ length: 7 }, (_, i) => ({ label: `I${i + 6}`, count: 23 })),
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

7. **Arbetspass är separata från positions-events** — `work_session` loggar tid per person och dag mot ett kvarter eller hela odlingen, inte mot enskilda trädpositioner. Det speglar hur arbete faktiskt utförs ("vi beskärde i 4 timmar") snarare än att tvinga fram tidrapportering per träd.
