import { cn } from '@/lib/utils/cn';

describe('cn utility', () => {
  it('should merge class names', () => {
    const result = cn('class1', 'class2');
    expect(result).toBe('class1 class2');
  });

  it('should handle conditional classes', () => {
    const isActive = true;
    const result = cn('base', isActive && 'active');
    expect(result).toBe('base active');
  });

  it('should handle false conditionals', () => {
    const isActive = false;
    const result = cn('base', isActive && 'active');
    expect(result).toBe('base');
  });

  it('should merge Tailwind classes correctly', () => {
    const result = cn('px-2 py-1', 'px-4');
    expect(result).toContain('px-4');
    expect(result).not.toContain('px-2');
  });

  it('should handle arrays of classes', () => {
    const result = cn(['class1', 'class2'], 'class3');
    expect(result).toBe('class1 class2 class3');
  });

  it('should handle undefined and null', () => {
    const result = cn('class1', undefined, null, 'class2');
    expect(result).toBe('class1 class2');
  });
});

