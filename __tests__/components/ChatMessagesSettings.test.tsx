/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock crypto.randomUUID before component import
Object.defineProperty(globalThis, "crypto", {
  value: { randomUUID: () => "test-uuid-1234-5678-9012-abcdefabcdef" },
});

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock ClientFetch
const mockApiGet = jest.fn();
const mockApiPut = jest.fn();

jest.mock("@/lib/utils/ClientFetch", () => ({
  apiGet: (...args: unknown[]) => mockApiGet(...args),
  apiPut: (...args: unknown[]) => mockApiPut(...args),
  isClientFetchError: jest.fn(() => false),
}));

// Mock toast
const mockToast = jest.fn();
jest.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

import { ChatMessagesSettings } from "@/components/settings/ChatMessagesSettings";

describe("ChatMessagesSettings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should show loading spinner initially", () => {
    mockApiGet.mockImplementation(() => new Promise(() => {}));

    render(<ChatMessagesSettings />);

    // The Loader2 spinner has the animate-spin class
    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  it("should display messages after loading", async () => {
    const messages = [
      { id: "id-1", title: "Hello", message: "Hello everyone!" },
      { id: "id-2", title: "GG", message: "Good game!" },
    ];
    mockApiGet.mockResolvedValue({ messages });

    render(<ChatMessagesSettings />);

    await waitFor(() => {
      expect(screen.getByText("Hello")).toBeInTheDocument();
      expect(screen.getByText("Hello everyone!")).toBeInTheDocument();
      expect(screen.getByText("GG")).toBeInTheDocument();
      expect(screen.getByText("Good game!")).toBeInTheDocument();
    });
  });

  it("should disable save button when no changes", async () => {
    const messages = [
      { id: "id-1", title: "Hello", message: "Hello everyone!" },
    ];
    mockApiGet.mockResolvedValue({ messages });

    render(<ChatMessagesSettings />);

    await waitFor(() => {
      expect(screen.getByText("Hello")).toBeInTheDocument();
    });

    // The save button text is "save" (from translated key)
    const saveButton = screen.getByRole("button", { name: /^save$/i });
    expect(saveButton).toBeDisabled();
  });

  it("should add a new message", async () => {
    const user = userEvent.setup();
    mockApiGet.mockResolvedValue({ messages: [] });

    render(<ChatMessagesSettings />);

    await waitFor(() => {
      expect(screen.getByText("empty")).toBeInTheDocument();
    });

    // Fill in the new message form
    const titleInput = screen.getByPlaceholderText("titlePlaceholder");
    const messageTextarea = screen.getByPlaceholderText("messagePlaceholder");

    await user.type(titleInput, "New Title");
    await user.type(messageTextarea, "New Message Body");

    // Click the add button
    const addButton = screen.getByRole("button", { name: /addMessage/i });
    await user.click(addButton);

    // The new message should appear in the list
    await waitFor(() => {
      expect(screen.getByText("New Title")).toBeInTheDocument();
      expect(screen.getByText("New Message Body")).toBeInTheDocument();
    });

    // Save button should now be enabled since we have changes
    const saveButton = screen.getByRole("button", { name: /^save$/i });
    expect(saveButton).not.toBeDisabled();
  });

  it("should delete a message", async () => {
    const user = userEvent.setup();
    const messages = [
      { id: "id-1", title: "To Delete", message: "This will be removed" },
    ];
    mockApiGet.mockResolvedValue({ messages });

    render(<ChatMessagesSettings />);

    await waitFor(() => {
      expect(screen.getByText("To Delete")).toBeInTheDocument();
    });

    // Find the delete button (has text-destructive class)
    const deleteButtons = screen.getAllByRole("button").filter((btn) =>
      btn.className.includes("text-destructive")
    );
    expect(deleteButtons.length).toBeGreaterThan(0);
    await user.click(deleteButtons[0]);

    // Message should be removed
    await waitFor(() => {
      expect(screen.queryByText("To Delete")).not.toBeInTheDocument();
    });
  });

  it("should show empty state when no messages", async () => {
    mockApiGet.mockResolvedValue({ messages: [] });

    render(<ChatMessagesSettings />);

    await waitFor(() => {
      expect(screen.getByText("empty")).toBeInTheDocument();
      expect(screen.getByText("emptyHint")).toBeInTheDocument();
    });
  });
});
