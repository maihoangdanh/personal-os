---
name: cross-boundary-qa
description: >
  Phương pháp QA so sánh chéo ranh giới cho Personal OS — đối chiếu response API thật với type/
  hook frontend thật, truy vết state machine, kiểm tra routing. Dùng ngay sau khi backend +
  frontend của một module cùng hoàn thành một phần, không chờ tới cuối dự án. Dùng lại mỗi khi
  một module mới báo "xong" trước khi coi là done thật sự.
---

# Cross-Boundary QA

## Vì sao "build pass" không đủ

TypeScript generic như `useQuery<TaskResponse[]>()` compile thành công ngay cả khi response
runtime thực tế là `{ tasks: [...] }` thay vì mảng trần — type-check không bắt được lệch giữa
những gì backend *thực sự* trả và những gì frontend *giả định*. Phải so sánh trực tiếp code hai
bên, không chỉ tin vào type annotation.

## 4 loại ranh giới phải kiểm tra cho mỗi module

### 1. Response API ↔ Type/hook frontend
- Đọc đồng thời DTO response thật trong `apps/api/src/{module}` **và**
  `apps/web/src/features/{module}/types/`.
- Kiểm tra: có wrapping không (`{ data: [...] }` vs mảng trần)? field nào optional/nullable ở
  backend có được frontend xử lý null không? kiểu ngày tháng — backend trả ISO string qua JSON,
  frontend type phải là `string` rồi parse, không phải `Date` trực tiếp.
- Endpoint nào tồn tại nhưng không có hook nào gọi tới → đánh dấu "chưa dùng", xác nhận là chủ ý
  hay thiếu sót.

### 2. Đường dẫn file ↔ Link/router
- Đối chiếu path thật của page trong `apps/web/src/app/` (chú ý route group `(group)` bị xoá
  khỏi URL, dynamic segment `[id]`) với mọi `href=`, `router.push(`, `redirect(` trong code.

### 3. State machine (status enum)
- Đối chiếu enum Prisma (`TaskStatus`, `ProjectStatus`, `GoalStatus`...) + logic chuyển trạng
  thái trong service với mọi nơi code thực sự gọi `.update({ status: ... })`.
- Tìm chuyển tiếp được "định nghĩa" trong logic nhưng không nơi nào trong code thực sự set được
  trạng thái đó (dead transition — UI sẽ treo chờ mãi ở trạng thái trung gian).

### 4. DB → API → UI field naming
- Tên cột `schema.prisma` → tên field response DTO → tên field type frontend phải nhất quán
  toàn chuỗi. Prisma tự map field camelCase, nhưng kiểm tra tầng DTO không vô tình đổi tên.

## Quy trình QA một module

1. Nhận `SendMessage` báo module sẵn sàng (từ backend-engineer và/hoặc frontend-engineer), kèm
   đường dẫn file thật.
2. Mở đồng thời file backend + file frontend liên quan (không đọc tuần tự rồi nhớ lại — mở cùng
   lúc để so sánh trực tiếp).
3. Chạy qua checklist 4 mục ở trên, đánh dấu pass/fail/chưa xác thực cho từng mục — không dùng
   nhận xét mơ hồ.
4. Nếu có dev server chạy được, thử luồng thật (không chỉ đọc code): với module thuộc luồng E2E
   chính (Login, CRUD Task, CRUD Project, Finance, AI Chat), bắt buộc thử chạy thật.
5. Phát hiện lệch → `SendMessage` ngay cho cả hai agent liên quan, kèm file:dòng cụ thể + cách
   sửa đề xuất.
6. Ghi báo cáo vào `_workspace/qa_{module}_report.md`.
7. Re-check sau khi agent sửa — không coi module "done" tới khi checklist pass hết hoặc có lý do
   rõ ràng được leader chấp nhận cho phần chưa pass.

## Luồng E2E bắt buộc theo Testing Strategy

Login · CRUD Task · CRUD Project · Finance · AI Chat — 5 luồng này phải được thử chạy thật (không
chỉ đọc code) trước khi coi một phase là hoàn tất, vì đây là luồng người dùng chạm vào đầu tiên
và thường xuyên nhất.
