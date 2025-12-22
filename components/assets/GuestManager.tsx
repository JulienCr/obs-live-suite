"use client";

import { useState, useEffect } from "react";
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

interface Guest {
  id: string;
  displayName: string;
  subtitle?: string;
  accentColor: string;
  avatarUrl?: string;
  isEnabled: boolean;
  createdAt?: string;
}

/**
 * Guest management component with virtualized grids and search
 */
export function GuestManager() {
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
  });

  useEffect(() => {
    fetchGuests();
  }, []);

  const fetchGuests = async () => {
    try {
      const res = await fetch("/api/assets/guests");
      const data = await res.json();
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
        const res = await fetch(`/api/assets/guests/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        
        if (res.ok) {
          fetchGuests();
          setShowForm(false);
          setEditingId(null);
          resetForm();
        }
      } else {
        // Create new guest
        console.log("[GuestManager] Creating new guest with data:", formData);
        const res = await fetch("/api/assets/guests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        
        if (res.ok) {
          const result = await res.json();
          console.log("[GuestManager] Guest created successfully:", result);
          fetchGuests();
          setShowForm(false);
          resetForm();
        } else {
          const error = await res.json();
          console.error("[GuestManager] Failed to create guest:", error);
        }
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
    });
  };

  const handleToggleEnabled = async (guest: Guest) => {
    try {
      await fetch(`/api/assets/guests/${guest.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isEnabled: !guest.isEnabled }),
      });
      fetchGuests();
    } catch (error) {
      console.error("Failed to toggle guest:", error);
    }
  };

  const handleDelete = async (guest: Guest) => {
    if (!confirm(`Delete ${guest.displayName}?`)) return;

    try {
      await fetch(`/api/assets/guests/${guest.id}`, { method: "DELETE" });
      fetchGuests();
    } catch (error) {
      console.error("Failed to delete guest:", error);
    }
  };

  const handleQuickLowerThird = async (guest: Guest) => {
    try {
      await fetch(`/api/actions/lower/guest/${guest.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          duration: 8,
        }),
      });
    } catch (error) {
      console.error("Failed to show lower third:", error);
    }
  };

  const handleEnableFromSearch = async (guestId: string) => {
    try {
      await fetch(`/api/assets/guests/${guestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isEnabled: true }),
      });
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
    return <div>Loading guests...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats and Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <Users className="w-6 h-6" />
            Guests
          </h2>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-sm text-muted-foreground">
              {enabledGuests.length} active · {guests.length} total
            </p>
          </div>
        </div>
        <Button onClick={() => {
          setEditingId(null);
          resetForm();
          setShowForm(!showForm);
        }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Guest
        </Button>
      </div>

      {/* Search Bar - Enable Disabled Guests */}
      <div className="space-y-2">
        <Label htmlFor="guest-search">Enable a Guest</Label>
        <Popover open={searchOpen} onOpenChange={setSearchOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={searchOpen}
              className="w-full justify-between"
            >
              <span className="text-muted-foreground">
                Search to enable a disabled guest...
              </span>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Search by name or subtitle..."
                value={searchValue}
                onValueChange={setSearchValue}
              />
              <CommandList>
                <CommandEmpty>No guests found.</CommandEmpty>
                <CommandGroup heading="Guests">
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
                        {guest.isEnabled ? "Active" : "Disabled"}
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
              <h3 className="font-medium">{editingId ? "Edit Guest" : "Create Guest"}</h3>
              
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={formData.displayName}
                  onChange={(e) =>
                    setFormData({ ...formData, displayName: e.target.value })
                  }
                  placeholder="John Doe"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subtitle">Subtitle</Label>
                <Input
                  id="subtitle"
                  value={formData.subtitle}
                  onChange={(e) =>
                    setFormData({ ...formData, subtitle: e.target.value })
                  }
                  placeholder="CEO, Company Name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="accentColor">Accent Color</Label>
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
                <Label>Avatar (Optional)</Label>
                <AvatarUploader
                  currentAvatar={formData.avatarUrl}
                  onUpload={(url) => setFormData({ ...formData, avatarUrl: url })}
                  accentColor={formData.accentColor}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleSubmit}
                  disabled={!formData.displayName}
                >
                  {editingId ? "Update Guest" : "Create Guest"}
                </Button>
                <Button variant="outline" onClick={handleCancelEdit}>
                  Cancel
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Active Guests Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Active Guests</h3>
          <Badge variant="default">{enabledGuests.length}</Badge>
        </div>
        
        {enabledGuests.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <User className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No active guests</p>
            <p className="text-sm text-muted-foreground">
              Add a guest or enable one using the search above
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
              <h3 className="text-lg font-medium">Disabled Guests</h3>
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
