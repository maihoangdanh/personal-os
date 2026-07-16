---
name: personal-os-team
description: >
  Orchestrator điều phối nhóm agent xây dựng Personal OS (Next.js 15 + NestJS + Prisma +
  PostgreSQL, monorepo apps/web + apps/api + apps/worker). Dùng skill này khi được yêu cầu xây
  dựng, phát triển, thêm module/tính năng, sửa schema, viết API, dựng UI, tích hợp AI, cấu hình
  deploy/CI-CD, hoặc QA cho dự án Personal OS. Cũng dùng khi yêu cầu "tiếp tục Phase 2/3/4",
  "làm lại module X", "cập nhật kết quả trước", "chạy lại backend/frontend", "bổ sung tính năng
  cho Personal OS", hoặc bất kỳ câu hỏi kiến trúc nào về dự án này. Câu hỏi đơn giản (giải thích
  khái niệm, đọc code có sẵn) có thể trả lời trực tiếp không cần orchestrator.
---

# Personal OS — Team Orchestrator

Điều phối nhóm 6 agent chuyên biệt để xây Personal OS theo roadmap 4 phase trong PRD:
Phase 1 (MVP: Auth, Dashboard, Todo, Habit, Reminder, Calendar, Eisenhower) → Phase 2 (Goal &
Project) → Phase 3 (Finance) → Phase 4 (Intelligence/AI).

## Chế độ thực thi: Nhóm agent (mặc định)

Lý do: các module phụ thuộc lẫn nhau theo chuỗi DB → API → Frontend, đồng thời nhiều module
độc lập (Task, Habit, Finance...) có thể triển khai song song. Nhóm agent tự điều phối qua
`SendMessage` cho phép backend/frontend/QA trao đổi ngay khi có bug ranh giới, thay vì phải
quay lại leader mỗi lần.

## Cấu thành Agent

| Thành viên | Loại agent | Vai trò | Skill | Đầu ra |
|-----------|-----------|---------|-------|--------|
| database-architect | tùy chỉnh | Schema Prisma, migration, index | `prisma-schema-design` | `packages/database/prisma/schema.prisma` + migration |
| backend-engineer | tùy chỉnh | NestJS module (API) + BullMQ worker jobs | `nestjs-module-scaffold`, `bullmq-worker-jobs` | `apps/api/src/{module}`, `apps/worker/src/{job}` |
| frontend-engineer | tùy chỉnh | Next.js feature UI | `nextjs-feature-scaffold` | `apps/web/src/features/{module}` |
| ai-engineer | tùy chỉnh | Tính năng AI (classify, suggest, summary, chat) | `ai-feature-design` | `apps/api/src/ai/*`, job AI trong `apps/worker` |
| devops-engineer | tùy chỉnh | Docker/CI-CD/deploy/security/monitoring | `deployment-ops` | `docker-compose*.yml`, `.github/workflows/*` |
| qa-inspector | general-purpose | So sánh chéo ranh giới API↔Frontend, E2E flow | `cross-boundary-qa` | `_workspace/qa_{module}_report.md` |

Tất cả agent gọi với `model: "opus"`.

## Quy trình

### Phase 0: Kiểm tra context (hỗ trợ tác vụ tiếp theo)

1. Kiểm tra `_workspace/` trong thư mục dự án.
2. Phân nhánh:
   - Không tồn tại → chạy lần đầu, tiến hành Phase 1.
   - Tồn tại + người dùng yêu cầu sửa/thêm một module cụ thể → chạy lại một phần, chỉ gọi lại
     agent liên quan (đọc `_workspace/*_{module}.md` cũ trước khi sửa).
   - Tồn tại + người dùng chuyển sang phase roadmap mới (v.d. "làm Phase 2") → giữ nguyên
     `_workspace/`, chỉ thêm task mới cho phase đó — không di chuyển workspace cũ vì các phase
     nối tiếp nhau, không phải chạy lại từ đầu.
3. Nếu người dùng yêu cầu một kiến trúc hoàn toàn khác (đổi stack) → di chuyển `_workspace/`
   hiện có sang `_workspace_{YYYYMMDD_HHMMSS}/` rồi bắt đầu lại.

### Phase 1: Chuẩn bị

1. Xác định module/tính năng cần làm và phase roadmap tương ứng (tham chiếu bảng roadmap bên
   dưới).
2. Tạo/mở `_workspace/` tại thư mục gốc dự án.
3. Ghi yêu cầu người dùng vào `_workspace/00_input/{ngày}_request.md`.

### Phase 2: Cấu thành nhóm & phân task

```
TeamCreate(
  team_name: "personal-os-team",
  members: [
    { name: "database-architect", agent_type: "database-architect", model: "opus", prompt: "..." },
    { name: "backend-engineer",   agent_type: "backend-engineer",   model: "opus", prompt: "..." },
    { name: "frontend-engineer",  agent_type: "frontend-engineer",  model: "opus", prompt: "..." },
    { name: "ai-engineer",        agent_type: "ai-engineer",        model: "opus", prompt: "..." },
    { name: "devops-engineer",    agent_type: "devops-engineer",    model: "opus", prompt: "..." },
    { name: "qa-inspector",       agent_type: "general-purpose",    model: "opus", prompt: "Đọc .claude/agents/qa-inspector.md và .claude/skills/cross-boundary-qa/SKILL.md rồi làm theo." }
  ]
)
```

`TaskCreate` theo chuỗi phụ thuộc cho **mỗi module** đang làm trong phase hiện tại:

```
1. "{module}: schema"    → database-architect
2. "{module}: API"       → backend-engineer, depends_on: [1]
3. "{module}: UI"        → frontend-engineer, depends_on: [2]
4. "{module}: QA"        → qa-inspector, depends_on: [2, 3]   (chạy ngay khi 2+3 xong, không chờ hết mọi module)
```

Nếu module có phần AI (v.d. "AI tự phân loại task"), thêm task AI song song với bước 2, phụ
thuộc bước 1: `"{module}: AI logic" → ai-engineer, depends_on: [1]`.

devops-engineer nhận task độc lập không phụ thuộc chuỗi trên (setup Docker/CI chạy song song
từ đầu).

> Quy mô nhóm 6 người phù hợp cho scope "lớn" (roadmap 4 phase, 20+ module con). Nếu chỉ làm
> 1 module nhỏ lẻ, có thể chỉ activate 3 người liên quan (database-architect, backend-engineer,
> frontend-engineer) — không bắt buộc gọi đủ 6.

### Phase 3: Thực thi (thành viên tự điều phối)

**Quy tắc giao tiếp giữa thành viên:**
- database-architect gửi SendMessage cho backend-engineer (+ ai-engineer nếu liên quan) ngay
  khi migration của module đó merge xong, kèm đường dẫn model mới trong schema.
- backend-engineer gửi SendMessage cho frontend-engineer + qa-inspector khi endpoint sẵn sàng,
  kèm đường dẫn file DTO/response shape thực tế (không phải mô tả bằng lời).
- frontend-engineer gửi SendMessage cho qa-inspector khi UI hoàn tất.
- qa-inspector phát hiện lệch ranh giới → SendMessage trực tiếp cho **cả hai** agent hai phía
  kèm file:dòng cụ thể, không báo qua leader trước (per `references/qa-agent-guide.md` nguyên
  tắc "đọc cả hai bên đồng thời").
- Leader (orchestrator) theo dõi qua `TaskGet`, can thiệp khi một thành viên bị kẹt quá 1 vòng
  trao đổi.

**Lưu đầu ra:**

| Thành viên | Đường dẫn |
|-----------|----------|
| database-architect | `_workspace/{phase}_database_{module}.md` |
| backend-engineer | `_workspace/{phase}_backend_{module}.md` |
| frontend-engineer | `_workspace/{phase}_frontend_{module}.md` |
| ai-engineer | `_workspace/{phase}_ai_{module}.md` |
| devops-engineer | `_workspace/{phase}_devops_{artifact}.md` |
| qa-inspector | `_workspace/qa_{module}_report.md` |

### Phase 4: Tổng hợp

1. Chờ toàn bộ task của phase hiện tại `done` (kiểm tra `TaskGet`).
2. Đọc tất cả `_workspace/qa_*_report.md` của phase này bằng Read.
3. Nếu còn finding chưa fix → giữ nhóm hoạt động, giao lại task sửa cho agent tương ứng thay vì
   sang phase tiếp theo.
4. Khi sạch: tổng hợp báo cáo tiến độ phase (module nào done, còn thiếu gì) báo cho người dùng.

### Phase 5: Dọn dẹp (chỉ khi kết thúc phiên làm việc, không phải mỗi module)

1. SendMessage yêu cầu thành viên kết thúc.
2. `TeamDelete`.
3. Giữ nguyên `_workspace/` để audit và cho lần chạy tiếp theo.

## Roadmap tham chiếu (từ PRD)

| Phase | Nội dung | Module chính |
|-------|---------|--------------|
| 1 — MVP | Auth, Dashboard, Todo, Habit Tracker, Reminder, Calendar, Eisenhower Matrix | Auth, Task, Habit, Notification, Dashboard |
| 2 — Goal & Project | Goal Tree, KPI, Project, Kanban, Timeline, Progress | Goal, KPI, Project |
| 3 — Finance | Income, Expense, Investment, Asset, Report | Finance (Wallet/Transaction/Budget/Investment/Asset) |
| 4 — Intelligence | AI phân loại task, gợi ý lịch, tổng kết ngày/tuần, dự báo KPI/tài chính, AI chat dữ liệu cá nhân | AI |

Bắt đầu từ Phase 1; không nhảy sang Finance/AI trước khi Auth + Task + schema nền tảng ổn định,
trừ khi người dùng yêu cầu rõ ràng.

## Xử lý lỗi

| Tình huống | Chiến lược |
|----------|-----------|
| database-architect chặn vì requirement mơ hồ | Không đoán field — hỏi lại người dùng qua leader, tạm dừng task phụ thuộc |
| backend/frontend lệch ranh giới (qa-inspector phát hiện) | qa-inspector báo trực tiếp 2 bên, agent sửa, không sang module tiếp theo tới khi pass |
| 1 thành viên treo/lỗi | Thử lại 1 lần qua SendMessage; thất bại tiếp thì leader nhận task đó và ghi rõ thiếu sót trong báo cáo |
| Mâu thuẫn dữ liệu giữa 2 agent (v.d. field đặt tên khác nhau) | Ghi rõ cả hai nguồn trong báo cáo, không tự xóa — leader quyết định cùng người dùng |

## Kịch bản kiểm thử

**Luồng bình thường:** Người dùng yêu cầu "làm module Task cho Phase 1" → Phase 0 phát hiện
`_workspace/` chưa có, chạy lần đầu → Phase 2 tạo nhóm 6 người + 4 task (schema→API→UI→QA) →
Phase 3 database-architect xong trước, SendMessage cho backend-engineer, backend-engineer xong
báo frontend-engineer + qa-inspector, qa-inspector so sánh DTO Task response với type frontend
→ Phase 4 báo cáo "Task module: done, 0 finding" cho người dùng.

**Luồng lỗi:** backend-engineer trả DTO `{ deadline: string }` nhưng frontend-engineer định
nghĩa type `deadline: Date` → qa-inspector phát hiện mismatch, SendMessage cả hai kèm
file:dòng → backend-engineer/frontend-engineer thống nhất chuẩn hóa (ISO string qua wire, parse
ở frontend) → qa-inspector re-check → pass → Phase 4 tiếp tục.
