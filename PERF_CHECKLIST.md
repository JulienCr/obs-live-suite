# Performance & Quality Checklist

## Performance Optimization

### React Performance
- [ ] Heavy components wrapped in `React.memo()`
- [ ] Expensive callbacks memoized with `useCallback()`
- [ ] Expensive computations memoized with `useMemo()`
- [ ] Large lists virtualized (`react-window` or `react-virtuoso`)
- [ ] Images lazy-loaded
- [ ] Code split with `React.lazy()` and `Suspense`

### Dockview-Specific
- [ ] Layout saves debounced (300ms)
- [ ] Panel components lazy-loaded
- [ ] Listeners disposed on cleanup
- [ ] No synchronous heavy operations in `onDidLayoutChange`

### Bundle Size
- [ ] Tree-shaking enabled
- [ ] Dead code eliminated
- [ ] Only importing needed Blueprint components
- [ ] No duplicate dependencies (check with `pnpm why <package>`)
- [ ] Bundle analyzed (`next build` + bundle analyzer)

### State Management
- [ ] No unnecessary re-renders
- [ ] State lifted only as needed
- [ ] Context split by concern
- [ ] No massive objects in state

---

## Accessibility (A11y)

### Keyboard Navigation
- [ ] All interactive elements keyboard accessible
- [ ] Tab order logical
- [ ] Focus indicators visible
- [ ] Escape closes dialogs/popovers
- [ ] Arrow keys work in menus/lists

### ARIA & Semantics
- [ ] Buttons have accessible labels
- [ ] Icon-only buttons have `aria-label`
- [ ] Form inputs have associated labels
- [ ] Dialogs have `role="dialog"`
- [ ] Live regions for dynamic content

### Screen Readers
- [ ] Alt text on images
- [ ] `sr-only` class for visual-only content
- [ ] Status messages announced

### Color & Contrast
- [ ] Sufficient contrast (WCAG AA minimum)
- [ ] Not relying on color alone for info
- [ ] Dark theme tested

---

## Code Quality

### TypeScript
- [ ] No `any` without justification
- [ ] Strict mode enabled
- [ ] Types for all props/state
- [ ] No `@ts-ignore` without comment

### ESLint
- [ ] No ESLint errors
- [ ] No unused imports
- [ ] No console.log in production code
- [ ] Consistent formatting (Prettier)

### Testing
- [ ] Unit tests for utils/services
- [ ] Component tests for UI
- [ ] E2E tests for critical paths
- [ ] Test keyboard interactions
- [ ] Test error states

---

## Security

### Input Validation
- [ ] All user input validated
- [ ] No XSS vulnerabilities
- [ ] No `dangerouslySetInnerHTML` without sanitization
- [ ] Path traversal prevented in file operations

### Dependencies
- [ ] No known vulnerabilities (`pnpm audit`)
- [ ] Dependencies up-to-date
- [ ] Lockfile committed

### Content Security
- [ ] CSP headers configured
- [ ] No inline scripts (if CSP strict)
- [ ] External resources whitelisted

---

## Blueprint Migration Specific

### Styling
- [ ] Blueprint CSS imported in globals.css
- [ ] Dark theme class (`bp5-dark`) on body
- [ ] No Tailwind color/border utilities remaining
- [ ] Only layout utilities from Tailwind kept
- [ ] No `!important` overrides on Blueprint classes

### Components
- [ ] All Radix imports replaced
- [ ] Dialog API updated (`open` → `isOpen`, etc.)
- [ ] Tabs API updated (ID-based)
- [ ] Toast using Blueprint Toaster
- [ ] Form controls using Blueprint components

### Dockview
- [ ] Panel IDs unique
- [ ] Layout persistence working
- [ ] Panels lazy-mounted
- [ ] No DnD conflicts (only for lists, not panels)

---

## Runtime Checks

### Dev Tools
- [ ] No React warnings in console
- [ ] No memory leaks (profile with React DevTools)
- [ ] No excessive re-renders (profile)

### Network
- [ ] Images optimized (WebP, proper sizing)
- [ ] API calls debounced/throttled
- [ ] Unnecessary requests eliminated

### Loading
- [ ] Initial page load < 3s
- [ ] Time to interactive < 5s
- [ ] No blocking main thread

---

## Pre-Commit Checklist

Before committing migration changes:

1. **Build succeeds**
   ```bash
   pnpm build
   ```

2. **Types check**
   ```bash
   pnpm type-check
   ```

3. **Linting passes**
   ```bash
   pnpm lint
   ```

4. **Tests pass**
   ```bash
   pnpm test
   ```

5. **Manual testing**
   - [ ] Dashboard loads
   - [ ] Dockview panels work
   - [ ] Command palette opens (Cmd+P)
   - [ ] Dialogs open/close
   - [ ] Toasts appear
   - [ ] Keyboard navigation works
   - [ ] Dark theme correct

6. **Visual regression**
   - [ ] Screenshot key pages before/after
   - [ ] Compare layouts

7. **Performance baseline**
   - [ ] Lighthouse score > 90
   - [ ] No performance regressions

---

## Post-Migration

After completing the migration:

- [ ] Remove old Radix dependencies
- [ ] Remove unused Tailwind utilities
- [ ] Update documentation
- [ ] Train team on new patterns
- [ ] Monitor production for issues
- [ ] Collect user feedback

---

## Automated Checks (CI/CD)

Add to GitHub Actions / CI:

```yaml
- name: Type Check
  run: pnpm type-check

- name: Lint
  run: pnpm lint

- name: Test
  run: pnpm test

- name: Build
  run: pnpm build

- name: Audit
  run: pnpm audit --audit-level=moderate
```

---

**Goal:** Zero errors, fast loads, accessible to all, secure by default.
