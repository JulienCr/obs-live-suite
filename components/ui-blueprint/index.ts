/**
 * Blueprint UI components barrel export
 * Import from here instead of @blueprintjs/core directly
 */

export * from "./Button";
export * from "./Dialog";

// Re-export commonly used Blueprint components
export {
  Tabs,
  Tab,
  Switch,
  Checkbox,
  Radio,
  RadioGroup,
  Slider,
  RangeSlider,
  Divider,
  FormGroup,
  InputGroup,
  NumericInput,
  TextArea,
  HTMLSelect,
  Card,
  Elevation,
  Navbar,
  NavbarGroup,
  NavbarHeading,
  NavbarDivider,
  Menu,
  MenuItem,
  MenuDivider,
  Popover,
  Tooltip,
  Tag,
  Icon,
  Spinner,
  ProgressBar,
  Callout,
  NonIdealState,
  Tree,
  type TreeNodeInfo,
} from "@blueprintjs/core";

// Popover2 (better popover)
export { Popover2, Tooltip2 } from "@blueprintjs/popover2";

// Icons
export * as BlueprintIcons from "@blueprintjs/icons";
