# Example Patterns

## 1. Dialog Example

```tsx
import { Dialog, DialogBody, Button } from "@/components/ui-blueprint";
import { useState } from "react";

export function SettingsDialog() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Open Settings</Button>
      <Dialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Settings"
        icon="cog"
      >
        <DialogBody>
          <p>Settings content here...</p>
        </DialogBody>
        <div className="bp5-dialog-footer">
          <div className="bp5-dialog-footer-actions">
            <Button onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button intent="primary" onClick={() => setIsOpen(false)}>
              Save
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
```

---

## 2. Toast Notifications

```tsx
import { AppToaster } from "@/lib/toaster";
import { Button } from "@/components/ui-blueprint";

export function ToastExample() {
  const showSuccess = () => {
    AppToaster.then((toaster) => {
      toaster.show({
        message: "Settings saved successfully!",
        intent: "success",
        icon: "tick",
      });
    });
  };

  const showError = () => {
    AppToaster.then((toaster) => {
      toaster.show({
        message: "Failed to save settings",
        intent: "danger",
        icon: "error",
      });
    });
  };

  return (
    <div>
      <Button onClick={showSuccess}>Show Success</Button>
      <Button onClick={showError} intent="danger">
        Show Error
      </Button>
    </div>
  );
}
```

---

## 3. Tabs Example

```tsx
import { Tabs, Tab } from "@/components/ui-blueprint";
import { useState } from "react";

export function TabsExample() {
  const [selectedTab, setSelectedTab] = useState("general");

  return (
    <Tabs
      id="settings-tabs"
      selectedTabId={selectedTab}
      onChange={(newTabId) => setSelectedTab(newTabId as string)}
    >
      <Tab
        id="general"
        title="General"
        panel={
          <div>
            <h3>General Settings</h3>
            <p>General content...</p>
          </div>
        }
      />
      <Tab
        id="advanced"
        title="Advanced"
        panel={
          <div>
            <h3>Advanced Settings</h3>
            <p>Advanced content...</p>
          </div>
        }
      />
    </Tabs>
  );
}
```

---

## 4. Form with Validation

```tsx
import {
  FormGroup,
  InputGroup,
  Button,
  Switch,
  NumericInput,
} from "@/components/ui-blueprint";
import { useState } from "react";

export function FormExample() {
  const [name, setName] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [port, setPort] = useState(4455);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log({ name, enabled, port });
  };

  return (
    <form onSubmit={handleSubmit}>
      <FormGroup label="Name" labelFor="name-input" labelInfo="(required)">
        <InputGroup
          id="name-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter name..."
        />
      </FormGroup>

      <FormGroup label="Port" labelFor="port-input">
        <NumericInput
          id="port-input"
          value={port}
          onValueChange={(val) => setPort(val)}
          min={1}
          max={65535}
        />
      </FormGroup>

      <Switch
        checked={enabled}
        onChange={(e) => setEnabled(e.currentTarget.checked)}
        label="Enabled"
      />

      <div style={{ marginTop: "1rem" }}>
        <Button type="submit" intent="primary">
          Save
        </Button>
      </div>
    </form>
  );
}
```

---

## 5. Status Bar

```tsx
import { Navbar, NavbarGroup, NavbarDivider, Tag } from "@/components/ui-blueprint";

export function StatusBar() {
  return (
    <Navbar style={{ height: "30px", minHeight: "30px" }}>
      <NavbarGroup>
        <Tag minimal>OBS: Connected</Tag>
        <NavbarDivider />
        <Tag minimal intent="success">
          Backend: Running
        </Tag>
        <NavbarDivider />
        <span style={{ fontSize: "12px", color: "#8A9BA8" }}>
          Last sync: 2 seconds ago
        </span>
      </NavbarGroup>
    </Navbar>
  );
}
```

---

## 6. Context Menu

```tsx
import { Menu, MenuItem, MenuDivider } from "@/components/ui-blueprint";
import { Popover2 } from "@blueprintjs/popover2";

export function ContextMenuExample() {
  const menu = (
    <Menu>
      <MenuItem icon="document-open" text="Open" />
      <MenuItem icon="duplicate" text="Duplicate" />
      <MenuDivider />
      <MenuItem icon="trash" text="Delete" intent="danger" />
    </Menu>
  );

  return (
    <Popover2 content={menu} placement="bottom-start">
      <button>Right-click menu (click to open)</button>
    </Popover2>
  );
}
```

---

## 7. Tree Navigation

```tsx
import { Tree, type TreeNodeInfo } from "@/components/ui-blueprint";
import { useState } from "react";

const INITIAL_NODES: TreeNodeInfo[] = [
  {
    id: 0,
    hasCaret: true,
    icon: "folder-close",
    label: "Scenes",
    isExpanded: true,
    childNodes: [
      { id: 1, icon: "media", label: "Main Scene" },
      { id: 2, icon: "media", label: "Countdown Scene" },
    ],
  },
  {
    id: 3,
    hasCaret: true,
    icon: "folder-close",
    label: "Overlays",
    childNodes: [
      { id: 4, icon: "application", label: "Lower Third" },
      { id: 5, icon: "application", label: "Poster" },
    ],
  },
];

export function TreeExample() {
  const [nodes, setNodes] = useState<TreeNodeInfo[]>(INITIAL_NODES);

  const handleNodeClick = (node: TreeNodeInfo) => {
    console.log("Clicked:", node.label);
  };

  const handleNodeCollapse = (node: TreeNodeInfo) => {
    node.isExpanded = false;
    setNodes([...nodes]);
  };

  const handleNodeExpand = (node: TreeNodeInfo) => {
    node.isExpanded = true;
    setNodes([...nodes]);
  };

  return (
    <Tree
      contents={nodes}
      onNodeClick={handleNodeClick}
      onNodeCollapse={handleNodeCollapse}
      onNodeExpand={handleNodeExpand}
    />
  );
}
```

---

## 8. Loading States

```tsx
import { Spinner, NonIdealState, Button } from "@/components/ui-blueprint";

export function LoadingExample() {
  return (
    <div>
      {/* Inline spinner */}
      <Spinner size={20} />

      {/* Full-page empty state */}
      <NonIdealState
        icon="search"
        title="No results found"
        description="Try adjusting your filters"
        action={<Button>Clear Filters</Button>}
      />
    </div>
  );
}
```

---

## 9. Dockview Panel Component

```tsx
import { type IDockviewPanelProps } from "dockview-react";
import { Button, Card } from "@/components/ui-blueprint";

export function CustomPanel(props: IDockviewPanelProps) {
  // Access panel API
  const { api } = props;

  return (
    <div style={{ padding: "1rem", height: "100%", overflow: "auto" }}>
      <Card>
        <h3>Custom Panel</h3>
        <p>Panel ID: {api.id}</p>
        <Button
          onClick={() => api.close()}
          minimal
          icon="cross"
        >
          Close Panel
        </Button>
      </Card>
    </div>
  );
}
```

---

## 10. Performance: Virtualized List

```tsx
import { FixedSizeList } from "react-window";
import { memo } from "react";

interface RowProps {
  index: number;
  style: React.CSSProperties;
  data: string[];
}

const Row = memo(function Row({ index, style, data }: RowProps) {
  return (
    <div style={style} className="bp5-menu-item">
      {data[index]}
    </div>
  );
});

export function VirtualizedListExample() {
  const items = Array.from({ length: 10000 }, (_, i) => `Item ${i + 1}`);

  return (
    <FixedSizeList
      height={400}
      itemCount={items.length}
      itemSize={30}
      width="100%"
      itemData={items}
    >
      {Row}
    </FixedSizeList>
  );
}
```

---

## Command Execution Pattern

For command palette integration:

```tsx
// In your CommandPalette.tsx, add commands like:
{
  id: "lower-third-show",
  label: "Show Lower Third",
  keywords: ["overlay", "lower", "third"],
  action: () => {
    // Dispatch action or call API
    showLowerThird();
  }
}
```

---

## Keyboard Shortcuts Pattern

```tsx
import { useEffect } from "react";

export function useKeyboardShortcuts() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Cmd/Ctrl+P: Command palette
      if ((e.metaKey || e.ctrlKey) && e.key === "p") {
        e.preventDefault();
        // Open palette
      }

      // Cmd/Ctrl+B: Toggle sidebar
      if ((e.metaKey || e.ctrlKey) && e.key === "b") {
        e.preventDefault();
        // Toggle explorer
      }

      // Cmd/Ctrl+J: Toggle console
      if ((e.metaKey || e.ctrlKey) && e.key === "j") {
        e.preventDefault();
        // Toggle console
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}
```

---

## Integration Example: Dashboard with Dockview

```tsx
"use client";

import { DashboardShell } from "@/components/shell/DashboardShell";
import { CommandPalette } from "@/components/shell/CommandPalette";

export default function DashboardPage() {
  return (
    <>
      <CommandPalette />
      <DashboardShell />
    </>
  );
}
```

---

See `MIGRATION.md` and `REFACTORING_GUIDELINES.md` for complete migration patterns.
