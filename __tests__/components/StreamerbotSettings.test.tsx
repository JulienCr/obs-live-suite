/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StreamerbotSettings } from "@/components/settings/StreamerbotSettings";

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      title: "Streamer.bot Connection",
      description: "Configure connection to Streamer.bot WebSocket server",
      loading: "Loading...",
      currentStatus: "Current Status",
      connected: "Connected",
      connecting: "Connecting",
      disconnected: "Disconnected",
      connect: "Connect",
      disconnect: "Disconnect",
      source: "Source",
      database: "Database",
      websocketUrl: "WebSocket URL",
      websocketUrlDefault: "Default: ws://127.0.0.1:8080/",
      password: "Password (Optional)",
      passwordPlaceholder: "Leave empty if auth is disabled",
      showPassword: "Show password",
      passwordHelp: "Find in Streamer.bot settings",
      autoConnect: "Auto-connect on startup",
      autoReconnect: "Auto-reconnect on disconnect",
      testing: "Testing...",
      testConnection: "Test Connection",
      saving: "Saving...",
      saveSettings: "Save Settings",
      clearSettings: "Clear Settings",
      settingsCleared: "Settings cleared",
      saveSuccess: "Settings saved successfully",
      saveFailed: "Failed to save settings",
      setupGuide: "Setup Guide",
      setupStep1: "Open Streamer.bot",
      setupStep2: "Enable WebSocket Server",
      setupStep3: "Copy the password",
      setupStep4: "Enter details and test",
    };
    return translations[key] || key;
  },
}));

// Mock streamerbotUrl utility
jest.mock("@/lib/utils/streamerbotUrl", () => ({
  buildStreamerbotUrl: (parts: { host: string; port: number; endpoint: string; scheme: string }) =>
    `${parts.scheme}://${parts.host}:${parts.port}${parts.endpoint}`,
  parseStreamerbotUrl: (url: string) => {
    if (!url || url === "ws://127.0.0.1:8080/") {
      return { host: "127.0.0.1", port: 8080, endpoint: "/", scheme: "ws" };
    }
    return { host: "custom", port: 9999, endpoint: "/", scheme: "ws" };
  },
}));

// Mock websocket utility
jest.mock("@/lib/utils/websocket", () => ({
  getBackendUrl: () => "http://localhost:3002",
}));

// Mock ClientFetch
const mockApiGet = jest.fn();
const mockApiPut = jest.fn();
const mockApiPost = jest.fn();
const mockApiDelete = jest.fn();

jest.mock("@/lib/utils/ClientFetch", () => ({
  apiGet: (...args: unknown[]) => mockApiGet(...args),
  apiPut: (...args: unknown[]) => mockApiPut(...args),
  apiPost: (...args: unknown[]) => mockApiPost(...args),
  apiDelete: (...args: unknown[]) => mockApiDelete(...args),
  isClientFetchError: (error: unknown): boolean => {
    return (
      error !== null &&
      typeof error === "object" &&
      "errorMessage" in error
    );
  },
  extractErrorMessage: (error: unknown, fallback: string): string => {
    if (error instanceof Error) return error.message;
    return fallback;
  },
}));

describe("StreamerbotSettings", () => {
  const defaultSettingsResponse = {
    host: "127.0.0.1",
    port: 8080,
    endpoint: "/",
    scheme: "ws" as const,
    autoConnect: true,
    autoReconnect: true,
    hasPassword: false,
  };

  const defaultStatusResponse = {
    status: "disconnected" as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Loading State", () => {
    it("should show loading state initially", () => {
      mockApiGet.mockImplementation(() => new Promise(() => {}));
      render(<StreamerbotSettings />);
      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    it("should hide loading state after settings load", async () => {
      mockApiGet.mockImplementation((url: string) => {
        if (url.includes("/settings")) return Promise.resolve(defaultSettingsResponse);
        if (url.includes("/status")) return Promise.resolve(defaultStatusResponse);
        return Promise.reject(new Error("Unknown URL"));
      });

      render(<StreamerbotSettings />);

      await waitFor(() => {
        expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
      });

      expect(screen.getByText("Streamer.bot Connection")).toBeInTheDocument();
    });
  });

  describe("Initial Data Loading", () => {
    it("should call apiGet to load settings and status on mount", async () => {
      mockApiGet.mockImplementation((url: string) => {
        if (url.includes("/settings")) return Promise.resolve(defaultSettingsResponse);
        if (url.includes("/status")) return Promise.resolve(defaultStatusResponse);
        return Promise.reject(new Error("Unknown URL"));
      });

      render(<StreamerbotSettings />);

      await waitFor(() => {
        expect(mockApiGet).toHaveBeenCalledWith(
          "http://localhost:3002/api/streamerbot-chat/settings"
        );
        expect(mockApiGet).toHaveBeenCalledWith(
          "http://localhost:3002/api/streamerbot-chat/status"
        );
      });
    });
  });

  describe("Connection Status Display", () => {
    it("should show connected badge when connected", async () => {
      mockApiGet.mockImplementation((url: string) => {
        if (url.includes("/settings")) return Promise.resolve(defaultSettingsResponse);
        if (url.includes("/status")) return Promise.resolve({ status: "connected" });
        return Promise.reject(new Error("Unknown URL"));
      });

      render(<StreamerbotSettings />);

      await waitFor(() => {
        expect(screen.getByText("Connected")).toBeInTheDocument();
      });
    });

    it("should show disconnected badge when disconnected", async () => {
      mockApiGet.mockImplementation((url: string) => {
        if (url.includes("/settings")) return Promise.resolve(defaultSettingsResponse);
        if (url.includes("/status")) return Promise.resolve({ status: "disconnected" });
        return Promise.reject(new Error("Unknown URL"));
      });

      render(<StreamerbotSettings />);

      await waitFor(() => {
        expect(screen.getByText("Disconnected")).toBeInTheDocument();
      });
    });

    it("should show connecting badge when connecting", async () => {
      mockApiGet.mockImplementation((url: string) => {
        if (url.includes("/settings")) return Promise.resolve(defaultSettingsResponse);
        if (url.includes("/status")) return Promise.resolve({ status: "connecting" });
        return Promise.reject(new Error("Unknown URL"));
      });

      render(<StreamerbotSettings />);

      await waitFor(() => {
        expect(screen.getByText("Connecting")).toBeInTheDocument();
      });
    });
  });

  describe("URL Input", () => {
    it("should display URL input with loaded value", async () => {
      mockApiGet.mockImplementation((url: string) => {
        if (url.includes("/settings")) return Promise.resolve(defaultSettingsResponse);
        if (url.includes("/status")) return Promise.resolve(defaultStatusResponse);
        return Promise.reject(new Error("Unknown URL"));
      });

      render(<StreamerbotSettings />);

      await waitFor(() => {
        const urlInput = screen.getByPlaceholderText("ws://127.0.0.1:8080/");
        expect(urlInput).toBeInTheDocument();
        expect(urlInput).toHaveValue("ws://127.0.0.1:8080/");
      });
    });
  });

  describe("Save Functionality", () => {
    beforeEach(() => {
      mockApiGet.mockImplementation((url: string) => {
        if (url.includes("/settings")) return Promise.resolve(defaultSettingsResponse);
        if (url.includes("/status")) return Promise.resolve(defaultStatusResponse);
        return Promise.reject(new Error("Unknown URL"));
      });
    });

    it("should call apiPut with parsed settings when saving", async () => {
      const user = userEvent.setup();
      mockApiPut.mockResolvedValue({});

      render(<StreamerbotSettings />);

      await waitFor(() => {
        expect(screen.getByText("Save Settings")).toBeInTheDocument();
      });

      const saveButton = screen.getByRole("button", { name: /Save Settings/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockApiPut).toHaveBeenCalledWith(
          "http://localhost:3002/api/streamerbot-chat/settings",
          expect.objectContaining({
            host: "127.0.0.1",
            port: 8080,
            autoConnect: true,
            autoReconnect: true,
          })
        );
      });
    });

    it("should show success message after save", async () => {
      const user = userEvent.setup();
      mockApiPut.mockResolvedValue({});

      render(<StreamerbotSettings />);

      await waitFor(() => {
        expect(screen.getByText("Save Settings")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /Save Settings/i }));

      await waitFor(() => {
        expect(screen.getByText("Settings saved successfully")).toBeInTheDocument();
      });
    });

    it("should show error on save failure", async () => {
      const user = userEvent.setup();
      mockApiPut.mockRejectedValue(new Error("Save failed"));

      render(<StreamerbotSettings />);

      await waitFor(() => {
        expect(screen.getByText("Save Settings")).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /Save Settings/i }));

      await waitFor(() => {
        expect(screen.getByText("Save failed")).toBeInTheDocument();
      });
    });
  });

  describe("Connect/Disconnect Actions", () => {
    it("should show Connect button when disconnected", async () => {
      mockApiGet.mockImplementation((url: string) => {
        if (url.includes("/settings")) return Promise.resolve(defaultSettingsResponse);
        if (url.includes("/status")) return Promise.resolve({ status: "disconnected" });
        return Promise.reject(new Error("Unknown URL"));
      });

      render(<StreamerbotSettings />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /^Connect$/i })).toBeInTheDocument();
      });
    });

    it("should show Disconnect button when connected", async () => {
      mockApiGet.mockImplementation((url: string) => {
        if (url.includes("/settings")) return Promise.resolve(defaultSettingsResponse);
        if (url.includes("/status")) return Promise.resolve({ status: "connected" });
        return Promise.reject(new Error("Unknown URL"));
      });

      render(<StreamerbotSettings />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /^Disconnect$/i })).toBeInTheDocument();
      });
    });

    it("should call connect API when clicking Connect", async () => {
      const user = userEvent.setup();
      mockApiGet.mockImplementation((url: string) => {
        if (url.includes("/settings")) return Promise.resolve(defaultSettingsResponse);
        if (url.includes("/status")) return Promise.resolve({ status: "disconnected" });
        return Promise.reject(new Error("Unknown URL"));
      });
      mockApiPost.mockResolvedValue({});

      render(<StreamerbotSettings />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /^Connect$/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /^Connect$/i }));

      await waitFor(() => {
        expect(mockApiPost).toHaveBeenCalledWith(
          "http://localhost:3002/api/streamerbot-chat/connect"
        );
      });
    });

    it("should call disconnect API when clicking Disconnect", async () => {
      const user = userEvent.setup();
      mockApiGet.mockImplementation((url: string) => {
        if (url.includes("/settings")) return Promise.resolve(defaultSettingsResponse);
        if (url.includes("/status")) return Promise.resolve({ status: "connected" });
        return Promise.reject(new Error("Unknown URL"));
      });
      mockApiPost.mockResolvedValue({});

      render(<StreamerbotSettings />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /^Disconnect$/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /^Disconnect$/i }));

      await waitFor(() => {
        expect(mockApiPost).toHaveBeenCalledWith(
          "http://localhost:3002/api/streamerbot-chat/disconnect"
        );
      });
    });
  });

  describe("Setup Guide", () => {
    it("should display setup guide", async () => {
      mockApiGet.mockImplementation((url: string) => {
        if (url.includes("/settings")) return Promise.resolve(defaultSettingsResponse);
        if (url.includes("/status")) return Promise.resolve(defaultStatusResponse);
        return Promise.reject(new Error("Unknown URL"));
      });

      render(<StreamerbotSettings />);

      await waitFor(() => {
        expect(screen.getByText("Setup Guide")).toBeInTheDocument();
      });

      expect(screen.getByText("Open Streamer.bot")).toBeInTheDocument();
      expect(screen.getByText("Enable WebSocket Server")).toBeInTheDocument();
    });
  });
});
