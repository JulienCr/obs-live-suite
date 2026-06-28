/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ChatMessageInput } from "@/components/presenter/chat/ChatMessageInput";

/**
 * The platform selector lets the user route a sent message to Twitch, YouTube, or
 * both. The input must forward the *selected* target to onSend (previously every
 * message went to Twitch only).
 */
describe("ChatMessageInput platform selector", () => {
  it("forwards the selected target to onSend and clears on success", async () => {
    const onSend = jest.fn().mockResolvedValue(true);
    render(
      <ChatMessageInput onSend={onSend} sendTarget="youtube" onSendTargetChange={() => {}} />
    );

    const input = screen.getByPlaceholderText("Send a message...") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "bonjour" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => expect(onSend).toHaveBeenCalledWith("bonjour", "youtube"));
    await waitFor(() => expect(input.value).toBe(""));
  });

  it("defaults the target to 'both' when no sendTarget prop is given", async () => {
    const onSend = jest.fn().mockResolvedValue(true);
    render(<ChatMessageInput onSend={onSend} />);

    const input = screen.getByPlaceholderText("Send a message...") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "hi" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => expect(onSend).toHaveBeenCalledWith("hi", "both"));
  });
});
