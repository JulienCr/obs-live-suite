"use client";

import { type IDockviewPanelProps } from "dockview-react";
import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Send,
  Plus,
  Trash2,
  Pencil,
  MessageSquare,
  Wifi,
  WifiOff,
  X,
  Check,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { apiGet } from "@/lib/utils/ClientFetch";
import { getBackendUrl } from "@/lib/utils/websocket";
import { BasePanelWrapper, type PanelConfig } from "@/components/panels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type { StreamerbotConnectionStatus } from "@/lib/models/StreamerbotChat";
import type { ChatPredefinedMessage } from "@/lib/models/ChatMessages";
import { CHAT_MESSAGES_CONFIG } from "@/lib/models/ChatMessages";

const config: PanelConfig = { id: "chatMessages", context: "dashboard" };

interface StreamerbotStatusResponse {
  status: StreamerbotConnectionStatus;
}

interface MessageEditFormProps {
  title: string;
  message: string;
  onTitleChange: (value: string) => void;
  onMessageChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

function MessageEditForm({ title, message, onTitleChange, onMessageChange, onSave, onCancel }: MessageEditFormProps) {
  return (
    <div className="flex-1 flex flex-col gap-1">
      <div className="flex gap-1">
        <Input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Title"
          className="h-8 text-sm"
        />
        <Button size="icon" variant="ghost" onClick={onSave} className="h-8 w-8">
          <Check className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={onCancel} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <Input
        value={message}
        onChange={(e) => onMessageChange(e.target.value)}
        placeholder="Message"
        className="h-8 text-sm text-muted-foreground"
        onKeyDown={(e) => e.key === "Enter" && onSave()}
      />
    </div>
  );
}

interface MessageEditButtonProps {
  item: ChatPredefinedMessage;
  onEdit: () => void;
  onDelete: () => void;
}

function MessageEditButton({ item, onEdit, onDelete }: MessageEditButtonProps) {
  return (
    <>
      <Button
        variant="outline"
        className="flex-1 justify-start h-auto py-1.5 px-2 text-sm"
        onClick={onEdit}
      >
        <Pencil className="h-3 w-3 mr-2 flex-shrink-0" />
        <div className="flex flex-col items-start overflow-hidden">
          <span className="truncate w-full text-left">{item.title}</span>
          <span className="truncate w-full text-left text-xs text-muted-foreground">
            {item.message}
          </span>
        </div>
      </Button>
      <Button
        size="icon"
        variant="ghost"
        onClick={onDelete}
        className="h-8 w-8 text-destructive hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </>
  );
}

interface MessageSendButtonProps {
  item: ChatPredefinedMessage;
  connected: boolean;
  isSending: boolean;
  disabled: boolean;
  onSend: () => void;
}

function MessageSendButton({ item, connected, isSending, disabled, onSend }: MessageSendButtonProps) {
  return (
    <Button
      variant="secondary"
      className={cn("flex-1 justify-between h-auto py-2 px-3 text-sm", !connected && "opacity-50")}
      onClick={onSend}
      disabled={disabled}
    >
      <span className="truncate text-left">{item.title}</span>
      {isSending ? (
        <Loader2 className="h-4 w-4 animate-spin ml-2 flex-shrink-0" />
      ) : (
        <Send className="h-4 w-4 ml-2 flex-shrink-0" />
      )}
    </Button>
  );
}

/**
 * ChatMessagesPanel - Quick chat messages panel for dashboard
 *
 * Features:
 * - Displays a list of predefined messages as clickable buttons
 * - Shows Streamerbot connection status (green/red indicator)
 * - Edit mode to add/edit/delete messages inline
 * - Sends messages via POST /api/streamerbot-chat/send
 * - Loads/saves messages via GET/PUT /api/chat-messages/settings
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ChatMessagesPanel(_props: IDockviewPanelProps) {
  const t = useTranslations("dashboard.chatMessagesPanel");
  const { toast } = useToast();

  // State
  const [messages, setMessages] = useState<ChatPredefinedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [sendingIndex, setSendingIndex] = useState<number | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newMessageText, setNewMessageText] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editMessage, setEditMessage] = useState("");

  const backendUrl = getBackendUrl();

  // Load messages on mount
  useEffect(() => {
    loadMessages();
    checkConnection();
    // Poll connection status every 10 seconds
    const interval = setInterval(checkConnection, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMessages = async () => {
    try {
      const response = await apiGet<{ messages: ChatPredefinedMessage[] }>("/api/chat-messages/settings");
      setMessages(response.messages || []);
    } catch (error) {
      console.error("Failed to load messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkConnection = useCallback(async () => {
    try {
      const response = await fetch(`${backendUrl}/api/streamerbot-chat/status`);
      if (response.ok) {
        const data: StreamerbotStatusResponse = await response.json();
        setConnected(data.status === "connected");
      } else {
        setConnected(false);
      }
    } catch {
      setConnected(false);
    }
  }, [backendUrl]);

  const saveMessages = async (newMessages: ChatPredefinedMessage[]) => {
    try {
      const response = await fetch("/api/chat-messages/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });
      if (response.ok) {
        setMessages(newMessages);
      } else {
        throw new Error("Failed to save");
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to save messages",
        variant: "destructive",
      });
    }
  };

  const sendMessage = async (message: string, index: number) => {
    if (!connected) {
      toast({
        title: t("notConnected"),
        description: t("connectFirst"),
        variant: "destructive",
      });
      return;
    }

    setSendingIndex(index);
    try {
      const response = await fetch(`${backendUrl}/api/streamerbot-chat/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: "twitch",
          message,
        }),
      });

      if (response.ok) {
        toast({
          title: t("sent"),
          description: message.substring(0, 50) + (message.length > 50 ? "..." : ""),
        });
      } else {
        const data = await response.json();
        throw new Error(data.error || "Failed to send");
      }
    } catch (error) {
      toast({
        title: t("sendFailed"),
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSendingIndex(null);
    }
  };

  const addMessage = () => {
    if (newTitle.trim() && newMessageText.trim() && messages.length < CHAT_MESSAGES_CONFIG.MAX_MESSAGES) {
      saveMessages([...messages, { title: newTitle.trim(), message: newMessageText.trim() }]);
      setNewTitle("");
      setNewMessageText("");
    }
  };

  const deleteMessage = (index: number) => {
    const newMessages = messages.filter((_, i) => i !== index);
    saveMessages(newMessages);
  };

  const startEditing = (index: number) => {
    setEditingIndex(index);
    setEditTitle(messages[index].title);
    setEditMessage(messages[index].message);
  };

  const saveEdit = () => {
    if (editingIndex !== null && editTitle.trim() && editMessage.trim()) {
      const newMessages = [...messages];
      newMessages[editingIndex] = { title: editTitle.trim(), message: editMessage.trim() };
      saveMessages(newMessages);
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

  function renderMessageItem(item: ChatPredefinedMessage, index: number) {
    if (!editMode) {
      return (
        <MessageSendButton
          item={item}
          connected={connected}
          isSending={sendingIndex === index}
          disabled={sendingIndex !== null || !connected}
          onSend={() => sendMessage(item.message, index)}
        />
      );
    }

    if (editingIndex === index) {
      return (
        <MessageEditForm
          title={editTitle}
          message={editMessage}
          onTitleChange={setEditTitle}
          onMessageChange={setEditMessage}
          onSave={saveEdit}
          onCancel={cancelEdit}
        />
      );
    }

    return (
      <MessageEditButton
        item={item}
        onEdit={() => startEditing(index)}
        onDelete={() => deleteMessage(index)}
      />
    );
  }

  return (
    <BasePanelWrapper config={config}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-purple-500" />
          <span className="font-semibold text-sm">Chat Messages</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Connection status */}
          <div className="flex items-center gap-1 text-xs">
            {connected ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
          </div>
          {/* Edit mode toggle */}
          <Button
            variant={editMode ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setEditMode(!editMode)}
            className="h-7 text-xs"
          >
            {editMode ? t("doneEditing") : t("editMode")}
          </Button>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!loading && messages.length === 0 && !editMode && (
        <div className="text-center py-6 text-muted-foreground">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">{t("noMessages")}</p>
          <p className="text-xs mt-1">{t("addFirst")}</p>
        </div>
      )}

      {/* Messages list */}
      {!loading && (
        <div className="space-y-2">
          {messages.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              {renderMessageItem(item, index)}
            </div>
          ))}

          {/* Add new message input (edit mode only) */}
          {editMode && messages.length < CHAT_MESSAGES_CONFIG.MAX_MESSAGES && (
            <div className="flex flex-col gap-1 mt-3">
              <div className="flex gap-1">
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Title"
                  className="h-8 text-sm"
                />
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={addMessage}
                  disabled={!newTitle.trim() || !newMessageText.trim()}
                  className="h-8 w-8"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <Input
                value={newMessageText}
                onChange={(e) => setNewMessageText(e.target.value)}
                placeholder="Message to send..."
                className="h-8 text-sm text-muted-foreground"
                onKeyDown={(e) => e.key === "Enter" && addMessage()}
              />
            </div>
          )}
        </div>
      )}

      {/* Not connected warning */}
      {!connected && !editMode && messages.length > 0 && (
        <div className="mt-3 flex items-center gap-2 p-2 bg-destructive/10 text-destructive rounded text-xs">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{t("connectFirst")}</span>
        </div>
      )}
    </BasePanelWrapper>
  );
}
