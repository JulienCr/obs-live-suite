import { safeJsonParse, safeJsonParseOptional } from '@/lib/utils/safeJsonParse';

describe('safeJsonParse', () => {
  it('should return parsed object for valid JSON', () => {
    const json = '{"name": "test", "value": 123}';
    const result = safeJsonParse(json, {});
    expect(result).toEqual({ name: 'test', value: 123 });
  });

  it('should return parsed array for valid JSON array', () => {
    const json = '[1, 2, 3, "four"]';
    const result = safeJsonParse(json, []);
    expect(result).toEqual([1, 2, 3, 'four']);
  });

  it('should return fallback for null input', () => {
    const fallback = { default: true };
    const result = safeJsonParse(null, fallback);
    expect(result).toBe(fallback);
  });

  it('should return fallback for undefined input', () => {
    const fallback = ['default'];
    const result = safeJsonParse(undefined, fallback);
    expect(result).toBe(fallback);
  });

  it('should return fallback for empty string', () => {
    const fallback = { empty: true };
    const result = safeJsonParse('', fallback);
    expect(result).toBe(fallback);
  });

  it('should return fallback for malformed JSON', () => {
    const fallback = { fallback: true };
    const result = safeJsonParse('{ invalid json }', fallback);
    expect(result).toBe(fallback);
  });

  it('should return fallback for partial JSON', () => {
    const fallback: string[] = [];
    const result = safeJsonParse('{"unclosed": "brace"', fallback);
    expect(result).toBe(fallback);
  });

  it('should preserve type through generics', () => {
    interface Config {
      theme: string;
      enabled: boolean;
    }
    const json = '{"theme": "dark", "enabled": true}';
    const fallback: Config = { theme: 'default', enabled: false };
    const result = safeJsonParse<Config>(json, fallback);

    expect(result.theme).toBe('dark');
    expect(result.enabled).toBe(true);
  });

  it('should parse primitive values', () => {
    expect(safeJsonParse('"hello"', '')).toBe('hello');
    expect(safeJsonParse('42', 0)).toBe(42);
    expect(safeJsonParse('true', false)).toBe(true);
    expect(safeJsonParse('null', 'fallback')).toBeNull();
  });
});

describe('safeJsonParseOptional', () => {
  it('should return parsed object for valid JSON', () => {
    const json = '{"key": "value"}';
    const result = safeJsonParseOptional<{ key: string }>(json);
    expect(result).toEqual({ key: 'value' });
  });

  it('should return parsed array for valid JSON array', () => {
    const json = '["a", "b", "c"]';
    const result = safeJsonParseOptional<string[]>(json);
    expect(result).toEqual(['a', 'b', 'c']);
  });

  it('should return undefined for null input', () => {
    const result = safeJsonParseOptional(null);
    expect(result).toBeUndefined();
  });

  it('should return undefined for undefined input', () => {
    const result = safeJsonParseOptional(undefined);
    expect(result).toBeUndefined();
  });

  it('should return undefined for empty string', () => {
    const result = safeJsonParseOptional('');
    expect(result).toBeUndefined();
  });

  it('should return undefined for malformed JSON', () => {
    const result = safeJsonParseOptional('not valid json');
    expect(result).toBeUndefined();
  });

  it('should return undefined for incomplete JSON', () => {
    const result = safeJsonParseOptional('[1, 2, 3');
    expect(result).toBeUndefined();
  });

  it('should parse primitive values', () => {
    expect(safeJsonParseOptional('"string"')).toBe('string');
    expect(safeJsonParseOptional('100')).toBe(100);
    expect(safeJsonParseOptional('false')).toBe(false);
  });
});
