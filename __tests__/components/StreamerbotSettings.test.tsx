/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StreamerbotSettings } from "@/components/settings/StreamerbotSettings";
import { DEFAULT_STREAMERBOT_CONNECTION } from "@/lib/models/StreamerbotChat";

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      title: "Streamer.bot Connection",
      description: "Configure connection to Streamer.bot WebSocket server",
      loading: "Loading...",
      connected: "Connected",
      connecting: "Connecting",
      disconnected: "Disconnected",
      saveSettings: "Save Settings",
      saving: "Saving...",
      saveSuccess: "Settings saved successfully",
      saveFailed: "Failed to save settings",
      connect: "Connect",
      disconnect: "Disconnect",
      setupGuide: "Setup Guide",
      setupStep1: "Open Streamer.bot and enable WebSocket Server",
      setupStep2: "Note the host and port settings",
      setupStep3: "Enter the connection details above",
      setupStep4: "Click Save and then Connect",
    };
    return translations[key] || key;
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

jest.mock("@/lib/utils/ClientFetch", () => ({
  apiGet: (...args: unknown[]) => mockApiGet(...args),
  apiPut: (...args: unknown[]) => mockApiPut(...args),
  apiPost: (...args: unknown[]) => mockApiPost(...args),
  isClientFetchError: (error: unknown): boolean => {
    return (
      error !== null &&
      typeof error === "object" &&
      "errorMessage" in error
    );
  },
}));

// Mock StreamerbotConnectionForm since it has its own test file
jest.mock("@/components/settings/StreamerbotConnectionForm", () => ({
  StreamerbotConnectionForm: ({
    value,
    onChange,
    disabled,
  }: {
    value?: { host: string; port: number };
    onChange: (value: { host: string; port: number }) => void;
    disabled?: boolean;
  }) => (
    <div data-testid="streamerbot-connection-form">
      <input
        data-testid="host-input"
        value={value?.host || ""}
        onChange={(e) => onChange({ ...value, host: e.target.value } as never)}
        disabled={disabled}
        placeholder="Host"
      />
      <input
        data-testid="port-input"
        type="number"
        value={value?.port || ""}
        onChange={(e) =>
          onChange({ ...value, port: parseInt(e.target.value) } as never)
        }
        disabled={disabled}
        placeholder="Port"
      />
    </div>
  ),
}));

describe("StreamerbotSettings", () => {
  const defaultSettingsResponse = {
    host: DEFAULT_STREAMERBOT_CONNECTION.host,
    port: DEFAULT_STREAMERBOT_CONNECTION.port,
    endpoint: DEFAULT_STREAMERBOT_CONNECTION.endpoint,
    scheme: DEFAULT_STREAMERBOT_CONNECTION.scheme,
    autoConnect: DEFAULT_STREAMERBOT_CONNECTION.autoConnect,
    autoReconnect: DEFAULT_STREAMERBOT_CONNECTION.autoReconnect,
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
      // Never resolve to keep loading state
      mockApiGet.mockImplementation(() => new Promise(() => {}));

      render(<StreamerbotSettings />);

      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    it("should hide loading state after settings and status load", async () => {
      mockApiGet.mockImplementation((url: string) => {
        if (url.includes("/settings")) {
          return Promise.resolve(defaultSettingsResponse);
        }
        if (url.includes("/status")) {
          return Promise.resolve(defaultStatusResponse);
        }
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
        if (url.includes("/settings")) {
          return Promise.resolve(defaultSettingsResponse);
        }
        if (url.includes("/status")) {
          return Promise.resolve(defaultStatusResponse);
        }
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

    it("should use default settings on load error", async () => {
      mockApiGet.mockImplementation((url: string) => {
        if (url.includes("/settings")) {
          return Promise.reject(new Error("Network error"));
        }
        if (url.includes("/status")) {
          return Promise.resolve(defaultStatusResponse);
        }
        return Promise.reject(new Error("Unknown URL"));
      });

      render(<StreamerbotSettings />);

      await waitFor(() => {
        expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
      });

      // Form should still render with defaults
      expect(screen.getByTestId("streamerbot-connection-form")).toBeInTheDocument();
    });

    it("should show error status when status check fails", async () => {
      mockApiGet.mockImplementation((url: string) => {
        if (url.includes("/settings")) {
          return Promise.resolve(defaultSettingsResponse);
        }
        if (url.includes("/status")) {
          return Promise.reject(new Error("Status check failed"));
        }
        return Promise.reject(new Error("Unknown URL"));
      });

      render(<StreamerbotSettings />);

      await waitFor(() => {
        expect(screen.getByText("Disconnected")).toBeInTheDocument();
      });
    });
  });

  describe("Connection Status Display", () => {
    it("should show connected badge when connected", async () => {
      mockApiGet.mockImplementation((url: string) => {
        if (url.includes("/settings")) {
          return Promise.resolve(defaultSettingsResponse);
        }
        if (url.includes("/status")) {
          return Promise.resolve({ status: "connected" });
        }
        return Promise.reject(new Error("Unknown URL"));
      });

      render(<StreamerbotSettings />);

      await waitFor(() => {
        expect(screen.getByText("Connected")).toBeInTheDocument();
      });
    });

    it("should show connecting badge when connecting", async () => {
      mockApiGet.mockImplementation((url: string) => {
        if (url.includes("/settings")) {
          return Promise.resolve(defaultSettingsResponse);
        }
        if (url.includes("/status")) {
          return Promise.resolve({ status: "connecting" });
        }
        return Promise.reject(new Error("Unknown URL"));
      });

      render(<StreamerbotSettings />);

      await waitFor(() => {
        expect(screen.getByText("Connecting")).toBeInTheDocument();
      });
    });

    it("should show disconnected badge when disconnected", async () => {
      mockApiGet.mockImplementation((url: string) => {
        if (url.includes("/settings")) {
          return Promise.resolve(defaultSettingsResponse);
        }
        if (url.includes("/status")) {
          return Promise.resolve({ status: "disconnected" });
        }
        return Promise.reject(new Error("Unknown URL"));
      });

      render(<StreamerbotSettings />);

      await waitFor(() => {
        expect(screen.getByText("Disconnected")).toBeInTheDocument();
      });
    });
  });

  describe("Form Changes", () => {
    beforeEach(() => {
      mockApiGet.mockImplementation((url: string) => {
        if (url.includes("/settings")) {
          return Promise.resolve(defaultSettingsResponse);
        }
        if (url.includes("/status")) {
          return Promise.resolve(defaultStatusResponse);
        }
        return Promise.reject(new Error("Unknown URL"));
      });
    });

    it("should enable save button when form changes", async () => {
      const user = userEvent.setup();
      render(<StreamerbotSettings />);

      await waitFor(() => {
        expect(screen.getByTestId("host-input")).toBeInTheDocument();
      });

      // Initially save button should be disabled (no changes)
      const saveButton = screen.getByRole("button", { name: /Save Settings/i });
      expect(saveButton).toBeDisabled();

      // Make a change
      const hostInput = screen.getByTestId("host-input");
      await user.clear(hostInput);
      await user.type(hostInput, "192.168.1.100");

      // Save button should now be enabled
      expect(saveButton).not.toBeDisabled();
    });
  });

  describe("Save Functionality", () => {
    beforeEach(() => {
      mockApiGet.mockImplementation((url: string) => {
        if (url.includes("/settings")) {
          return Promise.resolve({
            ...defaultSettingsResponse,
            host: "127.0.0.1",
            port: 8080,
          });
        }
        if (url.includes("/status")) {
          return Promise.resolve(defaultStatusResponse);
        }
        return Promise.reject(new Error("Unknown URL"));
      });
    });

    it("should call apiPut with settings when saving", async () => {
      const user = userEvent.setup();
      mockApiPut.mockResolvedValue({});

      render(<StreamerbotSettings />);

      await waitFor(() => {
        expect(screen.getByTestId("host-input")).toBeInTheDocument();
      });

      // Make a change to enable save button
      const hostInput = screen.getByTestId("host-input");
      await user.clear(hostInput);
      await user.type(hostInput, "192.168.1.50");

      const saveButton = screen.getByRole("button", { name: /Save Settings/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockApiPut).toHaveBeenCalledWith(
          "http://localhost:3002/api/streamerbot-chat/settings",
          expect.objectContaining({
            host: "192.168.1.50",
          })
        );
      });
    });

    it("should show saving state while saving", async () => {
      const user = userEvent.setup();
      // Never resolve to keep saving state
      mockApiPut.mockImplementation(() => new Promise(() => {}));

      render(<StreamerbotSettings />);

      await waitFor(() => {
        expect(screen.getByTestId("host-input")).toBeInTheDocument();
      });

      // Make a change
      const hostInput = screen.getByTestId("host-input");
      await user.clear(hostInput);
      await user.type(hostInput, "newhost");

      const saveButton = screen.getByRole("button", { name: /Save Settings/i });
      await user.click(saveButton);

      expect(screen.getByText("Saving...")).toBeInTheDocument();
    });

    it("should show success message after successful save", async () => {
      const user = userEvent.setup();
      mockApiPut.mockResolvedValue({});

      render(<StreamerbotSettings />);

      await waitFor(() => {
        expect(screen.getByTestId("host-input")).toBeInTheDocument();
      });

      // Make a change
      const hostInput = screen.getByTestId("host-input");
      await user.clear(hostInput);
      await user.type(hostInput, "newhost");

      const saveButton = screen.getByRole("button", { name: /Save Settings/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText("Settings saved successfully")).toBeInTheDocument();
      });
    });

    it("should show error message on save failure", async () => {
      const user = userEvent.setup();
      mockApiPut.mockRejectedValue(new Error("Save failed"));

      render(<StreamerbotSettings />);

      await waitFor(() => {
        expect(screen.getByTestId("host-input")).toBeInTheDocument();
      });

      // Make a change
      const hostInput = screen.getByTestId("host-input");
      await user.clear(hostInput);
      await user.type(hostInput, "newhost");

      const saveButton = screen.getByRole("button", { name: /Save Settings/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText("Save failed")).toBeInTheDocument();
      });
    });

    it("should show ClientFetchError message on API error", async () => {
      const user = userEvent.setup();
      const clientFetchError = {
        errorMessage: "Invalid port number",
        status: 400,
      };
      mockApiPut.mockRejectedValue(clientFetchError);

      render(<StreamerbotSettings />);

      await waitFor(() => {
        expect(screen.getByTestId("host-input")).toBeInTheDocument();
      });

      // Make a change
      const hostInput = screen.getByTestId("host-input");
      await user.clear(hostInput);
      await user.type(hostInput, "newhost");

      const saveButton = screen.getByRole("button", { name: /Save Settings/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText("Invalid port number")).toBeInTheDocument();
      });
    });

    it("should refresh status after successful save", async () => {
      const user = userEvent.setup();
      mockApiPut.mockResolvedValue({});

      render(<StreamerbotSettings />);

      await waitFor(() => {
        expect(screen.getByTestId("host-input")).toBeInTheDocument();
      });

      // Clear existing calls
      mockApiGet.mockClear();

      // Make a change
      const hostInput = screen.getByTestId("host-input");
      await user.clear(hostInput);
      await user.type(hostInput, "newhost");

      const saveButton = screen.getByRole("button", { name: /Save Settings/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockApiGet).toHaveBeenCalledWith(
          "http://localhost:3002/api/streamerbot-chat/status"
        );
      });
    });
  });

  describe("Connect/Disconnect Actions", () => {
    it("should show Connect button when disconnected", async () => {
      mockApiGet.mockImplementation((url: string) => {
        if (url.includes("/settings")) {
          return Promise.resolve(defaultSettingsResponse);
        }
        if (url.includes("/status")) {
          return Promise.resolve({ status: "disconnected" });
        }
        return Promise.reject(new Error("Unknown URL"));
      });

      render(<StreamerbotSettings />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Connect/i })).toBeInTheDocument();
      });
    });

    it("should show Disconnect button when connected", async () => {
      mockApiGet.mockImplementation((url: string) => {
        if (url.includes("/settings")) {
          return Promise.resolve(defaultSettingsResponse);
        }
        if (url.includes("/status")) {
          return Promise.resolve({ status: "connected" });
        }
        return Promise.reject(new Error("Unknown URL"));
      });

      render(<StreamerbotSettings />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Disconnect/i })).toBeInTheDocument();
      });
    });

    it("should call connect API when clicking Connect", async () => {
      const user = userEvent.setup();
      mockApiGet.mockImplementation((url: string) => {
        if (url.includes("/settings")) {
          return Promise.resolve(defaultSettingsResponse);
        }
        if (url.includes("/status")) {
          return Promise.resolve({ status: "disconnected" });
        }
        return Promise.reject(new Error("Unknown URL"));
      });
      mockApiPost.mockResolvedValue({});

      render(<StreamerbotSettings />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Connect/i })).toBeInTheDocument();
      });

      const connectButton = screen.getByRole("button", { name: /Connect/i });
      await user.click(connectButton);

      await waitFor(() => {
        expect(mockApiPost).toHaveBeenCalledWith(
          "http://localhost:3002/api/streamerbot-chat/connect"
        );
      });
    });

    it("should call disconnect API when clicking Disconnect", async () => {
      const user = userEvent.setup();
      mockApiGet.mockImplementation((url: string) => {
        if (url.includes("/settings")) {
          return Promise.resolve(defaultSettingsResponse);
        }
        if (url.includes("/status")) {
          return Promise.resolve({ status: "connected" });
        }
        return Promise.reject(new Error("Unknown URL"));
      });
      mockApiPost.mockResolvedValue({});

      render(<StreamerbotSettings />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Disconnect/i })).toBeInTheDocument();
      });

      const disconnectButton = screen.getByRole("button", { name: /Disconnect/i });
      await user.click(disconnectButton);

      await waitFor(() => {
        expect(mockApiPost).toHaveBeenCalledWith(
          "http://localhost:3002/api/streamerbot-chat/disconnect"
        );
      });
    });

    it("should refresh status after connect", async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      mockApiGet.mockImplementation((url: string) => {
        if (url.includes("/settings")) {
          return Promise.resolve(defaultSettingsResponse);
        }
        if (url.includes("/status")) {
          return Promise.resolve({ status: "disconnected" });
        }
        return Promise.reject(new Error("Unknown URL"));
      });
      mockApiPost.mockResolvedValue({});

      render(<StreamerbotSettings />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Connect/i })).toBeInTheDocument();
      });

      mockApiGet.mockClear();

      const connectButton = screen.getByRole("button", { name: /Connect/i });
      await user.click(connectButton);

      // Advance past the 500ms delay
      jest.advanceTimersByTime(600);

      await waitFor(() => {
        expect(mockApiGet).toHaveBeenCalledWith(
          "http://localhost:3002/api/streamerbot-chat/status"
        );
      });

      jest.useRealTimers();
    });

    it("should disable Connect button while connecting", async () => {
      mockApiGet.mockImplementation((url: string) => {
        if (url.includes("/settings")) {
          return Promise.resolve(defaultSettingsResponse);
        }
        if (url.includes("/status")) {
          return Promise.resolve({ status: "connecting" });
        }
        return Promise.reject(new Error("Unknown URL"));
      });

      render(<StreamerbotSettings />);

      await waitFor(() => {
        const connectButton = screen.getByRole("button", { name: /Connect/i });
        expect(connectButton).toBeDisabled();
      });
    });
  });

  describe("Refresh Status Button", () => {
    it("should refresh status when clicking refresh button", async () => {
      const user = userEvent.setup();
      mockApiGet.mockImplementation((url: string) => {
        if (url.includes("/settings")) {
          return Promise.resolve(defaultSettingsResponse);
        }
        if (url.includes("/status")) {
          return Promise.resolve({ status: "disconnected" });
        }
        return Promise.reject(new Error("Unknown URL"));
      });

      render(<StreamerbotSettings />);

      await waitFor(() => {
        expect(screen.getByText("Disconnected")).toBeInTheDocument();
      });

      mockApiGet.mockClear();

      // Find the refresh button (it's an icon button without text)
      const buttons = screen.getAllByRole("button");
      const refreshButton = buttons.find(
        (btn) => btn.querySelector('svg.lucide-refresh-cw') !== null
      );

      if (refreshButton) {
        await user.click(refreshButton);

        await waitFor(() => {
          expect(mockApiGet).toHaveBeenCalledWith(
            "http://localhost:3002/api/streamerbot-chat/status"
          );
        });
      }
    });
  });

  describe("Setup Guide", () => {
    it("should display setup guide card", async () => {
      mockApiGet.mockImplementation((url: string) => {
        if (url.includes("/settings")) {
          return Promise.resolve(defaultSettingsResponse);
        }
        if (url.includes("/status")) {
          return Promise.resolve(defaultStatusResponse);
        }
        return Promise.reject(new Error("Unknown URL"));
      });

      render(<StreamerbotSettings />);

      await waitFor(() => {
        expect(screen.getByText("Setup Guide")).toBeInTheDocument();
      });

      // Check setup steps are displayed
      expect(screen.getByText("Open Streamer.bot and enable WebSocket Server")).toBeInTheDocument();
      expect(screen.getByText("Note the host and port settings")).toBeInTheDocument();
      expect(screen.getByText("Enter the connection details above")).toBeInTheDocument();
      expect(screen.getByText("Click Save and then Connect")).toBeInTheDocument();
    });
  });
});
