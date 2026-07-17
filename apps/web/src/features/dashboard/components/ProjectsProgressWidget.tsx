"use client";

import Link from "next/link";
import { ArrowRight, FolderKanban } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { extractApiErrorMessage } from "@/lib/api-client";
import { useProjects } from "@/features/projects/hooks/useProjects";

/**
 * Projects progress widget — Project đang ACTIVE + progress bar, link nhanh /projects/{id}.
 * Tái dùng useProjects (Phase 2). Dùng `project.progress` INLINE từ GET /projects (backend
 * tự tính, đã có trong list response) → không gọi thêm /projects/{id}/progress cho từng item.
 */
export function ProjectsProgressWidget() {
  const { data: projects, isLoading, isError, error } = useProjects({ status: "ACTIVE" });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <FolderKanban className="h-5 w-5 text-primary" /> Projects Progress
        </CardTitle>
        <Link
          href="/projects"
          className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          Xem tất cả <ArrowRight className="h-4 w-4" />
        </Link>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-11 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        )}

        {isError && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Không tải được project: {extractApiErrorMessage(error)}
          </p>
        )}

        {!isLoading && !isError && projects && projects.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Chưa có project ACTIVE nào.
          </p>
        )}

        {!isLoading && !isError && projects && projects.length > 0 && (
          <ul className="space-y-3">
            {projects.map((project) => (
              <li key={project.id}>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <Link
                    href={`/projects/${project.id}`}
                    className="truncate font-medium hover:underline"
                  >
                    {project.title}
                  </Link>
                  <Badge variant="outline">{project.progress}%</Badge>
                </div>
                <Progress value={project.progress} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
