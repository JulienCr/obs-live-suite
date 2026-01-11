"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  MessageSquare,
  Plus,
  Trash2,
  Pencil,
  Save,
  Loader2,
  X,
  Check,
  GripVertical,
} from "lucide-react";
import { apiGet, apiPut, isClientFetchError } from "@/lib/utils/ClientFetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ChatPredefinedMessage, CHAT_MESSAGES_CONFIG } from "@/lib/models/ChatMessages";

export function ChatMessagesSettings() {
  const t = useTranslations("settings.chatMessages");
  const tCommon = useTranslations("common");
  const { toast } = useToast();

  // State
  const [messages, setMessages] = useState<ChatPredefinedMessage[]>([]);
  const [originalMessages, setOriginalMessages] = useState<ChatPredefinedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newMessageText, setNewMessageText] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editMessage, setEditMessage] = useState("");

  const hasChanges = JSON.stringify(messages) !== JSON.stringify(originalMessages);

  // Load messages on mount
  useEffect(() => {
    loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const response = await apiGet<{ messages: ChatPredefinedMessage[] }>("/api/chat-messages/settings");
      const msgs = response.messages || [];
      setMessages(msgs);
      setOriginalMessages(msgs);
    } catch {
      toast({
        title: tCommon("error"),
        description: "Failed to load messages",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveChanges = async () => {
    try {
      setSaving(true);
      await apiPut("/api/chat-messages/settings", { messages });
      setOriginalMessages(messages);
      toast({
        title: tCommon("saved"),
        description: t("description"),
      });
    } catch (error) {
      toast({
        title: tCommon("error"),
        description: isClientFetchError(error) ? error.errorMessage : "Failed to save",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const addMessage = () => {
    if (newTitle.trim() && newMessageText.trim() && messages.length < CHAT_MESSAGES_CONFIG.MAX_MESSAGES) {
      setMessages([...messages, {
        id: crypto.randomUUID(),
        title: newTitle.trim(),
        message: newMessageText.trim()
      }]);
      setNewTitle("");
      setNewMessageText("");
    }
  };

  const deleteMessage = (index: number) => {
    setMessages(messages.filter((_, i) => i !== index));
  };

  const startEditing = (index: number) => {
    setEditingIndex(index);
    setEditTitle(messages[index].title);
    setEditMessage(messages[index].message);
  };

  const saveEdit = () => {
    if (editingIndex !== null && editTitle.trim() && editMessage.trim()) {
      const newMessages = [...messages];
      newMessages[editingIndex] = {
        ...messages[editingIndex],
        title: editTitle.trim(),
        message: editMessage.trim()
      };
      setMessages(newMessages);
    }
    setEditingIndex(null);
    setEditTitle("");
    setEditMessage("");
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditTitle("");
    setEditMessage("");
  };

  const moveMessage = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= messages.length) return;

    const newMessages = [...messages];
    [newMessages[index], newMessages[newIndex]] = [newMessages[newIndex], newMessages[index]];
    setMessages(newMessages);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {t("title")}
          </CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Messages list */}
          <div className="space-y-2">
            {messages.length === 0 && (
              <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-lg">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{t("empty")}</p>
                <p className="text-xs mt-1">{t("emptyHint")}</p>
              </div>
            )}

            {messages.map((msg, index) => (
              <div
                key={msg.id || index}
                className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg group"
              >
                {/* Drag handle placeholder */}
                <GripVertical className="h-4 w-4 mt-1 text-muted-foreground/50 cursor-grab flex-shrink-0" />

                {editingIndex === index ? (
                  // Editing state
                  <div className="flex-1 space-y-2">
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value.slice(0, CHAT_MESSAGES_CONFIG.MAX_TITLE_LENGTH))}
                      placeholder={t("titlePlaceholder")}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Escape") cancelEdit();
                      }}
                    />
                    <textarea
                      value={editMessage}
                      onChange={(e) => setEditMessage(e.target.value.slice(0, CHAT_MESSAGES_CONFIG.MAX_MESSAGE_LENGTH))}
                      placeholder={t("messagePlaceholder")}
                      className="w-full min-h-[80px] px-3 py-2 text-sm rounded-md border border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
                      onKeyDown={(e) => {
                        if (e.key === "Escape") cancelEdit();
                      }}
                    />
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={cancelEdit}>
                        <X className="h-4 w-4 mr-1" />
                        {tCommon("cancel")}
                      </Button>
                      <Button size="sm" onClick={saveEdit} disabled={!editTitle.trim() || !editMessage.trim()}>
                        <Check className="h-4 w-4 mr-1" />
                        {tCommon("save")}
                      </Button>
                    </div>
                  </div>
                ) : (
                  // Display state
                  <>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{msg.title}</div>
                      <div className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap break-words">
                        {msg.message}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => moveMessage(index, "up")}
                        disabled={index === 0}
                        className="h-8 w-8"
                      >
                        <span className="sr-only">Move up</span>
                        ↑
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => moveMessage(index, "down")}
                        disabled={index === messages.length - 1}
                        className="h-8 w-8"
                      >
                        <span className="sr-only">Move down</span>
                        ↓
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => startEditing(index)}
                        className="h-8 w-8"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteMessage(index)}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Add new message */}
          {messages.length < CHAT_MESSAGES_CONFIG.MAX_MESSAGES ? (
            <div className="space-y-3 p-4 border-2 border-dashed rounded-lg">
              <div className="text-sm font-medium">{t("addNewMessage")}</div>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value.slice(0, CHAT_MESSAGES_CONFIG.MAX_TITLE_LENGTH))}
                placeholder={t("titlePlaceholder")}
              />
              <textarea
                value={newMessageText}
                onChange={(e) => setNewMessageText(e.target.value.slice(0, CHAT_MESSAGES_CONFIG.MAX_MESSAGE_LENGTH))}
                placeholder={t("messagePlaceholder")}
                className="w-full min-h-[80px] px-3 py-2 text-sm rounded-md border border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
              />
              <div className="flex justify-end">
                <Button onClick={addMessage} disabled={!newTitle.trim() || !newMessageText.trim()}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("addMessage")}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center">
              {t("maxMessagesReached")}
            </p>
          )}

          {/* Helper text */}
          <p className="text-xs text-muted-foreground">{t("messagesHelp")}</p>
        </CardContent>
      </Card>

      {/* Save button */}
      <div className="flex justify-end">
        <Button onClick={saveChanges} disabled={!hasChanges || saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              {tCommon("saving")}
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              {tCommon("save")}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
