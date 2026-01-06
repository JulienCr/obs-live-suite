"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { AvatarUploader } from "./AvatarUploader";
import { VirtualizedGuestGrid } from "./VirtualizedGuestGrid";
import { Plus, User, ChevronDown, ChevronUp, Users } from "lucide-react";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/utils/ClientFetch";

interface Guest {
  id: string;
  displayName: string;
  subtitle?: string;
  accentColor: string;
  avatarUrl?: string;
  chatMessage?: string;
  isEnabled: boolean;
  createdAt?: string;
}

/**
 * Guest management component with virtualized grids and search
 */
export function GuestManager() {
  const t = useTranslations("assets.guests");
  const tCommon = useTranslations("common");
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDisabled, setShowDisabled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [formData, setFormData] = useState({
    displayName: "",
    subtitle: "",
    accentColor: "#3b82f6",
    avatarUrl: "",
    chatMessage: "",
  });

  useEffect(() => {
    fetchGuests();
  }, []);

  const fetchGuests = async () => {
    try {
      const data = await apiGet<{ guests: Guest[] }>("/api/assets/guests");
      setGuests(data.guests || []);
    } catch (error) {
      console.error("Failed to fetch guests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      if (editingId) {
        // Update existing guest
        console.log("[GuestManager] Updating guest with data:", formData);
        await apiPatch<Guest>(`/api/assets/guests/${editingId}`, formData);
        fetchGuests();
        setShowForm(false);
        setEditingId(null);
        resetForm();
      } else {
        // Create new guest
        console.log("[GuestManager] Creating new guest with data:", formData);
        const result = await apiPost<{ guest: Guest }>("/api/assets/guests", formData);
        console.log("[GuestManager] Guest created successfully:", result);
        fetchGuests();
        setShowForm(false);
        resetForm();
      }
    } catch (error) {
      console.error("Failed to save guest:", error);
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

  const handleToggleEnabled = async (guest: Guest) => {
    try {
      await apiPatch<Guest>(`/api/assets/guests/${guest.id}`, { isEnabled: !guest.isEnabled });
      fetchGuests();
    } catch (error) {
      console.error("Failed to toggle guest:", error);
    }
  };

  const handleDelete = async (guest: Guest) => {
    if (!confirm(`Delete ${guest.displayName}?`)) return;

    try {
      await apiDelete<{ success: boolean }>(`/api/assets/guests/${guest.id}`);
      fetchGuests();
    } catch (error) {
      console.error("Failed to delete guest:", error);
    }
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

  const handleEnableFromSearch = async (guestId: string) => {
    try {
      await apiPatch<Guest>(`/api/assets/guests/${guestId}`, { isEnabled: true });
      fetchGuests();
      setSearchOpen(false);
      setSearchValue("");
    } catch (error) {
      console.error("Failed to enable guest:", error);
    }
  };

  // Split guests by enabled status
  const enabledGuests = guests.filter(g => g.isEnabled);
  const disabledGuests = guests.filter(g => !g.isEnabled);

  // Filter guests for search (show all, prioritize disabled)
  const filteredGuestsForSearch = guests.filter(guest => {
    const search = searchValue.toLowerCase();
    return (
      guest.displayName.toLowerCase().includes(search) ||
      (guest.subtitle && guest.subtitle.toLowerCase().includes(search))
    );
  }).sort((a, b) => {
    // Disabled guests first in search results
    if (!a.isEnabled && b.isEnabled) return -1;
    if (a.isEnabled && !b.isEnabled) return 1;
    return 0;
  });

  if (loading) {
    return <div>{tCommon("loading")}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats and Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <Users className="w-6 h-6" />
            {t("title")}
          </h2>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-sm text-muted-foreground">
              {t("activeCount", { count: enabledGuests.length, total: guests.length })}
            </p>
          </div>
        </div>
        <Button onClick={() => {
          setEditingId(null);
          resetForm();
          setShowForm(!showForm);
        }}>
          <Plus className="w-4 h-4 mr-2" />
          {t("addGuest")}
        </Button>
      </div>

      {/* Search Bar - Enable Disabled Guests */}
      <div className="space-y-2">
        <Label htmlFor="guest-search">{t("enableGuest")}</Label>
        <Popover open={searchOpen} onOpenChange={setSearchOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={searchOpen}
              className="w-full justify-between"
            >
              <span className="text-muted-foreground">
                {t("searchToEnable")}
              </span>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder={t("searchByNameSubtitle")}
                value={searchValue}
                onValueChange={setSearchValue}
              />
              <CommandList>
                <CommandEmpty>{t("noGuestsFound")}</CommandEmpty>
                <CommandGroup heading={t("title")}>
                  {filteredGuestsForSearch.map((guest) => (
                    <CommandItem
                      key={guest.id}
                      value={guest.displayName}
                      onSelect={() => {
                        if (!guest.isEnabled) {
                          handleEnableFromSearch(guest.id);
                        } else {
                          setSearchOpen(false);
                        }
                      }}
                      className="flex items-center gap-3"
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold overflow-hidden flex-shrink-0"
                        style={{ backgroundColor: guest.accentColor }}
                      >
                        {guest.avatarUrl ? (
                          <img
                            src={guest.avatarUrl}
                            alt={guest.displayName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          guest.displayName.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{guest.displayName}</div>
                        {guest.subtitle && (
                          <div className="text-xs text-muted-foreground truncate">
                            {guest.subtitle}
                          </div>
                        )}
                      </div>
                      <Badge variant={guest.isEnabled ? "default" : "secondary"} className="text-xs">
                        {guest.isEnabled ? t("active") : t("disabled")}
                      </Badge>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

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
      {disabledGuests.length > 0 && (
        <div className="space-y-3 pt-4 border-t">
          <Button
            variant="ghost"
            onClick={() => setShowDisabled(!showDisabled)}
            className="w-full justify-between"
          >
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-medium">{t("disabledGuests")}</h3>
              <Badge variant="secondary">{disabledGuests.length}</Badge>
            </div>
            {showDisabled ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>

          {showDisabled && (
            <VirtualizedGuestGrid
              guests={disabledGuests}
              variant="disabled"
              onEdit={handleEdit}
              onToggleEnabled={handleToggleEnabled}
              onDelete={handleDelete}
            />
          )}
        </div>
      )}
    </div>
  );
}
