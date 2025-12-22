# Refactoring Guidelines: Radix → Blueprint

## Component Conversion Patterns

### 1. Button
**Before (Radix + Tailwind):**
```tsx
import { Button } from "@/components/ui/button";

<Button variant="destructive" size="sm">Delete</Button>
```

**After (Blueprint):**
```tsx
import { Button } from "@blueprintjs/core";

<Button intent="danger" small>Delete</Button>
```

**Mapping:**
- `variant="destructive"` → `intent="danger"`
- `variant="outline"` → `outlined`
- `variant="ghost"` → `minimal`
- `size="sm"` → `small`
- `size="lg"` → `large`
- `size="icon"` → `icon` prop + no text

---

### 2. Dialog
**Before:**
```tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Settings</DialogTitle>
    </DialogHeader>
    <div>Content</div>
  </DialogContent>
</Dialog>
```

**After:**
```tsx
import { Dialog, DialogBody } from "@blueprintjs/core";

<Dialog isOpen={open} onClose={() => setOpen(false)} title="Settings">
  <DialogBody>
    <div>Content</div>
  </DialogBody>
</Dialog>
```

**Key changes:**
- `open` → `isOpen`
- `onOpenChange` → `onClose`
- No `DialogContent` wrapper
- `title` prop instead of `DialogTitle` component

---

### 3. Tabs
**Before:**
```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

<Tabs defaultValue="tab1">
  <TabsList>
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">Content 1</TabsContent>
  <TabsContent value="tab2">Content 2</TabsContent>
</Tabs>
```

**After:**
```tsx
import { Tabs, Tab } from "@blueprintjs/core";

<Tabs id="main-tabs" selectedTabId={selected} onChange={setSelected}>
  <Tab id="tab1" title="Tab 1" panel={<div>Content 1</div>} />
  <Tab id="tab2" title="Tab 2" panel={<div>Content 2</div>} />
</Tabs>
```

**Key changes:**
- Uses `id` instead of `value`
- `panel` prop instead of separate `TabsContent`
- `onChange` receives the new tab ID

---

### 4. Switch
**Before:**
```tsx
import { Switch } from "@/components/ui/switch";

<Switch checked={enabled} onCheckedChange={setEnabled} />
```

**After:**
```tsx
import { Switch } from "@blueprintjs/core";

<Switch checked={enabled} onChange={(e) => setEnabled(e.currentTarget.checked)} />
```

**Key changes:**
- `onCheckedChange` → `onChange` (with event)

---

### 5. Checkbox
**Before:**
```tsx
import { Checkbox } from "@/components/ui/checkbox";

<Checkbox checked={checked} onCheckedChange={setChecked} />
```

**After:**
```tsx
import { Checkbox } from "@blueprintjs/core";

<Checkbox checked={checked} onChange={(e) => setChecked(e.currentTarget.checked)} />
```

---

### 6. Select
**Before:**
```tsx
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

<Select value={value} onValueChange={setValue}>
  <SelectTrigger>
    <SelectValue placeholder="Choose..." />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="a">Option A</SelectItem>
    <SelectItem value="b">Option B</SelectItem>
  </SelectContent>
</Select>
```

**After (simple):**
```tsx
import { HTMLSelect } from "@blueprintjs/core";

<HTMLSelect value={value} onChange={(e) => setValue(e.currentTarget.value)}>
  <option value="a">Option A</option>
  <option value="b">Option B</option>
</HTMLSelect>
```

**After (advanced):**
```tsx
import { Select } from "@blueprintjs/select";

const ItemSelect = Select.ofType<Item>();

<ItemSelect
  items={items}
  itemRenderer={(item, { handleClick }) => (
    <MenuItem key={item.id} text={item.label} onClick={handleClick} />
  )}
  onItemSelect={setSelected}
>
  <Button text={selected?.label || "Choose..."} rightIcon="caret-down" />
</ItemSelect>
```

---

### 7. Slider
**Before:**
```tsx
import { Slider } from "@/components/ui/slider";

<Slider value={[volume]} onValueChange={([v]) => setVolume(v)} min={0} max={100} />
```

**After:**
```tsx
import { Slider } from "@blueprintjs/core";

<Slider value={volume} onChange={setVolume} min={0} max={100} />
```

---

### 8. Separator
**Before:**
```tsx
import { Separator } from "@/components/ui/separator";

<Separator />
```

**After:**
```tsx
import { Divider } from "@blueprintjs/core";

<Divider />
```

---

### 9. Toast
**Before:**
```tsx
import { toast } from "sonner";

toast.success("Saved!");
toast.error("Failed!");
```

**After:**
```tsx
import { AppToaster } from "@/lib/toaster";

AppToaster.then(t => t.show({ message: "Saved!", intent: "success" }));
AppToaster.then(t => t.show({ message: "Failed!", intent: "danger" }));
```

**Setup once:**
```tsx
// lib/toaster.ts
import { OverlayToaster } from "@blueprintjs/core";

export const AppToaster = OverlayToaster.createAsync({
  position: "top-right",
  maxToasts: 5,
});
```

---

### 10. Label + Input (Form Pattern)
**Before:**
```tsx
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

<div>
  <Label htmlFor="name">Name</Label>
  <Input id="name" value={name} onChange={e => setName(e.target.value)} />
</div>
```

**After:**
```tsx
import { FormGroup, InputGroup } from "@blueprintjs/core";

<FormGroup label="Name" labelFor="name">
  <InputGroup id="name" value={name} onChange={e => setName(e.target.value)} />
</FormGroup>
```

---

## Styling Rules

### Remove Tailwind Classes
**Before:**
```tsx
<div className="flex items-center justify-between p-4 border-b">
```

**After:**
```tsx
<div className="bp5-navbar">
```

### Custom Spacing (Keep Minimal Tailwind)
If you **must** keep Tailwind utilities, restrict to:
- Layout: `flex`, `grid`, `gap-*`
- Spacing: `p-*`, `m-*`, `space-*`
- Avoid: colors, typography, borders (use Blueprint)

### Blueprint Class Naming
- `bp5-button`
- `bp5-dialog`
- `bp5-navbar`
- `bp5-card`
- `bp5-dark` (dark theme)

---

## Dockview Integration

### Replace Widget Grid with Dockview
**Before (Custom DnD):**
```tsx
<DndContext onDragEnd={handleDragEnd}>
  <SortableContext items={widgetIds}>
    {widgets.map(w => <WidgetCard key={w.id} {...w} />)}
  </SortableContext>
</DndContext>
```

**After (Dockview):**
```tsx
<DockviewReact
  components={{
    lowerThird: LowerThirdPanel,
    countdown: CountdownPanel,
    guests: GuestsPanel,
  }}
  onReady={onDockviewReady}
/>
```

### Panel Component
```tsx
// components/shell/panels/LowerThirdPanel.tsx
import { IDockviewPanelProps } from "dockview-react";

export function LowerThirdPanel(props: IDockviewPanelProps) {
  return (
    <div className="panel-content">
      {/* Your existing LowerThirdCard content */}
    </div>
  );
}
```

---

## Common Pitfalls

### ❌ Don't: Override Blueprint CSS Aggressively
```css
/* BAD */
.bp5-button {
  background: red !important;
}
```

### ✅ Do: Extend with Custom Classes
```css
/* GOOD */
.my-special-button.bp5-button {
  background: var(--my-accent);
}
```

---

### ❌ Don't: Use Inline Styles for Theming
```tsx
<Button style={{ color: darkMode ? "#fff" : "#000" }} />
```

### ✅ Do: Use Blueprint Intent/Classes
```tsx
<Button intent="primary" />
```

---

### ❌ Don't: Mix Dockview with Custom DnD
```tsx
<DockviewReact>
  <DndContext> {/* WRONG */}
```

### ✅ Do: Use Dockview for Panels, DnD for Lists Only
```tsx
// In a panel:
<DndContext> {/* For reordering list items only */}
  <SortableContext items={listItems}>
    ...
  </SortableContext>
</DndContext>
```

---

## Performance Best Practices

### Memoize Heavy Components
```tsx
import { memo } from "react";

export const ExpensivePanel = memo(function ExpensivePanel(props) {
  // ...
});
```

### Virtualize Long Lists
```tsx
import { FixedSizeList } from "react-window";

<FixedSizeList
  height={400}
  itemCount={items.length}
  itemSize={35}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>{items[index].name}</div>
  )}
</FixedSizeList>
```

### Debounce Layout Saves
```tsx
import { useMemo } from "react";
import debounce from "lodash.debounce";

const saveLayout = useMemo(
  () => debounce((json) => localStorage.setItem("layout", json), 300),
  []
);
```

---

## Testing Checklist

- [ ] Keyboard navigation (Tab, Enter, Esc)
- [ ] Focus trap in dialogs
- [ ] ARIA labels present
- [ ] Dark theme renders correctly
- [ ] Layout persists on reload
- [ ] Toasts appear/dismiss
- [ ] Command palette opens (Cmd+P)
- [ ] No console errors

---

## Incremental Migration Strategy

1. **Start with one page** (e.g., Settings)
2. **Convert UI components** in that page
3. **Test thoroughly**
4. **Move to next page**
5. **Delete old Radix components** once all references gone

---

## Questions?
See [Blueprint.js Docs](https://blueprintjs.com/docs/) and [Dockview Docs](https://dockview.dev/).
