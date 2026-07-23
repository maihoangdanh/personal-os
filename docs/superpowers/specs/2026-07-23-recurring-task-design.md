# Task lặp lại (Recurring Task) — thiết kế

Trạng thái: **Thiết kế đã trình bày và được duyệt** (2026-07-23) — sẵn sàng viết implementation
plan. CHƯA code.

Nguồn: brainstorm trực tiếp với người dùng, phiên 2026-07-23.

## Vấn đề

Người dùng có những việc lặp lại mỗi ngày/mỗi tuần thuộc về 1 Project cụ thể, cần xử lý (vd
"mỗi ngày check tài khoản TikTok Ads") — cần có **impact/urgency** (xếp Eisenhower), **timer**,
và deadline cụ thể — không phù hợp với Habit Tracker (Habit là thói quen cá nhân, không gắn
Project, không có impact/urgency/timer). Task hiện tại không có khái niệm lặp lại — phải tự tạo
lại thủ công mỗi ngày.

## Quyết định đã chốt (qua AskUserQuestion, không đoán)

| Câu hỏi | Quyết định |
|---|---|
| Tần suất cần hỗ trợ? | **Hàng ngày + Hàng tuần (chọn thứ cụ thể)** — không cần RRULE đầy đủ |
| Cơ chế sinh task? | **Sinh Task MỚI mỗi kỳ** (Task instance độc lập, giữ lịch sử) — KHÔNG dùng chung 1 Task rồi tự reset status |
| Bỏ lỡ 1 ngày thì sao? | **Tự động archive** task bị lỡ khi sinh task mới (không tích tụ, không xoá cứng — giữ lịch sử qua status ARCHIVED) |
| Dừng 1 chuỗi lặp bằng gì? | **Nút "Dừng lặp"** ngay trên chính Task instance đang hiện (không cần màn hình quản lý riêng) |

## Kiến trúc

### 1. Schema — model mới `RecurringTaskTemplate`

Tách biệt khỏi `Task` (Task giữ nguyên, không đổi ý nghĩa các field hiện có). Thêm vào
`packages/database/prisma/schema.prisma`:

```prisma
enum RecurrenceFrequency {
  DAILY
  WEEKLY
}

model RecurringTaskTemplate {
  id                String              @id @default(uuid()) @db.Uuid
  projectId         String              @db.Uuid   // scoping giống Task: ownership qua Project→Goal→Vision→User
  title             String              @db.VarChar(255)
  description       String?             @db.Text
  impact            Int                 @db.SmallInt
  urgency           Int                 @db.SmallInt
  estimateMinute    Int?
  frequency         RecurrenceFrequency
  weekDays          Int[]               // ISO weekday 1=T2..7=CN; rỗng khi frequency=DAILY
  timeOfDay         String?             @db.VarChar(5) // "HH:mm", null = chỉ có ngày, không giờ cụ thể
  active            Boolean             @default(true) // false = đã "Dừng lặp", cron bỏ qua
  lastGeneratedDate DateTime?           @db.Date        // chống sinh trùng nếu cron chạy lại cùng ngày
  createdAt         DateTime            @default(now()) @db.Timestamptz(6)
  updatedAt         DateTime            @updatedAt @db.Timestamptz(6)
  deletedAt         DateTime?           @db.Timestamptz(6)

  project Project @relation(fields: [projectId], references: [id], onDelete: Restrict, onUpdate: Cascade)
  tasks   Task[]  // các instance đã sinh từ template này
}
```

Thêm vào `model Task` hiện có: cột `recurringTemplateId String? @db.Uuid` + relation tới
`RecurringTaskTemplate` (`onDelete: SetNull` — xoá template không kéo theo xoá Task đã sinh,
đúng tinh thần "Task instance độc lập hoàn toàn" đã chốt).

Ownership scoping cho `RecurringTaskTemplate` dùng đúng pattern `ownedByUser()` hiện có trong
`apps/api/src/task/task.repository.ts` (`{ project: { goal: { vision: { userId } } } }`), áp lên
`project` relation của template.

### 2. Cron sinh/archive hàng ngày

Module mới `apps/api/src/task/recurring-task.scheduler.ts`, theo ĐÚNG pattern
`apps/api/src/notification/notification.scheduler.ts` (đã có, dùng `@nestjs/schedule`). Chạy
`@Cron` 1 lần/ngày vào đầu giờ sáng (giờ server — đơn giản hoá có chủ đích, không tính theo
`user.timezone` riêng vì hệ thống hiện chỉ có 1 user thật).

Với mỗi `RecurringTaskTemplate` có `active=true`:
1. **Archive các instance quá hạn chưa DONE**: tìm Task có `recurringTemplateId` = template này,
   `status` không phải DONE/ARCHIVED, `deadline < hôm nay` (KHÔNG chỉ đúng "hôm qua" — dùng `<`
   để tự bắt kịp nếu cron lỡ chạy 1-2 ngày do server down, không bỏ sót instance cũ hơn) → set
   `status=ARCHIVED` (tái dùng đúng transaction rollup hiện có trong `TaskRepository.update()` —
   Project.progress vẫn tính lại đúng vì ARCHIVED không tính vào % DONE, xem `common/rollup.ts`).
2. **Sinh instance hôm nay nếu lịch khớp**: DAILY → luôn khớp; WEEKLY → khớp khi thứ hôm nay nằm
   trong `weekDays`. Nếu khớp VÀ `lastGeneratedDate` khác hôm nay (chống sinh trùng): tạo Task mới
   (`title/description/projectId/impact/urgency/estimateMinute` copy từ template,
   `priorityScore = impact×urgency`, `status=TODO`, `deadline` = hôm nay lúc `timeOfDay` (hoặc
   23:59 nếu không set giờ), `recurringTemplateId` = template.id), rồi cập nhật
   `lastGeneratedDate` = hôm nay.

### 3. API mới (module `recurring-task`, theo cấu trúc chuẩn NestJS module hiện có)

- `POST /recurring-tasks` — tạo template. Sau khi tạo, **sinh luôn instance đầu tiên ngay lập
  tức** nếu hôm nay khớp lịch (tái dùng logic bước 2 ở trên, gọi trực tiếp không đợi cron) — để
  người dùng thấy task ngay, không phải chờ tới sáng hôm sau.
- `PATCH /recurring-tasks/:id` — hiện tại chỉ cần hỗ trợ `{ active: false }` (nút "Dừng lặp").
  Không cần sửa frequency/title qua endpoint này ở bản đầu (YAGNI — chưa có yêu cầu sửa chuỗi
  đang chạy, chỉ cần bật/tắt).

Không cần `GET /recurring-tasks` (list) cho bản đầu — không có yêu cầu màn hình quản lý riêng
(đã chốt: nút "Dừng lặp" nằm ngay trên Task, không cần list riêng).

### 4. Frontend

- `TaskResponseDto` (backend) + type `Task` (frontend, `apps/web/src/features/tasks/types/task.types.ts`)
  thêm field `recurringTemplateId: string | null`.
- `TaskFormDialog.tsx` — thêm mục "Lặp lại": select Không/Hàng ngày/Hàng tuần; khi Hàng tuần hiện
  thêm 7 checkbox thứ. Chỉ hiện mục này khi TẠO task mới (không sửa được tần suất của task đã tồn
  tại qua form này — sửa tần suất ngoài phạm vi bản đầu).
- Khi sửa (edit) một Task có `recurringTemplateId != null`: hiện thêm nút "Dừng lặp" trong dialog,
  gọi `PATCH /recurring-tasks/{recurringTemplateId}` `{active:false}`, đóng dialog, invalidate
  task list.

## Việc CHƯA làm / để ngỏ (ngoài phạm vi bản đầu)

- Sửa tần suất/giờ của 1 chuỗi đang chạy (chỉ có bật/tắt, chưa có sửa).
- Cron theo `user.timezone` riêng từng user (hệ thống hiện 1 user, dùng giờ server).
- Màn hình liệt kê tất cả chuỗi lặp đang chạy (không có yêu cầu).
- Task lặp theo tháng/theo ngày cụ thể trong tháng (chỉ DAILY/WEEKLY theo quyết định đã chốt).

## Bước tiếp theo

Viết implementation plan (writing-plans skill) từ spec này, decompose thành: (1) DB — schema +
migration, (2) Backend — module `recurring-task` (CRUD tối thiểu + scheduler cron + tích hợp
`recurringTemplateId` vào TaskResponseDto), (3) Frontend — TaskFormDialog mở rộng + nút "Dừng lặp".
