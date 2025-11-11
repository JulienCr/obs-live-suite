/**
 * Re-export Blueprint Dialog components
 */
export {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogStep,
  MultistepDialog,
  Alert,
  type DialogProps,
  type AlertProps,
} from "@blueprintjs/core";

/**
 * Migration guide:
 * Radix: <Dialog open={open} onOpenChange={setOpen}>
 * Blueprint: <Dialog isOpen={open} onClose={() => setOpen(false)}>
 *
 * Radix: <DialogContent><DialogHeader><DialogTitle>...
 * Blueprint: <Dialog title="...">
 *
 * Footer actions: wrap in <DialogFooter>
 */
