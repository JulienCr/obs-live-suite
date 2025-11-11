# Don't Do List

## ❌ Anti-Patterns & Forbidden Practices

### 1. Layout & Docking
- **DON'T** mix Dockview with generic DnD libraries for panel docking
- **DON'T** use @dnd-kit for moving panels around (Dockview handles this)
- **DO** use @dnd-kit only for **in-panel list reordering**

**Bad:**
```tsx
<DockviewReact>
  <DndContext> {/* WRONG - conflicts with Dockview */}
    <Panel>...</Panel>
  </DndContext>
</DockviewReact>
```

**Good:**
```tsx
<DockviewReact ...>
  {/* Inside a specific panel component */}
  <DndContext> {/* OK - for list items only */}
    <SortableContext items={listItems}>
      {items.map(item => <DraggableRow key={item.id} />)}
    </SortableContext>
  </DndContext>
</DockviewReact>
```

---

### 2. Styling
- **DON'T** override Blueprint CSS wholesale with `!important`
- **DON'T** use inline styles for theming (breaks dark mode)
- **DON'T** keep Tailwind utility soup everywhere
- **DON'T** remove Blueprint class names (e.g., `bp5-button`)

**Bad:**
```css
.bp5-button {
  background: red !important; /* Breaks Blueprint intents */
}
```

```tsx
<Button style={{ color: darkMode ? "#fff" : "#000" }}> {/* Bad */}
```

**Good:**
```css
.my-custom-button.bp5-button {
  background: var(--my-accent); /* Extends, doesn't override */
}
```

```tsx
<Button intent="primary"> {/* Blueprint handles theming */}
```

---

### 3. Component Migration
- **DON'T** reintroduce Radix components after migration
- **DON'T** mix Radix and Blueprint in the same UI tree
- **DON'T** use both Sonner and Blueprint toasts

**Bad:**
```tsx
import { Dialog as RadixDialog } from "@radix-ui/react-dialog";
import { Button } from "@blueprintjs/core";

<RadixDialog> {/* DON'T mix */}
  <Button>OK</Button>
</RadixDialog>
```

---

### 4. Performance
- **DON'T** block main thread with heavy synchronous renders
- **DON'T** render thousands of items without virtualization
- **DON'T** forget to memoize expensive components
- **DON'T** use unmemoized callbacks in render-heavy components

**Bad:**
```tsx
function HeavyList({ items }: { items: any[] }) {
  return (
    <div>
      {items.map(item => <ExpensiveRow key={item.id} data={item} />)}
      {/* 10,000 items = UI freeze */}
    </div>
  );
}
```

**Good:**
```tsx
import { FixedSizeList } from "react-window";
import { memo } from "react";

const ExpensiveRow = memo(function ExpensiveRow({ data }) {
  // ...
});

function HeavyList({ items }: { items: any[] }) {
  return (
    <FixedSizeList
      height={600}
      itemCount={items.length}
      itemSize={40}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>
          <ExpensiveRow data={items[index]} />
        </div>
      )}
    </FixedSizeList>
  );
}
```

---

### 5. State Management
- **DON'T** use prop drilling for deeply nested data
- **DON'T** put everything in global state (avoid state soup)
- **DON'T** create circular dependencies between panels

**Bad:**
```tsx
<App>
  <Shell>
    <Panel data={data} updateData={setData}>
      <NestedComponent data={data} updateData={setData}>
        <DeeperComponent data={data} updateData={setData}>
          {/* Prop drilling hell */}
        </DeeperComponent>
      </NestedComponent>
    </Panel>
  </Shell>
</App>
```

**Good:**
```tsx
// Use service/context at appropriate level
const DataContext = createContext();

<DataContext.Provider value={{ data, updateData }}>
  <Panel>
    <DeeperComponent /> {/* Uses useContext(DataContext) */}
  </Panel>
</DataContext.Provider>
```

---

### 6. Security
- **DON'T** use `dangerouslySetInnerHTML` without sanitization
- **DON'T** use `eval()` or `Function()` constructor
- **DON'T** trust user input in URLs or file paths
- **DON'T** skip input validation

**Bad:**
```tsx
<div dangerouslySetInnerHTML={{ __html: userInput }} /> {/* XSS */}
```

**Good:**
```tsx
import DOMPurify from "dompurify";

<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userInput) }} />
```

---

### 7. Accessibility
- **DON'T** remove focus outlines without providing alternative
- **DON'T** skip ARIA labels on interactive elements
- **DON'T** break keyboard navigation
- **DON'T** use `tabIndex={-1}` on interactive elements

**Bad:**
```css
* {
  outline: none !important; /* DON'T */
}
```

```tsx
<button onClick={handler}> {/* No accessible label */}
  <Icon icon="delete" />
</button>
```

**Good:**
```tsx
<Button icon="delete" aria-label="Delete item">
  {/* Icon-only button with label */}
</Button>
```

---

### 8. Tailwind Cleanup
- **DON'T** keep dead utility classes after Blueprint migration
- **DON'T** use Tailwind for colors, borders, shadows (Blueprint handles this)
- **DON'T** keep tailwind config if you're not using it

**Remove:**
```tsx
<div className="bg-blue-500 text-white rounded-md shadow-lg border p-4">
  {/* All of this can be Blueprint */}
</div>
```

**Replace with:**
```tsx
<Card elevation={Elevation.TWO} className="bp5-text-large">
  {/* Blueprint handles styling */}
</Card>
```

**Keep (if needed):**
```tsx
<div className="flex gap-2 p-4">
  {/* Minimal layout utilities OK */}
</div>
```

---

### 9. TypeScript
- **DON'T** use `any` without justification
- **DON'T** disable strict mode
- **DON'T** ignore TypeScript errors in Blueprint components

**Bad:**
```tsx
function handleChange(e: any) { // DON'T
  setData(e.target.value);
}
```

**Good:**
```tsx
function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
  setData(e.target.value);
}
```

---

### 10. Dockview Specifics
- **DON'T** forget to dispose of Dockview API listeners
- **DON'T** save layout JSON synchronously on every change (debounce it)
- **DON'T** mutate panel props directly (use Dockview API)

**Bad:**
```tsx
useEffect(() => {
  api.onDidLayoutChange(() => {
    localStorage.setItem("layout", JSON.stringify(api.toJSON())); // Runs on every pixel resize!
  });
}, []);
```

**Good:**
```tsx
const saveLayout = useMemo(
  () => debounce((json) => localStorage.setItem("layout", json), 300),
  []
);

useEffect(() => {
  const disposable = api.onDidLayoutChange(() => {
    saveLayout(JSON.stringify(api.toJSON()));
  });
  return () => disposable.dispose(); // Clean up
}, []);
```

---

### 11. Build & Dependencies
- **DON'T** install both Radix and Blueprint long-term (transition period only)
- **DON'T** ignore lockfile changes (commit pnpm-lock.yaml)
- **DON'T** use `pnpm add` without checking bundle size impact

---

### 12. Testing
- **DON'T** skip tests during migration
- **DON'T** test implementation details (test behavior)
- **DON'T** forget to test keyboard interactions

---

## Summary Checklist

Before merging migration PRs, verify:

- [ ] No Radix imports remaining
- [ ] No Tailwind color/border/shadow utilities (only layout if needed)
- [ ] Blueprint dark theme class on `<body>`
- [ ] Dockview layout persists to localStorage
- [ ] Command palette works (Cmd+P)
- [ ] No `any` types without justification
- [ ] No `!important` CSS overrides on Blueprint classes
- [ ] Long lists are virtualized
- [ ] Heavy components are memoized
- [ ] No `dangerouslySetInnerHTML` without sanitization
- [ ] Focus outlines visible
- [ ] Keyboard navigation works
- [ ] Tests pass (unit + e2e)

---

**When in doubt, ask: "Does this align with Blueprint's design philosophy and Dockview's architecture?"**
