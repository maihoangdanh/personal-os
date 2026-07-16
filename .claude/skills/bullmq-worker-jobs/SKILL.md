---
name: bullmq-worker-jobs
description: >
  Quy trình viết job nền BullMQ cho apps/worker của Personal OS — Reminder, Notification,
  Email, Daily Review, Weekly Summary, AI Background Jobs. Dùng khi một tác vụ cần chạy bất
  đồng bộ/định kỳ thay vì trong request-response của API (gửi thông báo hẹn giờ, tổng kết định
  kỳ, xử lý AI nặng).
---

# BullMQ Worker Jobs

## Khi nào dùng job nền thay vì API đồng bộ

Đưa vào hàng đợi khi: (a) tác vụ không cần phản hồi ngay cho người dùng, (b) tác vụ chạy theo
lịch (reminder tại thời điểm định trước, weekly summary mỗi Chủ Nhật), hoặc (c) tác vụ tốn thời
gian đủ để block request nếu chạy đồng bộ (AI phân loại hàng loạt, tạo báo cáo PDF). AI Chat
(cần phản hồi tức thời) vẫn là API đồng bộ, không đưa vào queue.

## Các hàng đợi đã định nghĩa

`Reminder`, `Notification`, `Email`, `Daily Review`, `Weekly Summary`, `AI Background Jobs`
(theo System Architecture — không tự tạo queue mới ngoài danh sách này trừ khi có nhu cầu rõ
ràng chưa được cover).

## Cấu trúc mỗi job

```
apps/worker/src/{queue}/
  {queue}.processor.ts   # xử lý job — gọi service/repository từ apps/api qua package dùng chung
  {queue}.producer.ts    # nơi khác trong hệ thống enqueue job (thường gọi từ apps/api service)
  {job-name}.dto.ts      # job data contract — typed, không dùng object tự do
```

## Nguyên tắc bắt buộc

- **Job data phải typed và tối thiểu**: chỉ truyền ID (`userId`, `taskId`...), không truyền cả
  object lớn vào job data — processor tự query DB mới nhất khi chạy, tránh dùng dữ liệu cũ nếu
  job bị delay.
- **Idempotent**: một job có thể bị BullMQ retry — xử lý phải an toàn khi chạy lại (v.d. kiểm
  tra đã gửi notification này chưa trước khi gửi lại, không cộng dồn 2 lần).
- **Retry + backoff**: cấu hình `attempts` + `backoff` hợp lý theo loại job (Email/Notification
  retry nhiều lần backoff ngắn; AI job retry ít lần backoff dài hơn vì chi phí cao hơn).
- **Reminder job** dùng BullMQ delayed job (`delay` theo thời điểm reminder), không dùng cron
  polling database liên tục — tốn tài nguyên và không chính xác tới phút.
- **Daily Review / Weekly Summary** dùng BullMQ repeatable job (cron pattern), gọi service tổng
  hợp dữ liệu ngày/tuần rồi tạo Notification + (nếu Phase 4) bản tóm tắt AI.
- **AI Background Jobs**: phối hợp với ai-engineer — job này chỉ lo phần hạ tầng (enqueue,
  retry, kết quả lưu đâu); logic AI thực tế (prompt, model) thuộc quyền sở hữu ai-engineer.

## Quy trình thêm job mới

1. Xác định queue phù hợp trong danh sách đã định (không tạo queue mới tuỳ tiện).
2. Viết DTO cho job data (typed, tối thiểu).
3. Viết processor gọi repository/service thật — không duplicate business logic đã có trong
   `apps/api`, import lại từ package dùng chung nếu có thể.
4. Cấu hình retry/backoff phù hợp loại job.
5. Viết producer ở nơi trigger job (thường trong service của `apps/api`).
6. Test: chạy job giả lập với dữ liệu thật, xác nhận idempotent khi chạy 2 lần.
7. Ghi tóm tắt vào `_workspace/{phase}_backend_{queue}.md`.
