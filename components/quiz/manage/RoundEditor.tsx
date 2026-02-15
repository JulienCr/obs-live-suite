"use client";
import { useEffect, useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { getQuestionTypeColor } from "@/lib/utils/questionTypeColors";
import { apiGet, isClientFetchError } from "@/lib/utils/ClientFetch";

interface Question {
  id: string;
  type: string;
  text: string;
  points: number;
  notes?: string;
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
  const t = useTranslations("quiz.manage.roundEditor");
  const [title, setTitle] = useState("");
  const [selectedQuestions, setSelectedQuestions] = useState<Question[]>([]);
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

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
    apiGet<{ questions?: Question[] }>("/api/quiz/questions")
      .then(data => {
        setAvailableQuestions(data.questions || []);
        setLoading(false);
      })
      .catch((err) => {
        if (isClientFetchError(err)) {
          console.error("Failed to load questions:", err.errorMessage);
        } else {
          console.error("Failed to load questions:", err);
        }
        setLoading(false);
      });
  }, []);

  const addQuestion = (q: Question) => {
    if (selectedQuestions.some(sq => sq.id === q.id)) {
      alert(t("questionAlreadyAdded"));
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
      alert(t("enterRoundTitle"));
      return;
    }
    if (selectedQuestions.length === 0) {
      alert(t("addAtLeastOneQuestion"));
      return;
    }
    onSave({
      id: round?.id,
      title,
      questions: selectedQuestions,
    });
  };

  // Filter available questions: hide already added, apply search and type filter
  const filteredAvailableQuestions = useMemo(() => {
    const selectedIds = new Set(selectedQuestions.map(q => q.id));
    let filtered = availableQuestions.filter(q => !selectedIds.has(q.id));

    // Filter by type
    if (typeFilter !== "all") {
      filtered = filtered.filter(q => q.type === typeFilter);
    }

    // Search by text and notes
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(q => 
        q.text.toLowerCase().includes(query) ||
        (q.notes && q.notes.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [availableQuestions, selectedQuestions, searchQuery, typeFilter]);

  // Extract unique types for filter
  const questionTypes = useMemo(() => {
    const types = new Set(availableQuestions.map(q => q.type));
    return Array.from(types).sort();
  }, [availableQuestions]);

  return (
    <div className="space-y-4">
      <div className="border rounded-lg p-4 bg-white">
        <h3 className="text-lg font-semibold mb-4">{round ? t("editRound") : t("createRound")}</h3>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">{t("roundTitle")}</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border rounded px-3 py-2"
            placeholder={t("roundTitlePlaceholder")}
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">{t("questions", { count: selectedQuestions.length })}</label>
          {selectedQuestions.length === 0 && (
            <div className="text-sm text-gray-400 mb-2">{t("noQuestionsAdded")}</div>
          )}
          <div className="space-y-2 mb-4">
            {selectedQuestions.map((q, idx) => (
              <div key={q.id} className="flex items-center gap-2 p-2 bg-blue-50 rounded">
                <span className="text-sm font-medium w-8">{idx + 1}.</span>
                <div className="flex-1">
                  <div className="text-sm font-medium line-clamp-1">{q.text}</div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${getQuestionTypeColor(q.type)}`}>{q.type}</span>
                    <span className="text-xs text-gray-500">{q.points} pts</span>
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
                    {t("remove")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            {t("saveRound")}
          </button>
          <button onClick={onCancel} className="px-4 py-2 border rounded hover:bg-gray-50">
            {t("cancel")}
          </button>
        </div>
      </div>

      <div className="border rounded-lg p-4 bg-white">
        <h3 className="font-semibold mb-3">{t("addQuestions")}</h3>

        {/* Search and Filter Bar */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder={t("searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border rounded text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border rounded text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">{t("allTypes")}</option>
              {questionTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Results Count */}
        <div className="text-sm text-gray-600 mb-3">
          {t("questionsAvailable", { count: filteredAvailableQuestions.length })}
          {selectedQuestions.length > 0 && ` ${t("alreadyAdded", { count: selectedQuestions.length })}`}
        </div>

        {loading && <div className="text-sm text-gray-500">{t("loadingQuestions")}</div>}
        {!loading && availableQuestions.length === 0 && (
          <div className="text-sm text-gray-400">{t("noQuestionsAvailable")}</div>
        )}
        {!loading && filteredAvailableQuestions.length === 0 && availableQuestions.length > 0 && (
          <div className="text-sm text-gray-400">
            {selectedQuestions.length === availableQuestions.length
              ? t("allQuestionsAdded")
              : t("noQuestionsMatch")}
          </div>
        )}
        
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredAvailableQuestions.map(q => (
            <button
              key={q.id}
              onClick={() => addQuestion(q)}
              className="w-full text-left p-2 rounded bg-gray-50 hover:bg-gray-100 transition"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="text-sm font-medium line-clamp-2">{q.text}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded ${getQuestionTypeColor(q.type)}`}>{q.type}</span>
                    <span className="text-xs text-gray-500">{q.points} pts</span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
