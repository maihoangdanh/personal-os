# Personal OS — Kế hoạch triển khai chi tiết

Cập nhật lần cuối: 2026-07-21 (105 unit test pass, typecheck backend+frontend sạch, 15 migration,
21 module backend, redesign toàn bộ UI theo mockup thiết kế thật). Theo dõi tiến độ từ
Phase → Module → Task, đối chiếu với roadmap gốc trong PRD. Chú giải trạng thái:

- ✅ **Xong** — đã build + verify thật (test pass, chạy thật với Supabase, browser-test thật, hoặc smoke test HTTP)
- 🔄 **Đang làm** — có code nhưng chưa verify đầy đủ / đang chạy dở
- ⏸️ **Hoãn có chủ đích** — quyết định KHÔNG làm bây giờ, xem chi tiết lý do trong [BACKLOG.md](BACKLOG.md)
- ❌ **Chưa bắt đầu**

---

## Redesign UI ✅ Hoàn tất (2026-07-21)

Áp dụng bộ mockup thiết kế thật tại [`design/Personal OS.dc.html`](design/Personal%20OS.dc.html)
(nguồn tham khảo chính thức của dự án) vào toàn bộ `apps/web` — không đổi logic/API/hook, chỉ đổi
visual.

- [x] ✅ Design token toàn cục: màu (nền kem/card trắng ngà/accent cam cháy #D9481F/accent-2 xanh
      rêu/vàng đồng), font (Playfair Display serif + Be Vietnam Pro + IBM Plex Mono qua
      `next/font/google`), bo góc 16px, shadow mềm — `globals.css` + `tailwind.config.ts`, có `.dark`
- [x] ✅ Sidebar: nền tối `#191512`, item active accent, nút toggle sáng/tối, avatar initials
- [x] ✅ Dashboard: eyebrow + greeting serif, StatStrip 4 ô, widget grid
- [x] ✅ Tasks, Habits, Reminders, Calendar (lưới tuần 7 cột), Journal (composer inline), Goals
      (Vision card lồng Goal card), Projects (grid card + tên Goal), Finance (tab pill + stat
      strip + chọn tháng), AI (sidebar hội thoại + chat bubble), Settings (2 cột)
- [x] ✅ Toàn bộ verify live qua browser thật từng trang, `tsc`/`next build` sạch (17 route)
- [x] ✅ Phát hiện + fix 1 regression thật: redesign vô tình khoá cứng tháng ở Finance Report
      (mất khả năng xem tháng khác) — đã khôi phục
- [ ] ⏸️ Project card thiếu due date + task count (mockup có, DTO/schema chưa hỗ trợ) — xem BACKLOG.md
- [ ] ⏸️ Màu theo category (Calendar event/Journal mood/Finance category) dùng màu cố định do field
      free-text, không phải bảng màu định nghĩa sẵn — chấp nhận được, đổi sau nếu cần

---

## Phase 1 — MVP

### Auth
- [x] ✅ Backend: register (tự tạo Workspace + chuỗi Vision/Goal/Project "Inbox"), login, refresh, logout, me — JWT access(15m)+refresh(7d), RBAC (OWNER/ADMIN/MEMBER), bcryptjs hash, audit log
- [x] ✅ Backend: `PATCH /auth/me` (sửa name/timezone), `POST /auth/change-password` (verify currentPassword trước khi đổi)
- [x] ✅ Backend: **register khoá vĩnh viễn** — 403 nếu đã có ≥1 user active. App giờ chỉ dùng 1 tài khoản duy nhất (`maihoangdanh92@gmail.com`)
- [x] ✅ Frontend: trang login, lưu token, interceptor tự refresh khi 401. Đã gỡ UI đăng ký (RegisterForm xoá, link đăng ký gỡ khỏi `/login`)
- [x] ✅ Frontend: trang `/settings` (Hồ sơ + Đổi mật khẩu), thêm nhóm "System" vào Sidebar
- [ ] ⏸️ Session/refresh-token store để revoke được — hiện stateless, không thu hồi được token trước hạn. *(Xem BACKLOG.md)*
- [ ] ⏸️ Chuyển token sang httpOnly cookie (thay localStorage) — trade-off XSS, để khi chuẩn bị deploy production. *(Xem BACKLOG.md)*

### Task (Todo) + Eisenhower Matrix
- [x] ✅ Backend: CRUD, soft delete, complete, timer start/stop (+ `isTimerRunning`/`activeTimeLogId`), `priorityScore` = impact×urgency, `completedAt`, `estimateMinute`, `spentMinute` (tổng TimeLog, tính runtime), TaskStatus 6 trạng thái (INBOX/TODO/DOING/REVIEW/DONE/ARCHIVED, không state-machine cứng — Kanban kéo-thả tự do)
- [x] ✅ Frontend: danh sách task (hiện cả estimateMinute + spentMinute), tạo/sửa, filter theo status, nút toggle timer, Eisenhower Matrix (4 ô Do Now/Schedule/Delegate/Ignore) — verify live: timer chạy 70s → UI hiện đúng "Đã làm: 1 phút"
- [ ] ⏸️ Ngưỡng phân loại Eisenhower (`impact/urgency >= 3` = "cao") là suy luận, chưa xác nhận bằng dữ liệu dùng thật. *(Xem BACKLOG.md)*

### Habit Tracker
- [x] ✅ Backend: CRUD habit, checkin (HabitLog, unique theo ngày), streak tính động từ HabitLog (không lưu cột)
- [x] ✅ Frontend: HabitsView, HabitCard, HabitFormDialog — verify live qua browser thật (tạo habit → checkin → streak 0→1 đúng)

### Reminder (Notification)
- [x] ✅ Backend: CRUD, đánh dấu đã đọc, snooze, cron nội bộ (`@nestjs/schedule`, không Redis) quét mỗi phút
- [x] ✅ Frontend: NotificationsView, ReminderFormDialog, SnoozeDialog — verify live qua browser thật (tạo → snooze → đánh dấu đã đọc, badge biến mất đúng)
- [x] ✅ Gửi thật qua Telegram Bot API — verify bằng cron thật + Telegram thật, chỉ mark `sentAt` khi gửi thành công

### Calendar
- [x] ✅ Backend: CRUD CalendarEvent, single-occurrence
- [x] ✅ Frontend: CalendarView, CalendarEventFormDialog — verify live qua browser thật (tạo event → hiện đúng ngày ở week view, toggle Ngày/Tuần hoạt động)
- [ ] ⏸️ Recurrence (sự kiện lặp lại) — ngoài phạm vi Phase 1. *(Xem BACKLOG.md)*

### Journal (bổ sung — PRD gốc có, Phase 1 ban đầu bỏ sót)
- [x] ✅ Backend: CRUD `/journals`, 1 entry/ngày (`unique[userId,date]`), revive-on-recreate khi tạo lại ngày đã xoá mềm — verify e2e thật (5/5 test)
- [x] ✅ Frontend: trang `/journal`, "hôm nay" tự chuyển Tạo/Sửa qua `GET /journals/date/:date`, thêm vào nhóm "Daily" trong Sidebar — verify live qua browser thật

### Dashboard
- [x] ✅ "Today's Tasks" (tối giản, trong `DashboardView.tsx`)
- [x] ✅ Habit Streak widget — check-in nhanh ngay trên dashboard, verify live qua browser
- [x] ✅ Urgent & Important panel (tái dùng logic Eisenhower "Do Now") — verify live qua browser
- [x] ✅ Goal Progress widget (làm ở Phase 2) — verify live
- [x] ✅ Projects progress widget (làm ở Phase 2) — verify live
- [x] ✅ Net Worth widget (làm ở Phase 3)
- [ ] ⏸️ Finance pie chart (Income/Expense/Profit) — rút gọn thành stat card ở trang `/finance`, không làm riêng trên Dashboard

### QA
- [x] ✅ Auth+Task+Habit+Calendar+Reminder+Goal+Project+Finance+AI: verify thật (unit/e2e test + browser thật hoặc curl live) cho từng module khi build xong
- [ ] ⏸️ QA cross-boundary chính thức bằng qa-inspector agent — **bỏ qua theo yêu cầu người dùng**, đã bù bằng việc leader tự verify kỹ mỗi module

### Hạ tầng / DevOps
- [x] ✅ Chạy local trực tiếp (không Docker), Supabase Postgres
- [x] ✅ Repo GitHub đồng bộ (`github.com/maihoangdanh/personal-os`)
- [ ] ❌ CI/CD pipeline (lint/test/build tự động)
- [ ] 🔄 **Deploy Oracle Cloud VPS — đang bắt đầu (2026-07-21)**, xem chi tiết mục "Deploy Oracle Cloud" ngay dưới

## Deploy Oracle Cloud 🔄 Đang chuẩn bị (2026-07-21)

**Quyết định đã chốt với người dùng:**
- Hạ tầng: Oracle Cloud Compute Instance (đã tạo sẵn, Ubuntu, SSH user `ubuntu`).
- Domain: người dùng có tên miền riêng, sẽ trỏ DNS qua **Cloudflare** về IP VM.
- HTTPS: cần cấu hình (Let's Encrypt/Certbot, hoặc qua Cloudflare proxy — quyết định cụ thể lúc setup Nginx).
- Kiến trúc dự kiến: cài Node.js trên VM → clone repo → `npm install` + build cả `apps/api`
  lẫn `apps/web` → chạy bằng **PM2** (không Docker, giữ nhất quán tinh thần "đơn giản" đã chọn
  cho dev local — có thể đổi sang Docker sau nếu cần) → **Nginx** làm reverse proxy (web port
  3000, api port 3001) + SSL.
- Database: **vẫn dùng Supabase** (Postgres đã ở cloud rồi, VPS chỉ cần connect qua Pooler
  connection string đã có, không cần cài Postgres trên VPS).

**Đang chặn — cần từ người dùng để tiếp tục:**
1. ❌ **Public IP của VM** — người dùng mới chỉ có Private IP. Đã hướng dẫn cách tìm/gán Public
   IP (Ephemeral) qua OCI Console → Compute → Instances → Attached VNICs → Edit IPv4 Addresses.
2. ❌ **SSH private key** (file `.key`/`.pem` tải về lúc tạo instance) — người dùng sẽ gửi.
3. ❌ **Tên miền cụ thể** muốn dùng — người dùng nói "đưa lên đi rồi gửi IP tao trỏ" nghĩa là
   **thứ tự ngược lại**: deploy trước bằng IP, sau đó người dùng tự trỏ domain qua Cloudflare
   khi có Public IP — không cần domain ngay từ đầu để bắt đầu deploy.

**Việc cần làm khi có Public IP + SSH key (thứ tự dự kiến):**
1. SSH vào VM, cài Node.js (LTS ≥20), git, Nginx, PM2 (`npm i -g pm2`).
2. Clone repo `github.com/maihoangdanh/personal-os` vào VM (cần deploy key hoặc HTTPS + token
   nếu repo private — kiểm tra lại repo đang public hay private).
3. Tạo `.env` thật trên VPS cho `apps/api` (DATABASE_URL Supabase Pooler, JWT secret **mới**
   cho production — không dùng lại secret dev, AI_API_*, TELEGRAM_*) — nhập tay trên VPS, không
   commit, không truyền qua git.
4. `npm install` ở root (workspaces) → build `apps/api` (tsc) + `apps/web` (`next build`).
5. Chạy bằng PM2: 1 process cho `apps/api` (port 3001), 1 process cho `apps/web`
   (`next start`, port 3000) → `pm2 save` + `pm2 startup` để tự khởi động lại khi VM reboot.
6. Cài Nginx: reverse proxy `/` → web:3000, `/api` → api:3001 (hoặc theo đúng path hiện tại của
   frontend gọi API — kiểm tra `NEXT_PUBLIC_API_URL` đang trỏ đâu để cấu hình đúng).
7. Mở port 80/443 trên Oracle Cloud Security List/NSG (mặc định OCI chặn hết port trừ 22 — đây
   là bước hay bị quên, phải mở thủ công trong VCN Security List).
8. Verify truy cập qua `http://<Public-IP>` trước, sau đó người dùng trỏ domain qua Cloudflare,
   rồi cấu hình SSL (Certbot hoặc Cloudflare Full/Strict).

---

## Phase 2 — Goal & Project ✅ Hoàn tất (trừ Gantt rút gọn)

- [x] ✅ Backend: Vision CRUD
- [x] ✅ Backend: Goal CRUD + KPI + `GET /goals/{id}/progress` (`progress = min(100, current/target*100)`, `currentValue` nhập tay)
- [x] ✅ Backend: Project CRUD + Milestone + `GET /projects/{id}/progress` (`progress` = % task DONE, tự tính trong transaction)
- [x] ✅ Backend: Task liên kết Project thật + `milestoneId` (validate cùng-project), rollup Project.progress/Milestone.isCompleted mỗi khi task đổi status
- [x] ✅ Frontend: Goal Tree (Vision→Goal→KPI, progress bar)
- [x] ✅ Frontend: Project List + chi tiết (Milestone list, progress)
- [x] ✅ Frontend: Kanban board (6 cột TaskStatus, kéo-thả) — verify live: kéo DONE→DOING làm progress/milestone cập nhật đúng
- [x] ✅ Frontend: Task form chọn Project/Milestone thật
- [ ] 🔄 Timeline/Gantt — **rút gọn có chủ đích** thành danh sách Milestone sắp theo `dueDate` (không vẽ Gantt chart thật)
- [x] ✅ Dashboard: Goal Progress + Projects progress widget

## Phase 3 — Finance ✅ Hoàn tất

Migration 012 (`transferGroupId`) + 013 (`category`) bổ sung so với schema gốc, công thức đã chốt
với người dùng (xem BACKLOG.md).

- [x] ✅ Backend: Wallet CRUD, `balance` tự tính lại từ tổng trong transaction
- [x] ✅ Backend: Transaction CRUD (Income/Expense) + Transfer riêng (2 dòng cùng `transferGroupId`, atomic)
- [x] ✅ Backend: Budget CRUD theo category (case-insensitive) + `GET /budgets/{id}/status`
- [x] ✅ Backend: Investment CRUD (CRUD thuần, không tự trừ ví — xem BACKLOG.md)
- [x] ✅ Backend: Asset CRUD
- [x] ✅ Backend: Report runtime (Income/Expense/Profit/Saving Rate) + Net Worth — verify bằng số liệu cụ thể (income 1000+expense 300+transfer 200 → report đúng 1000/300/700, không đếm Transfer trùng)
- [x] ✅ Frontend: trang `/finance` 6 tab (Tổng quan/Ví/Giao dịch/Ngân sách/Đầu tư/Tài sản)
- [x] ✅ Frontend: Transaction list + filter + category autocomplete + form Transfer riêng
- [x] ✅ Frontend: Budget progress bar (đỏ khi vượt ngân sách)
- [x] ✅ Frontend: Investment + Asset CRUD UI
- [x] ✅ Frontend: Report page + Net Worth breakdown — verify live bằng số tiền cụ thể
- [x] ✅ Dashboard: NetWorthWidget
- [x] ✅ 4 tab Giao dịch/Ngân sách/Đầu tư/Tài sản — verify live qua browser thật; phát hiện + fix 1 bug thật (tạo Investment/Asset xong list không refresh do thiếu invalidate cache — build/typecheck không bắt được, chỉ lộ khi click thật)
- [ ] ⏸️ Report dùng stat card thay vì pie chart — rút gọn có chủ đích

## Phase 4 — Intelligence (AI) ✅ Hoàn tất

Migration 014 (`AiConversation/AiMessage/AiSummary`) + 015 (`Journal`). LLM: custom router
OpenAI-compatible (`AI_API_BASE`/`AI_API_KEY`/`AI_MODEL` trong `apps/api/.env`, không commit).

- [x] ✅ Backend: AI Chat (lưu AiConversation/AiMessage, RAG có kiểm soát trên dữ liệu thật)
- [x] ✅ Backend: Tổng kết định kỳ (lưu AiSummary, upsert theo kỳ) — hiện SYNC, chưa có worker/cron
- [x] ✅ Backend: Phân loại task Eisenhower (runtime, gợi ý impact/urgency, priorityScore code tính)
- [x] ✅ Backend: Gợi ý lịch làm việc (runtime, đọc Task deadline + CalendarEvent thật)
- [x] ✅ Backend: Dự báo KPI/tài chính (runtime, từ chối kết luận khi thiếu dữ liệu thay vì bịa)
- [x] ✅ Frontend: trang `/ai` 4 tab (Chat/Tổng kết/Lịch gợi ý/Dự báo) + nút "Gợi ý AI" trong Task form — verify live: chat trả lời đúng số liệu thật (300.000đ khớp DB, transfer bị loại đúng)
- [ ] ⏸️ Gửi AI summary qua Telegram/push — chưa làm
- [ ] ⏸️ Tổng kết định kỳ tự động (cron/worker) — hiện SYNC theo yêu cầu, để dành khi dựng BullMQ

---

## Tổng số liệu thật (verify 2026-07-18)

- **21 module backend**: ai, asset, audit, auth, budget, calendar, common, finance, goal, habit, health, investment, journal, kpi, milestone, notification, project, task, transaction, vision, wallet
- **10 feature frontend**: ai, auth, calendar, dashboard, finance, goals, habit, notification, projects, tasks
- **15 migration** Postgres đã apply vào Supabase (001→015), không lệch
- **101/101 unit test pass**, typecheck backend + frontend sạch
- **29 commit** trên GitHub (`github.com/maihoangdanh/personal-os`)

## Gap thật sự còn lại (không phải hoãn có chủ đích)

Không còn gap nào — **Journal frontend** và **verify 4 tab Finance** đã đóng ngày 2026-07-18
(commit `9a9e359`), kèm 1 bug thật được phát hiện + fix (invalidate cache thiếu cho Investment/
Asset). Toàn bộ roadmap 4 phase giờ đã hoàn tất kể cả phần trước đây bị bỏ sót.

## Việc hoãn có chủ đích (tổng hợp — chi tiết xem [BACKLOG.md](BACKLOG.md))

| Việc | Lý do hoãn | Khi nào quay lại |
|------|-----------|------------------|
| Session/refresh-token store | MVP chưa cần revoke token | Giai đoạn "auth-hardening" trước deploy production |
| Calendar recurrence | Không tài liệu nào yêu cầu | Nếu phát sinh nhu cầu (sự kiện lặp) |
| Token localStorage → httpOnly cookie | Không cần thiết khi chạy local 1 mình | Trước khi deploy production thật |
| Ngưỡng Eisenhower | Suy luận, chưa xác nhận qua dùng thật | Sau vài ngày dùng thử |
| Redis/BullMQ | Cron polling đủ cho 1 user | Nếu scale nhiều user/nhiều instance |
| Timeline/Gantt thật | List Milestone theo ngày đủ dùng cho MVP | Nếu cần trực quan hoá đường thời gian |
| Report Finance dạng pie chart | Stat card đủ rõ ràng | Nếu muốn trực quan hoá hơn |
| AI Summary tự động (cron/worker) | Hiện bấm tay qua UI | Khi dựng BullMQ |
| Deploy VPS/Docker + CI/CD | Theo đúng yêu cầu: chạy ổn local trước | Sau khi dùng thật ổn định ở local |

---

## Bug phát hiện khi dùng thật (đã fix)

| Ngày | Bug | Nguyên nhân | Fix |
|------|-----|------------|-----|
| 2026-07-20 | `/settings` crash `ReferenceError: require is not defined` khi chạy `npm run dev` thật trên máy người dùng | `tailwind.config.ts` dùng `require("tailwindcss-animate")`, nhưng Next.js 15 nạp file này qua ESM loader — không có `require` | Đổi sang `import tailwindcssAnimate from "tailwindcss-animate"` tĩnh (commit `2c88d63`) |

## Việc cần làm ngay tiếp theo (đề xuất thứ tự)

**Không còn gap nào trong roadmap 4 phase.** Việc còn lại thuần là nâng cấp/vận hành:

1. Dùng thật hàng ngày để tinh chỉnh ngưỡng Eisenhower + phát hiện thêm bug ẩn (đã có 1 ca thật —
   xem bảng trên).
2. Xử lý dần các mục "hoãn có chủ đích" khi có nhu cầu thật.
3. Khi sẵn sàng: CI/CD pipeline + deploy VPS (Docker/Nginx).
