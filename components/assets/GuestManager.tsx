"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { EntityHeader } from "@/components/ui/EntityHeader";
import { EnableSearchCombobox } from "@/components/ui/EnableSearchCombobox";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { AvatarUploader } from "./AvatarUploader";
import { VirtualizedGuestGrid } from "./VirtualizedGuestGrid";
import { User, Users } from "lucide-react";
import { apiPost } from "@/lib/utils/ClientFetch";
import { useGuests, type Guest } from "@/lib/queries";

export function GuestManager() {
  const t = useTranslations("assets.guests");
  const tCommon = useTranslations("common");

  // Use React Query hook for guest data and mutations
  const {
    guests,
    isLoading: loading,
    toggleEnabled,
    deleteGuest,
    createGuest,
    updateGuest,
  } = useGuests();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    displayName: "",
    subtitle: "",
    accentColor: "#3b82f6",
    avatarUrl: "",
    chatMessage: "",
  });

  const handleSubmit = () => {
    if (editingId) {
      // Update existing guest
      console.log("[GuestManager] Updating guest with data:", formData);
      updateGuest({ id: editingId, ...formData });
      setShowForm(false);
      setEditingId(null);
      resetForm();
    } else {
      // Create new guest
      console.log("[GuestManager] Creating new guest with data:", formData);
      createGuest(formData);
      setShowForm(false);
      resetForm();
    }
  };

  const handleEdit = (guest: Guest) => {
    setEditingId(guest.id);
    setFormData({
      displayName: guest.displayName,
      subtitle: guest.subtitle || "",
      accentColor: guest.accentColor,
      avatarUrl: guest.avatarUrl || "",
      chatMessage: guest.chatMessage || "",
    });
    setShowForm(true);
  };

  const handleCancelEdit = () => {
    setShowForm(false);
    setEditingId(null);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      displayName: "",
      subtitle: "",
      accentColor: "#3b82f6",
      avatarUrl: "",
      chatMessage: "",
    });
  };

  const handleToggleEnabled = (guest: Guest) => {
    toggleEnabled({ id: guest.id, isEnabled: !guest.isEnabled });
  };

  const handleDelete = (guest: Guest) => {
    if (!confirm(`Delete ${guest.displayName}?`)) return;
    deleteGuest(guest.id);
  };

  const handleQuickLowerThird = async (guest: Guest) => {
    try {
      await apiPost<{ success: boolean }>(`/api/actions/lower/guest/${guest.id}`, {
        duration: 8,
      });
    } catch (error) {
      console.error("Failed to show lower third:", error);
    }
  };

  const handleEnableFromSearch = (guestId: string) => {
    toggleEnabled({ id: guestId, isEnabled: true });
  };

  // Split guests by enabled status
  const enabledGuests = guests.filter(g => g.isEnabled);
  const disabledGuests = guests.filter(g => !g.isEnabled);

  if (loading) {
    return <div>{tCommon("loading")}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats and Actions */}
      <EntityHeader
        icon={Users}
        title={t("title")}
        stats={t("activeCount", { count: enabledGuests.length, total: guests.length })}
        onAdd={() => {
          setEditingId(null);
          resetForm();
          setShowForm(!showForm);
        }}
        addLabel={t("addGuest")}
      />

      {/* Search Bar - Enable Disabled Guests */}
      <EnableSearchCombobox
        items={guests}
        onEnable={handleEnableFromSearch}
        getId={(g) => g.id}
        getName={(g) => g.displayName}
        getIsEnabled={(g) => g.isEnabled}
        label={t("enableGuest")}
        placeholder={t("searchToEnable")}
        searchPlaceholder={t("searchByNameSubtitle")}
        emptyMessage={t("noGuestsFound")}
        groupHeading={t("title")}
        renderItem={(guest) => (
          <>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold overflow-hidden shrink-0"
              style={{ backgroundColor: guest.accentColor }}
            >
              {guest.avatarUrl ? (
                <img src={guest.avatarUrl} alt={guest.displayName} className="w-full h-full object-cover" />
              ) : (
                guest.displayName.charAt(0).toUpperCase()
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{guest.displayName}</div>
              {guest.subtitle && <div className="text-xs text-muted-foreground truncate">{guest.subtitle}</div>}
            </div>
            <Badge variant={guest.isEnabled ? "default" : "secondary"} className="text-xs">
              {guest.isEnabled ? t("active") : t("disabled")}
            </Badge>
          </>
        )}
      />

      {/* Create/Edit Form */}
      {showForm && (
        <Alert>
          <AlertDescription>
            <div className="space-y-4 mt-2">
              <h3 className="font-medium">{editingId ? t("editGuest") : t("createGuest")}</h3>

              <div className="space-y-2">
                <Label htmlFor="displayName">{t("displayName")}</Label>
                <Input
                  id="displayName"
                  value={formData.displayName}
                  onChange={(e) =>
                    setFormData({ ...formData, displayName: e.target.value })
                  }
                  placeholder={t("displayNamePlaceholder")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subtitle">{t("subtitle")}</Label>
                <Input
                  id="subtitle"
                  value={formData.subtitle}
                  onChange={(e) =>
                    setFormData({ ...formData, subtitle: e.target.value })
                  }
                  placeholder={t("subtitlePlaceholder")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="accentColor">{t("accentColor")}</Label>
                <div className="flex gap-2">
                  <Input
                    id="accentColor"
                    type="color"
                    value={formData.accentColor}
                    onChange={(e) =>
                      setFormData({ ...formData, accentColor: e.target.value })
                    }
                    className="w-20"
                  />
                  <Input
                    value={formData.accentColor}
                    onChange={(e) =>
                      setFormData({ ...formData, accentColor: e.target.value })
                    }
                    placeholder="#3b82f6"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t("avatarOptional")}</Label>
                <AvatarUploader
                  currentAvatar={formData.avatarUrl}
                  onUpload={(url) => setFormData({ ...formData, avatarUrl: url })}
                  accentColor={formData.accentColor}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="chatMessage">{t("chatMessage")}</Label>
                <Input
                  id="chatMessage"
                  value={formData.chatMessage}
                  onChange={(e) => setFormData({ ...formData, chatMessage: e.target.value })}
                  placeholder={t("chatMessagePlaceholder")}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground">
                  {formData.chatMessage.length}/500
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleSubmit}
                  disabled={!formData.displayName}
                >
                  {editingId ? t("updateGuest") : t("createGuest")}
                </Button>
                <Button variant="outline" onClick={handleCancelEdit}>
                  {tCommon("cancel")}
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Active Guests Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">{t("activeGuests")}</h3>
          <Badge variant="default">{enabledGuests.length}</Badge>
        </div>

        {enabledGuests.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <User className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t("noActiveGuests")}</p>
            <p className="text-sm text-muted-foreground">
              {t("addOrEnable")}
            </p>
          </div>
        ) : (
          <VirtualizedGuestGrid
            guests={enabledGuests}
            variant="enabled"
            onQuickLowerThird={handleQuickLowerThird}
            onEdit={handleEdit}
            onToggleEnabled={handleToggleEnabled}
            onDelete={handleDelete}
          />
        )}
      </div>

      {/* Disabled Guests Section (Collapsible) */}
      <CollapsibleSection title={t("disabledGuests")} count={disabledGuests.length}>
        <VirtualizedGuestGrid
          guests={disabledGuests}
          variant="disabled"
          onEdit={handleEdit}
          onToggleEnabled={handleToggleEnabled}
          onDelete={handleDelete}
        />
      </CollapsibleSection>
    </div>
  );
}
