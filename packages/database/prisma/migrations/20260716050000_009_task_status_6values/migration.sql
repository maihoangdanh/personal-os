-- Align TaskStatus enum with Business Rules (doc 02): 4 legacy values -> 6 canonical values.
-- Canonical set/order: INBOX, TODO, DOING, REVIEW, DONE, ARCHIVED.
-- Legacy -> canonical mapping applied inline via CASE so the migration is safe even if
-- rows exist in future replays: IN_PROGRESS -> DOING, CANCELLED -> ARCHIVED; TODO/DONE unchanged.
-- Column default kept at 'TODO' (first Kanban column; doc 02 does not mandate a default).
BEGIN;

CREATE TYPE "TaskStatus_new" AS ENUM ('INBOX', 'TODO', 'DOING', 'REVIEW', 'DONE', 'ARCHIVED');

ALTER TABLE "tasks" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "tasks" ALTER COLUMN "status" TYPE "TaskStatus_new" USING (
  CASE "status"::text
    WHEN 'IN_PROGRESS' THEN 'DOING'
    WHEN 'CANCELLED'   THEN 'ARCHIVED'
    ELSE "status"::text
  END::"TaskStatus_new"
);

ALTER TYPE "TaskStatus" RENAME TO "TaskStatus_old";
ALTER TYPE "TaskStatus_new" RENAME TO "TaskStatus";
DROP TYPE "TaskStatus_old";

ALTER TABLE "tasks" ALTER COLUMN "status" SET DEFAULT 'TODO';

COMMIT;
