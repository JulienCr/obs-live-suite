"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWorkspaces } from "./WorkspacesContext";
import { Loader2 } from "lucide-react";

interface WorkspaceSaveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WorkspaceSaveDialog({ open, onOpenChange }: WorkspaceSaveDialogProps) {
  const t = useTranslations("dashboard.workspaces");
  const {
    workspaces,
    currentWorkspaceId,
    saveCurrentAsWorkspace,
    saveToExistingWorkspace,
    setAsDefault,
  } = useWorkspaces();

  const [mode, setMode] = useState<"new" | "overwrite">("new");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("");
  const [makeDefault, setMakeDefault] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter to only user workspaces for overwrite
  const userWorkspaces = workspaces.filter((w) => !w.isBuiltIn);

  const resetForm = () => {
    setMode("new");
    setName("");
    setDescription("");
    setSelectedWorkspaceId("");
    setMakeDefault(false);
    setError(null);
  };

  const handleSave = async () => {
    setError(null);
    setIsSaving(true);

    try {
      if (mode === "new") {
        if (!name.trim()) {
          setError(t("errors.nameRequired"));
          setIsSaving(false);
          return;
        }

        const workspace = await saveCurrentAsWorkspace(name.trim(), description.trim() || undefined);

        if (makeDefault) {
          await setAsDefault(workspace.id);
        }
      } else {
        if (!selectedWorkspaceId) {
          setError(t("errors.selectWorkspace"));
          setIsSaving(false);
          return;
        }

        await saveToExistingWorkspace(selectedWorkspaceId);
      }

      resetForm();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.saveFailed"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("saveDialog.title")}</DialogTitle>
          <DialogDescription>{t("saveDialog.description")}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Save Mode Selection */}
          <div className="flex gap-4">
            <Button
              variant={mode === "new" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("new")}
              className="flex-1"
            >
              {t("saveDialog.createNew")}
            </Button>
            <Button
              variant={mode === "overwrite" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("overwrite")}
              className="flex-1"
              disabled={userWorkspaces.length === 0}
            >
              {t("saveDialog.overwrite")}
            </Button>
          </div>

          {mode === "new" ? (
            <>
              {/* Name Input */}
              <div className="grid gap-2">
                <Label htmlFor="workspace-name">{t("saveDialog.name")}</Label>
                <Input
                  id="workspace-name"
                  value={name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                  placeholder={t("saveDialog.namePlaceholder")}
                  maxLength={50}
                />
              </div>

              {/* Description Input */}
              <div className="grid gap-2">
                <Label htmlFor="workspace-description">
                  {t("saveDialog.descriptionLabel")}
                </Label>
                <Input
                  id="workspace-description"
                  value={description}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)}
                  placeholder={t("saveDialog.descriptionPlaceholder")}
                  maxLength={200}
                />
              </div>

              {/* Make Default Checkbox */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="make-default"
                  checked={makeDefault}
                  onCheckedChange={(checked) => setMakeDefault(checked === true)}
                />
                <Label htmlFor="make-default" className="text-sm font-normal">
                  {t("saveDialog.makeDefault")}
                </Label>
              </div>
            </>
          ) : (
            <>
              {/* Workspace Selection for Overwrite */}
              <div className="grid gap-2">
                <Label>{t("saveDialog.selectWorkspace")}</Label>
                <Select
                  value={selectedWorkspaceId}
                  onValueChange={setSelectedWorkspaceId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("saveDialog.selectPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {userWorkspaces.map((workspace) => (
                      <SelectItem key={workspace.id} value={workspace.id}>
                        {workspace.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Error Display */}
          {error && (
            <div className="text-sm text-destructive">{error}</div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            {t("saveDialog.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {t("saveDialog.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
