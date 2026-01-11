/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PresenterChannelSettings } from "@/components/settings/PresenterChannelSettings";
import { DEFAULT_QUICK_REPLIES } from "@/lib/models/PresenterChannel";

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    const translations: Record<string, string> = {
      title: "Presenter Channel Settings",
      description: "Configure presenter channel settings",
      loading: "Loading...",
      vdoNinjaUrl: "VDO.Ninja URL",
      vdoNinjaUrlPlaceholder: "https://vdo.ninja/...",
      vdoNinjaUrlHelp: "Enter your VDO.Ninja room URL",
      quickReplies: "Quick Replies",
      quickRepliesHelp: `Quick reply buttons (max ${params?.max || 6})`,
      quickRepliesPlaceholder: "Add a quick reply...",
      maxRepliesReached: `Maximum of ${params?.max || 6} quick replies reached`,
      allowCustomMessages: "Allow Custom Messages",
      allowCustomMessagesHelp: "Allow presenter to send custom messages",
      allowPresenterChat: "Allow Presenter Chat",
      allowPresenterChatHelp: "Allow presenter to send chat messages",
      saveSettings: "Save Settings",
      saving: "Saving...",
      settingsSaved: "Settings saved successfully",
      saveFailed: "Failed to save settings",
      failedToLoad: "Failed to load settings",
    };
    return translations[key] || key;
  },
}));

// Mock ClientFetch
const mockApiGet = jest.fn();
const mockApiPut = jest.fn();

jest.mock("@/lib/utils/ClientFetch", () => ({
  apiGet: (...args: unknown[]) => mockApiGet(...args),
  apiPut: (...args: unknown[]) => mockApiPut(...args),
  isClientFetchError: (error: unknown): boolean => {
    return (
      error !== null &&
      typeof error === "object" &&
      "errorMessage" in error
    );
  },
}));

describe("PresenterChannelSettings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Loading State", () => {
    it("should show loading state initially", () => {
      // Never resolve to keep loading state
      mockApiGet.mockImplementation(() => new Promise(() => {}));

      render(<PresenterChannelSettings />);

      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    it("should hide loading state after settings load", async () => {
      mockApiGet.mockResolvedValue({
        vdoNinjaUrl: undefined,
        quickReplies: [...DEFAULT_QUICK_REPLIES],
        canSendCustomMessages: false,
        allowPresenterToSendMessage: false,
      });

      render(<PresenterChannelSettings />);

      await waitFor(() => {
        expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
      });

      expect(screen.getByText("Presenter Channel Settings")).toBeInTheDocument();
    });
  });

  describe("Initial Data Loading", () => {
    it("should call apiGet to load settings on mount", async () => {
      mockApiGet.mockResolvedValue({
        vdoNinjaUrl: "https://vdo.ninja/room123",
        quickReplies: ["Yes", "No"],
        canSendCustomMessages: true,
        allowPresenterToSendMessage: false,
      });

      render(<PresenterChannelSettings />);

      await waitFor(() => {
        expect(mockApiGet).toHaveBeenCalledWith("/api/presenter/settings");
      });
    });

    it("should display loaded settings in the form", async () => {
      mockApiGet.mockResolvedValue({
        vdoNinjaUrl: "https://vdo.ninja/room123",
        quickReplies: ["Custom Reply 1", "Custom Reply 2"],
        canSendCustomMessages: true,
        allowPresenterToSendMessage: true,
      });

      render(<PresenterChannelSettings />);

      await waitFor(() => {
        expect(screen.getByDisplayValue("https://vdo.ninja/room123")).toBeInTheDocument();
      });

      // Check quick replies are displayed
      expect(screen.getByDisplayValue("Custom Reply 1")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Custom Reply 2")).toBeInTheDocument();
    });

    it("should use default quick replies if none provided", async () => {
      mockApiGet.mockResolvedValue({
        vdoNinjaUrl: undefined,
        quickReplies: undefined,
        canSendCustomMessages: false,
        allowPresenterToSendMessage: false,
      });

      render(<PresenterChannelSettings />);

      await waitFor(() => {
        DEFAULT_QUICK_REPLIES.forEach((reply) => {
          expect(screen.getByDisplayValue(reply)).toBeInTheDocument();
        });
      });
    });

    it("should show error message when loading fails", async () => {
      mockApiGet.mockRejectedValue(new Error("Network error"));

      render(<PresenterChannelSettings />);

      await waitFor(() => {
        expect(screen.getByText("Failed to load settings")).toBeInTheDocument();
      });
    });
  });

  describe("Form Field Changes", () => {
    beforeEach(async () => {
      mockApiGet.mockResolvedValue({
        vdoNinjaUrl: "",
        quickReplies: ["Ready"],
        canSendCustomMessages: false,
        allowPresenterToSendMessage: false,
      });
    });

    it("should update VDO.Ninja URL when typing", async () => {
      const user = userEvent.setup();
      render(<PresenterChannelSettings />);

      await waitFor(() => {
        expect(screen.getByLabelText("VDO.Ninja URL")).toBeInTheDocument();
      });

      const input = screen.getByLabelText("VDO.Ninja URL");
      await user.type(input, "https://vdo.ninja/newroom");

      expect(input).toHaveValue("https://vdo.ninja/newroom");
    });

    it("should update quick reply when editing", async () => {
      const user = userEvent.setup();
      render(<PresenterChannelSettings />);

      await waitFor(() => {
        expect(screen.getByDisplayValue("Ready")).toBeInTheDocument();
      });

      const input = screen.getByDisplayValue("Ready");
      await user.clear(input);
      await user.type(input, "Updated Reply");

      expect(input).toHaveValue("Updated Reply");
    });

    it("should toggle canSendCustomMessages switch", async () => {
      const user = userEvent.setup();
      render(<PresenterChannelSettings />);

      await waitFor(() => {
        expect(screen.getByLabelText("Allow Custom Messages")).toBeInTheDocument();
      });

      const switchElement = screen.getByRole("switch", { name: "Allow Custom Messages" });
      expect(switchElement).not.toBeChecked();

      await user.click(switchElement);
      expect(switchElement).toBeChecked();
    });

    it("should toggle allowPresenterToSendMessage switch", async () => {
      const user = userEvent.setup();
      render(<PresenterChannelSettings />);

      await waitFor(() => {
        expect(screen.getByLabelText("Allow Presenter Chat")).toBeInTheDocument();
      });

      const switchElement = screen.getByRole("switch", { name: "Allow Presenter Chat" });
      expect(switchElement).not.toBeChecked();

      await user.click(switchElement);
      expect(switchElement).toBeChecked();
    });
  });

  describe("Quick Replies Management", () => {
    beforeEach(async () => {
      mockApiGet.mockResolvedValue({
        vdoNinjaUrl: undefined,
        quickReplies: ["Reply 1", "Reply 2"],
        canSendCustomMessages: false,
        allowPresenterToSendMessage: false,
      });
    });

    it("should add a new quick reply", async () => {
      const user = userEvent.setup();
      render(<PresenterChannelSettings />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Add a quick reply...")).toBeInTheDocument();
      });

      const addInput = screen.getByPlaceholderText("Add a quick reply...");
      await user.type(addInput, "New Reply");

      // Find the add button by finding the parent container and the button with variant="outline"
      const addInputContainer = addInput.closest(".flex.items-center");
      const addButton = addInputContainer?.querySelector('button[type="button"]');
      expect(addButton).not.toBeNull();
      await user.click(addButton!);

      // Check new reply is added
      expect(screen.getByDisplayValue("New Reply")).toBeInTheDocument();
      // Input should be cleared
      expect(addInput).toHaveValue("");
    });

    it("should add quick reply on Enter key press", async () => {
      const user = userEvent.setup();
      render(<PresenterChannelSettings />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Add a quick reply...")).toBeInTheDocument();
      });

      const addInput = screen.getByPlaceholderText("Add a quick reply...");
      await user.type(addInput, "Enter Reply{Enter}");

      expect(screen.getByDisplayValue("Enter Reply")).toBeInTheDocument();
    });

    it("should remove a quick reply", async () => {
      const user = userEvent.setup();
      render(<PresenterChannelSettings />);

      await waitFor(() => {
        expect(screen.getByDisplayValue("Reply 1")).toBeInTheDocument();
      });

      // Find the delete button for Reply 1 (it's next to the input in the same flex container)
      const reply1Input = screen.getByDisplayValue("Reply 1");
      const container = reply1Input.closest(".flex.items-center");
      const deleteButton = container?.querySelector('button[type="button"]');
      expect(deleteButton).not.toBeNull();

      await user.click(deleteButton!);

      expect(screen.queryByDisplayValue("Reply 1")).not.toBeInTheDocument();
      expect(screen.getByDisplayValue("Reply 2")).toBeInTheDocument();
    });

    it("should not add duplicate quick replies", async () => {
      const user = userEvent.setup();
      render(<PresenterChannelSettings />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Add a quick reply...")).toBeInTheDocument();
      });

      const addInput = screen.getByPlaceholderText("Add a quick reply...");
      await user.type(addInput, "Reply 1{Enter}");

      // The add input still has "Reply 1" because duplicate was rejected
      // But the quick replies list should still only have one "Reply 1" input
      // Count inputs with "Reply 1" value excluding the add input
      const allInputs = screen.getAllByRole("textbox");
      const reply1Inputs = allInputs.filter(
        (input) =>
          (input as HTMLInputElement).value === "Reply 1" &&
          !(input as HTMLInputElement).placeholder
      );
      expect(reply1Inputs).toHaveLength(1);
    });

    it("should not add empty quick replies", async () => {
      const user = userEvent.setup();
      render(<PresenterChannelSettings />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Add a quick reply...")).toBeInTheDocument();
      });

      const addInput = screen.getByPlaceholderText("Add a quick reply...");
      await user.type(addInput, "   {Enter}");

      // Count quick reply inputs (should still be 2)
      const replyInputs = screen.getAllByRole("textbox");
      // One for VDO.Ninja URL, two for existing replies, one for add new
      expect(replyInputs).toHaveLength(4);
    });

    it("should show max replies message when limit reached", async () => {
      mockApiGet.mockResolvedValue({
        vdoNinjaUrl: undefined,
        quickReplies: ["1", "2", "3", "4", "5", "6"], // 6 is the max
        canSendCustomMessages: false,
        allowPresenterToSendMessage: false,
      });

      render(<PresenterChannelSettings />);

      await waitFor(() => {
        expect(screen.getByText(/Maximum of 6 quick replies reached/)).toBeInTheDocument();
      });

      // Add input should not be visible
      expect(screen.queryByPlaceholderText("Add a quick reply...")).not.toBeInTheDocument();
    });
  });

  describe("Save Functionality", () => {
    beforeEach(async () => {
      mockApiGet.mockResolvedValue({
        vdoNinjaUrl: "https://vdo.ninja/test",
        quickReplies: ["Ready"],
        canSendCustomMessages: false,
        allowPresenterToSendMessage: false,
      });
    });

    it("should call apiPut with current settings when saving", async () => {
      const user = userEvent.setup();
      mockApiPut.mockResolvedValue({});

      render(<PresenterChannelSettings />);

      await waitFor(() => {
        expect(screen.getByText("Save Settings")).toBeInTheDocument();
      });

      const saveButton = screen.getByRole("button", { name: /Save Settings/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockApiPut).toHaveBeenCalledWith("/api/presenter/settings", {
          vdoNinjaUrl: "https://vdo.ninja/test",
          quickReplies: ["Ready"],
          canSendCustomMessages: false,
          allowPresenterToSendMessage: false,
        });
      });
    });

    it("should show saving state while saving", async () => {
      const user = userEvent.setup();
      // Never resolve to keep saving state
      mockApiPut.mockImplementation(() => new Promise(() => {}));

      render(<PresenterChannelSettings />);

      await waitFor(() => {
        expect(screen.getByText("Save Settings")).toBeInTheDocument();
      });

      const saveButton = screen.getByRole("button", { name: /Save Settings/i });
      await user.click(saveButton);

      expect(screen.getByText("Saving...")).toBeInTheDocument();
      expect(saveButton).toBeDisabled();
    });

    it("should show success message after successful save", async () => {
      const user = userEvent.setup();
      mockApiPut.mockResolvedValue({});

      render(<PresenterChannelSettings />);

      await waitFor(() => {
        expect(screen.getByText("Save Settings")).toBeInTheDocument();
      });

      const saveButton = screen.getByRole("button", { name: /Save Settings/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText("Settings saved successfully")).toBeInTheDocument();
      });
    });

    it("should show error message on save failure", async () => {
      const user = userEvent.setup();
      mockApiPut.mockRejectedValue(new Error("Network error"));

      render(<PresenterChannelSettings />);

      await waitFor(() => {
        expect(screen.getByText("Save Settings")).toBeInTheDocument();
      });

      const saveButton = screen.getByRole("button", { name: /Save Settings/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText("Network error")).toBeInTheDocument();
      });
    });

    it("should show ClientFetchError message when save fails with API error", async () => {
      const user = userEvent.setup();
      const clientFetchError = {
        errorMessage: "Invalid VDO.Ninja URL format",
        status: 400,
      };
      mockApiPut.mockRejectedValue(clientFetchError);

      render(<PresenterChannelSettings />);

      await waitFor(() => {
        expect(screen.getByText("Save Settings")).toBeInTheDocument();
      });

      const saveButton = screen.getByRole("button", { name: /Save Settings/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText("Invalid VDO.Ninja URL format")).toBeInTheDocument();
      });
    });

    it("should convert empty VDO.Ninja URL to undefined on save", async () => {
      mockApiGet.mockResolvedValue({
        vdoNinjaUrl: "",
        quickReplies: ["Ready"],
        canSendCustomMessages: false,
        allowPresenterToSendMessage: false,
      });
      mockApiPut.mockResolvedValue({});

      const user = userEvent.setup();
      render(<PresenterChannelSettings />);

      await waitFor(() => {
        expect(screen.getByText("Save Settings")).toBeInTheDocument();
      });

      const saveButton = screen.getByRole("button", { name: /Save Settings/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockApiPut).toHaveBeenCalledWith("/api/presenter/settings", {
          vdoNinjaUrl: undefined,
          quickReplies: ["Ready"],
          canSendCustomMessages: false,
          allowPresenterToSendMessage: false,
        });
      });
    });
  });
});
