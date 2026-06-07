import { PANEL_IDS } from "@/lib/panels/registry";
import fr from "@/messages/fr.json";
import en from "@/messages/en.json";

/**
 * The command-palette labels are derived from `dashboard.panels.{id}` via the
 * single `dashboard.commandPalette.addPanel` template (see CommandPalette.tsx).
 * This guards that invariant: every registered panel must have a localized title
 * in every locale, and the addPanel template must exist with a {name} placeholder.
 */
interface Messages {
  dashboard: {
    panels: Record<string, string>;
    commandPalette: Record<string, string>;
  };
}

const locales: Record<string, Messages> = {
  fr: fr as unknown as Messages,
  en: en as unknown as Messages,
};

describe("panel i18n completeness", () => {
  for (const [locale, messages] of Object.entries(locales)) {
    describe(locale, () => {
      it.each([...PANEL_IDS])("has a dashboard.panels title for '%s'", (id) => {
        const title = messages.dashboard.panels[id];
        expect(typeof title).toBe("string");
        expect(title.trim().length).toBeGreaterThan(0);
      });

      it("defines the command-palette addPanel template with a {name} placeholder", () => {
        const template = messages.dashboard.commandPalette.addPanel;
        expect(typeof template).toBe("string");
        expect(template).toContain("{name}");
      });
    });
  }
});
