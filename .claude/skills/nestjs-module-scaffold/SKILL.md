---
name: nestjs-module-scaffold
description: >
  Quy trình dựng một module NestJS hoàn chỉnh cho apps/api của Personal OS theo Clean
  Architecture (controller/service/repository/dto/entities/validators/tests). Dùng khi tạo
  module API mới (Auth, Task, Project, Goal, Habit, Finance, Notification, Dashboard) hoặc thêm
  endpoint vào module đã có.
---

# NestJS Module Scaffold

## Cấu trúc bắt buộc mỗi module

```
apps/api/src/{module}/
  {module}.controller.ts   # nhận HTTP request, gọi service, trả response — KHÔNG business logic
  {module}.service.ts      # business logic — KHÔNG truy cập HTTP (Request/Response) trực tiếp
  {module}.repository.ts   # truy cập Prisma — CHỈ nơi duy nhất gọi prisma.{model}
  dto/
    create-{model}.dto.ts
    update-{model}.dto.ts
    {model}-response.dto.ts
  entities/
    {model}.entity.ts
  validators/
    {rule}.validator.ts
  {module}.module.ts
  __tests__/
    {module}.service.spec.ts
    {module}.controller.spec.ts
```

## Nguyên tắc phân tầng (không thương lượng)

- **Controller không gọi Prisma trực tiếp** — vi phạm nguyên tắc này là lý do số một khiến
  business logic bị rải rác không test được. Controller chỉ: validate DTO (qua `class-validator`),
  gọi đúng 1 method service, map kết quả sang response DTO.
- **Service không truy cập HTTP trực tiếp** — không inject `@Req()`/`@Res()` vào service. Nếu
  cần thông tin request (user hiện tại), truyền qua tham số từ controller.
- **Repository là nơi duy nhất gọi Prisma Client** cho module đó — service gọi repository, không
  bao giờ tự `import { PrismaClient }` trong service.
- **DTO khớp chính xác API Specification**: trước khi đặt tên field trong DTO, đọc phần module
  tương ứng trong `04_API_Specification_Personal_OS_v1.pdf` (đường dẫn trong
  `personal-os-team/references/source-docs.md`). Đây là bước bắt buộc — tự đặt tên field theo
  cảm tính là nguồn lỗi ranh giới số một mà qa-inspector sẽ bắt được.

## Quy trình dựng module mới

1. Xác nhận `database-architect` đã hoàn tất schema cho module (nhận `SendMessage` báo sẵn
   sàng) — không bắt đầu repository trước khi có schema thật.
2. Đọc `04_API_Specification_Personal_OS_v1.pdf` phần module này để lấy danh sách endpoint +
   request/response shape chính xác.
3. Đọc `02_Business_Rules_Personal_OS_v1.pdf` phần module này để lấy validation rule/ngưỡng số.
4. Viết `repository` trước (chỉ CRUD + query cần thiết), rồi `service` (business logic + gọi
   repository), rồi `controller` (map HTTP ↔ service).
5. Viết DTO với `class-validator` decorator đầy đủ (`@IsString()`, `@IsOptional()`,
   `@IsEnum()`...) — validation ở biên hệ thống, không chỉ dựa vào TypeScript type.
6. Viết unit test cho service (business logic là phần quan trọng nhất cần test), integration
   test cho API endpoint.
7. Đăng ký module vào `AppModule`.
8. Ghi endpoint/DTO thật đã tạo vào `_workspace/{phase}_backend_{module}.md` — copy chính xác
   từ code, không diễn giải — để frontend-engineer và qa-inspector dùng làm nguồn sự thật.

## Auth & bảo mật (áp dụng mọi module có endpoint cần đăng nhập)

- JWT access token (ngắn hạn) + refresh token (dài hạn, lưu hashed trong DB hoặc Redis).
- Guard RBAC (`@Roles()` decorator + `RolesGuard`) cho endpoint cần phân quyền.
- Hash password bằng Argon2 hoặc bcrypt — không bao giờ lưu plaintext, không tự viết hash logic.
- Ghi Audit Log cho hành động nhạy cảm: login, đổi mật khẩu, xoá/sửa dữ liệu tài chính, đổi
  quyền user.
- Rate limit trên endpoint auth (login, register, forgot-password) để chống brute-force.

## Transaction nghiệp vụ nhiều bước

Khi service cần cập nhật nhiều model trong một hành động nghiệp vụ (hoàn thành Task → cập nhật
Habit streak → cập nhật Goal progress), bọc trong `this.prisma.$transaction(async (tx) => {...})`
ở tầng repository/service — không gọi nhiều `.update()` rời rạc.
