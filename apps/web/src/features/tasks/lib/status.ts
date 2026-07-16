import type { BadgeProps } from "@/components/ui/badge";
import type { TaskStatus } from "../types/task.types";

export const STATUS_LABELS: Record<TaskStatus, string> = {
  INBOX: "Inbox",
  TODO: "Todo",
  DOING: "Doing",
  REVIEW: "Review",
  DONE: "Done",
  ARCHIVED: "Archived",
};

export const STATUS_BADGE_VARIANT: Record<TaskStatus, BadgeProps["variant"]> = {
  INBOX: "secondary",
  TODO: "outline",
  DOING: "default",
  REVIEW: "warning",
  DONE: "success",
  ARCHIVED: "secondary",
};
