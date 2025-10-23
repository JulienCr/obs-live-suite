/**
 * Get color classes for question type badges
 */
export function getQuestionTypeColor(type: string): string {
  switch (type.toLowerCase()) {
    case 'qcm':
      return 'bg-blue-100 text-blue-800';
    case 'closest':
      return 'bg-purple-100 text-purple-800';
    case 'open':
      return 'bg-green-100 text-green-800';
    case 'image':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

