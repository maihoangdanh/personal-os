---
name: ai-feature-design
description: >
  Quy trình thiết kế và implement tính năng AI cho Personal OS — phân loại task theo Eisenhower,
  gợi ý lịch làm việc tối ưu, tổng kết ngày/tuần/tháng, dự báo KPI/tài chính, AI chat trên dữ
  liệu cá nhân. Dùng khi thêm bất kỳ tính năng nào dùng LLM hoặc suy luận trên dữ liệu người
  dùng thật (Phase 4 — Intelligence — trong roadmap).
---

# AI Feature Design

## Nguyên tắc cốt lõi: grounding trên dữ liệu thật

Personal OS quản lý task, mục tiêu và **tài chính thật** của người dùng. Mọi câu trả lời AI về
số liệu (chi tiêu, tiến độ KPI, dự báo tài sản) phải được tính từ truy vấn DB thật qua
repository, không phải model tự suy diễn từ context ngắn hoặc "làm tròn cho hợp lý". Nếu dữ liệu
nguồn không đủ để trả lời chính xác, trả lời "không đủ dữ liệu" thay vì đoán — bịa số tài chính
gây hại thật cho người dùng, khác với một câu trả lời sai trong demo.

## 5 nhóm tính năng AI (theo PRD Phase 4)

| Tính năng | Sync/Async | Vị trí code | Ghi chú |
|-----------|-----------|-------------|---------|
| Tự phân loại task theo urgent/important | Async (khi tạo/sửa task hàng loạt) hoặc sync (khi tạo 1 task) | `apps/api/src/ai` (sync) hoặc job `AI Background Jobs` | Input: title/description task. Output: gợi ý quadrant Eisenhower — vẫn để user override |
| Gợi ý lịch làm việc tối ưu theo thời gian rảnh | Sync (user bấm "gợi ý lịch") | `apps/api/src/ai` | Cần đọc CalendarEvent + Task deadline hiện có |
| Tổng kết ngày/tuần/tháng | Async, job định kỳ | job `Daily Review` / `Weekly Summary` trong `apps/worker` | Tổng hợp Task hoàn thành, Habit streak, Finance trong kỳ — build từ số liệu thật rồi mới đưa model viết văn tóm tắt |
| Dự báo tiến độ KPI/tài chính | Sync hoặc async tuỳ độ nặng | `apps/api/src/ai` | Dự báo dựa trên trend số liệu lịch sử thật (tính toán trước, model chỉ diễn giải kết quả, không tự tính) |
| AI Chat trên dữ liệu cá nhân | Sync, cần phản hồi tức thời | `apps/api/src/ai` | Dạng RAG có kiểm soát: xác định intent câu hỏi → query đúng bảng liên quan → đưa kết quả query vào context → model chỉ diễn giải, không tự tính toán số |

> Chi tiết flow/prompt cụ thể cho từng tính năng nằm trong `07_AI_Design_Personal_OS_v1.pdf`
> (đường dẫn trong `personal-os-team/references/source-docs.md`) — đọc phần liên quan trước khi
> viết prompt, bảng trên chỉ là khung phân loại sync/async.

## Quy tắc thiết kế prompt/model

- Tách rõ **bước tính toán** (code, truy vấn DB, không phải model) và **bước diễn giải** (model
  viết văn tự nhiên từ số liệu đã có sẵn) — không để model vừa tính vừa viết trong một bước,
  giảm rủi ro bịa số.
- Model/chi phí: chọn model rẻ hơn cho tác vụ phân loại/tóm tắt đơn giản, model mạnh hơn cho AI
  Chat cần suy luận đa bước — không dùng một model cho mọi việc nếu chi phí chênh lệch đáng kể.
- Giới hạn phạm vi dữ liệu đưa vào context theo đúng `userId`/`workspaceId` của người hỏi — không
  bao giờ để truy vấn tràn sang dữ liệu user khác dù là lỗi vô tình trong query.

## Quy trình implement tính năng AI mới

1. Đọc phần liên quan trong `07_AI_Design_Personal_OS_v1.pdf`.
2. Xác định sync hay async (bảng trên), phối hợp `backend-engineer` nếu cần route API mới hoặc
   `bullmq-worker-jobs` nếu cần job mới.
3. Xác định dữ liệu nguồn cần truy vấn — nếu repository chưa có, yêu cầu `backend-engineer` bổ
   sung method thay vì tự query Prisma trực tiếp từ module AI (giữ Clean Architecture).
4. Nếu cần lưu kết quả AI (bảng summary, cache dự báo), yêu cầu `database-architect` thêm model.
5. Viết logic: query dữ liệu thật → tính toán (code) → prompt model chỉ để diễn giải/viết văn.
6. Test bằng dữ liệu thật của một user mẫu, xác nhận số liệu AI đưa ra khớp 100% với query trực
   tiếp DB.
7. Ghi tóm tắt vào `_workspace/{phase}_ai_{tính năng}.md`: nguồn dữ liệu, sync/async, model dùng.
