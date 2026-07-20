"use client";

import * as React from "react";
import { BookOpen, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { extractApiErrorMessage } from "@/lib/api-client";
import { useDeleteJournal, useJournalByDate, useJournals } from "../hooks/useJournal";
import type { Journal } from "../types/journal.types";
import { JournalEntryDialog } from "./JournalEntryDialog";

/** YYYY-MM-DD theo local. */
function todayStr(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function JournalView() {
  const today = React.useMemo(() => todayStr(), []);
  const todayQuery = useJournalByDate(today);
  const { data: journals, isLoading, isError, error } = useJournals();
  const deleteMut = useDeleteJournal();

  const [dialog, setDialog] = React.useState(false);
  const [editing, setEditing] = React.useState<Journal | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);

  const todayEntry = todayQuery.data; // null nếu hôm nay chưa viết

  function openToday() {
    // Đã có entry hôm nay → mở form SỬA; chưa có → form TẠO (date = hôm nay).
    setEditing(todayEntry ?? null);
    setDialog(true);
  }
  function openEdit(j: Journal) {
    setEditing(j);
    setDialog(true);
  }

  return (
    <div className="space-y-6">
      {/* Hôm nay */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" /> Hôm nay · {formatDate(today)}
          </CardTitle>
          <Button size="sm" onClick={openToday} disabled={todayQuery.isLoading}>
            {todayEntry ? (
              <>
                <Pencil className="h-4 w-4" /> Sửa
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" /> Viết nhật ký
              </>
            )}
          </Button>
        </CardHeader>
        <CardContent>
          {todayQuery.isLoading ? (
            <div className="h-12 animate-pulse rounded bg-muted" />
          ) : todayEntry ? (
            <div>
              {todayEntry.mood && <Badge variant="secondary">{todayEntry.mood}</Badge>}
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{todayEntry.content}</p>
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Bạn chưa viết nhật ký hôm nay. Ghi lại vài dòng nhé!
            </p>
          )}
        </CardContent>
      </Card>

      {/* Timeline */}
      <div>
        <h3 className="mb-2 text-sm font-medium text-muted-foreground">Dòng thời gian</h3>
        {actionError && (
          <p className="mb-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{actionError}</p>
        )}
        {isLoading && <div className="h-20 animate-pulse rounded-lg bg-muted" />}
        {isError && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {extractApiErrorMessage(error)}
          </p>
        )}
        {!isLoading && !isError && journals && journals.length === 0 && (
          <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
            Chưa có nhật ký nào.
          </div>
        )}
        <div className="space-y-3">
          {journals?.map((j) => (
            <Card key={j.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{formatDate(j.date)}</span>
                    {j.mood && <Badge variant="secondary">{j.mood}</Badge>}
                  </div>
                  <div className="flex items-center gap-1">
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
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{j.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <JournalEntryDialog open={dialog} onOpenChange={setDialog} journal={editing} date={today} />
    </div>
  );
}
