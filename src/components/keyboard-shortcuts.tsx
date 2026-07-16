"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const shortcuts = [
  { keys: ["Ctrl", "Enter"], description: "Check test cases" },
  { keys: ["Ctrl", "Z"], description: "Undo" },
  { keys: ["Ctrl", "Shift", "Z"], description: "Redo" },
  { keys: ["H"], description: "Hint (random uncovered EC)" },
  { keys: ["F"], description: "Fill all uncovered ECs" },
  { keys: ["B"], description: "Fill all uncovered BVs" },
  { keys: ["R"], description: "Random task" },
  { keys: ["?"], description: "Show keyboard shortcuts" },
  { keys: ["1", "–", "10"], description: "Quick task selection" },
  { keys: ["Esc"], description: "Close dialog" },
];

export function KeyboardShortcutsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Quick combinations for the trainer
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          {shortcuts.map((shortcut) => (
            <div
              key={shortcut.description}
              className="flex items-center justify-between"
            >
              <span className="text-sm text-muted-foreground">
                {shortcut.description}
              </span>
              <div className="flex gap-1">
                {shortcut.keys.map((key) => (
                  <kbd
                    key={key}
                    className="px-2 py-1 rounded bg-muted text-xs font-mono border border-border"
                  >
                    {key}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
