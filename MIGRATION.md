# Blueprint.js + Dockview Migration Guide

## Overview
Migrating from Next.js + Radix-UI + Tailwind to Blueprint.js + Dockview while preserving core functionality.

## Component Mapping

### UI Primitives (Radix → Blueprint)
- `Dialog` → `Dialog` (similar API)
- `Tabs` → `Tabs` (ID-based, cleaner)
- `Switch` → `Switch`
- `Checkbox` → `Checkbox`
- `Select` → `Select` or `HTMLSelect`
- `Slider` → `Slider` (multi-handle)
- `Separator` → `Divider`
- `Toast` (Sonner) → `Toaster` (singleton)
- `Button` (CVA) → `Button` (intent-based)

### Layout (Custom → Dockview)
- Widget Grid (DnD) → **Dockview Panels**
- No more custom drag-drop for panels
- Keep @dnd-kit for **in-panel list reordering only**

## Installation

```bash
pnpm add @blueprintjs/core @blueprintjs/icons @blueprintjs/popover2 @blueprintjs/select dockview-core dockview-react
```

**Note:** After installation, import Dockview CSS in `app/globals.css`:
```css
@import "dockview-react/dist/styles/dockview.css";
```

## Architecture

### App Structure
```
app/
  layout.tsx          # Blueprint CSS + dark theme class
  dashboard/
    page.tsx          # <DashboardShell /> (Dockview)
components/
  shell/
    DashboardShell.tsx   # Dockview layout
    panels/
      ExplorerPanel.tsx
      EditorPanel.tsx
      ConsolePanel.tsx
  ui-blueprint/          # New Blueprint wrappers
    Button.tsx
    Dialog.tsx
    ...
```

### Dockview Layout
- **Left**: Explorer (asset tree, navigation)
- **Center**: Main Editor (widget controls)
- **Bottom**: Console (event log)
- **Persistence**: localStorage JSON

## Styling Strategy

### Remove Tailwind
- Delete most utility classes from components
- Keep **only spacing/layout** if needed (e.g., `flex`, `gap-2`)
- Use Blueprint class names: `bp5-*`
- Custom CSS variables for theming (don't override Blueprint defaults)

### Dark Theme
```tsx
// app/layout.tsx
<body className="bp5-dark">
  <BlueprintProvider>
    {children}
  </BlueprintProvider>
</body>
```

## Patterns

### Dialog Example
```tsx
import { Dialog, DialogBody, Button } from "@blueprintjs/core";

function MyDialog({ isOpen, onClose }) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Settings">
      <DialogBody>
        <p>Content here</p>
      </DialogBody>
      <div className="bp5-dialog-footer">
        <Button onClick={onClose}>Close</Button>
      </div>
    </Dialog>
  );
}
```

### Toaster (Singleton)
```tsx
// lib/toaster.ts
import { OverlayToaster } from "@blueprintjs/core";

export const AppToaster = OverlayToaster.createAsync({
  position: "top-right",
});

// Usage
AppToaster.then(toaster => {
  toaster.show({ message: "Success!", intent: "success" });
});
```

### Dockview Panel Registration
```tsx
import { DockviewReact, DockviewReadyEvent } from "dockview-react";

const components = {
  explorer: ExplorerPanel,
  editor: EditorPanel,
  console: ConsolePanel,
};

function DashboardShell() {
  const onReady = (event: DockviewReadyEvent) => {
    event.api.addPanel({
      id: "explorer",
      component: "explorer",
      title: "Explorer",
    });
    // ... add more panels

    // Restore layout from localStorage
    const saved = localStorage.getItem("dockview-layout");
    if (saved) {
      event.api.fromJSON(JSON.parse(saved));
    }
  };

  return (
    <DockviewReact
      components={components}
      onReady={onReady}
      className="dockview-theme-dark"
    />
  );
}
```

## Command Palette
```tsx
import { Omnibar } from "@blueprintjs/select";

// Register shortcuts
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "p") {
      e.preventDefault();
      setOmnibarOpen(true);
    }
  };
  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
}, []);
```

## Security Checklist
- ✅ No `dangerouslySetInnerHTML` without sanitization
- ✅ No `eval()` or `Function()`
- ✅ Lock dependencies (pnpm lockfile)
- ✅ Content-Security-Policy headers

## Performance Checklist
- ✅ Memoize heavy components (`React.memo`)
- ✅ Virtualize long lists (`react-window`)
- ✅ Lazy-load panels (Dockview unmount on hide)
- ✅ Debounce layout saves (300ms)
- ✅ Avoid prop drilling (use services/context)

## Accessibility
- ✅ Blueprint components have ARIA roles
- ✅ Full keyboard navigation (Tab, Enter, Esc)
- ✅ Focus trap in dialogs
- ✅ High-contrast mode support

## Don't Do
- ❌ Mix Dockview with generic DnD for panel docking
- ❌ Override Blueprint CSS wholesale
- ❌ Keep Tailwind utility soup
- ❌ Block main thread (use `useDeferredValue`, workers)
- ❌ Reintroduce Radix in parallel
- ❌ Use inline styles for theming

## Migration Order
1. Install deps
2. Wire Blueprint CSS + dark class
3. Build Dockview shell (3 panels)
4. Replace UI primitives (Button, Dialog, etc.)
5. Migrate dashboard cards → panels
6. Add command palette + shortcuts
7. Remove Tailwind classes
8. Perf + a11y pass
9. Tests
