/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Repo convention: mock next-intl so t("key") returns the key.
jest.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));

const apiGet = jest.fn();
const apiPost = jest.fn();
jest.mock("@/lib/utils/ClientFetch", () => ({
  apiGet: (...a: unknown[]) => apiGet(...a),
  apiPost: (...a: unknown[]) => apiPost(...a),
  extractErrorMessage: (_e: unknown, fallback: string) => fallback,
}));
jest.mock("sonner", () => ({ toast: { error: jest.fn() } }));

import { LiveAssistControls } from "@/components/live-assist/LiveAssistControls";

// A fully-populated settings object, incl. user customizations a partial save would wipe.
const FULL = {
  enabled: true,
  transcriptDebug: true,
  inputDevice: "1",
  whisperModel: "large-v3",
  keywordsByProvider: { poster: ["spectacle"] },
  contextPromptsByProvider: { poster: "règle perso" },
  localPostersEnabled: true,
  localPosterMinSimilarity: 0.8,
  windowBeforeSec: 8,
  windowAfterSec: 15,
  confidenceThreshold: 0.6,
};

beforeEach(() => {
  apiGet.mockReset();
  apiPost.mockReset();
  apiGet.mockResolvedValue({ settings: FULL });
  apiPost.mockResolvedValue({ success: true });
});

describe("LiveAssistControls", () => {
  it("toggles `enabled` off by re-sending the FULL settings (keeps keywords/prompts)", async () => {
    render(<LiveAssistControls />);
    fireEvent.click(await screen.findByLabelText("listening"));
    await waitFor(() => expect(apiPost).toHaveBeenCalledTimes(1));
    expect(apiPost).toHaveBeenCalledWith("/api/settings/live-assist", {
      settings: { ...FULL, enabled: false },
    });
  });

  it("toggles `transcriptDebug` independently of `enabled`", async () => {
    render(<LiveAssistControls />);
    fireEvent.click(await screen.findByLabelText("transcript"));
    await waitFor(() => expect(apiPost).toHaveBeenCalledTimes(1));
    expect(apiPost).toHaveBeenCalledWith("/api/settings/live-assist", {
      settings: { ...FULL, transcriptDebug: false },
    });
  });

  it("renders nothing until settings load", () => {
    apiGet.mockReturnValue(new Promise(() => {})); // never resolves
    const { container } = render(<LiveAssistControls />);
    expect(container).toBeEmptyDOMElement();
  });
});
