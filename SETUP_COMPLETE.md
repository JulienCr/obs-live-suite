# Blueprint.js + Dockview Migration - Setup Complete

## ✅ What's Been Done

### 1. Dependencies Installed
```bash
@blueprintjs/core @blueprintjs/icons @blueprintjs/popover2 @blueprintjs/select
dockview-core dockview-react
```

### 2. Global Styles Configured
- `app/globals.css` - Blueprint CSS imports added
- `app/layout.tsx` - Dark theme class (`bp5-dark`) on body

### 3. Core Infrastructure Created

**Blueprint UI Components** (`components/ui-blueprint/`)
- `Button.tsx` - Re-export with migration notes
- `Dialog.tsx` - Dialog components
- `index.ts` - Barrel export for all Blueprint components

**Dockview Shell** (`components/shell/`)
- `DashboardShell.tsx` - 3-panel IDE layout (Explorer, Editor, Console)
- `CommandPalette.tsx` - Omnibar with Cmd+P shortcut

**Utilities**
- `lib/toaster.ts` - Singleton toaster for notifications

### 4. Documentation Created

**Migration Guides:**
- `MIGRATION.md` - Complete migration roadmap
- `REFACTORING_GUIDELINES.md` - Component-by-component conversion patterns
- `EXAMPLE_PATTERNS.md` - Copy-paste code examples
- `PERF_CHECKLIST.md` - Performance & quality checklist
- `DONT_DO_LIST.md` - Anti-patterns & forbidden practices

---

## 🚀 Next Steps (Manual Migration)

### Phase 1: Test the Setup
```bash
pnpm dev
```
Visit `http://localhost:3000` - should see dark theme with Blueprint styles.

### Phase 2: Wire Dockview into Dashboard

**Option A: Quick Test (New Route)**
Create `app/dashboard-v2/page.tsx`:
```tsx
import { DashboardShell } from "@/components/shell/DashboardShell";
import { CommandPalette } from "@/components/shell/CommandPalette";

export default function DashboardV2() {
  return (
    <>
      <CommandPalette />
      <DashboardShell />
    </>
  );
}
```
Visit `/dashboard-v2` to see Dockview in action.

**Option B: Replace Existing (Gradual)**
Replace `components/dashboard/DashboardContainer.tsx` incrementally.

### Phase 3: Migrate UI Components

Start with most-used components:

1. **Button** (easiest)
   - Find: `import { Button } from "@/components/ui/button"`
   - Replace: `import { Button } from "@/components/ui-blueprint"`
   - Update props: `variant="destructive"` → `intent="danger"`, etc.

2. **Dialog**
   - See `REFACTORING_GUIDELINES.md` for Dialog migration pattern
   - Update API: `open` → `isOpen`, `onOpenChange` → `onClose`

3. **Tabs**
   - ID-based instead of value-based
   - See examples in `EXAMPLE_PATTERNS.md`

4. **Switch, Checkbox, Slider**
   - Change `onCheckedChange` → `onChange` (with event)

5. **Toast**
   - Replace Sonner with Blueprint Toaster
   - See `lib/toaster.ts` usage

### Phase 4: Convert Dashboard Cards to Dockview Panels

For each widget (LowerThirdCard, CountdownCard, etc.):

1. Create panel component in `components/shell/panels/`
   ```tsx
   import { type IDockviewPanelProps } from "dockview-react";

   export function LowerThirdPanel(props: IDockviewPanelProps) {
     return (
       <div style={{ padding: "1rem", height: "100%" }}>
         {/* Existing LowerThirdCard content */}
       </div>
     );
   }
   ```

2. Register in `DashboardShell.tsx`:
   ```tsx
   const components = {
     lowerThird: LowerThirdPanel,
     countdown: CountdownPanel,
     // ... etc
   };
   ```

3. Remove old `WidgetGrid` + DnD code

### Phase 5: Command Palette Integration

Add commands in `CommandPalette.tsx`:
```tsx
{
  id: "lower-third-show",
  label: "Show Lower Third",
  action: () => {
    // Call your API or dispatch action
  }
}
```

### Phase 6: Cleanup

1. **Remove Radix**
   ```bash
   pnpm remove @radix-ui/react-dialog @radix-ui/react-tabs @radix-ui/react-switch @radix-ui/react-select @radix-ui/react-slider @radix-ui/react-checkbox @radix-ui/react-separator @radix-ui/react-toast @radix-ui/react-avatar @radix-ui/react-label @radix-ui/react-slot
   pnpm remove sonner
   ```

2. **Remove Old UI Components**
   ```bash
   rm -rf components/ui/
   ```

3. **Trim Tailwind Config**
   Remove color/border definitions from `tailwind.config.ts`, keep only layout utilities.

4. **Update Imports**
   Global find/replace:
   - `@/components/ui/` → `@/components/ui-blueprint/`

---

## 📦 Key Files Reference

### Import Blueprint Components
```tsx
import { Button, Dialog, Tabs, Switch, ... } from "@/components/ui-blueprint";
```

### Show Toast
```tsx
import { AppToaster } from "@/lib/toaster";

AppToaster.then(t => t.show({ message: "Success!", intent: "success" }));
```

### Open Command Palette
Press **Cmd+P** (Mac) or **Ctrl+P** (Windows/Linux)

### Dockview Panel Template
```tsx
import { type IDockviewPanelProps } from "dockview-react";

export function MyPanel(props: IDockviewPanelProps) {
  return <div>Panel content</div>;
}
```

---

## 🎨 Styling Rules

### Use Blueprint Classes
```tsx
<div className="bp5-card bp5-elevation-2">
  <h3 className="bp5-heading">Title</h3>
</div>
```

### Minimal Tailwind
Keep only: `flex`, `grid`, `gap-*`, `p-*`, `m-*`

Remove: All color, border, shadow, typography utilities

### Dark Theme
Already enabled via `bp5-dark` class on `<body>`.

---

## 🔍 Debugging Tips

### CSS Not Loading?
Check `app/globals.css` has Blueprint imports at top:
```css
@import "dockview-react/dist/styles/dockview.css";
```
(Note: It's `dist/styles/dockview.css`, not `dist/styles.css`)

### Dockview Not Rendering?
- Check `height: 100vh` on parent container
- Verify Dockview CSS imported in `app/globals.css`

### Command Palette Not Opening?
- Check console for JS errors
- Verify `CommandPalette` component mounted

### Dark Theme Issues?
- Ensure `bp5-dark` class on `<body>`
- Check Blueprint CSS loaded before Tailwind

---

## 📚 Documentation Quick Links

- **Component Mapping:** `MIGRATION.md`
- **Conversion Patterns:** `REFACTORING_GUIDELINES.md`
- **Code Examples:** `EXAMPLE_PATTERNS.md`
- **Anti-Patterns:** `DONT_DO_LIST.md`
- **Performance:** `PERF_CHECKLIST.md`

---

## 🤝 Getting Help

- [Blueprint.js Docs](https://blueprintjs.com/docs/)
- [Dockview Docs](https://dockview.dev/)
- [Blueprint GitHub](https://github.com/palantir/blueprint)
- [Dockview GitHub](https://github.com/mathuo/dockview)

---

## ✅ Pre-Commit Checklist

Before committing migration code:

```bash
pnpm type-check  # No TypeScript errors
pnpm lint        # No ESLint errors
pnpm build       # Build succeeds
pnpm test        # Tests pass
```

Manual checks:
- [ ] Dashboard loads without errors
- [ ] Command palette opens (Cmd+P)
- [ ] Dark theme correct
- [ ] Dockview panels draggable/resizable
- [ ] Layout persists on refresh

---

**You're ready to start migrating!** Begin with a single page or component, test thoroughly, then proceed to the next.

Good luck! 🚀
