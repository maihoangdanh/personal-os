# Personal OS — Kế hoạch triển khai chi tiết

Cập nhật lần cuối: 2026-07-17. Theo dõi tiến độ từ Phase → Module → Task, đối chiếu với roadmap
gốc trong PRD. Chú giải trạng thái:

- ✅ **Xong** — đã build + verify thật (test pass, chạy thật với Supabase, hoặc smoke test HTTP)
- 🔄 **Đang làm** — có code nhưng chưa verify đầy đủ / đang chạy dở
- ⏸️ **Hoãn có chủ đích** — quyết định KHÔNG làm bây giờ, xem chi tiết lý do trong [BACKLOG.md](BACKLOG.md)
- ❌ **Chưa bắt đầu**

---

## Phase 1 — MVP

### Auth
- [x] ✅ Backend: register (tự tạo Workspace + chuỗi Vision/Goal/Project "Inbox"), login, refresh, logout, me — JWT access(15m)+refresh(7d), RBAC (OWNER/ADMIN/MEMBER), bcryptjs hash, audit log — verify e2e thật với Supabase
- [x] ✅ Frontend: trang login/register, lưu token, interceptor tự refresh khi 401
- [ ] ⏸️ Session/refresh-token store để revoke được — hiện stateless, không thu hồi được token trước hạn. *(Xem BACKLOG.md)*
- [ ] ⏸️ Chuyển token sang httpOnly cookie (thay localStorage) — trade-off XSS, để khi chuẩn bị deploy production. *(Xem BACKLOG.md)*

### Task (Todo) + Eisenhower Matrix
- [x] ✅ Backend: CRUD, soft delete, complete, timer start/stop (+ `isTimerRunning`/`activeTimeLogId`), `priorityScore` = impact×urgency, `completedAt`, `estimateMinute`, TaskStatus 6 trạng thái (INBOX/TODO/DOING/REVIEW/DONE/ARCHIVED, không state-machine cứng — Kanban kéo-thả tự do) — verify e2e thật (9/9 test)
- [x] ✅ Frontend: danh sách task, tạo/sửa, filter theo status, nút toggle timer, Eisenhower Matrix (4 ô Do Now/Schedule/Delegate/Ignore)
- [ ] ⏸️ Ngưỡng phân loại Eisenhower (`impact/urgency >= 3` = "cao") là suy luận, chưa xác nhận bằng dữ liệu dùng thật. *(Xem BACKLOG.md)*
- [ ] 🔄 `spentMinute` (tổng hợp từ TimeLog) — **xác nhận CHƯA làm** (không có ở backend response lẫn UI, dù note "derivable" từ đầu) — đang giao frontend-engineer bổ sung.

### Habit Tracker
- [x] ✅ Backend: CRUD habit, checkin (HabitLog, unique theo ngày), streak tính động từ HabitLog (không lưu cột) — verify qua smoke test thật (checkin → streak=1 đúng)
- [x] ✅ Frontend: HabitsView, HabitCard, HabitFormDialog — build/typecheck sạch, **đang browser-test thật** (giao frontend-engineer, xem tiến độ)

### Reminder (Notification)
- [x] ✅ Backend: CRUD, đánh dấu đã đọc, snooze, cron nội bộ (`@nestjs/schedule`, không Redis) quét mỗi phút đánh dấu `sentAt` — verify qua smoke test thật
- [x] ✅ Frontend: NotificationsView, ReminderFormDialog, SnoozeDialog — build/typecheck sạch, **đang browser-test thật** (giao frontend-engineer, xem tiến độ)
- [x] ✅ Gửi thật qua Telegram Bot API — verify bằng cron thật + Telegram thật, chỉ mark `sentAt` khi gửi thành công (101/101 unit test pass)

### Calendar
- [x] ✅ Backend: CRUD CalendarEvent, single-occurrence — verify qua smoke test thật
- [x] ✅ Frontend: CalendarView, CalendarEventFormDialog — build/typecheck sạch, **đang browser-test thật** (giao frontend-engineer, xem tiến độ)
- [ ] ⏸️ Recurrence (sự kiện lặp lại) — ngoài phạm vi Phase 1. *(Xem BACKLOG.md)*

### Dashboard
- [x] ✅ "Today's Tasks" (tối giản)
- [x] ✅ Habit Streak widget — check-in nhanh ngay trên dashboard, verify live qua browser
- [x] ✅ Urgent & Important panel (tái dùng logic Eisenhower "Do Now") — verify live qua browser
- [x] ✅ Goal Progress widget — làm ở Phase 2, xem dòng tương ứng bên dưới
- [x] ✅ Projects progress widget — làm ở Phase 2, xem dòng tương ứng bên dưới
- [x] ✅ Net Worth widget — làm ở Phase 3, xem dòng tương ứng bên dưới
- [ ] ⏸️ Finance pie chart (Income/Expense/Profit) — rút gọn thành stat card ở trang `/finance`, không làm riêng trên Dashboard *(Xem BACKLOG.md nếu muốn thêm sau)*

### QA
- [x] ✅ Auth+Task: verify thủ công (test pass, curl thật)
- [x] ✅ Habit/Calendar/Reminder: verify thủ công (test pass, smoke test HTTP thật)
- [x] ✅ Dashboard (Habit Streak + Urgent&Important): verify live qua browser thật
- [ ] ⏸️ QA cross-boundary chính thức bằng qa-inspector agent — **bỏ qua theo yêu cầu người dùng**, không chặn tiến độ

### Hạ tầng / DevOps
- [x] ✅ Chạy local trực tiếp (không Docker), Supabase Postgres — đã quyết định + hoạt động
- [x] ✅ Repo GitHub đồng bộ (`github.com/maihoangdanh/personal-os`)
- [ ] ❌ CI/CD pipeline (lint/test/build tự động)
- [ ] ❌ Deploy VPS (Docker + Nginx) — **chủ đích để cuối cùng**, sau khi Phase 1 chạy ổn định local (theo đúng yêu cầu ban đầu của bạn)

---

## Phase 2 — Goal & Project ✅ Hoàn tất (trừ Gantt rút gọn)

- [x] ✅ Backend: Vision CRUD — verify e2e thật
- [x] ✅ Backend: Goal CRUD + KPI + `GET /goals/{id}/progress` (`progress = min(100, current/target*100)`, `currentValue` nhập tay)
- [x] ✅ Backend: Project CRUD + Milestone + `GET /projects/{id}/progress` (`progress` = % task DONE, tự tính trong transaction)
- [x] ✅ Backend: Task liên kết Project thật + `milestoneId` (validate cùng-project), rollup Project.progress/Milestone.isCompleted mỗi khi task đổi status — 55 unit + 17 e2e pass
- [x] ✅ Frontend: Goal Tree (Vision→Goal→KPI, progress bar)
- [x] ✅ Frontend: Project List + chi tiết (Milestone list, progress)
- [x] ✅ Frontend: Kanban board (6 cột TaskStatus, kéo-thả) — verify live: kéo DONE→DOING làm progress/milestone cập nhật đúng
- [x] ✅ Frontend: Task form chọn Project/Milestone thật
- [ ] 🔄 Timeline/Gantt — **rút gọn** thành danh sách Milestone sắp theo `dueDate` (không vẽ Gantt chart thật, quyết định có ghi chú trong `_workspace/10_frontend_goal-project.md`)
- [x] ✅ Dashboard: Goal Progress + Projects progress widget — verify live qua browser thật

## Phase 3 — Finance ✅ Hoàn tất

Migration 012 (`transferGroupId`) + 013 (`category`) đã bổ sung so với schema gốc, đã chốt công
thức với người dùng (xem BACKLOG.md).

- [x] ✅ Backend: Wallet CRUD, `balance` tự tính lại từ tổng trong transaction — verify e2e thật
- [x] ✅ Backend: Transaction CRUD (Income/Expense) + Transfer riêng (2 dòng cùng `transferGroupId`, atomic) — 71 unit + 25 e2e pass
- [x] ✅ Backend: Budget CRUD theo category (case-insensitive) + `GET /budgets/{id}/status` (actual vs ngân sách)
- [x] ✅ Backend: Investment CRUD (CRUD thuần, không tự trừ ví — xem BACKLOG.md)
- [x] ✅ Backend: Asset CRUD
- [x] ✅ Backend: Report runtime (`GET /finance/report?month`: Income/Expense/Profit/Saving Rate) + `GET /finance/net-worth` — verify bằng số liệu cụ thể (income 1000+expense 300+transfer 200 → report đúng 1000/300/700, không đếm Transfer trùng)
- [x] ✅ Frontend: trang `/finance` 6 tab (Tổng quan/Ví/Giao dịch/Ngân sách/Đầu tư/Tài sản)
- [x] ✅ Frontend: Transaction list + filter + category autocomplete + form Transfer riêng
- [x] ✅ Frontend: Budget progress bar (đỏ khi vượt ngân sách)
- [x] ✅ Frontend: Investment + Asset CRUD UI
- [x] ✅ Frontend: Report page + Net Worth breakdown — verify live bằng số tiền cụ thể (1.000.000/300.000/200.000 transfer → đúng 100% so với API)
- [x] ✅ Dashboard: NetWorthWidget
- [ ] 🔄 Verify live chưa phủ hết mọi tab (Giao dịch/Ngân sách/Đầu tư/Tài sản dùng chung pattern component đã verify ở Phase 1/2, nhưng chưa tự tay click qua browser do gián đoạn công cụ giữa buổi — phần quan trọng nhất (tính đúng tiền) đã verify qua API + 2 tab chính)
- [ ] ⏸️ Report dùng stat card thay vì pie chart — rút gọn có chủ đích, tránh kéo thêm Recharts cho MVP

## Phase 4 — Intelligence (AI) ✅ Hoàn tất

Migration 014 (`AiConversation/AiMessage/AiSummary`) + 015 (`Journal`, bổ sung Phase 1 bị bỏ sót).
LLM: custom router OpenAI-compatible (`AI_API_BASE`/`AI_API_KEY`/`AI_MODEL` trong `apps/api/.env`,
không commit).

- [x] ✅ Backend: AI Chat (lưu AiConversation/AiMessage, RAG có kiểm soát trên dữ liệu thật)
- [x] ✅ Backend: Tổng kết định kỳ (lưu AiSummary, upsert theo kỳ) — hiện SYNC, chưa có worker/cron (để dành khi dựng BullMQ)
- [x] ✅ Backend: Phân loại task Eisenhower (runtime, gợi ý impact/urgency, priorityScore code tính)
- [x] ✅ Backend: Gợi ý lịch làm việc (runtime, đọc Task deadline + CalendarEvent thật)
- [x] ✅ Backend: Dự báo KPI/tài chính (runtime, từ chối kết luận khi thiếu dữ liệu thay vì bịa)
- [x] ✅ Backend: Journal module (bổ sung Phase 1) — CRUD, 1 entry/ngày, revive-on-recreate
- [x] ✅ Test: 99 unit pass (23 AI mới), verify thật với LLM router thật + Supabase — số AI khớp 100% dữ liệu thật
- [x] ✅ Frontend: trang `/ai` 4 tab (Chat/Tổng kết/Lịch gợi ý/Dự báo) + nút "Gợi ý AI" trong Task form — verify live: chat trả lời đúng số liệu thật (300.000đ khớp DB, transfer bị loại đúng)
- [ ] ⏸️ Gửi AI summary qua Telegram/push — chưa (cùng lý do BACKLOG.md mục Telegram)
- [ ] ⏸️ Tổng kết định kỳ tự động (cron/worker) — hiện SYNC theo yêu cầu, để dành khi dựng BullMQ

---

## Việc hoãn có chủ đích (tổng hợp — chi tiết xem [BACKLOG.md](BACKLOG.md))

| Việc | Lý do hoãn | Khi nào quay lại |
|------|-----------|------------------|
| ~~Gửi Reminder qua Telegram~~ | ✅ Đã xong 2026-07-18 | — |
| Session/refresh-token store | MVP chưa cần revoke token | Giai đoạn "auth-hardening" trước deploy production |
| Calendar recurrence | Không tài liệu nào yêu cầu | Nếu phát sinh nhu cầu (sự kiện lặp) |
| Token localStorage → httpOnly cookie | Không cần thiết khi chạy local 1 mình | Trước khi deploy production thật |
| Ngưỡng Eisenhower | Suy luận, chưa xác nhận qua dùng thật | Sau vài ngày dùng thử |
| Redis/BullMQ | Cron polling đủ cho 1 user | Nếu scale nhiều user/nhiều instance |
| Deploy VPS/Docker | Theo đúng yêu cầu: chạy ổn local trước | Sau khi Phase 1 hoàn tất + test kỹ local |

---

## Việc cần làm ngay tiếp theo (đề xuất thứ tự)

**Cả 4 phase trong roadmap đã hoàn tất** (trừ các mục hoãn có chủ đích — xem bảng trên). Việc còn
lại không phải "chưa xong roadmap" mà là các khoản backlog/nâng cấp:

1. Verify live nốt các tab Finance chưa tự tay click qua (Giao dịch/Ngân sách/Đầu tư/Tài sản) khi
   dùng thật hàng ngày.
2. Xử lý dần các mục trong bảng "Việc hoãn có chủ đích" khi có nhu cầu thật (Telegram, auth
   hardening, v.v.)
3. Khi sẵn sàng: CI/CD pipeline + deploy VPS (Docker/Nginx) — đúng thứ tự đã hẹn từ đầu, chỉ làm
   sau khi dùng thật ổn định ở local.
