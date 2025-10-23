"use client";
import { useState, useRef, useEffect } from "react";
import { parseCsv, csvToQuestions, validateQuestion } from "@/lib/utils/CsvParser";

interface BulkQuestionImportProps {
  onSuccess: () => void;
  onCancel: () => void;
}

interface ValidationError {
  row: number;
  errors: string[];
}

interface DuplicateWarning {
  questionId: string;
  questionText: string;
  isDuplicate: boolean;
}

/**
 * Bulk Question Import Component
 * Allows importing multiple questions from CSV or JSON files
 */
export function BulkQuestionImport({ onSuccess, onCancel }: BulkQuestionImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateWarning[]>([]);
  const [existingQuestions, setExistingQuestions] = useState<Set<string>>(new Set());
  const [success, setSuccess] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [existingTexts, setExistingTexts] = useState<Set<string>>(new Set());

  // Load existing questions on mount
  useEffect(() => {
    const loadExisting = async () => {
      try {
        const res = await fetch('/api/quiz/questions');
        const data = await res.json();
        const ids = new Set<string>((data.questions || []).map((q: any) => q.id as string));
        const texts = new Set<string>((data.questions || []).map((q: any) => (q.text || '').trim().toLowerCase()));
        setExistingQuestions(ids);
        setExistingTexts(texts);
      } catch (e) {
        console.error('Failed to load existing questions', e);
      }
    };
    loadExisting();
  }, []);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setPreview([]);
    setErrors([]);
    setSuccess('');

    // Parse and preview
    try {
      const text = await selectedFile.text();
      const fileType = selectedFile.name.toLowerCase();

      let questions: any[] = [];

      if (fileType.endsWith('.json')) {
        const json = JSON.parse(text);
        questions = Array.isArray(json) ? json : json.questions || [];
      } else if (fileType.endsWith('.csv')) {
        const rows = parseCsv(text);
        questions = csvToQuestions(rows);
      } else {
        throw new Error('Unsupported file type. Please use .csv or .json');
      }

      // Check for duplicates
      const seenIds = new Set<string>();
      const seenTexts = new Set<string>();
      const duplicateWarnings: DuplicateWarning[] = [];
      const validationErrors: ValidationError[] = [];
      
      questions.forEach((q, idx) => {
        // Validate question
        const errs = validateQuestion(q);
        if (errs.length > 0) {
          validationErrors.push({ row: idx + 1, errors: errs });
        }

        // Check for duplicates by ID and by text content
        const questionText = (q.text || '').trim().toLowerCase();
        const isDuplicateIdInFile = q.id && seenIds.has(q.id);
        const isDuplicateIdInDb = q.id && existingQuestions.has(q.id);
        const isDuplicateTextInFile = questionText && seenTexts.has(questionText);
        const isDuplicateTextInDb = questionText && existingTexts.has(questionText);
        
        if (isDuplicateIdInFile || isDuplicateIdInDb || isDuplicateTextInFile || isDuplicateTextInDb) {
          duplicateWarnings.push({
            questionId: q.id || 'no-id',
            questionText: q.text || 'Unknown',
            isDuplicate: true
          });
        }
        
        if (q.id) seenIds.add(q.id);
        if (questionText) seenTexts.add(questionText);
      });

      setPreview(questions);
      setErrors(validationErrors);
      setDuplicates(duplicateWarnings);

      if (validationErrors.length > 0 || duplicateWarnings.length > 0) {
        setSuccess('');
      } else {
        setSuccess(`${questions.length} question(s) ready to import`);
      }
    } catch (error: any) {
      setErrors([{ row: 0, errors: [error.message || 'Failed to parse file'] }]);
    }
  };

  const handleImport = async () => {
    if (!file || preview.length === 0 || errors.length > 0) return;

    // Filter out duplicates
    const duplicateIds = new Set(duplicates.map(d => d.questionId));
    const questionsToImport = preview.filter(q => !duplicateIds.has(q.id));

    if (questionsToImport.length === 0) {
      setErrors([{ row: 0, errors: ['All questions are duplicates. Nothing to import.'] }]);
      return;
    }

    setImporting(true);
    try {
      const response = await fetch('/api/quiz/questions/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: questionsToImport }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Import failed');
      }

      const result = await response.json();
      const skippedCount = duplicates.length;
      const successMsg = skippedCount > 0 
        ? `Successfully imported ${result.imported} question(s). Skipped ${skippedCount} duplicate(s).`
        : `Successfully imported ${result.imported} question(s)`;
      setSuccess(successMsg);
      
      // Reset and notify parent
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (error: any) {
      setErrors([{ row: 0, errors: [error.message || 'Import failed'] }]);
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    // Generate CSV template
    const csvTemplate = `type,text,option_a,option_b,option_c,option_d,correct,points,time_s,media,explanation,notes
qcm,"What is 2+2?",2,3,4,5,2,1,20,,It's basic math,
qcm,"Which is a primary color?",Red,Green,Blue,Yellow,0,1,15,,,
closest,"How many days in a year?",,,,,365,2,20,,,
open,"Explain photosynthesis",,,,,Photosynthesis is the process...,3,30,,,Example open question`;

    const blob = new Blob([csvTemplate], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'quiz_questions_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white border rounded-lg p-6 shadow-md">
      <h2 className="text-xl font-bold mb-4">Bulk Import Questions</h2>

      <div className="space-y-4">
        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select CSV or JSON file
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.json"
            onChange={handleFileSelect}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
          />
        </div>

        {/* Template Download */}
        <div className="flex gap-2">
          <button
            onClick={handleDownloadTemplate}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
          >
            📥 Download CSV Template
          </button>
          <a
            href="/quiz_questions_template.xlsx"
            download
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm inline-flex items-center"
          >
            📥 Download XLSX Template
          </a>
        </div>

        {/* Format Help */}
        <div className="bg-blue-50 border border-blue-200 rounded p-4 text-sm">
          <h3 className="font-semibold mb-2">📋 CSV Format:</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            <li><strong>Required:</strong> type, text</li>
            <li><strong>QCM:</strong> option_a, option_b, option_c, option_d, correct (0-3 or A-D)</li>
            <li><strong>Closest:</strong> correct (numeric value, supports integers and floats like 365 or 2.72)</li>
            <li><strong>Optional:</strong> points (default: 1), time_s (default: 20), media, explanation, notes</li>
          </ul>
          <h3 className="font-semibold mt-3 mb-2">📋 JSON Format:</h3>
          <p className="text-gray-700">Array of question objects or <code className="bg-white px-1">&#123;"questions": [...]&#125;</code></p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded p-4 text-green-800">
            ✅ {success}
          </div>
        )}

        {/* Duplicate Warnings */}
        {duplicates.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
            <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Duplicate Questions Detected:</h3>
            <p className="text-sm text-yellow-700 mb-2">
              The following questions already exist and will be skipped during import:
            </p>
            <div className="space-y-1 text-sm text-yellow-700 max-h-48 overflow-y-auto">
              {duplicates.map((dup, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-yellow-600">•</span>
                  <div className="flex-1">
                    <code className="bg-yellow-100 px-1 rounded text-xs">{dup.questionId}</code>
                    <span className="ml-2">{dup.questionText.substring(0, 60)}{dup.questionText.length > 60 ? '...' : ''}</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-yellow-600 mt-2">
              💡 These questions will be automatically excluded from import.
            </p>
          </div>
        )}

        {/* Validation Errors */}
        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded p-4">
            <h3 className="font-semibold text-red-800 mb-2">❌ Validation Errors:</h3>
            <div className="space-y-2 text-sm text-red-700 max-h-64 overflow-y-auto">
              {errors.map((err, idx) => (
                <div key={idx}>
                  {err.row > 0 && <strong>Row {err.row}:</strong>}
                  <ul className="list-disc list-inside ml-2">
                    {err.errors.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Preview */}
        {preview.length > 0 && errors.length === 0 && (
          <div className="bg-gray-50 border rounded p-4">
            <h3 className="font-semibold mb-2">
              Preview ({preview.length} questions{duplicates.length > 0 ? `, ${preview.length - duplicates.length} will be imported` : ''}):
            </h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {preview.slice(0, 5).map((q, idx) => {
                const isDuplicate = duplicates.some(d => d.questionId === q.id);
                return (
                  <div 
                    key={idx} 
                    className={`bg-white p-3 rounded border text-sm transition-opacity ${isDuplicate ? 'opacity-30' : ''}`}
                  >
                    <div className="flex gap-2 mb-1 items-center">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">{q.type}</span>
                      <span className="text-gray-500 text-xs">{q.points} pts</span>
                      {isDuplicate && (
                        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs">Duplicate - Will Skip</span>
                      )}
                    </div>
                    <div className={`font-medium ${isDuplicate ? 'line-through' : ''}`}>{q.text}</div>
                    {q.options && (
                      <div className="mt-1 text-xs text-gray-600">
                        Options: {q.options.join(', ')}
                      </div>
                    )}
                  </div>
                );
              })}
              {preview.length > 5 && (
                <div className="text-gray-500 text-sm text-center">
                  ...and {preview.length - 5} more
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-4 border-t">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
            disabled={importing}
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!file || preview.length === 0 || errors.length > 0 || importing || (preview.length === duplicates.length)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {importing ? 'Importing...' : `Import ${preview.length - duplicates.length} Question(s)${duplicates.length > 0 ? ` (Skip ${duplicates.length})` : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}

