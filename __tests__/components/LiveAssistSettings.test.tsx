/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor } from "@testing-library/react";

// Repo convention: mock next-intl so t("key") returns the key (no provider).
jest.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));

// Mock ClientFetch (repo pattern for settings component tests)
const mockApiGet = jest.fn();
jest.mock("@/lib/utils/ClientFetch", () => ({
  apiGet: (...args: unknown[]) => mockApiGet(...args),
  apiPost: jest.fn(),
  apiPut: jest.fn(),
  isClientFetchError: jest.fn(() => false),
}));

import { LiveAssistSettings } from "@/components/settings/LiveAssistSettings";

describe("LiveAssistSettings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the device dropdown from reported devices", async () => {
    // useSettings and the devices effect both GET /api/settings/live-assist
    // via apiGet → fetch; one mock response feeds both.
    mockApiGet.mockResolvedValue({
      settings: { enabled: false, inputDevice: null, whisperModel: "large-v3", keywordsByProvider: { poster: ["spectacle"] }, windowBeforeSec: 15, windowAfterSec: 15, confidenceThreshold: 0.6 },
      devices: [{ id: "mic1", label: "USB Mic" }],
    });
    render(<LiveAssistSettings />);
    await waitFor(() => expect(screen.getByText("USB Mic")).toBeInTheDocument());
  });
});
