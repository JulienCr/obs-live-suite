import { BaseRepository, ColumnTransformConfig } from "./BaseRepository";
import type { DbMacro } from "@/lib/models/Database";

/**
 * Raw macro row type as stored in SQLite database.
 */
type DbMacroRow = Omit<DbMacro, "actions" | "createdAt" | "updatedAt"> & {
  actions: string;
  createdAt: string;
  updatedAt: string;
};

/**
 * MacroRepository handles macro database operations.
 * Read-only for now — macros are created/edited via the macro management UI.
 */
export class MacroRepository extends BaseRepository<
  DbMacro,
  DbMacroRow,
  never,
  never
> {
  private static instance: MacroRepository;

  protected readonly tableName = "macros";
  protected readonly loggerName = "MacroRepository";
  protected readonly transformConfig: ColumnTransformConfig = {
    dateColumns: ["createdAt", "updatedAt"],
    jsonColumns: [
      { column: "actions", defaultValue: [] },
    ],
  };

  private constructor() {
    super();
  }

  static getInstance(): MacroRepository {
    if (!MacroRepository.instance) {
      MacroRepository.instance = new MacroRepository();
    }
    return MacroRepository.instance;
  }

  protected override getOrderBy(): string {
    return "name ASC";
  }

  create(_input: never): void {
    throw new Error("Not implemented");
  }

  update(_id: string, _updates: never): void {
    throw new Error("Not implemented");
  }
}
