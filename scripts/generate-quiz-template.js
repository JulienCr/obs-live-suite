#!/usr/bin/env node
/**
 * Generate XLSX template for quiz question import
 * Generates a template file in the public directory
 */

import XLSX from 'xlsx';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define the template structure
const headers = [
  'type',
  'text',
  'option_a',
  'option_b',
  'option_c',
  'option_d',
  'correct',
  'points',
  'time_s',
  'media',
  'explanation',
  'notes',
  'mode'
];

// Example data
const examples = [
  {
    type: 'qcm',
    text: 'What is 2+2?',
    option_a: '2',
    option_b: '3',
    option_c: '4',
    option_d: '5',
    correct: '2',
    points: 1,
    time_s: 20,
    media: '',
    explanation: 'Basic arithmetic: 2+2 equals 4',
    notes: 'Easy question',
    mode: ''
  },
  {
    type: 'qcm',
    text: 'Which is a primary color?',
    option_a: 'Red',
    option_b: 'Green',
    option_c: 'Purple',
    option_d: 'Orange',
    correct: '0',
    points: 1,
    time_s: 15,
    media: '',
    explanation: 'Red is one of the three primary colors (Red, Blue, Yellow)',
    notes: '',
    mode: ''
  },
  {
    type: 'closest',
    text: 'How many days are there in a year?',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    correct: '365',
    points: 2,
    time_s: 20,
    media: '',
    explanation: 'A regular year has 365 days',
    notes: 'Supports integers and floats (e.g., 365 or 2.72)',
    mode: ''
  },
  {
    type: 'open',
    text: 'Explain what photosynthesis is',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    correct: 'Photosynthesis is the process by which plants convert light into energy',
    points: 3,
    time_s: 30,
    media: '',
    explanation: 'Photosynthesis converts sunlight, water, and CO2 into glucose and oxygen',
    notes: 'Open-ended question',
    mode: ''
  }
];

// Create worksheet data
const wsData = [headers, ...examples.map(ex => headers.map(h => ex[h] || ''))];

// Create workbook
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet(wsData);

// Set column widths
const colWidths = [
  { wch: 10 },  // type
  { wch: 50 },  // text
  { wch: 25 },  // option_a
  { wch: 25 },  // option_b
  { wch: 25 },  // option_c
  { wch: 25 },  // option_d
  { wch: 10 },  // correct
  { wch: 8 },   // points
  { wch: 8 },   // time_s
  { wch: 40 },  // media
  { wch: 50 },  // explanation
  { wch: 30 },  // notes
  { wch: 15 }   // mode
];
ws['!cols'] = colWidths;

// Add to workbook
XLSX.utils.book_append_sheet(wb, ws, 'Questions');

// Add instructions sheet
const instructions = [
  ['Quiz Questions Import Template'],
  [''],
  ['Instructions:'],
  ['1. Fill in the questions in the "Questions" sheet'],
  ['2. Required columns: type, text'],
  ['3. For QCM questions: fill option_a through option_d and set correct (0-3 or A-D)'],
  ['4. For Closest questions: set correct to the numeric answer'],
  ['5. For Open questions: set correct to the expected answer text'],
  ['6. Save as CSV or keep as XLSX for import'],
  [''],
  ['Column Descriptions:'],
  ['type - Question type: qcm, closest, open, image'],
  ['text - The question text (required)'],
  ['option_a/b/c/d - Answer options for QCM questions'],
  ['correct - Correct answer (index 0-3, letter A-D, or numeric/text value)'],
  ['points - Points awarded (default: 1)'],
  ['time_s - Time limit in seconds (default: 20)'],
  ['media - URL or path to image/video'],
  ['explanation - Explanation shown to host after lock/reveal'],
  ['notes - Internal notes (not shown to players)'],
  ['mode - Advanced mode (qcm, image_qcm, image_zoombuzz, mystery_image)']
];

const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
wsInstructions['!cols'] = [{ wch: 80 }];
XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');

// Write to file
const publicDir = join(__dirname, '..', 'public');
const outputPath = join(publicDir, 'quiz_questions_template.xlsx');

try {
  XLSX.writeFile(wb, outputPath);
  console.log(`✅ Template generated: ${outputPath}`);
} catch (error) {
  console.error('❌ Error generating template:', error);
  process.exit(1);
}

