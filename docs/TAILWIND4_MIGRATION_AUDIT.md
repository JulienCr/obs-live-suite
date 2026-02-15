# Tailwind CSS v4 Migration Audit

**Date**: 2026-02-14
**Project**: OBS Live Suite (Next.js 15 + App Router)
**Current Stack**: Tailwind CSS 3.4.19, PostCSS 8.5.6, Autoprefixer 10.4.23
**Target Stack**: Tailwind CSS 4.x, @tailwindcss/postcss

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Breaking Changes Relevant to This Project](#2-breaking-changes-relevant-to-this-project)
3. [Ecosystem Compatibility](#3-ecosystem-compatibility)
4. [PostCSS Compatibility Changes](#4-postcss-compatibility-changes)
5. [Config File Migration](#5-config-file-migration)
6. [CSS Syntax Changes](#6-css-syntax-changes)
7. [Codebase Impact Analysis](#7-codebase-impact-analysis)
8. [Effort Estimation](#8-effort-estimation)
9. [Risks](#9-risks)
10. [Go/No-Go Recommendation](#10-gono-go-recommendation)

---

## 1. Executive Summary

Tailwind CSS v4 (released January 2025) is a **complete rewrite** with fundamental architectural changes. It moves from a JavaScript-centric configuration model to a CSS-first approach, replaces the PostCSS plugin with a dedicated package, and introduces breaking changes to utility naming, default values, and plugin APIs.

**Bottom line**: Migration is feasible and all key ecosystem dependencies now support TW4. The project has a moderate migration surface (~34 shadcn/ui components, ~5 `@apply` directives, 1 config file, 1 PostCSS config). However, the color system change (HSL variables to OKLCH) and the `tailwindcss-animate` deprecation require careful handling. The official upgrade tool can automate ~80% of the work.

**Recommendation**: **GO** -- proceed with migration on a dedicated branch, using the official `@tailwindcss/upgrade` tool as the starting point.

---

## 2. Breaking Changes Relevant to This Project

### 2.1 Browser Requirements

Tailwind v4 requires **Safari 16.4+, Chrome 111+, Firefox 128+**. It uses native CSS cascade layers (`@layer`) and `@property` rules that cannot be polyfilled.

**Impact on this project**: LOW. OBS browser sources use Chromium (recent), and the dashboard runs in modern browsers only. No legacy browser support is needed.

### 2.2 Ring Default Width Change

- **v3**: `ring` produces a **3px** ring
- **v4**: `ring` produces a **1px** ring

**Impact**: MEDIUM. Found **40 occurrences** of `ring`-related classes across 28 files, and **22 occurrences** of `ring-ring` / `ring-offset-background` in 20 files (primarily shadcn/ui components). Most use explicit widths (`ring-2`), but any bare `ring` usage needs `ring-3` replacement.

### 2.3 Border and Divide Default Colors

- **v3**: `border` defaults to `gray-200`
- **v4**: `border` defaults to `currentColor`

**Impact**: LOW-MEDIUM. The project already sets `border-border` globally via `@apply border-border` in `globals.css`, and most border usages are explicit with color classes. But any component relying on implicit `border` color without an explicit class will change appearance.

### 2.4 Shadow Changes

- **v3**: `shadow` utilities use `rgba(0,0,0,...)` values
- **v4**: `shadow` utilities use color-mix-based values in OKLCH

**Impact**: LOW. Found 28 shadow usage sites. Visual differences will be subtle and may actually improve color accuracy.

### 2.5 Deprecated/Renamed Utilities

| v3 Utility | v4 Replacement | Project Usage |
|---|---|---|
| `bg-opacity-*` | `bg-color/opacity` syntax | **57 occurrences** of opacity-related patterns across 28 files -- the upgrade tool handles this automatically |
| `flex-grow` / `flex-shrink` | `grow` / `shrink` | Needs scan -- likely used in shadcn components |
| `decoration-slice` / `decoration-clone` | `box-decoration-slice` / `box-decoration-clone` | None found |

### 2.6 Container Utility Changes

The `container` utility configuration (`center`, `padding`, `screens`) has been **removed from the theme config** in v4. This project defines a custom container in `tailwind.config.ts`:

```typescript
container: {
  center: true,
  padding: "2rem",
  screens: { "2xl": "1400px" },
},
```

**Impact**: MEDIUM. Found **67 container references** across 25 files. In v4, this must be migrated to a custom `@utility` directive:

```css
@utility container {
  margin-inline: auto;
  padding-inline: 2rem;
  max-width: 1400px;
}
```

### 2.7 Preflight Changes

- Placeholder text now uses `currentColor` at 50% opacity instead of `gray-400`
- Buttons use `cursor: default` instead of `cursor: pointer`

**Impact**: LOW-MEDIUM. Button cursor change may feel surprising but can be overridden with `cursor-pointer` where needed. Placeholder color change is cosmetic.

### 2.8 Gradient Behavior

Gradient overrides with variants no longer reset the entire gradient in v4 -- partial overrides are preserved. Use `via-none` to unset a three-stop gradient.

**Impact**: LOW. Minimal gradient usage in the dashboard UI.

### 2.9 Dark Mode Configuration

- **v3**: `darkMode: ["class"]` in JS config
- **v4**: Dark mode uses `@custom-variant` in CSS, or defaults to `prefers-color-scheme`

**Impact**: MEDIUM. The project uses class-based dark mode (`darkMode: ["class"]`) with `next-themes`. In v4, this is configured in CSS:

```css
@custom-variant dark (&:where(.dark, .dark *));
```

This must be explicitly set because v4 defaults to media-query-based dark mode.

---

## 3. Ecosystem Compatibility

### 3.1 tailwindcss-animate --> tw-animate-css

| Aspect | Status |
|---|---|
| `tailwindcss-animate ^1.0.7` | **DEPRECATED** as of March 2025 |
| Replacement | `tw-animate-css` (pure CSS, no JS plugin) |
| Migration | Replace `plugins: [tailwindcssAnimate]` with `@import "tw-animate-css"` in CSS |
| API compatibility | Same class names (`animate-in`, `animate-out`, `accordion-down`, etc.) |

**Impact**: LOW. Direct drop-in replacement. Found **90 occurrences** of `animate-` classes across 51 files. The class names remain identical; only the import mechanism changes.

**Migration step**:
```bash
pnpm remove tailwindcss-animate
pnpm add tw-animate-css
```
Then in `globals.css`:
```css
@import "tw-animate-css";
```

### 3.2 tailwind-merge

| Aspect | Status |
|---|---|
| `tailwind-merge ^2.6.0` | Only compatible with **Tailwind v3** |
| Required version for TW4 | `tailwind-merge ^3.x` |
| API compatibility | Same `twMerge()` API, but internal utility resolution updated for v4 |

**Impact**: LOW. The `cn()` utility in `lib/utils/cn.ts` uses `twMerge(clsx(inputs))`. Upgrading to `tailwind-merge@3` is a drop-in replacement -- the public API is unchanged. Found **152 import sites** across 114 files, but no code changes needed beyond the version bump.

**Migration step**:
```bash
pnpm add tailwind-merge@^3
```

### 3.3 shadcn/ui

| Aspect | Status |
|---|---|
| Compatibility | **Full TW4 support** since early 2025 |
| CLI | `npx shadcn@latest` generates TW4-compatible components |
| Color system | HSL variables converted to OKLCH |
| Animation | Uses `tw-animate-css` instead of `tailwindcss-animate` |
| Breaking changes | `forwardRef` removed (React 19), `data-slot` attributes added |

**Impact**: MEDIUM. The project has **34 shadcn/ui components** (~2,562 lines). Two migration paths:

1. **Manual migration**: Update CSS variables, color format, and class names in existing components
2. **Regenerate components**: Use `npx shadcn@latest add <component> --overwrite` to get fresh TW4-compatible versions

Recommended: **Regenerate** components after the base migration, then manually re-apply any project-specific customizations.

### 3.4 class-variance-authority (cva)

| Aspect | Status |
|---|---|
| `class-variance-authority ^0.7.1` | **Fully compatible** with TW4 |
| Impact | None -- cva is framework-agnostic |

Found in 5 shadcn/ui components (`button`, `toast`, `badge`, `alert`, `label`). No changes needed.

### 3.5 next-themes

| Aspect | Status |
|---|---|
| `next-themes ^0.4.6` | Compatible -- adds `.dark` class to HTML |
| Impact | Ensure `@custom-variant dark` is configured in CSS |

---

## 4. PostCSS Compatibility Changes

### Current Setup (`postcss.config.mjs`)
```javascript
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

### Required Changes

| Change | Details |
|---|---|
| PostCSS plugin moved | `tailwindcss` --> `@tailwindcss/postcss` (separate package) |
| Autoprefixer removed | v4 uses Lightning CSS internally, which handles vendor prefixes |
| `postcss-import` removed | v4 handles `@import` natively |

### New Setup

```javascript
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
```

**Migration steps**:
```bash
pnpm remove tailwindcss autoprefixer
pnpm add tailwindcss@4 @tailwindcss/postcss
```

### Turbopack Consideration

The project's `next.config.mjs` includes Turbopack configuration. Next.js 15 with Turbopack supports `@tailwindcss/postcss`. No additional configuration is needed.

---

## 5. Config File Migration

### Current: `tailwind.config.ts` (JavaScript-based)

The project's config defines:
- Dark mode: class-based
- Content paths: 4 glob patterns
- Container: centered, 2rem padding, 1400px max
- Extended colors: 8 semantic color groups (HSL via CSS variables)
- Extended border radius: 3 sizes (CSS variable-based)
- Custom keyframes: `accordion-down`, `accordion-up`
- Custom animations: `accordion-down`, `accordion-up`
- Plugin: `tailwindcss-animate`

### Target: CSS-based configuration in `globals.css`

**Content detection**: v4 auto-detects content files from the project. The explicit `content` array is no longer needed. Files matching `.gitignore` are automatically excluded.

**Theme values**: Move to `@theme` directive:

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:where(.dark, .dark *));

@theme inline {
  --color-border: hsl(var(--border));
  --color-input: hsl(var(--input));
  --color-ring: hsl(var(--ring));
  --color-background: hsl(var(--background));
  --color-foreground: hsl(var(--foreground));
  --color-primary: hsl(var(--primary));
  --color-primary-foreground: hsl(var(--primary-foreground));
  --color-secondary: hsl(var(--secondary));
  --color-secondary-foreground: hsl(var(--secondary-foreground));
  --color-destructive: hsl(var(--destructive));
  --color-destructive-foreground: hsl(var(--destructive-foreground));
  --color-muted: hsl(var(--muted));
  --color-muted-foreground: hsl(var(--muted-foreground));
  --color-accent: hsl(var(--accent));
  --color-accent-foreground: hsl(var(--accent-foreground));
  --color-popover: hsl(var(--popover));
  --color-popover-foreground: hsl(var(--popover-foreground));
  --color-card: hsl(var(--card));
  --color-card-foreground: hsl(var(--card-foreground));

  --radius-lg: var(--radius);
  --radius-md: calc(var(--radius) - 2px);
  --radius-sm: calc(var(--radius) - 4px);

  --animate-accordion-down: accordion-down 0.2s ease-out;
  --animate-accordion-up: accordion-up 0.2s ease-out;
}

@keyframes accordion-down {
  from { height: 0; }
  to { height: var(--radix-accordion-content-height); }
}

@keyframes accordion-up {
  from { height: var(--radix-accordion-content-height); }
  to { height: 0; }
}
```

**Container utility**: Migrate to `@utility`:

```css
@utility container {
  margin-inline: auto;
  padding-inline: 2rem;
  max-width: 1400px;
}
```

**Post-migration**: Delete `tailwind.config.ts`.

---

## 6. CSS Syntax Changes

### 6.1 Import Directives

| v3 | v4 |
|---|---|
| `@tailwind base;` | Removed |
| `@tailwind components;` | Removed |
| `@tailwind utilities;` | Removed |
| N/A | `@import "tailwindcss";` (single import) |

**Impact**: Only `app/globals.css` uses these directives (3 lines to replace with 1).

### 6.2 @layer Directive

| v3 | v4 |
|---|---|
| `@layer base { ... }` | `@layer base { ... }` (still works) |
| `@layer components { ... }` | Use `@utility` for custom utilities |
| `@layer utilities { ... }` | Use `@utility` for custom utilities |

v4 uses **native CSS cascade layers**. The `@layer base` usage in `globals.css` (2 blocks) is compatible as-is.

### 6.3 @apply Directive

`@apply` continues to work in v4. Found **5 usages** in `globals.css`:

```css
@apply border-border;           /* still valid */
@apply bg-background text-foreground text-sm;  /* still valid */
@apply text-xl font-semibold;   /* still valid */
@apply text-lg font-semibold;   /* still valid */
@apply text-base font-semibold; /* still valid */
```

**Impact**: NONE. All `@apply` usages are straightforward and will work unchanged.

### 6.4 theme() Function

The project does **not use** `theme()` in any CSS files. No impact.

### 6.5 HSL Color Variables

The existing CSS variables use space-separated HSL values (e.g., `--primary: 221.2 83.2% 53.3%`), consumed via `hsl(var(--primary))` in the Tailwind config.

**In v4 (shadcn approach)**: The recommended pattern shifts to OKLCH, but HSL-based variables will continue to work. The project can either:

1. **Keep HSL**: No visual change, variables work as-is with `hsl(var(...))` in `@theme`
2. **Migrate to OKLCH**: More vibrant colors, better perceptual uniformity -- can be done later

**Recommendation**: Keep HSL for now (zero-risk), migrate to OKLCH as a separate enhancement.

---

## 7. Codebase Impact Analysis

### Files Requiring Changes

| Category | Files | Changes |
|---|---|---|
| `globals.css` | 1 | Replace `@tailwind` directives, add `@import "tailwindcss"`, add `@theme`, add `@custom-variant dark` |
| `tailwind.config.ts` | 1 | Delete entirely (config moves to CSS) |
| `postcss.config.mjs` | 1 | Replace `tailwindcss` + `autoprefixer` with `@tailwindcss/postcss` |
| `package.json` | 1 | Update/swap dependencies |
| `lib/utils/cn.ts` | 0 | No change (tailwind-merge v3 has same API) |
| shadcn/ui components | 0-34 | Potentially regenerate; ring-3 fixup if using bare `ring` |
| Template files (`.tsx`) | ~10-20 | Rename deprecated utilities (automated by upgrade tool) |
| Overlay CSS files | 0 | Plain CSS, no Tailwind directives |
| Panel color schemes (`globals.css`) | 0 | Pure CSS variables, unaffected |

### Files NOT Requiring Changes

- All 5 overlay CSS files (pure CSS animations)
- Backend server code (no Tailwind)
- API routes (no Tailwind)
- All Zod models, services, adapters
- All test files (utility class names tested via snapshots may need updates)

---

## 8. Effort Estimation

### Phase 1: Core Migration (2-4 hours)

| Task | Effort |
|---|---|
| Run `npx @tailwindcss/upgrade` on feature branch | 15 min |
| Review and fix automated migration output | 45 min |
| Update `postcss.config.mjs` | 5 min |
| Swap dependencies (`tailwindcss@4`, `@tailwindcss/postcss`, `tw-animate-css`, `tailwind-merge@3`) | 10 min |
| Delete `tailwind.config.ts` | 1 min |
| Configure `@custom-variant dark` for class-based dark mode | 5 min |
| Migrate container utility to `@utility` directive | 10 min |
| Test dev server starts and renders | 30 min |

### Phase 2: Visual QA and Fixups (2-4 hours)

| Task | Effort |
|---|---|
| Visual comparison of all dashboard panels | 60 min |
| Test dark mode toggle across all views | 30 min |
| Test panel color schemes (8 schemes) | 30 min |
| Fix ring width regressions (ring --> ring-3) | 20 min |
| Fix border color regressions | 20 min |
| Fix button cursor (if desired) | 10 min |
| Test all overlay pages in OBS browser source | 30 min |

### Phase 3: Component Refresh (Optional, 2-3 hours)

| Task | Effort |
|---|---|
| Regenerate shadcn/ui components with TW4 CLI | 60 min |
| Re-apply project customizations (compact sizing, etc.) | 60 min |
| Re-test after regeneration | 60 min |

### Total Estimate

| Scope | Effort |
|---|---|
| **Minimum viable migration** (Phase 1 + 2) | **4-8 hours** |
| **Full migration with component refresh** (Phase 1 + 2 + 3) | **6-11 hours** |

---

## 9. Risks

### HIGH Risk

| Risk | Mitigation |
|---|---|
| **Panel color scheme breakage**: The 8 panel-scheme CSS classes override Tailwind CSS variables. If v4 changes how variables cascade through layers, panel theming could break silently. | Dedicated QA pass for each color scheme in both light/dark mode. |
| **Dockview CSS interaction**: Dockview has its own CSS (`dockview.css`). CSS cascade layer changes in TW4 could alter specificity relationships. | Test dockview panel rendering, drag-drop, and tab styling thoroughly. |

### MEDIUM Risk

| Risk | Mitigation |
|---|---|
| **Ring width regression**: Bare `ring` usage changes from 3px to 1px. Focus indicators may become invisible. | Search-and-replace `ring ` (with space) to `ring-3 ` across all `.tsx` files. |
| **Border default color change**: Any `border` without explicit color will use `currentColor` instead of `gray-200`. | The global `@apply border-border` mitigates most cases, but inspect edge cases. |
| **Snapshot tests**: Tests that assert on class names may fail if the upgrade tool renames classes. | Update test snapshots after migration. |
| **tailwind-merge v3 edge cases**: New merge logic in v3 may resolve conflicts differently for some utility combinations. | Run full test suite; visually inspect components with dynamic class merging. |

### LOW Risk

| Risk | Mitigation |
|---|---|
| `@apply` syntax changes | v4 still supports `@apply`; the 5 usages in this project are trivial. |
| Overlay CSS breakage | Overlay files are pure CSS with no Tailwind -- zero risk. |
| Next.js 15 incompatibility | `@tailwindcss/postcss` is fully supported by Next.js 15. |
| HSL variable format | HSL variables work unchanged in v4; OKLCH migration is optional. |

---

## 10. Go/No-Go Recommendation

### Recommendation: **GO**

**Rationale**:

1. **Ecosystem readiness**: All dependencies (`tw-animate-css`, `tailwind-merge@3`, shadcn/ui, `@tailwindcss/postcss`) are stable and production-ready for TW4.

2. **Bounded scope**: The project's Tailwind footprint is well-contained -- 1 config file, 1 CSS file with 5 `@apply` directives, 34 shadcn components, and no `theme()` function calls.

3. **Official tooling**: The `@tailwindcss/upgrade` CLI automates dependency swaps, config migration, and class renaming.

4. **Performance gains**: TW4 offers 5x faster full builds and 100x faster incremental builds, which benefits the development workflow.

5. **Future-proofing**: Staying on TW3 means missing new features, and the shadcn/ui CLI will eventually drop TW3 component generation.

6. **Overlay safety**: The overlay CSS files (the most critical visual elements for live streaming) use zero Tailwind and are completely unaffected.

### Conditions for GO

- [ ] Migration happens on a **dedicated feature branch**
- [ ] Full visual QA pass on all dashboard views, dark mode, and panel color schemes
- [ ] All overlay pages tested in OBS browser source
- [ ] Test suite updated and passing
- [ ] No production deployment until at least 2 days of development use

### Suggested Migration Order

1. Create `feat/tailwind-v4-migration` branch
2. Run `npx @tailwindcss/upgrade`
3. Manually fix PostCSS config, dark mode variant, container utility
4. Swap `tailwindcss-animate` for `tw-animate-css`
5. Upgrade `tailwind-merge` to v3
6. Delete `tailwind.config.ts`
7. Start dev server, fix compilation errors
8. Visual QA across all pages
9. Optionally regenerate shadcn/ui components
10. Run test suite, update snapshots

---

## References

- [Tailwind CSS v4 Upgrade Guide](https://tailwindcss.com/docs/upgrade-guide)
- [Tailwind CSS v4 Release Blog](https://tailwindcss.com/blog/tailwindcss-v4)
- [shadcn/ui Tailwind v4 Documentation](https://ui.shadcn.com/docs/tailwind-v4)
- [tw-animate-css (replacement for tailwindcss-animate)](https://github.com/Wombosvideo/tw-animate-css)
- [tailwind-merge v3 Releases](https://github.com/dcastil/tailwind-merge/releases)
- [tailwind-merge TW4 Discussion](https://github.com/dcastil/tailwind-merge/discussions/468)
- [PostCSS plugin migration](https://tailwindcss.com/docs/installation/using-postcss)
- [Migrating from Tailwind 3 to 4 with shadcn/ui](https://zippystarter.com/blog/guides/migrating-tailwind3-to-tailwind4-with-shadcn)
