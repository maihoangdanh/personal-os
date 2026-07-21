"use client";

import * as React from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { formatDate } from "@/lib/format";
import { extractApiErrorMessage } from "@/lib/api-client";
import {
  useCreateJournal,
  useDeleteJournal,
  useJournalByDate,
  useJournals,
  useUpdateJournal,
} from "../hooks/useJournal";
import type { Journal } from "../types/journal.types";
import { JournalEntryDialog } from "./JournalEntryDialog";

/** YYYY-MM-DD theo local. */
function todayStr(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const MOODS = ["Bình yên", "Hào hứng", "Bình thường", "Mệt"];

/** Màu badge theo mood (chỉ map các mood mockup định nghĩa; free-text khác → trung tính). */
function moodBadgeClass(mood: string): string {
  switch (mood) {
    case "Bình yên":
      return "text-accent-2 bg-accent-2/10";
    case "Hào hứng":
      return "text-warning bg-warning/10";
    case "Mệt":
      return "text-destructive bg-destructive/10";
    default:
      return "text-muted-foreground bg-secondary";
  }
}

export function JournalView() {
  const today = React.useMemo(() => todayStr(), []);
  const todayQuery = useJournalByDate(today);
  const { data: journals, isLoading, isError, error } = useJournals();
  const deleteMut = useDeleteJournal();
  const createMut = useCreateJournal();
  const updateMut = useUpdateJournal();

  const todayEntry = todayQuery.data; // null nếu hôm nay chưa viết

  // Composer "hôm nay" — reuse hook create/update có sẵn (không đổi API/hook).
  const [content, setContent] = React.useState("");
  const [mood, setMood] = React.useState("");
  const [composerError, setComposerError] = React.useState<string | null>(null);

  // Đồng bộ composer với entry hôm nay khi tải xong / thay đổi.
  React.useEffect(() => {
    setContent(todayEntry?.content ?? "");
    setMood(todayEntry?.mood ?? "");
  }, [todayEntry?.id, todayEntry?.content, todayEntry?.mood]);

  const [dialog, setDialog] = React.useState(false);
  const [editing, setEditing] = React.useState<Journal | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);

  const saving = createMut.isPending || updateMut.isPending;

  async function saveToday() {
    setComposerError(null);
    if (!content.trim()) {
      setComposerError("Nội dung không được để trống.");
      return;
    }
    try {
      if (todayEntry) {
        await updateMut.mutateAsync({
          id: todayEntry.id,
          payload: { content: content.trim(), ...(mood.trim() ? { mood: mood.trim() } : {}) },
        });
      } else {
        await createMut.mutateAsync({
          date: today,
          content: content.trim(),
          ...(mood.trim() ? { mood: mood.trim() } : {}),
        });
      }
    } catch (e) {
      setComposerError(extractApiErrorMessage(e));
    }
  }

  function openEdit(j: Journal) {
    setEditing(j);
    setDialog(true);
  }

  return (
    <div className="max-w-[760px] space-y-7">
      <PageHeader
        eyebrow="NHẬT KÝ"
        title="Journal"
        description="Vài dòng mỗi tối — cho một cái đầu nhẹ hơn."
      />

      {/* Composer hôm nay */}
      <div className="rounded-lg border border-border bg-card p-6 shadow-card">
        <p className="font-serif text-[17px] italic text-muted-foreground">
          &ldquo;Hôm nay điều gì khiến bạn thấy đáng nhớ nhất?&rdquo;
        </p>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={`Viết cho ngày ${formatDate(today)}…`}
          className="mt-3.5 min-h-[64px] w-full resize-none border-none bg-transparent text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground"
        />
        {composerError && (
          <p className="mb-2 text-sm text-destructive">{composerError}</p>
        )}
        <div className="mt-2 flex items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {MOODS.map((m) => {
              const active = mood === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMood(active ? "" : m)}
                  className={
                    "rounded-full border px-3 py-1.5 text-[11.5px] font-semibold transition-colors " +
                    (active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-secondary")
                  }
                >
                  {m}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={saveToday}
            disabled={saving || !content.trim()}
            className="shrink-0 rounded-md bg-foreground px-4 py-2 text-[12.5px] font-semibold text-background transition-opacity hover:opacity-85 disabled:opacity-50"
          >
            {saving ? "Đang lưu…" : "Lưu entry"}
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-4">
        {actionError && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{actionError}</p>
        )}
        {isLoading && <div className="h-20 animate-pulse rounded-lg bg-muted" />}
        {isError && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {extractApiErrorMessage(error)}
          </p>
        )}
        {!isLoading && !isError && journals && journals.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            Chưa có nhật ký nào.
          </div>
        )}
        {journals?.map((j) => (
          <div
            key={j.id}
            className="group rounded-lg border border-border bg-card p-6 shadow-card"
          >
            <div className="mb-2.5 flex items-baseline justify-between gap-2">
              <span className="font-serif text-lg font-semibold">{formatDate(j.date)}</span>
              <div className="flex items-center gap-2">
                {j.mood && (
                  <span
                    className={
                      "rounded-full px-2.5 py-1 text-[11px] font-semibold " + moodBadgeClass(j.mood)
                    }
                  >
                    {j.mood}
                  </span>
                )}
                <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button variant="ghost" size="icon" title="Sửa" onClick={() => openEdit(j)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Xoá"
                    disabled={deleteMut.isPending}
                    onClick={async () => {
                      setActionError(null);
                      try {
                        await deleteMut.mutateAsync(j.id);
                      } catch (e) {
                        setActionError(extractApiErrorMessage(e));
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
            <p className="whitespace-pre-wrap text-[13.5px] leading-[1.7] text-foreground">{j.content}</p>
          </div>
        ))}
      </div>

      <JournalEntryDialog open={dialog} onOpenChange={setDialog} journal={editing} date={today} />
    </div>
  );
}
