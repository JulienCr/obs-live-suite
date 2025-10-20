import { NextResponse } from "next/server";
import { DatabaseService } from "@/lib/services/DatabaseService";
import { RegistryService } from "@/lib/services/updater/RegistryService";
import { GitHubReleaseChecker } from "@/lib/services/updater/GitHubReleaseChecker";

/**
 * POST /api/updater/check
 * Check for plugin updates
 */
export async function POST() {
  try {
    const db = DatabaseService.getInstance().getDb();
    const registryService = RegistryService.getInstance();
    const releaseChecker = new GitHubReleaseChecker();

    const plugins = db.prepare("SELECT * FROM plugins").all() as any[];

    for (const plugin of plugins) {
      if (plugin.isIgnored) continue;

      const registryEntry = registryService.getEntry(plugin.registryId);
      if (!registryEntry) continue;

      const release = await releaseChecker.getLatestRelease(registryEntry.canonicalRepo);
      if (!release) continue;

      const hasUpdate = releaseChecker.hasUpdate(plugin.localVersion, release.version);

      db.prepare(`
        UPDATE plugins
        SET latestVersion = ?, releaseUrl = ?, releaseNotes = ?,
            updateStatus = ?, lastChecked = ?, updatedAt = ?
        WHERE id = ?
      `).run(
        release.version,
        release.url,
        release.notes.substring(0, 500),
        hasUpdate ? "update_available" : "up_to_date",
        new Date().toISOString(),
        new Date().toISOString(),
        plugin.id
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Check updates error:", error);
    return NextResponse.json(
      { error: "Failed to check updates" },
      { status: 500 }
    );
  }
}

