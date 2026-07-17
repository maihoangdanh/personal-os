# Backlog — việc đã hoãn có chủ đích

Không phải bug, không phải thiếu sót — đây là các quyết định **chủ động hoãn lại** trong lúc build
Phase 1, ghi lại để không quên và biết chỗ nào cần quay lại sửa/bổ sung.

## Reminder — gửi Telegram thật

- **Hiện trạng**: model `Notification` đã có `scheduledFor`/`sentAt`/`snoozedUntil` (migration 010).
  Cơ chế bắn đúng giờ dự kiến dùng cron polling trong NestJS (`@nestjs/schedule`, không cần Redis)
  — quét `scheduledFor <= now AND sentAt IS NULL` mỗi phút.
- **Hoãn**: tích hợp gửi thật qua Telegram Bot API. Cần **Telegram Bot Token** (tạo qua @BotFather)
  trước khi làm được — người dùng chưa cung cấp, để sau.
- **Khi làm lại**: hỏi người dùng token, thêm `TELEGRAM_BOT_TOKEN` vào `.env` apps/api, wire vào
  cron job đã build. Phase 1 tạm thời reminder chỉ hiển thị trong app (badge/list), không push ra
  ngoài.

## Auth — Session/refresh-token store

- **Hiện trạng**: logout/refresh hoàn toàn stateless (JWT xác thực chữ ký, không lưu DB) — không
  thể thu hồi (revoke) token trước khi hết hạn.
- **Hoãn**: bảng `sessions`/`refresh_tokens` để revoke được — để dành giai đoạn "auth-hardening"
  (thường trước khi có nhiều user thật hoặc trước khi deploy production).

## Calendar — recurrence (sự kiện lặp lại)

- **Hiện trạng**: `CalendarEvent` chỉ hỗ trợ sự kiện đơn (single-occurrence). Không tài liệu thiết
  kế nào (PRD/Business Rules/ERD) định nghĩa recurrence.
- **Hoãn**: nếu sau này cần (v.d. "họp team lặp mỗi thứ 2"), thêm 1 cột nullable
  `recurrenceRule` (dạng RRULE) — additive, không phá gì hiện có.

## Dashboard — chỉ mới có "Today's Tasks"

- **Hiện trạng**: `/dashboard` hiện chỉ hiển thị task hôm nay. Bản đầy đủ theo PRD gốc còn thiếu:
  Habit Streak, Goal Progress, Net Worth, Investment %, Projects progress, Finance pie chart.
- **Hoãn**: tự nhiên vì các module Goal/Project/Finance/Habit chưa build. Quay lại bổ sung từng
  widget khi module tương ứng xong (Phase 2 = Goal/Project, Phase 3 = Finance, Habit ở nốt Phase 1).

## Frontend — lưu token trong localStorage

- **Hiện trạng**: accessToken/refreshToken lưu `localStorage` — đơn giản, đủ dùng cho MVP local,
  nhưng có rủi ro XSS đọc trộm token (đã ghi rõ trong code `lib/auth-storage.ts`).
- **Hoãn**: nâng cấp sang httpOnly cookie cho refreshToken khi chuẩn bị deploy production thật
  (không cần thiết lúc chạy local một mình).

## Eisenhower Matrix — ngưỡng phân loại

- **Hiện trạng**: `impact >= 3` hoặc `urgency >= 3` được coi là "cao" — suy luận (điểm giữa thang
  1–5), không tài liệu nào chốt rõ ngưỡng này. Gói trong 1 hằng số `EISENHOWER_HIGH_THRESHOLD`
  (frontend) nên sửa nhanh nếu sai.
- **Hoãn**: chưa cần xác nhận ngay — dùng thử thực tế vài ngày rồi tinh chỉnh nếu thấy phân loại
  sai cảm giác.

## Goal.currentValue — auto rollup từ KPI/Project

- **Quyết định**: Phase 2 để user tự nhập tay `currentValue`, KHÔNG tự động tổng hợp từ KPI/Project.
- **Lý do**: doc 02 chỉ nói mơ hồ "cập nhật từ KPI hoặc Project", không có công thức rollup rõ ràng
  (trung bình cộng? trọng số theo KPI nào?) — tự bịa công thức rủi ro hơn để user nhập tay.
- **Khi nào quay lại**: nếu dùng thật thấy bất tiện, định nghĩa rõ công thức rồi thêm logic tự tính.

## Finance — công thức đã chốt (Phase 3)

- **Wallet.balance** = Σ(INCOME) − Σ(EXPENSE) của ví đó, backend tự tính trong transaction. Transfer
  giữa 2 ví = 2 dòng Transaction (EXPENSE ví nguồn + INCOME ví đích) cùng `transferGroupId`, không
  cần enum TRANSFER riêng — công thức balance không đổi, an toàn nhất cho con số quan trọng nhất.
- **Saving Rate** = (Income − Expense) / Income — công thức chuẩn phổ biến, doc không định nghĩa
  khác nên dùng định nghĩa thông dụng nhất. *(Quyết định của leader, chưa hỏi user — nếu user có
  định nghĩa khác thì đổi công thức, không phải đổi schema.)*
- **Monthly Report** = tính runtime từ Transaction mỗi lần gọi API, KHÔNG lưu bảng report riêng —
  tránh rủi ro lệch dữ liệu giữa report đã lưu và transaction thực tế.
- **Net Worth** = Σ Wallet.balance + Σ Investment.currentValue + Σ Asset.value. Chưa có khoản
  nợ/liability (không có bảng đó trong schema, PRD gốc không nhắc) — nếu cần theo dõi nợ, đây là
  việc để dành sau (thêm model Liability hoặc field âm trên Asset).
- **Budget theo danh mục**: user đã xác nhận cần (khớp PRD: Food/Travel/Shopping/Rent/Family/
  Entertainment) — thêm field `category` dạng text đơn giản trên Transaction + Budget, không dựng
  bảng Category riêng (tránh phức tạp thừa cho MVP).

## Redis/BullMQ

- **Quyết định**: KHÔNG dùng cho Phase 1 — cron polling trong NestJS đủ cho nhu cầu 1 user.
- **Khi nào quay lại**: nếu scale lên nhiều user thật/nhiều instance, đổi cron polling sang BullMQ
  (Upstash Redis, không cần Docker) — đổi cơ chế bên trong, không đổi API.
