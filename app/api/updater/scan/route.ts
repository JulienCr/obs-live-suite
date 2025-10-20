import { NextResponse } from "next/server";
import { PluginScanner } from "@/lib/services/updater/PluginScanner";
import { DatabaseService } from "@/lib/services/DatabaseService";
import { randomUUID } from "crypto";

/**
 * POST /api/updater/scan
 * Scan for installed plugins
 */
export async function POST() {
  try {
    const scanner = new PluginScanner();
    const plugins = await scanner.scan();

    const db = DatabaseService.getInstance().getDb();
    const insertStmt = db.prepare(`
      INSERT OR REPLACE INTO plugins (
        id, name, kind, localVersion, paths, registryId,
        latestVersion, releaseUrl, releaseNotes, updateStatus,
        isIgnored, isWatched, lastChecked, compatibleOBSVersions,
        createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const plugin of plugins) {
      const now = new Date().toISOString();
      insertStmt.run(
        randomUUID(),
        plugin.name,
        plugin.kind,
        plugin.localVersion || null,
        JSON.stringify(plugin.paths),
        plugin.registryId || null,
        null,
        null,
        null,
        plugin.updateStatus,
        plugin.isIgnored ? 1 : 0,
        plugin.isWatched ? 1 : 0,
        null,
        null,
        now,
        now
      );
    }

    return NextResponse.json({ success: true, count: plugins.length });
  } catch (error) {
    console.error("Plugin scan error:", error);
    return NextResponse.json(
      { error: "Failed to scan plugins" },
      { status: 500 }
    );
  }
}

