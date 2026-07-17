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
- [ ] ❓ `spentMinute` (tổng hợp từ TimeLog) — có ở tầng backend (derivable), **chưa xác nhận đã hiển thị ở UI hay chưa** — cần kiểm tra khi làm QA.

### Habit Tracker
- [x] ✅ Backend: CRUD habit, checkin (HabitLog, unique theo ngày), streak tính động từ HabitLog (không lưu cột) — verify qua smoke test thật (checkin → streak=1 đúng)
- [x] ✅ Frontend: HabitsView, HabitCard, HabitFormDialog — build/typecheck sạch, **chưa tự tay test qua browser thật**

### Reminder (Notification)
- [x] ✅ Backend: CRUD, đánh dấu đã đọc, snooze, cron nội bộ (`@nestjs/schedule`, không Redis) quét mỗi phút đánh dấu `sentAt` — verify qua smoke test thật
- [x] ✅ Frontend: NotificationsView, ReminderFormDialog, SnoozeDialog — build/typecheck sạch, **chưa tự tay test qua browser thật**
- [ ] ⏸️ Gửi thật qua Telegram/email/push — cần Telegram Bot Token, chưa có. *(Xem BACKLOG.md)*

### Calendar
- [x] ✅ Backend: CRUD CalendarEvent, single-occurrence — verify qua smoke test thật
- [x] ✅ Frontend: CalendarView, CalendarEventFormDialog — build/typecheck sạch, **chưa tự tay test qua browser thật**
- [ ] ⏸️ Recurrence (sự kiện lặp lại) — ngoài phạm vi Phase 1. *(Xem BACKLOG.md)*

### Dashboard
- [x] ✅ "Today's Tasks" (tối giản)
- [x] ✅ Habit Streak widget — check-in nhanh ngay trên dashboard, verify live qua browser
- [x] ✅ Urgent & Important panel (tái dùng logic Eisenhower "Do Now") — verify live qua browser
- [ ] ❌ Goal Progress widget — cần Phase 2 (Goal module) xong trước
- [ ] ❌ Projects progress widget — cần Phase 2 (Project module) xong trước
- [ ] ❌ Net Worth / Investment % widget — cần Phase 3 (Finance module) xong trước
- [ ] ❌ Finance pie chart (Income/Expense/Profit) — cần Phase 3

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

## Phase 2 — Goal & Project

Schema đã có sẵn từ đầu (`Vision, Goal, KPI, Project, Milestone` — migration 002/003), nhưng
**chưa có module backend/frontend nào được build**.

- [ ] ❌ Backend: Vision CRUD
- [ ] ❌ Backend: Goal CRUD + liên kết KPI
- [ ] ❌ Backend: Project CRUD + Milestone
- [ ] ❌ Backend: Task liên kết Project (hiện Task đã bắt buộc `projectId`, dùng project "Inbox" mặc định — cần mở rộng cho phép chọn Project thật khi module này build)
- [ ] ❌ Frontend: Goal Tree (cây phân cấp Vision→Goal→KPI)
- [ ] ❌ Frontend: Project List + chi tiết Project
- [ ] ❌ Frontend: Kanban board (Todo/Doing/Review/Done — dùng lại đúng TaskStatus đã có, kéo-thả)
- [ ] ❌ Frontend: Timeline/Gantt
- [ ] ❌ Frontend: Progress tracking (Project.progress, Goal.currentValue — cột đã có, cần logic tính + cập nhật trong transaction)
- [ ] ❌ Dashboard: bổ sung Goal Progress + Projects progress widget

## Phase 3 — Finance

Schema đã có sẵn (`Wallet, Transaction, Budget, Investment, Asset` — migration 006), **chưa có
module nào được build**.

- [ ] ❌ Backend: Wallet CRUD
- [ ] ❌ Backend: Transaction CRUD (Income/Expense), cập nhật `Wallet.balance` trong transaction
- [ ] ❌ Backend: Budget CRUD + cảnh báo vượt ngân sách
- [ ] ❌ Backend: Investment CRUD (BTC/ETH/Stocks/Gold/Saving)
- [ ] ❌ Backend: Asset CRUD (Cash/Bank/Crypto/Real Estate/Vehicle)
- [ ] ❌ Backend: Report tổng hợp tháng (Income/Expense/Profit/Saving Rate)
- [ ] ❌ Frontend: Income/Expense entry, danh mục
- [ ] ❌ Frontend: Investment dashboard
- [ ] ❌ Frontend: Asset overview
- [ ] ❌ Frontend: Report + biểu đồ (Recharts/ECharts — đã chọn trong System Architecture)
- [ ] ❌ Dashboard: bổ sung Net Worth + Investment % + Finance pie chart

## Phase 4 — Intelligence (AI)

Chưa bắt đầu — schema AI (migration `008_ai`) cũng chưa tạo vì chưa cần.

- [ ] ❌ AI tự phân loại task theo Eisenhower (gợi ý, user vẫn override)
- [ ] ❌ AI gợi ý lịch làm việc tối ưu theo thời gian rảnh (đọc CalendarEvent + Task deadline)
- [ ] ❌ AI tổng kết ngày/tuần/tháng (job định kỳ, dùng số liệu thật tính trước, model chỉ diễn giải)
- [ ] ❌ AI dự báo tiến độ KPI/tài chính
- [ ] ❌ AI chat trên dữ liệu cá nhân (RAG có kiểm soát, scope đúng userId/workspaceId)

---

## Việc hoãn có chủ đích (tổng hợp — chi tiết xem [BACKLOG.md](BACKLOG.md))

| Việc | Lý do hoãn | Khi nào quay lại |
|------|-----------|------------------|
| Gửi Reminder qua Telegram | Chưa có Bot Token | Khi bạn tạo bot qua @BotFather |
| Session/refresh-token store | MVP chưa cần revoke token | Giai đoạn "auth-hardening" trước deploy production |
| Calendar recurrence | Không tài liệu nào yêu cầu | Nếu phát sinh nhu cầu (sự kiện lặp) |
| Token localStorage → httpOnly cookie | Không cần thiết khi chạy local 1 mình | Trước khi deploy production thật |
| Ngưỡng Eisenhower | Suy luận, chưa xác nhận qua dùng thật | Sau vài ngày dùng thử |
| Redis/BullMQ | Cron polling đủ cho 1 user | Nếu scale nhiều user/nhiều instance |
| Deploy VPS/Docker | Theo đúng yêu cầu: chạy ổn local trước | Sau khi Phase 1 hoàn tất + test kỹ local |

---

## Việc cần làm ngay tiếp theo (đề xuất thứ tự)

**Phase 1 coi như xong** (trừ các mục hoãn có chủ đích trong bảng trên). Tiếp theo:

1. Bắt đầu **Phase 2: Goal & Project** — Vision/Goal/KPI/Project/Milestone CRUD, Kanban, Timeline, Progress. Chưa dựng khung code trước (tránh module rỗng nằm chết) — dựng ngay khi bắt tay vào.
2. Phase 3 (Finance), Phase 4 (AI) theo đúng thứ tự roadmap — không nhảy cóc trừ khi bạn yêu cầu.
