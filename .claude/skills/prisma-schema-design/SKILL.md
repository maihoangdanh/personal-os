---
name: prisma-schema-design
description: >
  Quy trình thêm/sửa model, enum, quan hệ, index và migration trong schema Prisma của Personal
  OS (packages/database). Dùng khi cần thiết kế bảng mới, thêm field, đổi quan hệ, hoặc viết
  migration cho một module. Dùng lại khi sửa schema module đã có hoặc thêm module mới vào
  roadmap (Goal, Project, Task, Habit, Finance, Notification, AI...).
---

# Prisma Schema Design

## Khung schema đã chốt

**Datasource**: PostgreSQL. **Generator**: `prisma-client-js`.

**Enums cốt lõi**: `UserRole`, `TaskStatus`, `ProjectStatus`, `GoalStatus`, `TransactionType`,
`WalletType`, `NotificationType`.

**Core models đã định**: `Workspace, User, Vision, Goal, KPI, Project, Milestone, Task,
Checklist, TimeLog, Habit, HabitLog, CalendarEvent, Wallet, Transaction, Budget, Investment,
Asset, Tag, TaskTag, Attachment, Notification, ActivityLog`.

**Migration strategy** (một migration/module, theo đúng thứ tự phụ thuộc):
`001_auth → 002_goal → 003_project → 004_task → 005_habit → 006_finance → 007_notification →
008_ai`.

> Danh sách trên là khung tổng quát rút từ `09_Prisma_Schema_Design_Personal_OS_v1.pdf`. Field
> cấp chi tiết (tên cột chính xác, kiểu dữ liệu, ràng buộc) nằm trong
> `03_Database_Design_ERD_Detailed_v1.pdf` và `10_SQL_Database_Design_Personal_OS_v1.pdf` — Read
> phần liên quan trước khi viết field mới, đừng suy diễn từ tên model.

## Quy tắc field bắt buộc trên mọi model

```prisma
model Example {
  id        String    @id @default(uuid())
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?          // soft delete — không hard-delete
  // ... field nghiệp vụ
  @@index([status])            // nếu model có field status
  @@index([deadline])          // nếu model có field deadline
  @@index([userId])            // nếu model thuộc về 1 user
  @@index([projectId])         // nếu model thuộc về 1 project
}
```

Lý do bắt buộc `deletedAt` thay vì hard-delete: Personal OS lưu dữ liệu tài chính và nhật ký cá
nhân — xoá nhầm không thể phục hồi là rủi ro nghiêm trọng hơn nhiều so với chi phí thêm 1 cột.

## Quy trình thêm model/field mới

1. Xác định module sở hữu model (map vào migration strategy ở trên — không tạo migration mới
   ngoài thứ tự đã định trừ khi thực sự là module mới chưa có trong danh sách).
2. Đọc phần liên quan trong `03_Database_Design_ERD_Detailed_v1.pdf` để lấy field/kiểu dữ liệu/
   ràng buộc chính xác.
3. Xác định model có cần scope theo `workspaceId`/`userId` không (multi-tenant-ready — xem
   nguyên tắc trong `.claude/agents/database-architect.md`).
4. Viết model vào `schema.prisma`, khai báo `@relation` rõ ràng hai chiều.
5. Thêm index theo quy tắc trên.
6. Chạy migration: `npx prisma migrate dev --name {số}_{module}_{mô_tả_ngắn}`.
7. Nếu cần seed data cho model mới, cập nhật `prisma/seed.ts`.
8. Ghi tóm tắt thay đổi vào `_workspace/{phase}_database_{module}.md` (model, field, quan hệ,
   index, lý do quyết định nếu không hiển nhiên) — backend-engineer đọc file này để biết chính
   xác Prisma Client type mới.

## Quan hệ nhiều-nhiều (join table tường minh)

Personal OS đã dùng pattern join table tường minh (`TaskTag` nối `Task`↔`Tag`), không dùng
implicit many-to-many của Prisma — giữ nhất quán khi thêm quan hệ n-n mới (v.d. Project↔Member
khi mở rộng team sau này) để có chỗ gắn thêm metadata trên quan hệ (role, addedAt...).

## Transaction cho nghiệp vụ nhiều bước

Nghiệp vụ đụng nhiều bảng trong một hành động (v.d. hoàn thành Task → cộng điểm Habit liên quan
→ cập nhật Goal progress) phải bọc trong `prisma.$transaction([...])` — không để backend-engineer
tự gọi tuần tự nhiều `.create()`/`.update()` rời rạc, dễ tạo trạng thái nửa vời khi lỗi giữa
chừng.
