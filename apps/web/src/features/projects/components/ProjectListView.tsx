"use client";

import * as React from "react";
import Link from "next/link";
import { FolderKanban, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { extractApiErrorMessage } from "@/lib/api-client";
import { useDeleteProject, useProjects } from "../hooks/useProjects";
import type { Project, ProjectStatus } from "../types/projects.types";
import { ProjectFormDialog } from "./ProjectFormDialog";

const STATUS_VARIANT: Record<ProjectStatus, "default" | "success" | "secondary" | "warning" | "destructive"> = {
  PLANNING: "secondary",
  ACTIVE: "default",
  ON_HOLD: "warning",
  COMPLETED: "success",
  CANCELLED: "destructive",
};

export function ProjectListView() {
  const { data: projects, isLoading, isError, error } = useProjects();
  const deleteMut = useDeleteProject();
  const [dialog, setDialog] = React.useState(false);
  const [editing, setEditing] = React.useState<Project | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEditing(null);
            setDialog(true);
          }}
        >
          <Plus className="h-4 w-4" /> Tạo Project
        </Button>
      </div>

      {actionError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{actionError}</p>
      )}
      {isLoading && <div className="h-24 animate-pulse rounded-lg bg-muted" />}
      {isError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {extractApiErrorMessage(error)}
        </p>
      )}
      {!isLoading && !isError && projects && projects.length === 0 && (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          Chưa có Project nào. Project thuộc một Goal.
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {projects?.map((project) => (
          <Card key={project.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/projects/${project.id}`}
                  className="flex items-center gap-2 font-medium hover:underline"
                >
                  <FolderKanban className="h-4 w-4 text-primary" />
                  {project.title}
                </Link>
                <Badge variant={STATUS_VARIANT[project.status]}>{project.status}</Badge>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <Progress value={project.progress} className="flex-1" />
                <span className="w-12 shrink-0 text-right text-xs text-muted-foreground">
                  {project.progress}%
                </span>
              </div>
              <div className="mt-3 flex items-center justify-end gap-1">
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
            </CardContent>
          </Card>
        ))}
      </div>

      <ProjectFormDialog open={dialog} onOpenChange={setDialog} project={editing} />
    </div>
  );
}
