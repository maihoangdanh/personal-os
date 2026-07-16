## Harness: Personal OS Dev Team

**Mục tiêu:** Điều phối 6 agent chuyên biệt (database-architect, backend-engineer,
frontend-engineer, ai-engineer, devops-engineer, qa-inspector) để xây Personal OS
(Next.js 15 + NestJS + Prisma + PostgreSQL, monorepo) theo roadmap 4 phase trong PRD.

**Trigger:** Khi có yêu cầu xây dựng/phát triển/sửa module, tính năng, schema, API, UI, AI,
deploy, hoặc QA cho dự án này, dùng skill `personal-os-team`. Câu hỏi đơn giản (giải thích khái
niệm, đọc code có sẵn) có thể trả lời trực tiếp.

**Lịch sử thay đổi:**
| Ngày | Nội dung thay đổi | Mục tiêu | Lý do |
|------|-----------------|----------|-------|
| 2026-07-16 | Cấu hình ban đầu — 6 agent + 7 skill (personal-os-team orchestrator, prisma-schema-design, nestjs-module-scaffold, bullmq-worker-jobs, nextjs-feature-scaffold, ai-feature-design, deployment-ops, cross-boundary-qa) | Toàn bộ | Dự án mới, chưa có code — xây harness từ đầu dựa trên 10 tài liệu thiết kế |
| 2026-07-16 | Bỏ Docker cho local dev, dùng Supabase Postgres + chạy web/api trực tiếp (npm/pnpm dev) | `skills/deployment-ops`, `agents/devops-engineer.md`, `agents/database-architect.md` | Người dùng yêu cầu build trực tiếp không qua Docker; dự án 1 người build nên ưu tiên vòng lặp sửa code nhanh hơn parity dev↔prod. Docker/Nginx giữ lại cho production, chỉ setup khi thật sự deploy |
