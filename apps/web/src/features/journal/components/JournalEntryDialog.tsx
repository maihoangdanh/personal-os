"use client";

import * as React from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { extractApiErrorMessage } from "@/lib/api-client";
import { useCreateJournal, useUpdateJournal } from "../hooks/useJournal";
import type { Journal } from "../types/journal.types";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** entry đang sửa (bỏ trống = tạo mới) */
  journal?: Journal | null;
  /** ngày YYYY-MM-DD khi tạo mới (mặc định hôm nay) */
  date: string;
}

const MOOD_SUGGESTIONS = ["great", "good", "neutral", "bad", "tired", "productive"];

export function JournalEntryDialog({ open, onOpenChange, journal, date }: Props) {
  const isEdit = !!journal;
  const createMut = useCreateJournal();
  const updateMut = useUpdateJournal();
  const [content, setContent] = React.useState("");
  const [mood, setMood] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    setContent(journal?.content ?? "");
    setMood(journal?.mood ?? "");
  }, [open, journal]);

  const submitting = createMut.isPending || updateMut.isPending;
  const targetDate = journal?.date ?? date;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!content.trim()) {
      setError("Nội dung không được để trống.");
      return;
    }
    try {
      if (isEdit && journal) {
        await updateMut.mutateAsync({
          id: journal.id,
          payload: { content: content.trim(), ...(mood.trim() ? { mood: mood.trim() } : {}) },
        });
      } else {
        await createMut.mutateAsync({
          date: targetDate,
          content: content.trim(),
          ...(mood.trim() ? { mood: mood.trim() } : {}),
        });
      }
      onOpenChange(false);
    } catch (err) {
      setError(extractApiErrorMessage(err));
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? `Sửa nhật ký ${targetDate}` : `Viết nhật ký ${targetDate}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="j-content">Nội dung *</Label>
          <Textarea
            id="j-content"
            required
            rows={6}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Hôm nay của bạn thế nào?"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="j-mood">Tâm trạng (tự do)</Label>
          <Input
            id="j-mood"
            list="journal-moods"
            maxLength={50}
            value={mood}
            onChange={(e) => setMood(e.target.value)}
            placeholder="VD: good, mệt, hứng khởi..."
          />
          <datalist id="journal-moods">
            {MOOD_SUGGESTIONS.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </div>
        {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Huỷ
          </Button>
          <Button type="submit" disabled={submitting || !content.trim()}>
            {submitting ? "Đang lưu..." : isEdit ? "Lưu" : "Tạo"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
