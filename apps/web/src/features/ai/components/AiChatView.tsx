"use client";

import * as React from "react";
import { Send, Trash2 } from "lucide-react";
import { extractApiErrorMessage } from "@/lib/api-client";
import {
  useConversation,
  useConversations,
  useCreateConversation,
  useDeleteConversation,
  useSendMessage,
} from "../hooks/useAi";

const CHIPS = [
  "Tổng kết tuần này",
  "Task nào nên làm trước?",
  "Dự báo chi tiêu tháng 8",
];

/** "HH:mm · DD/MM" từ ISO. */
function fmtTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())} · ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

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
    <div className="grid grid-cols-1 gap-4 md:h-[560px] md:grid-cols-[220px_1fr]">
      {/* Sidebar hội thoại */}
      <div className="flex flex-col gap-2.5">
        <button
          type="button"
          onClick={newConversation}
          disabled={createMut.isPending}
          className="rounded-[11px] bg-primary px-3.5 py-2.5 text-center text-[13px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          + Hội thoại mới
        </button>
        {isLoading && <div className="h-10 animate-pulse rounded bg-muted" />}
        {conversations?.length === 0 && (
          <p className="px-1 text-xs text-muted-foreground">Chưa có hội thoại nào.</p>
        )}
        <div className="flex flex-col gap-2 overflow-y-auto">
          {conversations?.map((c) => {
            const active = selectedId === c.id;
            return (
              <div
                key={c.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedId(c.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedId(c.id);
                  }
                }}
                className={
                  "group cursor-pointer rounded-[11px] border px-3.5 py-2.5 transition-colors " +
                  (active
                    ? "border-primary bg-card"
                    : "border-border hover:bg-secondary")
                }
              >
                <div className="flex items-start justify-between gap-1.5">
                  <div className="truncate text-[12.5px] font-semibold">
                    {c.title || "Hội thoại mới"}
                  </div>
                  <Trash2
                    className="mt-0.5 hidden h-3.5 w-3.5 shrink-0 cursor-pointer text-muted-foreground hover:text-destructive group-hover:block"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteMut.mutate(c.id, {
                        onSuccess: () => {
                          if (selectedId === c.id) setSelectedId("");
                        },
                      });
                    }}
                  />
                </div>
                <div className="mt-0.5 text-[10.5px] text-muted-foreground">{fmtTime(c.updatedAt)}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Thread */}
      <div className="flex flex-col overflow-hidden rounded-[18px] border border-border bg-card shadow-card">
        {error && (
          <p className="m-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        )}
        {selectedId ? (
          <ChatThread conversationId={selectedId} />
        ) : (
          <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-muted-foreground">
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
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 space-y-3.5 overflow-y-auto p-6">
        {isLoading && <div className="h-16 animate-pulse rounded bg-muted" />}
        {!isLoading && messages.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Hỏi thử: &quot;Tháng này tôi tiêu bao nhiêu?&quot; hoặc &quot;Tôi còn task nào quan trọng?&quot;
          </p>
        )}
        {messages.map((m) => {
          const isUser = m.role === "USER";
          return (
            <div key={m.id} className={"flex flex-col " + (isUser ? "items-end" : "items-start")}>
              <div
                className={
                  "max-w-[78%] whitespace-pre-wrap px-4 py-3 text-[13.5px] leading-relaxed " +
                  (isUser
                    ? "rounded-[14px_4px_14px_14px] bg-primary text-primary-foreground"
                    : "rounded-[4px_14px_14px_14px] bg-secondary text-foreground")
                }
              >
                {m.content}
              </div>
              <div className="mt-1.5 font-mono text-[9.5px] text-muted-foreground">
                {fmtTime(m.createdAt)}
              </div>
            </div>
          );
        })}
        {sendMut.isPending && (
          <div className="flex flex-col items-start">
            <div className="rounded-[4px_14px_14px_14px] bg-secondary px-4 py-3 text-[13.5px] text-muted-foreground">
              AI đang trả lời...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && <p className="px-6 pb-1 text-xs text-destructive">{error}</p>}

      <div className="border-t border-border p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          {CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => setInput(chip)}
              disabled={sendMut.isPending}
              className="rounded-full border border-accent-2 px-3 py-1.5 text-[11.5px] font-medium text-accent-2 transition-colors hover:bg-accent-2/[0.08] disabled:opacity-50"
            >
              {chip}
            </button>
          ))}
        </div>
        <form onSubmit={handleSend} className="flex gap-2.5">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Hỏi về task, tài chính, thói quen…"
            disabled={sendMut.isPending}
            maxLength={4000}
            className="flex-1 rounded-[11px] border border-border bg-secondary px-4 py-2.5 text-[13px] text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            disabled={sendMut.isPending || !input.trim()}
            className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[11px] bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
