"use client";

import * as React from "react";
import {
  ChevronDown,
  ChevronRight,
  Pencil,
  Plus,
  Target,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { extractApiErrorMessage } from "@/lib/api-client";
import {
  useDeleteGoal,
  useDeleteKpi,
  useDeleteVision,
  useGoals,
  useKpis,
  useVisions,
} from "../hooks/useGoals";
import type { Goal, Kpi, Vision } from "../types/goals.types";
import { VisionFormDialog } from "./VisionFormDialog";
import { GoalFormDialog } from "./GoalFormDialog";
import { KpiFormDialog } from "./KpiFormDialog";

export function GoalTreeView() {
  const { data: visions, isLoading, isError, error } = useVisions();
  const [visionDialog, setVisionDialog] = React.useState(false);
  const [editingVision, setEditingVision] = React.useState<Vision | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEditingVision(null);
            setVisionDialog(true);
          }}
        >
          <Plus className="h-4 w-4" /> Tạo Vision
        </Button>
      </div>

      {isLoading && <div className="h-24 animate-pulse rounded-lg bg-muted" />}
      {isError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {extractApiErrorMessage(error)}
        </p>
      )}
      {!isLoading && !isError && visions && visions.length === 0 && (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          Chưa có Vision nào. Bắt đầu bằng một tầm nhìn dài hạn.
        </div>
      )}

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

      <VisionFormDialog open={visionDialog} onOpenChange={setVisionDialog} vision={editingVision} />
    </div>
  );
}

function VisionCard({ vision, onEdit }: { vision: Vision; onEdit: (v: Vision) => void }) {
  const [open, setOpen] = React.useState(true);
  const { data: goals } = useGoals(open ? { visionId: vision.id } : undefined);
  const deleteMut = useDeleteVision();
  const [goalDialog, setGoalDialog] = React.useState(false);
  const [editingGoal, setEditingGoal] = React.useState<Goal | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <button
          type="button"
          className="flex items-center gap-2 text-left"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <Target className="h-4 w-4 text-primary" />
          <span className="font-semibold">{vision.title}</span>
          {vision.targetYear && <Badge variant="secondary">{vision.targetYear}</Badge>}
        </button>
        <div className="flex items-center gap-1">
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
      </CardHeader>
      {open && (
        <CardContent className="space-y-2">
          {err && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</p>
          )}
          {goals && goals.length === 0 && (
            <p className="py-2 text-sm text-muted-foreground">Chưa có Goal trong Vision này.</p>
          )}
          {goals?.map((goal) => (
            <GoalItem
              key={goal.id}
              goal={goal}
              onEdit={(g) => {
                setEditingGoal(g);
                setGoalDialog(true);
              }}
            />
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditingGoal(null);
              setGoalDialog(true);
            }}
          >
            <Plus className="h-4 w-4" /> Thêm Goal
          </Button>
          <GoalFormDialog
            open={goalDialog}
            onOpenChange={setGoalDialog}
            visionId={vision.id}
            goal={editingGoal}
          />
        </CardContent>
      )}
    </Card>
  );
}

function GoalItem({ goal, onEdit }: { goal: Goal; onEdit: (g: Goal) => void }) {
  const [open, setOpen] = React.useState(false);
  const deleteMut = useDeleteGoal();
  const [err, setErr] = React.useState<string | null>(null);

  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className="flex flex-1 items-center gap-2 text-left"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <span className="font-medium">{goal.title}</span>
          <Badge variant={goal.status === "ACHIEVED" ? "success" : "outline"}>{goal.status}</Badge>
        </button>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" title="Sửa Goal" onClick={() => onEdit(goal)}>
            <Pencil className="h-4 w-4" />
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
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <Progress value={goal.progress} className="flex-1" />
        <span className="w-28 shrink-0 text-right text-xs text-muted-foreground">
          {goal.currentValue}
          {goal.targetValue != null ? ` / ${goal.targetValue}` : ""} · {goal.progress}%
        </span>
      </div>
      {err && <p className="mt-2 text-xs text-destructive">{err}</p>}
      {open && <KpiList goalId={goal.id} />}
    </div>
  );
}

function KpiList({ goalId }: { goalId: string }) {
  const { data: kpis, isLoading } = useKpis(goalId);
  const deleteMut = useDeleteKpi();
  const [kpiDialog, setKpiDialog] = React.useState(false);
  const [editingKpi, setEditingKpi] = React.useState<Kpi | null>(null);

  return (
    <div className={cn("mt-3 space-y-2 border-l-2 border-muted pl-3")}>
      {isLoading && <div className="h-8 animate-pulse rounded bg-muted" />}
      {kpis && kpis.length === 0 && (
        <p className="text-xs text-muted-foreground">Chưa có KPI.</p>
      )}
      {kpis?.map((kpi) => (
        <div key={kpi.id} className="flex items-center justify-between gap-2 text-sm">
          <span>
            {kpi.name}
            <span className="ml-2 text-xs text-muted-foreground">
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
