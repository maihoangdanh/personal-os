"use client";

import * as React from "react";
import { Bot, Plus, Send, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";
import { extractApiErrorMessage } from "@/lib/api-client";
import {
  useConversation,
  useConversations,
  useCreateConversation,
  useDeleteConversation,
  useSendMessage,
} from "../hooks/useAi";

export function AiChatView() {
  const { data: conversations, isLoading } = useConversations();
  const [selectedId, setSelectedId] = React.useState<string>("");
  const createMut = useCreateConversation();
  const deleteMut = useDeleteConversation();
  const [error, setError] = React.useState<string | null>(null);

  // Tự chọn conversation đầu tiên khi có.
  React.useEffect(() => {
    if (!selectedId && conversations && conversations.length > 0) {
      setSelectedId(conversations[0].id);
    }
  }, [conversations, selectedId]);

  async function newConversation() {
    setError(null);
    try {
      const c = await createMut.mutateAsync(undefined);
      setSelectedId(c.id);
    } catch (e) {
      setError(extractApiErrorMessage(e));
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[240px_1fr]">
      {/* Sidebar hội thoại */}
      <div className="space-y-2">
        <Button className="w-full" onClick={newConversation} disabled={createMut.isPending}>
          <Plus className="h-4 w-4" /> Hội thoại mới
        </Button>
        {isLoading && <div className="h-10 animate-pulse rounded bg-muted" />}
        {conversations?.length === 0 && (
          <p className="px-1 text-xs text-muted-foreground">Chưa có hội thoại nào.</p>
        )}
        <ul className="space-y-1">
          {conversations?.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => setSelectedId(c.id)}
                className={cn(
                  "flex w-full items-center justify-between gap-1 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                  selectedId === c.id ? "bg-primary/10 text-primary" : "hover:bg-accent",
                )}
              >
                <span className="truncate">{c.title || "Hội thoại mới"}</span>
                <Trash2
                  className="h-3.5 w-3.5 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteMut.mutate(c.id, {
                      onSuccess: () => {
                        if (selectedId === c.id) setSelectedId("");
                      },
                    });
                  }}
                />
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Thread */}
      <div className="rounded-lg border border-border">
        {error && (
          <p className="m-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        )}
        {selectedId ? (
          <ChatThread conversationId={selectedId} />
        ) : (
          <div className="flex h-[420px] items-center justify-center text-center text-sm text-muted-foreground">
            Tạo hoặc chọn một hội thoại để bắt đầu hỏi AI về dữ liệu của bạn.
          </div>
        )}
      </div>
    </div>
  );
}

function ChatThread({ conversationId }: { conversationId: string }) {
  const { data, isLoading } = useConversation(conversationId);
  const sendMut = useSendMessage(conversationId);
  const [input, setInput] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const bottomRef = React.useRef<HTMLDivElement>(null);

  const messages = React.useMemo(
    () => (data?.messages ?? []).filter((m) => m.role !== "SYSTEM"),
    [data],
  );

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, sendMut.isPending]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const content = input.trim();
    if (!content) return;
    setError(null);
    setInput("");
    try {
      await sendMut.mutateAsync(content);
    } catch (err) {
      setError(extractApiErrorMessage(err, "AI không phản hồi (router có thể bận, thử lại)"));
      setInput(content);
    }
  }

  return (
    <div className="flex h-[480px] flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {isLoading && <div className="h-16 animate-pulse rounded bg-muted" />}
        {!isLoading && messages.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Hỏi thử: &quot;Tháng này tôi tiêu bao nhiêu?&quot; hoặc &quot;Tôi còn task nào quan trọng?&quot;
          </p>
        )}
        {messages.map((m) => {
          const isUser = m.role === "USER";
          return (
            <div key={m.id} className={cn("flex gap-2", isUser ? "justify-end" : "justify-start")}>
              {!isUser && (
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Bot className="h-4 w-4" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[80%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm",
                  isUser ? "bg-primary text-primary-foreground" : "bg-muted",
                )}
              >
                {m.content}
                <div className={cn("mt-1 text-[10px] opacity-60")}>{formatDateTime(m.createdAt)}</div>
              </div>
              {isUser && (
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          );
        })}
        {sendMut.isPending && (
          <div className="flex gap-2">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Bot className="h-4 w-4" />
            </div>
            <div className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
              AI đang trả lời...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && <p className="px-4 pb-1 text-xs text-destructive">{error}</p>}

      <form onSubmit={handleSend} className="flex gap-2 border-t border-border p-3">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Nhập câu hỏi về task, tài chính, thói quen..."
          disabled={sendMut.isPending}
          maxLength={4000}
        />
        <Button type="submit" size="icon" disabled={sendMut.isPending || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
