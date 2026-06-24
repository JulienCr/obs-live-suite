/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from "@testing-library/react";

// Repo convention (see __tests__/components/ChatMessagesPanel.test.tsx):
// mock next-intl so t("key") returns the key — no provider needed.
jest.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));

import { SuggestionCard } from "@/components/live-assist/SuggestionCard";

const base = {
  id: "s1", intent: "poster", entity: "Le Cid", title: "Le Cid",
  preview: { kind: "image" as const, imageUrl: "http://x/p.jpg" },
  triggerExcerpt: "…le spectacle Le Cid…", applyPayload: { title: "Le Cid", fileUrl: "http://x/p.jpg" },
  status: "pending" as const, confidence: 0.9, createdAt: 1,
};

describe("SuggestionCard", () => {
  it("renders the title and an image preview", () => {
    render(<SuggestionCard suggestion={base} onApply={() => {}} onDismiss={() => {}} />);
    expect(screen.getByText("Le Cid")).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAttribute("src", "http://x/p.jpg");
  });

  it("calls onApply with target 'pin' when the primary button is clicked", () => {
    const onApply = jest.fn();
    render(<SuggestionCard suggestion={base} onApply={onApply} onDismiss={() => {}} />);
    // mocked t() returns the key; poster's primary button label is "validate"
    fireEvent.click(screen.getByText("validate"));
    expect(onApply).toHaveBeenCalledWith(base, "pin");
  });

  it("shows an 'onAir' action for definition suggestions and calls onApply with 'on-air'", () => {
    const def = { ...base, intent: "definition", preview: { kind: "text" as const, text: "déf" }, applyPayload: { target: "pin", text: "déf" } };
    const onApply = jest.fn();
    render(<SuggestionCard suggestion={def} onApply={onApply} onDismiss={() => {}} />);
    fireEvent.click(screen.getByText("onAir")); // mocked t("onAir")
    expect(onApply).toHaveBeenCalledWith(def, "on-air");
  });
});
