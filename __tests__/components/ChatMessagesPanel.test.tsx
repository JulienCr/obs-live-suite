/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock crypto.randomUUID
Object.defineProperty(globalThis, "crypto", {
  value: { randomUUID: () => "test-uuid-1234-5678-9012-abcdefabcdef" },
});

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock toast
const mockToast = jest.fn();
jest.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Mock ClientFetch
const mockApiGet = jest.fn();
jest.mock("@/lib/utils/ClientFetch", () => ({
  apiGet: (...args: unknown[]) => mockApiGet(...args),
}));

// Mock websocket
jest.mock("@/lib/utils/websocket", () => ({
  getBackendUrl: () => "http://localhost:3002",
}));

// Mock BasePanelWrapper
jest.mock("@/components/panels", () => ({
  BasePanelWrapper: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="panel-wrapper">{children}</div>
  ),
}));

// Mock cn utility
jest.mock("@/lib/utils/cn", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

// Mock dockview-react types
jest.mock("dockview-react", () => ({}));

// Mock global fetch for connection status
const mockFetch = jest.fn();
global.fetch = mockFetch;

import { ChatMessagesPanel } from "@/components/shell/panels/ChatMessagesPanel";

// Minimal mock props for IDockviewPanelProps
const mockPanelProps = {} as any;

describe("ChatMessagesPanel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Default: connection status check returns disconnected
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "disconnected" }),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should show loading state initially", () => {
    mockApiGet.mockImplementation(() => new Promise(() => {}));

    render(<ChatMessagesPanel {...mockPanelProps} />);

    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  it("should render messages after loading as send buttons", async () => {
    const messages = [
      { id: "id-1", title: "Hello", message: "Hello everyone!" },
      { id: "id-2", title: "GG", message: "Good game!" },
    ];
    mockApiGet.mockResolvedValue({ messages });

    render(<ChatMessagesPanel {...mockPanelProps} />);

    await waitFor(() => {
      expect(screen.getByText("Hello")).toBeInTheDocument();
      expect(screen.getByText("GG")).toBeInTheDocument();
    });

    // They should be buttons (MessageSendButton renders Button components)
    const buttons = screen.getAllByRole("button");
    const helloButton = buttons.find((btn) => btn.textContent?.includes("Hello"));
    expect(helloButton).toBeDefined();
  });

  it("should show edit mode toggle", async () => {
    mockApiGet.mockResolvedValue({ messages: [] });

    render(<ChatMessagesPanel {...mockPanelProps} />);

    await waitFor(() => {
      // The edit mode button uses translation key "editMode"
      expect(screen.getByText("editMode")).toBeInTheDocument();
    });
  });

  it("should show connection status indicator", async () => {
    mockApiGet.mockResolvedValue({ messages: [] });

    render(<ChatMessagesPanel {...mockPanelProps} />);

    await waitFor(() => {
      // WifiOff icon should be present (disconnected by default)
      const wifiOffIcon = document.querySelector(".lucide-wifi-off");
      expect(wifiOffIcon).toBeInTheDocument();
    });
  });

  it("should show connected status when streamerbot is connected", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "connected" }),
    });
    mockApiGet.mockResolvedValue({ messages: [] });

    render(<ChatMessagesPanel {...mockPanelProps} />);

    await waitFor(() => {
      const wifiIcon = document.querySelector(".lucide-wifi");
      expect(wifiIcon).toBeInTheDocument();
    });
  });
});
