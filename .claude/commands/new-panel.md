# New Panel Implementation Guide

Create a new dashboard panel in the OBS Live Suite application. This command walks through every file that must be created or modified to fully integrate a new panel, including multi-dashboard real-time sync.

## Arguments

- `$ARGUMENTS` — Name and brief description of the new panel (e.g., "timer — A customizable timer panel")

---

## Step-by-step checklist

Complete each step in order. Skip backend/data steps only if the panel is purely UI with no persisted data.

### 1. Register the Panel ID

**File:** `lib/panels/registry.ts`

1. Add the new camelCase ID to the `PANEL_IDS` array.
2. Add its entry in `PANEL_REGISTRY` with:
   - `icon`: a Lucide icon import
   - `commandPaletteKeywords`: relevant search terms (always include `"panel"`, `"widget"`, `"add"`)
   - `params` (optional): extra Dockview params
   - `inSidebar` (optional): set `false` to hide from sidebar

TypeScript will error on `DashboardShell.tsx` until step 3 is done (`satisfies Record<PanelId, …>`).

### 2. Create the Panel Component

**File:** `components/shell/panels/{PanelName}Panel.tsx`

Follow this template:

```tsx
import { type IDockviewPanelProps } from "dockview-react";
import { useTranslations } from "next-intl";
import { BasePanelWrapper, type PanelConfig } from "@/components/panels";

const config: PanelConfig = { id: "myPanel", context: "dashboard" };

export function MyPanelPanel(_props: IDockviewPanelProps) {
  const t = useTranslations("dashboard.myPanel");

  return (
    <BasePanelWrapper config={config}>
      {/* Panel content */}
    </BasePanelWrapper>
  );
}
```

Key points:
- Accept `IDockviewPanelProps` (even if unused — prefix with `_`)
- Use `BasePanelWrapper` with a `PanelConfig` for color menu, padding, scrolling
- `config.id` must match the ID in the registry
- Use `useTranslations` for all user-visible strings

### 3. Register in DashboardShell

**File:** `components/shell/DashboardShell.tsx`

1. Import the panel component at the top (keep imports alphabetical by panel name).
2. Add it to the `components` object:
   ```tsx
   const components = {
     // ... existing panels
     myPanel: MyPanelPanel,
   } satisfies Record<PanelId, React.ComponentType<any>>;
   ```

The `satisfies Record<PanelId, …>` enforces that every registered panel has a component.

### 4. Add i18n Translations

**Files:** `messages/fr.json` and `messages/en.json`

Add three entries in each file:

1. **Panel title** (under `dashboard.panels`):
   ```json
   "panels": {
     "myPanel": "Mon panneau"
   }
   ```

2. **Command palette** (under `dashboard.commandPalette`):
   ```json
   "commandPalette": {
     "showMyPanelPanel": "Afficher le panneau Mon panneau"
   }
   ```
   The key MUST follow the pattern `show{PanelId with first letter capitalized}Panel`.

3. **Panel-specific strings** (under `dashboard.myPanel`):
   ```json
   "myPanel": {
     "title": "Mon panneau",
     "empty": "Aucun élément"
   }
   ```

### 5. Data Model (if the panel manages persisted entities)

**File:** `lib/models/{Entity}.ts`

Define Zod schemas and TypeScript types:

```tsx
import { z } from "zod";

export const myEntitySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type MyEntity = z.infer<typeof myEntitySchema>;

export const updateMyEntitySchema = myEntitySchema.partial().required({ id: true });
```

### 6. Repository (if persisted)

**File:** `lib/repositories/{Entity}Repository.ts`

Follow the singleton pattern used by all repositories:

```tsx
import { DatabaseService } from "@/lib/services/DatabaseService";

export class MyEntityRepository {
  private static instance: MyEntityRepository;
  static getInstance(): MyEntityRepository {
    if (!this.instance) this.instance = new MyEntityRepository();
    return this.instance;
  }
  // getAll(), getById(id), create(entity), update(id, data), delete(id)
}
```

Add the migration in `DatabaseService` if a new table is needed.

### 7. API Routes

**Files:** `app/api/assets/{entity}/route.ts` and `app/api/assets/{entity}/[id]/route.ts`

Use the standard patterns:

```tsx
// route.ts — GET (list) + POST (create)
import { ApiResponses, withSimpleErrorHandler } from "@/lib/utils/ApiResponses";
import { broadcastDataChange } from "@/lib/utils/broadcastDataChange";

export const GET = withSimpleErrorHandler(async (request: Request) => {
  const items = repo.getAll();
  return ApiResponses.ok({ items });
}, LOG_CONTEXT);

export const POST = withSimpleErrorHandler(async (request: Request) => {
  const body = await request.json();
  const item = repo.create(parsed);
  broadcastDataChange("myEntity", "created", request, item.id);
  return ApiResponses.created({ item });
}, LOG_CONTEXT);
```

```tsx
// [id]/route.ts — PATCH + DELETE
import { withErrorHandler, RouteContext } from "@/lib/utils/ApiResponses";
import { broadcastDataChange } from "@/lib/utils/broadcastDataChange";

export const PATCH = withErrorHandler<{ id: string }>(
  async (request: Request, context: RouteContext<{ id: string }>) => {
    const { id } = await context.params;
    // ... update logic
    broadcastDataChange("myEntity", "updated", request, id);
    return ApiResponses.ok({ item });
  }, LOG_CONTEXT
);

export const DELETE = withErrorHandler<{ id: string }>(
  async (request: Request, context: RouteContext<{ id: string }>) => {
    const { id } = await context.params;
    repo.delete(id);
    broadcastDataChange("myEntity", "deleted", request, id);
    return ApiResponses.ok({ success: true });
  }, LOG_CONTEXT
);
```

### 8. React Query Hook

**File:** `lib/queries/use{Entities}.ts`

Follow the `useGuests` pattern:

```tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/utils/ClientFetch";
import { queryKeys } from "./queryKeys";
import { QUERY_STALE_TIMES } from "@/lib/config/Constants";

export function useMyEntities() {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.myEntities.all });

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.myEntities.list(),
    queryFn: () => apiGet<{ items: MyEntity[] }>("/api/assets/my-entities").then(r => r.items),
    staleTime: QUERY_STALE_TIMES.NORMAL,
  });

  const createMutation = useMutation({ mutationFn: ..., onSuccess: invalidate });
  const deleteMutation = useMutation({ mutationFn: ..., onSuccess: invalidate });

  return { items: data ?? [], isLoading, error, create: createMutation.mutate, ... };
}
```

### 9. Query Keys

**File:** `lib/queries/queryKeys.ts`

Add the entity's query key namespace:

```tsx
myEntities: {
  all: ["myEntities"] as const,
  list: () => [...queryKeys.myEntities.all, "list"] as const,
  detail: (id: string) => [...queryKeys.myEntities.all, "detail", id] as const,
},
```

Re-export from `lib/queries/index.ts` if not already using barrel exports.

### 10. Multi-Dashboard Real-Time Sync

Three things to connect for cross-tab sync:

#### 10a. SyncEntity Type

**File:** `lib/models/DataSyncEvents.ts`

Add the new entity name to the `SyncEntity` union:

```tsx
export type SyncEntity =
  | "guests"
  | "posters"
  // ... existing
  | "myEntities";  // ← add
```

#### 10b. DataSync Hook Mapping

**File:** `hooks/useDataSync.ts`

Add the mapping in `ENTITY_QUERY_KEYS`:

```tsx
const ENTITY_QUERY_KEYS: Record<SyncEntity, readonly string[]> = {
  // ... existing
  myEntities: queryKeys.myEntities.all,
};
```

#### 10c. Broadcast Calls in API Routes

Already done in step 7 — every POST/PATCH/DELETE calls `broadcastDataChange(...)`.

**How it works end-to-end:**
1. Dashboard A creates an entity → POST handler calls `broadcastDataChange("myEntities", "created", request)`
2. Backend publishes to WebSocket `system` channel with the `x-client-id` header value
3. Dashboard B receives the event in `useDataSync`, checks `clientId !== CLIENT_ID`, invalidates `queryKeys.myEntities.all`
4. React Query refetches → UI updates in ~1 second
5. Dashboard A ignores its own event (same clientId)

### 11. WebSocket Channel (if the panel has a real-time overlay)

If this panel controls an OBS overlay:

1. **Define event types** in `lib/models/OverlayEvents.ts`
2. **Subscribe in the panel** with `useWebSocketChannel<MyEvent>("my-channel", handler)`
3. **Create the overlay page** at `app/overlays/my-overlay/page.tsx` (excluded from i18n routing)
4. **Create the overlay renderer** at `components/overlays/MyOverlayRenderer.tsx`

### 12. Verification Checklist

Run these checks before considering the panel complete:

```bash
pnpm type-check        # No new errors
pnpm test              # No regressions
pnpm dev               # Panel appears in sidebar, command palette, opens correctly
```

Manual verification:
- [ ] Panel appears in the sidebar and can be toggled
- [ ] Panel appears in Command Palette (Ctrl+K)
- [ ] Panel renders correctly with data
- [ ] CRUD operations work
- [ ] Open 2 browser tabs: create/delete on tab 1 → tab 2 updates within ~1s
- [ ] Tab 1 does NOT double-fetch after its own mutation
- [ ] Panel title displays in both FR and EN
- [ ] Color scheme customization works (right-click panel tab)

## File Summary

| # | File | Action | Required |
|---|------|--------|----------|
| 1 | `lib/panels/registry.ts` | Add panel ID + metadata | Always |
| 2 | `components/shell/panels/{Name}Panel.tsx` | Create component | Always |
| 3 | `components/shell/DashboardShell.tsx` | Register component | Always |
| 4 | `messages/fr.json` + `messages/en.json` | Add translations | Always |
| 5 | `lib/models/{Entity}.ts` | Define Zod schemas | If data |
| 6 | `lib/repositories/{Entity}Repository.ts` | Singleton repo | If persisted |
| 7 | `app/api/assets/{entity}/route.ts` + `[id]/route.ts` | CRUD routes | If data |
| 8 | `lib/queries/use{Entities}.ts` | React Query hook | If data |
| 9 | `lib/queries/queryKeys.ts` | Query key namespace | If data |
| 10 | `lib/models/DataSyncEvents.ts` + `hooks/useDataSync.ts` | Real-time sync | If data |
| 11 | `lib/models/OverlayEvents.ts` + overlay files | WebSocket overlay | If overlay |
