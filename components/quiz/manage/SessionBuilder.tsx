"use client";
import { useState, useEffect } from "react";
import { PlayerSelector } from "./PlayerSelector";
import { RoundEditor } from "./RoundEditor";
import { ArrowLeft } from "lucide-react";

interface Player {
  id: string;
  name: string;
  avatar?: string;
  buzzerId?: string;
}

interface Question {
  id: string;
  type: string;
  text: string;
  points: number;
}

interface Round {
  id?: string;
  title: string;
  questions: Question[];
}

interface Session {
  id?: string;
  name: string;
  players: Player[];
  rounds: Round[];
}

interface SessionBuilderProps {
  sessionId?: string;
  onBack?: () => void;
}

export function SessionBuilder({ sessionId, onBack }: SessionBuilderProps) {
  const [sessionName, setSessionName] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [editingRound, setEditingRound] = useState<Round | null>(null);
  const [isCreatingRound, setIsCreatingRound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(sessionId);

  // Load existing session if sessionId provided
  useEffect(() => {
    if (sessionId) {
      loadSession(sessionId);
    }
  }, [sessionId]);

  const loadSession = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:3002/api/quiz/session/load`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      
      if (res.ok) {
        const data = await res.json();
        const session = data.session;
        setSessionName(session.title || "");
        setPlayers(session.players?.map((p: any) => ({
          id: p.id,
          name: p.displayName,
          avatar: p.avatarUrl,
          buzzerId: p.buzzerId,
        })) || []);
        setRounds(session.rounds || []);
        setCurrentSessionId(session.id);
      } else {
        alert("Failed to load session");
      }
    } catch (err) {
      console.error("Error loading session:", err);
      alert("Error loading session");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRound = (round: Round) => {
    if (round.id) {
      // Update existing
      setRounds(rounds.map(r => r.id === round.id ? round : r));
    } else {
      // Create new
      const newRound = { ...round, id: crypto.randomUUID() };
      setRounds([...rounds, newRound]);
    }
    setEditingRound(null);
    setIsCreatingRound(false);
  };

  const handleDeleteRound = (id: string) => {
    if (!confirm("Delete this round?")) return;
    setRounds(rounds.filter(r => r.id !== id));
  };

  const moveRoundUp = (index: number) => {
    if (index === 0) return;
    const newList = [...rounds];
    [newList[index], newList[index - 1]] = [newList[index - 1], newList[index]];
    setRounds(newList);
  };

  const moveRoundDown = (index: number) => {
    if (index === rounds.length - 1) return;
    const newList = [...rounds];
    [newList[index], newList[index + 1]] = [newList[index + 1], newList[index]];
    setRounds(newList);
  };

  const handleSaveSession = async () => {
    if (!sessionName.trim()) {
      alert("Please enter a session name");
      return;
    }
    if (players.length === 0) {
      alert("Please select at least one player");
      return;
    }
    if (rounds.length === 0) {
      alert("Please create at least one round");
      return;
    }

    const isEditing = !!currentSessionId;
    const session: Session = {
      id: currentSessionId || crypto.randomUUID(),
      name: sessionName,
      players,
      rounds,
    };

    try {
      const endpoint = isEditing 
        ? `http://localhost:3002/api/quiz/session/${currentSessionId}/update`
        : "/api/quiz/session/create";
      
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(session),
      });
      
      if (res.ok) {
        const data = await res.json();
        alert(isEditing ? "Session updated successfully!" : "Session created successfully!");
        setCurrentSessionId(data.session?.id);
        if (onBack) {
          onBack();
        }
      } else {
        alert(`Failed to ${isEditing ? "update" : "create"} session`);
      }
    } catch (err) {
      console.error(`Error ${isEditing ? "updating" : "creating"} session:`, err);
      alert(`Error ${isEditing ? "updating" : "creating"} session`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-gray-500">Loading session...</div>
      </div>
    );
  }

  if (isCreatingRound || editingRound) {
    return (
      <RoundEditor
        round={editingRound}
        onSave={handleSaveRound}
        onCancel={() => { setIsCreatingRound(false); setEditingRound(null); }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Session Name */}
      <div className="border rounded-lg p-4 bg-white">
        <div className="flex items-center gap-3 mb-4">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded"
              title="Back to sessions"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <h2 className="text-xl font-bold">
            {currentSessionId ? "Edit Session" : "Create New Session"}
          </h2>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Session Name</label>
          <input
            type="text"
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
            className="w-full border rounded px-3 py-2"
            placeholder="e.g., Episode 42 - October 2025"
          />
        </div>
      </div>

      {/* Players */}
      <div className="border rounded-lg p-4 bg-white">
        <h3 className="text-lg font-semibold mb-4">Studio Players</h3>
        <PlayerSelector selectedPlayers={players} onChange={setPlayers} />
      </div>

      {/* Rounds */}
      <div className="border rounded-lg p-4 bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Rounds ({rounds.length})</h3>
          <button
            onClick={() => setIsCreatingRound(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            + Add Round
          </button>
        </div>

        {rounds.length === 0 && (
          <div className="text-sm text-gray-400">No rounds added yet. Click &ldquo;Add Round&rdquo; to create one.</div>
        )}

        <div className="space-y-3">
          {rounds.map((round, idx) => (
            <div key={round.id} className="p-3 border rounded bg-gray-50">
              <div className="flex items-start gap-3">
                <span className="text-lg font-bold w-8">{idx + 1}</span>
                <div className="flex-1">
                  <div className="font-semibold">{round.title}</div>
                  <div className="text-sm text-gray-500">
                    {round.questions.length} question{round.questions.length !== 1 ? "s" : ""}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => moveRoundUp(idx)}
                    disabled={idx === 0}
                    className="px-2 py-1 text-xs bg-white border rounded disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveRoundDown(idx)}
                    disabled={idx === rounds.length - 1}
                    className="px-2 py-1 text-xs bg-white border rounded disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => setEditingRound(round)}
                    className="px-3 py-1 text-xs bg-white border rounded hover:bg-gray-100"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteRound(round.id!)}
                    className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Save Session */}
      <div className="border rounded-lg p-4 bg-white">
        <button
          onClick={handleSaveSession}
          disabled={!sessionName || players.length === 0 || rounds.length === 0}
          className="w-full px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Create Session
        </button>
        {(!sessionName || players.length === 0 || rounds.length === 0) && (
          <div className="text-sm text-gray-500 mt-2 text-center">
            Complete all sections to create the session
          </div>
        )}
      </div>
    </div>
  );
}

