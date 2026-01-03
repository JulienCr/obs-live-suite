# NEXT.JS 15 APP ROUTER AUDIT REPORT
## OBS Live Suite

**Date:** January 3, 2026
**Framework:** Next.js 15 App Router

---

## EXECUTIVE SUMMARY

This audit examines the Next.js 15 App Router implementation for best practices compliance. The codebase demonstrates a solid understanding of the dual-process architecture but has several areas for improvement.

---

## 1. SERVER VS CLIENT COMPONENTS

### Current State

1. **No `'use client'` directives in page files** - Most page files correctly delegate to client components.

2. **Exception: Some pages incorrectly use `'use client'`:**
   - `app/[locale]/profiles/page.tsx` - Unnecessary
   - `app/[locale]/settings/overlays/page.tsx` - Unnecessary

3. **135 client components** in `components/` - Expected for interactive dashboard.

4. **Overlay pages correctly use client components** for WebSocket functionality.

### Issues

| File | Issue | Severity |
|------|-------|----------|
| `app/[locale]/profiles/page.tsx` | Unnecessary `'use client'` | Low |
| `app/[locale]/settings/overlays/page.tsx` | Unnecessary `'use client'` | Low |

### Missing Suspense Boundaries

**Critical Finding:** No `<Suspense>` boundaries found in `app/` directory.

Locations that need Suspense:
- `app/[locale]/dashboard/page.tsx`
- `app/[locale]/assets/*`
- `app/[locale]/profiles/page.tsx`

---

## 2. SERVER ACTIONS

### Current State

**No Server Actions found** (`'use server'` directive not present).

The application uses traditional API routes, which is valid for the dual-process design where operations proxy to the backend server.

---

## 3. API ROUTES

### Validation Analysis

**Good Practices:**
- Zod validation in most routes
- Rate limiting for external APIs (Wikipedia, LLM)

### Issues

| File | Issue | Severity |
|------|-------|----------|
| `app/api/actions/lower/show/route.ts` | No request body validation | Medium |
| `app/api/presenter/cue/send/route.ts` | Proxies without validation | Medium |
| `app/api/profiles/[id]/route.ts` | Uses `error.name` instead of `instanceof ZodError` | Low |

### Response Format Inconsistencies

Three different patterns:
```typescript
// Pattern 1: { data: T }
return NextResponse.json({ guests });

// Pattern 2: { success: boolean, data: T }
return NextResponse.json({ success: true, data: {...} });

// Pattern 3: Bare object
return NextResponse.json({ profile }, { status: 201 });
```

**Recommendation:** Standardize on consistent response wrapper.

---

## 4. PERFORMANCE

### React.memo Usage

**Finding:** No `React.memo` usage detected.

Components that would benefit:
- `components/assets/VirtualizedGuestGrid.tsx`
- `components/quiz/host/PlayerAvatarChip.tsx`
- `components/shell/panels/*`

### Bundle Size Concerns

1. **Large bundles likely:**
   - Dockview library
   - Full icon sets from lucide-react
   - No dynamic imports

2. **No `next/dynamic` usage** for code splitting

### Recommendations

1. Add dynamic imports for heavy components
2. Consider tree-shaking icons
3. Add React.memo to list items

---

## 5. ROUTING

### Missing Loading/Error States

| Directory | loading.tsx | error.tsx |
|-----------|-------------|-----------|
| `app/[locale]/` | Missing | Missing |
| `app/[locale]/dashboard/` | Missing | Missing |
| `app/[locale]/assets/` | Missing | Missing |
| `app/[locale]/settings/` | Missing | Missing |
| `app/[locale]/quiz/` | Missing | Missing |

### i18n Routing

**Good Configuration:**
- Clean setup with `localePrefix: 'as-needed'`
- Correctly excludes `/overlays/*` and `/api/*`

---

## 6. DATA FETCHING

### Current Patterns

**Client-side fetching dominates:**
- `GuestManager.tsx` - useEffect + fetch
- `ProfileManager.tsx` - useEffect + fetch
- `GeneralSettings.tsx` - useEffect + fetch

### Missing Caching Strategies

1. No React `cache()` usage
2. No revalidation patterns
3. No `unstable_cache`

### Waterfall Requests

Example in `ProfileManager.tsx`:
```typescript
useEffect(() => {
  fetchProfiles();  // First request
  fetchThemes();    // Second request (could be parallel)
}, []);
```

---

## SUMMARY BY SEVERITY

### Medium Priority
1. No loading/error boundary pages
2. Missing request validation in action API routes
3. No React.memo for performance

### Low Priority
1. Unnecessary `'use client'` directives
2. Inconsistent API response formats
3. No Suspense boundaries
4. Missing dynamic imports
5. Waterfall request patterns

---

## ACTION ITEMS

### Immediate (Week 1)
1. Add `loading.tsx` and `error.tsx` to main route segments
2. Add request validation to action API routes
3. Standardize API response format

### Short-term (Month 1)
1. Add dynamic imports for heavy components
2. Implement React.memo for list items
3. Add Suspense boundaries

### Long-term
1. Consider server-side data fetching for initial loads
2. Implement SWR/React Query for client-side caching
3. Add rate limiting to remaining API routes
