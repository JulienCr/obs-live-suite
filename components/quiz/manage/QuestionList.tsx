"use client";
import { useEffect, useState } from "react";

interface Question {
  id: string;
  type: string;
  text: string;
  points: number;
}

interface QuestionListProps {
  onEdit: (id: string) => void;
}

export function QuestionList({ onEdit }: QuestionListProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await fetch("/api/quiz/questions");
      const data = await res.json();
      setQuestions(data.questions || []);
    } catch (e) {
      console.error("Failed to load questions", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this question?")) return;
    try {
      await fetch(`/api/quiz/questions/${id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      console.error("Failed to delete", e);
    }
  };

  if (loading) return <div className="text-gray-500">Loading...</div>;

  return (
    <div className="space-y-2">
      {questions.length === 0 && (
        <div className="text-gray-500 text-sm">No questions yet. Create one!</div>
      )}
      {questions.map((q) => (
        <div key={q.id} className="p-4 border rounded bg-white hover:shadow-md transition">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex gap-2 items-center mb-1">
                <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded">{q.type}</span>
                <span className="text-xs text-gray-500">{q.points} pts</span>
              </div>
              <div className="text-sm font-medium line-clamp-2">{q.text}</div>
            </div>
            <div className="flex gap-2 ml-4">
              <button
                onClick={() => onEdit(q.id)}
                className="text-sm px-3 py-1 bg-gray-100 rounded hover:bg-gray-200"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(q.id)}
                className="text-sm px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

