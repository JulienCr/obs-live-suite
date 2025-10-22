"use client";
import { useEffect, useState } from "react";

interface Guest {
  id: string;
  displayName: string;
  subtitle?: string;
  avatarUrl?: string;
  accentColor?: string;
}

interface Player {
  id: string;
  name: string;
  avatar?: string;
  buzzerId?: string;
}

interface PlayerSelectorProps {
  selectedPlayers: Player[];
  onChange: (players: Player[]) => void;
}

export function PlayerSelector({ selectedPlayers, onChange }: PlayerSelectorProps) {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/assets/guests")
      .then(r => r.json())
      .then(data => {
        setGuests(data.guests || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load guests:", err);
        setLoading(false);
      });
  }, []);

  const togglePlayer = (guest: Guest) => {
    const existing = selectedPlayers.find(p => p.id === guest.id);
    if (existing) {
      onChange(selectedPlayers.filter(p => p.id !== guest.id));
    } else {
      if (selectedPlayers.length >= 4) {
        alert("Maximum 4 players allowed");
        return;
      }
      const newPlayer: Player = {
        id: guest.id,
        name: guest.displayName,
        avatar: guest.avatarUrl,
        buzzerId: `buzzer-${selectedPlayers.length + 1}`,
      };
      onChange([...selectedPlayers, newPlayer]);
    }
  };

  const updateBuzzerId = (playerId: string, buzzerId: string) => {
    onChange(selectedPlayers.map(p => p.id === playerId ? { ...p, buzzerId } : p));
  };

  if (loading) return <div className="text-gray-500">Loading guests...</div>;

  return (
    <div className="space-y-4">
      <div className="border rounded-lg p-4 bg-white">
        <h3 className="font-semibold mb-3">Selected Players ({selectedPlayers.length}/4)</h3>
        {selectedPlayers.length === 0 && (
          <div className="text-sm text-gray-400">Select up to 4 studio players from the list below</div>
        )}
        <div className="space-y-2">
          {selectedPlayers.map((player, idx) => (
            <div key={player.id} className="flex items-center gap-3 p-2 bg-green-50 rounded">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 overflow-hidden bg-blue-600">
                {player.avatar ? (
                  <img src={player.avatar} alt={player.name} className="w-full h-full object-cover" />
                ) : (
                  player.name.charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm">{player.name}</div>
                <div className="text-xs text-gray-500">Player {idx + 1}</div>
              </div>
              <input
                type="text"
                value={player.buzzerId || ""}
                onChange={(e) => updateBuzzerId(player.id, e.target.value)}
                placeholder="Buzzer ID"
                className="w-24 px-2 py-1 text-xs border rounded"
              />
              <button
                onClick={() => onChange(selectedPlayers.filter(p => p.id !== player.id))}
                className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="border rounded-lg p-4 bg-white">
        <h3 className="font-semibold mb-3">Available Guests</h3>
        <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto">
          {guests.length === 0 && (
            <div className="text-sm text-gray-400">No guests found. Create guests in the Assets page.</div>
          )}
          {guests.map(guest => {
            const isSelected = selectedPlayers.some(p => p.id === guest.id);
            return (
              <button
                key={guest.id}
                onClick={() => togglePlayer(guest)}
                disabled={isSelected}
                className={`flex items-center gap-3 p-2 rounded text-left transition ${
                  isSelected 
                    ? "bg-gray-100 cursor-not-allowed opacity-50" 
                    : "bg-gray-50 hover:bg-gray-100"
                }`}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 overflow-hidden"
                  style={{ backgroundColor: guest.accentColor || "#3b82f6" }}
                >
                  {guest.avatarUrl ? (
                    <img src={guest.avatarUrl} alt={guest.displayName} className="w-full h-full object-cover" />
                  ) : (
                    guest.displayName.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{guest.displayName}</div>
                  {guest.subtitle && <div className="text-xs text-gray-500">{guest.subtitle}</div>}
                </div>
                {isSelected && <span className="text-xs text-green-600 font-medium">✓ Selected</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

