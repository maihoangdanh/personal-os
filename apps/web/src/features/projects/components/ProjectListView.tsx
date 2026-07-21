"use client";

import * as React from "react";
import Link from "next/link";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { extractApiErrorMessage } from "@/lib/api-client";
import { useDeleteProject, useProjects } from "../hooks/useProjects";
import type { Project, ProjectStatus } from "../types/projects.types";
import { ProjectFormDialog } from "./ProjectFormDialog";

/** Màu badge status (enum thật PLANNING/ACTIVE/ON_HOLD/COMPLETED/CANCELLED). */
function statusBadgeClass(status: ProjectStatus): string {
  switch (status) {
    case "ACTIVE":
      return "text-success bg-success/[0.12]";
    case "PLANNING":
      return "text-warning bg-warning/[0.12]";
    case "COMPLETED":
      return "text-accent-2 bg-accent-2/[0.12]";
    case "CANCELLED":
      return "text-destructive bg-destructive/[0.12]";
    default: // ON_HOLD
      return "text-muted-foreground bg-secondary";
  }
}

/** Màu thanh tiến độ theo status. */
function barColorClass(status: ProjectStatus): string {
  switch (status) {
    case "ACTIVE":
      return "bg-primary";
    case "PLANNING":
      return "bg-warning";
    case "COMPLETED":
      return "bg-accent-2";
    default:
      return "bg-border";
  }
}

export function ProjectListView() {
  const { data: projects, isLoading, isError, error } = useProjects();
  const deleteMut = useDeleteProject();
  const [dialog, setDialog] = React.useState(false);
  const [editing, setEditing] = React.useState<Project | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="DỰ ÁN"
        title="Projects"
        description="Mỗi project thuộc một Goal — tiến độ tính từ task."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setDialog(true);
            }}
          >
            <Plus className="h-4 w-4" /> Tạo Project
          </Button>
        }
      />

      {actionError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{actionError}</p>
      )}
      {isLoading && <div className="h-40 animate-pulse rounded-lg bg-muted" />}
      {isError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {extractApiErrorMessage(error)}
        </p>
      )}
      {!isLoading && !isError && projects && projects.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Chưa có Project nào. Project thuộc một Goal.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {projects?.map((project) => (
          <div
            key={project.id}
            className="group flex flex-col rounded-lg border border-border bg-card p-5 shadow-card"
          >
            <div className="flex items-start justify-between gap-2.5">
              <div className="text-[15px] font-bold">{project.title}</div>
              <span
                className={
                  "shrink-0 rounded-full px-2.5 py-1 text-[9.5px] font-bold tracking-[0.08em] " +
                  statusBadgeClass(project.status)
                }
              >
                {project.status}
              </span>
            </div>

            <div className="mb-1.5 mt-4 font-serif text-2xl font-bold">{project.progress}%</div>
            <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
              <div
                className={"h-full rounded-full " + barColorClass(project.status)}
                style={{ width: `${project.progress}%` }}
              />
            </div>

            <div className="mt-3.5 flex items-center justify-between border-t border-border pt-3">
              <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                  variant="ghost"
                  size="icon"
                  title="Sửa"
                  onClick={() => {
                    setEditing(project);
                    setDialog(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Xoá (422 nếu còn task)"
                  disabled={deleteMut.isPending}
                  onClick={async () => {
                    setActionError(null);
                    try {
                      await deleteMut.mutateAsync(project.id);
                    } catch (e) {
                      setActionError(extractApiErrorMessage(e));
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <Link
                href={`/projects/${project.id}`}
                className="text-[11.5px] font-semibold text-primary hover:underline"
              >
                Mở project →
              </Link>
            </div>
          </div>
        ))}
      </div>

      <ProjectFormDialog open={dialog} onOpenChange={setDialog} project={editing} />
    </div>
  );
}
