"use client";
import { useEffect, useState } from "react";

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

interface RoundEditorProps {
  round?: Round | null;
  onSave: (round: Round) => void;
  onCancel: () => void;
}

export function RoundEditor({ round, onSave, onCancel }: RoundEditorProps) {
  const [title, setTitle] = useState("");
  const [selectedQuestions, setSelectedQuestions] = useState<Question[]>([]);
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (round) {
      setTitle(round.title);
      setSelectedQuestions(round.questions || []);
    } else {
      setTitle("");
      setSelectedQuestions([]);
    }
  }, [round]);

  useEffect(() => {
    fetch("/api/quiz/questions")
      .then(r => r.json())
      .then(data => {
        setAvailableQuestions(data.questions || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const addQuestion = (q: Question) => {
    if (selectedQuestions.some(sq => sq.id === q.id)) {
      alert("Question already added");
      return;
    }
    setSelectedQuestions([...selectedQuestions, q]);
  };

  const removeQuestion = (id: string) => {
    setSelectedQuestions(selectedQuestions.filter(q => q.id !== id));
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newList = [...selectedQuestions];
    [newList[index], newList[index - 1]] = [newList[index - 1], newList[index]];
    setSelectedQuestions(newList);
  };

  const moveDown = (index: number) => {
    if (index === selectedQuestions.length - 1) return;
    const newList = [...selectedQuestions];
    [newList[index], newList[index + 1]] = [newList[index + 1], newList[index]];
    setSelectedQuestions(newList);
  };

  const handleSave = () => {
    if (!title.trim()) {
      alert("Please enter a round title");
      return;
    }
    if (selectedQuestions.length === 0) {
      alert("Please add at least one question");
      return;
    }
    onSave({
      id: round?.id,
      title,
      questions: selectedQuestions,
    });
  };

  return (
    <div className="space-y-4">
      <div className="border rounded-lg p-4 bg-white">
        <h3 className="text-lg font-semibold mb-4">{round ? "Edit" : "Create"} Round</h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Round Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border rounded px-3 py-2"
            placeholder="e.g., Round 1: General Knowledge"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Questions ({selectedQuestions.length})</label>
          {selectedQuestions.length === 0 && (
            <div className="text-sm text-gray-400 mb-2">No questions added yet</div>
          )}
          <div className="space-y-2 mb-4">
            {selectedQuestions.map((q, idx) => (
              <div key={q.id} className="flex items-center gap-2 p-2 bg-blue-50 rounded">
                <span className="text-sm font-medium w-8">{idx + 1}.</span>
                <div className="flex-1">
                  <div className="text-sm font-medium line-clamp-1">{q.text}</div>
                  <div className="text-xs text-gray-500">
                    {q.type} • {q.points} pts
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => moveUp(idx)}
                    disabled={idx === 0}
                    className="px-2 py-1 text-xs bg-gray-100 rounded disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveDown(idx)}
                    disabled={idx === selectedQuestions.length - 1}
                    className="px-2 py-1 text-xs bg-gray-100 rounded disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => removeQuestion(q.id)}
                    className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Save Round
          </button>
          <button onClick={onCancel} className="px-4 py-2 border rounded hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </div>

      <div className="border rounded-lg p-4 bg-white">
        <h3 className="font-semibold mb-3">Add Questions</h3>
        {loading && <div className="text-sm text-gray-500">Loading questions...</div>}
        {!loading && availableQuestions.length === 0 && (
          <div className="text-sm text-gray-400">No questions available. Create some first!</div>
        )}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {availableQuestions.map(q => {
            const isAdded = selectedQuestions.some(sq => sq.id === q.id);
            return (
              <button
                key={q.id}
                onClick={() => addQuestion(q)}
                disabled={isAdded}
                className={`w-full text-left p-2 rounded transition ${
                  isAdded 
                    ? "bg-gray-100 cursor-not-allowed opacity-50" 
                    : "bg-gray-50 hover:bg-gray-100"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="text-sm font-medium line-clamp-2">{q.text}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {q.type} • {q.points} pts
                    </div>
                  </div>
                  {isAdded && <span className="text-xs text-blue-600 font-medium ml-2">✓ Added</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

