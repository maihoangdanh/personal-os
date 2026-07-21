"use client";

import * as React from "react";
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { extractApiErrorMessage } from "@/lib/api-client";
import {
  useDeleteGoal,
  useDeleteKpi,
  useDeleteVision,
  useGoals,
  useKpis,
  useVisions,
} from "../hooks/useGoals";
import type { Goal, GoalStatus, Kpi, Vision } from "../types/goals.types";
import { VisionFormDialog } from "./VisionFormDialog";
import { GoalFormDialog } from "./GoalFormDialog";
import { KpiFormDialog } from "./KpiFormDialog";

/** Màu badge theo status (dùng enum thật ACTIVE/ACHIEVED/MISSED/ARCHIVED). */
function goalStatusClass(status: GoalStatus): string {
  switch (status) {
    case "ACTIVE":
      return "text-success bg-success/[0.12]";
    case "ACHIEVED":
      return "text-accent-2 bg-accent-2/[0.12]";
    case "MISSED":
      return "text-destructive bg-destructive/[0.12]";
    default: // ARCHIVED
      return "text-muted-foreground bg-secondary";
  }
}

export function GoalTreeView() {
  const { data: visions, isLoading, isError, error } = useVisions();
  const [visionDialog, setVisionDialog] = React.useState(false);
  const [editingVision, setEditingVision] = React.useState<Vision | null>(null);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="TẦM NHÌN → MỤC TIÊU → KPI"
        title="Goals"
        description="Tiến độ được tính tự động từ KPI."
        actions={
          <Button
            onClick={() => {
              setEditingVision(null);
              setVisionDialog(true);
            }}
          >
            <Plus className="h-4 w-4" /> Tạo Vision
          </Button>
        }
      />

      {isLoading && <div className="h-40 animate-pulse rounded-lg bg-muted" />}
      {isError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {extractApiErrorMessage(error)}
        </p>
      )}
      {!isLoading && !isError && visions && visions.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Chưa có Vision nào. Bắt đầu bằng một tầm nhìn dài hạn.
        </div>
      )}

      <div className="space-y-5">
        {visions?.map((vision) => (
          <VisionCard
            key={vision.id}
            vision={vision}
            onEdit={(v) => {
              setEditingVision(v);
              setVisionDialog(true);
            }}
          />
        ))}
      </div>

      <VisionFormDialog open={visionDialog} onOpenChange={setVisionDialog} vision={editingVision} />
    </div>
  );
}

function VisionCard({ vision, onEdit }: { vision: Vision; onEdit: (v: Vision) => void }) {
  const { data: goals } = useGoals({ visionId: vision.id });
  const deleteMut = useDeleteVision();
  const [goalDialog, setGoalDialog] = React.useState(false);
  const [editingGoal, setEditingGoal] = React.useState<Goal | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  function openCreateGoal() {
    setEditingGoal(null);
    setGoalDialog(true);
  }

  return (
    <div className="group/vision rounded-[18px] border border-border bg-card p-6 shadow-card">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h2 className="font-serif text-xl font-semibold italic">{vision.title}</h2>
          {vision.targetYear != null && (
            <span className="rounded-full border border-primary px-2.5 py-0.5 font-mono text-[10.5px] text-primary">
              {vision.targetYear}
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover/vision:opacity-100">
          <Button variant="ghost" size="icon" title="Sửa Vision" onClick={() => onEdit(vision)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Xoá Vision"
            disabled={deleteMut.isPending}
            onClick={async () => {
              setErr(null);
              try {
                await deleteMut.mutateAsync(vision.id);
              } catch (e) {
                setErr(extractApiErrorMessage(e));
              }
            }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      {err && (
        <p className="mb-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</p>
      )}

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {goals?.map((goal) => (
          <GoalCard
            key={goal.id}
            goal={goal}
            onEdit={(g) => {
              setEditingGoal(g);
              setGoalDialog(true);
            }}
          />
        ))}
        <button
          type="button"
          onClick={openCreateGoal}
          className="flex min-h-[120px] items-center justify-center gap-1.5 rounded-[13px] border border-dashed border-border text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary"
        >
          <Plus className="h-4 w-4" /> Thêm Goal
        </button>
      </div>

      <GoalFormDialog
        open={goalDialog}
        onOpenChange={setGoalDialog}
        visionId={vision.id}
        goal={editingGoal}
      />
    </div>
  );
}

function GoalCard({ goal, onEdit }: { goal: Goal; onEdit: (g: Goal) => void }) {
  const [showKpis, setShowKpis] = React.useState(false);
  const deleteMut = useDeleteGoal();
  const [err, setErr] = React.useState<string | null>(null);

  const metric =
    goal.currentValue + (goal.targetValue != null ? ` / ${goal.targetValue}` : "");

  return (
    <div className="group/goal rounded-[13px] bg-secondary p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="text-[13px] font-semibold leading-snug">{goal.title}</div>
        <span
          className={
            "shrink-0 rounded-full px-2 py-1 text-[9.5px] font-bold tracking-[0.08em] " +
            goalStatusClass(goal.status)
          }
        >
          {goal.status}
        </span>
      </div>

      <div className="mb-1 mt-3 font-serif text-2xl font-bold">{goal.progress}%</div>
      <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-border">
        <div className="h-full rounded-full bg-accent-2" style={{ width: `${goal.progress}%` }} />
      </div>
      <div className="font-mono text-[10.5px] text-muted-foreground">{metric}</div>

      {err && <p className="mt-2 text-xs text-destructive">{err}</p>}

      <div className="mt-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setShowKpis((o) => !o)}
          className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
        >
          {showKpis ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          KPI
        </button>
        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover/goal:opacity-100">
          <Button variant="ghost" size="icon" title="Sửa Goal" onClick={() => onEdit(goal)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Xoá Goal"
            disabled={deleteMut.isPending}
            onClick={async () => {
              setErr(null);
              try {
                await deleteMut.mutateAsync(goal.id);
              } catch (e) {
                setErr(extractApiErrorMessage(e));
              }
            }}
          >
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      </div>

      {showKpis && <KpiList goalId={goal.id} />}
    </div>
  );
}

function KpiList({ goalId }: { goalId: string }) {
  const { data: kpis, isLoading } = useKpis(goalId);
  const deleteMut = useDeleteKpi();
  const [kpiDialog, setKpiDialog] = React.useState(false);
  const [editingKpi, setEditingKpi] = React.useState<Kpi | null>(null);

  return (
    <div className="mt-3 space-y-2 border-l-2 border-border pl-3">
      {isLoading && <div className="h-8 animate-pulse rounded bg-muted" />}
      {kpis && kpis.length === 0 && <p className="text-xs text-muted-foreground">Chưa có KPI.</p>}
      {kpis?.map((kpi) => (
        <div key={kpi.id} className="flex items-center justify-between gap-2 text-sm">
          <span>
            {kpi.name}
            <span className="ml-2 font-mono text-xs text-muted-foreground">
              {kpi.currentValue}
              {kpi.targetValue != null ? ` / ${kpi.targetValue}` : ""} {kpi.unit ?? ""}
            </span>
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              title="Sửa KPI"
              onClick={() => {
                setEditingKpi(kpi);
                setKpiDialog(true);
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              title="Xoá KPI"
              disabled={deleteMut.isPending}
              onClick={() => deleteMut.mutate(kpi.id)}
            >
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        </div>
      ))}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setEditingKpi(null);
          setKpiDialog(true);
        }}
      >
        <Plus className="h-3.5 w-3.5" /> Thêm KPI
      </Button>
      <KpiFormDialog open={kpiDialog} onOpenChange={setKpiDialog} goalId={goalId} kpi={editingKpi} />
    </div>
  );
}
