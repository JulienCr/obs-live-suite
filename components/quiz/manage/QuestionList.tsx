"use client";
import { useEffect, useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { getQuestionTypeColor } from "@/lib/utils/questionTypeColors";
import { apiGet, apiDelete, isClientFetchError } from "@/lib/utils/ClientFetch";

interface Question {
  id: string;
  type: string;
  text: string;
  points: number;
  notes?: string;
}

interface QuestionListProps {
  onEdit: (id: string) => void;
  onImport?: () => void;
  onNewQuestion?: () => void;
}

const ITEMS_PER_PAGE = 20;

export function QuestionList({ onEdit, onImport, onNewQuestion }: QuestionListProps) {
  const t = useTranslations("quiz.manage.questionList");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  const load = async () => {
    try {
      const data = await apiGet<{ questions?: Question[] }>("/api/quiz/questions");
      setQuestions(data.questions || []);
    } catch (e) {
      if (isClientFetchError(e)) {
        console.error("Failed to load questions:", e.errorMessage);
      } else {
        console.error("Failed to load questions", e);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm(t("deleteConfirm"))) return;
    try {
      await apiDelete(`/api/quiz/questions/${id}`);
      await load();
    } catch (e) {
      if (isClientFetchError(e)) {
        console.error("Failed to delete:", e.errorMessage);
      } else {
        console.error("Failed to delete", e);
      }
    }
  };

  // Filter and search logic
  const filteredQuestions = useMemo(() => {
    let filtered = questions;

    // Filter by type
    if (typeFilter !== "all") {
      filtered = filtered.filter(q => q.type === typeFilter);
    }

    // Search by text
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(q => 
        q.text.toLowerCase().includes(query) ||
        (q.notes && q.notes.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [questions, searchQuery, typeFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredQuestions.length / ITEMS_PER_PAGE);
  const paginatedQuestions = useMemo(() => {
    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredQuestions.slice(startIdx, startIdx + ITEMS_PER_PAGE);
  }, [filteredQuestions, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, typeFilter]);

  // Extract unique types for filter
  const questionTypes = useMemo(() => {
    const types = new Set(questions.map(q => q.type));
    return Array.from(types).sort();
  }, [questions]);

  if (loading) return <div className="text-gray-500">{t("loading")}</div>;

  return (
    <div className="space-y-4">
      {/* Action Buttons Row */}
      <div className="flex gap-3">
        {onNewQuestion && (
          <button
            onClick={onNewQuestion}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm flex items-center gap-2"
          >
            ➕ {t("newQuestion")}
          </button>
        )}
        {onImport && (
          <button
            onClick={onImport}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm flex items-center gap-2"
          >
            📥 {t("bulkImport")}
          </button>
        )}
      </div>

      {/* Search and Filter Bar */}
      <div className="flex gap-3">
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
      <div className="text-sm text-gray-600">
        {t("showingResults", { shown: paginatedQuestions.length, filtered: filteredQuestions.length })}
        {filteredQuestions.length !== questions.length && ` ${t("showingFiltered", { total: questions.length })}`}
      </div>

      {/* Question List */}
      <div className="space-y-2">
        {paginatedQuestions.length === 0 && (
          <div className="text-gray-500 text-sm">
            {questions.length === 0 ? t("noQuestionsYet") : t("noQuestionsMatch")}
          </div>
        )}
        {paginatedQuestions.map((q) => (
          <div key={q.id} className="p-4 border rounded bg-white hover:shadow-md transition">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex gap-2 items-center mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded ${getQuestionTypeColor(q.type)}`}>{q.type}</span>
                  <span className="text-xs text-gray-500">{q.points} pts</span>
                </div>
                <div className="text-sm font-medium line-clamp-2">{q.text}</div>
              </div>
              <div className="flex gap-2 ml-4">
                <button
                  onClick={() => onEdit(q.id)}
                  className="text-sm px-3 py-1 bg-gray-100 rounded hover:bg-gray-200"
                >
                  {t("edit")}
                </button>
                <button
                  onClick={() => handleDelete(q.id)}
                  className="text-sm px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                >
                  {t("delete")}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 pt-4">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            {t("previous")}
          </button>
          
          <div className="flex gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
              // Show first, last, current, and adjacent pages
              const showPage = page === 1 || 
                              page === totalPages || 
                              Math.abs(page - currentPage) <= 1;
              
              const showEllipsis = (page === 2 && currentPage > 3) || 
                                  (page === totalPages - 1 && currentPage < totalPages - 2);

              if (!showPage && !showEllipsis) return null;

              if (showEllipsis) {
                return <span key={page} className="px-2 py-1 text-gray-400">...</span>;
              }

              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1 border rounded text-sm ${
                    currentPage === page
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            {t("next")}
          </button>
        </div>
      )}
    </div>
  );
}
