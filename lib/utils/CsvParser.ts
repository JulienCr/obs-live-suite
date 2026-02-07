/**
 * CSV Parser Utility for Quiz Questions
 * 
 * Parses CSV files containing quiz questions and converts them to Question objects
 */

import { Question, quizModeSchema } from "@/lib/models/Quiz";
import { v4 as uuidv4 } from "uuid";

export interface CsvRow {
  [key: string]: string;
}

/**
 * Parse CSV text into an array of objects
 */
export function parseCsv(csvText: string): CsvRow[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) {
    throw new Error("CSV file must have at least a header row and one data row");
  }

  const headers = lines[0].split(',').map(h => h.trim());
  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines

    const values = parseCsvLine(line);
    if (values.length !== headers.length) {
      throw new Error(`Row ${i + 1}: Expected ${headers.length} columns, got ${values.length}`);
    }

    const row: CsvRow = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx];
    });
    rows.push(row);
  }

  return rows;
}

/**
 * Parse a single CSV line handling quoted values with commas
 */
function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of value
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  // Add the last value
  values.push(current.trim());

  return values;
}

/**
 * Convert CSV rows to Question objects
 */
export function csvToQuestions(rows: CsvRow[]): Partial<Question>[] {
  const questions: Partial<Question>[] = [];

  for (const row of rows) {
    try {
      const question = csvRowToQuestion(row);
      questions.push(question);
    } catch (error) {
      console.error(`Error parsing row:`, row, error);
      throw error;
    }
  }

  return questions;
}

/**
 * Convert a single CSV row to a Question object
 */
function csvRowToQuestion(row: CsvRow): Partial<Question> {
  const type = (row.type || 'qcm').toLowerCase();
  
  // Base question fields
  const question: Partial<Question> = {
    id: uuidv4(),
    type: type as Question["type"],
    text: row.text || row.question || '',
    points: parseInt(row.points || '1', 10),
    time_s: parseInt(row.time_s || row.time || '20', 10),
    notes: row.notes || '',
    explanation: row.explanation || undefined,
  };

  // Media/image field
  if (row.media || row.image) {
    question.media = row.media || row.image;
  }

  // Options for QCM questions
  if (type === 'qcm' || type === 'image') {
    const options: string[] = [];
    if (row.option_a) options.push(row.option_a);
    if (row.option_b) options.push(row.option_b);
    if (row.option_c) options.push(row.option_c);
    if (row.option_d) options.push(row.option_d);
    
    if (options.length === 0) {
      throw new Error(`QCM question must have at least one option: "${question.text}"`);
    }
    
    question.options = options;

    // Correct answer (0-based index)
    if (row.correct || row.correct_answer) {
      const correctValue = row.correct || row.correct_answer;
      const correctNum = parseInt(correctValue, 10);
      if (!isNaN(correctNum)) {
        question.correct = correctNum;
      } else {
        // Try to match letter (A=0, B=1, etc.)
        const letter = correctValue.toUpperCase().charAt(0);
        const index = letter.charCodeAt(0) - 'A'.charCodeAt(0);
        if (index >= 0 && index < options.length) {
          question.correct = index;
        }
      }
    }
  }

  // Closest questions
  if (type === 'closest') {
    if (row.correct || row.correct_answer) {
      question.correct = parseFloat(row.correct || row.correct_answer);
    }
  }

  // Mode (for advanced question types)
  if (row.mode) {
    const parsed = quizModeSchema.safeParse(row.mode);
    if (parsed.success) {
      question.mode = parsed.data;
    }
  }

  return question;
}

/**
 * Validate question data
 */
export function validateQuestion(q: Partial<Question>): string[] {
  const errors: string[] = [];

  if (!q.text || q.text.trim() === '') {
    errors.push('Question text is required');
  }

  if (!q.type) {
    errors.push('Question type is required');
  }

  if (q.type === 'qcm' || q.type === 'image') {
    if (!q.options || q.options.length === 0) {
      errors.push('QCM questions must have at least one option');
    }
    if (q.correct === undefined) {
      errors.push('QCM questions must specify a correct answer');
    }
  }

  if (q.type === 'closest') {
    if (q.correct === undefined) {
      errors.push('Closest questions must specify a correct answer');
    }
  }

  return errors;
}

