# DRY (Don't Repeat Yourself) AUDIT REPORT
## OBS Live Suite

**Date:** January 3, 2026
**Scope:** lib/, components/, app/api/, server/

---

## EXECUTIVE SUMMARY

This audit identified **12 major duplication patterns** across API routes, components, utilities, and service layer code.

**Key Findings:**
- 35+ repeated fetch API calls with similar error handling patterns
- Multiple card components (5) with nearly identical wrapper structures
- 13+ similar WebSocket subscription patterns
- Duplicated validation and error response logic across API routes
- Repeated presenter notification logic in 4+ routes

---

## 1. DUPLICATED API ROUTE PATTERNS

### Issue 1.1: POST Request Error Handling Pattern
**Files:** 35+ API routes
**Effort:** Medium (2-4 hours)
**Impact:** High

**Duplicated Pattern:**
```typescript
try {
  const body = await request.json();
  const response = await fetch(`${BACKEND_URL}/api/...`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json();
    return NextResponse.json(errorData, { status: response.status });
  }

  return NextResponse.json(data);
} catch (error) {
  console.error("API error:", error);
  return NextResponse.json({ error: "Failed to..." }, { status: 500 });
}
```

**Suggestion:** Create `withErrorHandling()` wrapper utility.

---

### Issue 1.2: Proxy Request Pattern
**Files:** 4 different approaches
**Effort:** Low-Medium (1-2 hours)
**Impact:** Medium

Three different approaches to proxying requests:
1. `createPostProxy()` in lower/route.ts
2. `proxyToBackend()` in countdown/route.ts
3. Manual `fetch()` in poster/route.ts
4. `BackendClient.publish()` in action routes

**Suggestion:** Standardize on a single proxy pattern.

---

## 2. DUPLICATED PRESENTER NOTIFICATION LOGIC

### Issue 2.1: Similar Notification Code in 4+ Routes
**Files:** lower/show, poster/show, overlays/poster, overlays/poster-bigpicture
**Effort:** Low (1-2 hours)
**Impact:** Medium

Each route repeats:
1. Building `bullets` array from payload fields
2. Creating `links` array based on media type
3. Sending notification via `sendPresenterNotification()`

**Suggestion:** Create `buildNotificationPayload()` factory function.

---

## 3. DUPLICATED COMPONENT CARD WRAPPERS

### Issue 3.1: Nearly Identical Card Structures
**Files:** 5 card components
**Effort:** Medium (2-3 hours)
**Impact:** Medium

All cards follow the same pattern:
```typescript
<Card className={cn(className)}>
  <CardHeader>
    <CardTitle>{t("title")}</CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* Controls */}
  </CardContent>
</Card>
```

**Suggestion:** Create `CardShell` wrapper component.

---

## 4. DUPLICATED WEBSOCKET SUBSCRIPTION PATTERNS

### Issue 4.1: Repeated WebSocket Connection Logic
**Files:** 4+ components
**Effort:** Low (1-2 hours)
**Impact:** High

**Duplicated Pattern:**
```typescript
const wsRef = useRef<WebSocket | null>(null);

useEffect(() => {
  const ws = new WebSocket(getWebSocketUrl());
  wsRef.current = ws;

  ws.onopen = () => {
    ws.send(JSON.stringify({ type: "subscribe", channel: "..." }));
  };

  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      if (message.channel === "..." && message.data) {
        setState(prev => ({ ...prev, ...message.data }));
      }
    } catch (error) {
      console.error("Parse error:", error);
    }
  };

  return () => ws.close();
}, [dependency]);
```

**Suggestion:** Create `useWebSocketChannel()` custom hook.

---

## 5. DUPLICATED FETCH HELPER FUNCTIONS

### Issue 5.1: Similar fetch() Call Patterns
**Files:** 35+ occurrences
**Effort:** Low (1 hour)
**Impact:** High

**Suggestion:** Create client-side fetch wrapper:
```typescript
export async function apiPost<T>(endpoint: string, data?: any): Promise<T> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: data ? JSON.stringify(data) : undefined,
  });
  if (!response.ok) throw new Error("Request failed");
  return response.json();
}
```

---

## 6. DUPLICATED REPOSITORY SINGLETON PATTERN

### Issue 6.1: Repeated getInstance() Pattern
**Files:** 6 repository classes
**Effort:** Low-Medium (1-2 hours)
**Impact:** Low-Medium

**Suggestion:** Create `SingletonBase` abstract class.

---

## 7. DUPLICATED EVENT HANDLER PATTERNS

### Issue 7.1: Similar Event Handlers
**Files:** 3+ card components
**Effort:** Medium (2-3 hours)
**Impact:** Medium

**Suggestion:** Create `useApiAction()` hook.

---

## 8. DUPLICATED TYPE DEFINITIONS

### Issue 8.1: Similar Props Interfaces
**Files:** All card components
**Effort:** Low (0.5 hours)
**Impact:** Low

```typescript
interface CountdownCardProps {
  size?: string;
  className?: string;
  settings?: Record<string, unknown>;
}
// Repeated 5+ times
```

**Suggestion:** Create shared `DashboardCardProps` type.

---

## 9. DUPLICATED ERROR RESPONSE PATTERNS

### Issue 9.1: Similar 404/400 Error Responses
**Files:** 10+ API routes
**Effort:** Low (0.5 hours)
**Impact:** Low-Medium

**Suggestion:** Create response helpers:
```typescript
export const ApiResponses = {
  notFound: (entity: string) =>
    NextResponse.json({ error: `${entity} not found` }, { status: 404 }),
  badRequest: (message: string) =>
    NextResponse.json({ error: message }, { status: 400 }),
};
```

---

## SUMMARY TABLE

| Issue | Category | Files | Effort | Impact | Priority |
|-------|----------|-------|--------|--------|----------|
| 1.1 | API Error Handling | 35+ | Medium | High | High |
| 1.2 | Proxy Pattern | 4 | Low-Med | Medium | Medium |
| 2.1 | Presenter Notifications | 4 | Low | Medium | Medium |
| 3.1 | Card Wrappers | 5 | Medium | Medium | Medium |
| 4.1 | WebSocket Subscriptions | 4+ | Low | High | High |
| 5.1 | Fetch Helpers | 35+ | Low | High | High |
| 6.1 | Singleton Pattern | 6 | Low-Med | Low-Med | Low |
| 7.1 | Event Handlers | 3+ | Medium | Medium | Medium |
| 8.1 | Type Definitions | 5+ | Low | Low | Low |
| 9.1 | Error Responses | 10+ | Low | Low-Med | Low |

---

## IMPLEMENTATION ROADMAP

### Phase 1: Quick Wins (6-8 hours)
1. Create `ClientFetch.ts` utility (Issue 5.1)
2. Create `useWebSocketChannel` hook (Issue 4.1)
3. Standardize error response helpers (Issue 9.1)

### Phase 2: Medium Effort (8-12 hours)
1. Create API error handling wrapper (Issue 1.1)
2. Build `CardShell` component (Issue 3.1)
3. Extract event handlers to hooks (Issue 7.1)

### Phase 3: Medium Priority (6-10 hours)
1. Consolidate proxy patterns (Issue 1.2)
2. Build presenter notification factory (Issue 2.1)
3. Create validation utilities

### Phase 4: Low Priority (3-5 hours)
1. Singleton base class (Issue 6.1)
2. Shared type definitions (Issue 8.1)

---

## CONCLUSION

The recommended improvements would:
1. **Reduce codebase by ~800-1000 lines** of boilerplate
2. **Improve consistency** across API routes and components
3. **Enhance maintainability** through reusable utilities and hooks
4. **Increase testability** by extracting logic to utility functions

**Phase 1 quick wins should be prioritized** for maximum immediate impact.
