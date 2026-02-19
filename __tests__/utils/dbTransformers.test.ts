import {
  sqliteToBoolean,
  booleanToSqlite,
  sqliteToDate,
  dateToSqlite,
  sqliteTimestampToDate,
  dateToSqliteTimestamp,
  transformRow,
  prepareValue,
  prepareForInsert,
  STANDARD_DATE_COLUMNS,
} from "@/lib/utils/dbTransformers";

describe("sqliteToBoolean", () => {
  it("converts 1 to true", () => {
    expect(sqliteToBoolean(1)).toBe(true);
  });

  it("converts 0 to false", () => {
    expect(sqliteToBoolean(0)).toBe(false);
  });

  it("converts null to false", () => {
    expect(sqliteToBoolean(null)).toBe(false);
  });

  it("converts undefined to false", () => {
    expect(sqliteToBoolean(undefined)).toBe(false);
  });
});

describe("booleanToSqlite", () => {
  it("converts true to 1", () => {
    expect(booleanToSqlite(true)).toBe(1);
  });

  it("converts false to 0", () => {
    expect(booleanToSqlite(false)).toBe(0);
  });

  it("converts null to 0", () => {
    expect(booleanToSqlite(null)).toBe(0);
  });

  it("converts undefined to 0", () => {
    expect(booleanToSqlite(undefined)).toBe(0);
  });
});

describe("sqliteToDate", () => {
  it("converts ISO string to Date", () => {
    const iso = "2024-01-15T10:30:00.000Z";
    const result = sqliteToDate(iso);
    expect(result).toBeInstanceOf(Date);
    expect(result.toISOString()).toBe(iso);
  });

  it("returns current date for null", () => {
    const before = Date.now();
    const result = sqliteToDate(null);
    const after = Date.now();
    expect(result.getTime()).toBeGreaterThanOrEqual(before);
    expect(result.getTime()).toBeLessThanOrEqual(after);
  });

  it("returns current date for undefined", () => {
    const before = Date.now();
    const result = sqliteToDate(undefined);
    const after = Date.now();
    expect(result.getTime()).toBeGreaterThanOrEqual(before);
    expect(result.getTime()).toBeLessThanOrEqual(after);
  });
});

describe("dateToSqlite", () => {
  it("converts Date to ISO string", () => {
    const date = new Date("2024-01-15T10:30:00.000Z");
    expect(dateToSqlite(date)).toBe("2024-01-15T10:30:00.000Z");
  });

  it("returns current ISO string for null", () => {
    const before = new Date().toISOString();
    const result = dateToSqlite(null);
    const after = new Date().toISOString();
    expect(result >= before).toBe(true);
    expect(result <= after).toBe(true);
  });
});

describe("sqliteTimestampToDate", () => {
  it("converts millisecond timestamp to Date", () => {
    const ms = 1705312200000; // 2024-01-15T10:30:00.000Z
    const result = sqliteTimestampToDate(ms);
    expect(result).toBeInstanceOf(Date);
    expect(result.getTime()).toBe(ms);
  });

  it("returns current date for null", () => {
    const before = Date.now();
    const result = sqliteTimestampToDate(null);
    const after = Date.now();
    expect(result.getTime()).toBeGreaterThanOrEqual(before);
    expect(result.getTime()).toBeLessThanOrEqual(after);
  });
});

describe("dateToSqliteTimestamp", () => {
  it("converts Date to millisecond timestamp", () => {
    const date = new Date("2024-01-15T10:30:00.000Z");
    expect(dateToSqliteTimestamp(date)).toBe(date.getTime());
  });

  it("returns Date.now() for null", () => {
    const before = Date.now();
    const result = dateToSqliteTimestamp(null);
    const after = Date.now();
    expect(result).toBeGreaterThanOrEqual(before);
    expect(result).toBeLessThanOrEqual(after);
  });
});

describe("transformRow", () => {
  it("converts string date columns to Date objects", () => {
    const row = { name: "test", createdAt: "2024-01-15T10:30:00.000Z" };
    const result = transformRow(row, ["createdAt"], []);
    expect(result.createdAt).toBeInstanceOf(Date);
  });

  it("converts number timestamp columns to Date objects", () => {
    const row = { name: "test", createdAt: 1705312200000 };
    const result = transformRow(row, ["createdAt"], []);
    expect(result.createdAt).toBeInstanceOf(Date);
    expect((result.createdAt as Date).getTime()).toBe(1705312200000);
  });

  it("converts boolean columns from 0/1 to boolean", () => {
    const row = { name: "test", active: 1, hidden: 0 };
    const result = transformRow(row, [], ["active", "hidden"]);
    expect(result.active).toBe(true);
    expect(result.hidden).toBe(false);
  });

  it("handles both date and boolean columns", () => {
    const row = {
      name: "test",
      createdAt: "2024-01-15T10:30:00.000Z",
      active: 1,
    };
    const result = transformRow(row, ["createdAt"], ["active"]);
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.active).toBe(true);
    expect(result.name).toBe("test");
  });
});

describe("prepareValue", () => {
  it("converts undefined to null", () => {
    expect(prepareValue(undefined)).toBeNull();
  });

  it("converts Date to ISO string", () => {
    const date = new Date("2024-01-15T10:30:00.000Z");
    expect(prepareValue(date)).toBe("2024-01-15T10:30:00.000Z");
  });

  it("converts true to 1", () => {
    expect(prepareValue(true)).toBe(1);
  });

  it("converts false to 0", () => {
    expect(prepareValue(false)).toBe(0);
  });

  it("converts object to JSON string", () => {
    expect(prepareValue({ a: 1 })).toBe('{"a":1}');
  });

  it("passes through strings", () => {
    expect(prepareValue("hello")).toBe("hello");
  });

  it("passes through numbers", () => {
    expect(prepareValue(42)).toBe(42);
  });

  it("passes through null", () => {
    expect(prepareValue(null)).toBeNull();
  });
});

describe("prepareForInsert", () => {
  it("applies prepareValue to all fields", () => {
    const obj = {
      name: "test",
      active: true,
      createdAt: new Date("2024-01-15T10:30:00.000Z"),
      extra: undefined,
      meta: { key: "val" },
    };
    const result = prepareForInsert(obj);
    expect(result).toEqual({
      name: "test",
      active: 1,
      createdAt: "2024-01-15T10:30:00.000Z",
      extra: null,
      meta: '{"key":"val"}',
    });
  });
});

describe("STANDARD_DATE_COLUMNS", () => {
  it("contains createdAt and updatedAt", () => {
    expect(STANDARD_DATE_COLUMNS).toEqual(["createdAt", "updatedAt"]);
  });
});
