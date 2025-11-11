/**
 * Re-export Blueprint Button with simplified API
 * Add any app-specific customizations here
 */
export { Button, type ButtonProps, AnchorButton } from "@blueprintjs/core";

/**
 * Intent mapping guide (from old Radix variants):
 * - variant="default" → intent="primary"
 * - variant="destructive" → intent="danger"
 * - variant="outline" → outlined={true}
 * - variant="secondary" → intent="none"
 * - variant="ghost" → minimal={true}
 *
 * Size mapping:
 * - size="sm" → small={true}
 * - size="lg" → large={true}
 * - size="icon" → icon={IconName} + no text
 */
