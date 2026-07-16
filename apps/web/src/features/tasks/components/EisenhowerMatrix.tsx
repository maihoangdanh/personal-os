"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";
import { EISENHOWER_HIGH_THRESHOLD, QUADRANTS, groupByQuadrant } from "../lib/eisenhower";
import type { Task } from "../types/task.types";

interface EisenhowerMatrixProps {
  tasks: Task[];
  onSelect: (task: Task) => void;
}

export function EisenhowerMatrix({ tasks, onSelect }: EisenhowerMatrixProps) {
  const groups = groupByQuadrant(tasks);

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Phân loại theo ngưỡng suy luận: <b>Cao</b> khi impact/urgency ≥{" "}
        {EISENHOWER_HIGH_THRESHOLD} (thang 1–5). Task đã Done/Archived không hiển thị.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {QUADRANTS.map((q) => {
          const items = groups[q.key];
          return (
            <div
              key={q.key}
              className={cn("rounded-lg border p-4", q.accent)}
            >
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{q.title}</h3>
                  <p className="text-xs text-muted-foreground">{q.subtitle}</p>
                </div>
                <Badge variant="outline">{items.length}</Badge>
              </div>
              {items.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  Trống
                </p>
              ) : (
                <ul className="space-y-2">
                  {items.map((task) => (
                    <li key={task.id}>
                      <button
                        type="button"
                        onClick={() => onSelect(task)}
                        className="w-full rounded-md border border-border bg-card px-3 py-2 text-left text-sm shadow-sm transition-colors hover:bg-accent"
                      >
                        <div className="font-medium">{task.title}</div>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <span>
                            I{task.impact} · U{task.urgency}
                          </span>
                          <span>·</span>
                          <span>{formatDateTime(task.deadline)}</span>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
