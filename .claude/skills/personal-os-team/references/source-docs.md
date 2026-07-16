# Tài liệu nguồn — Personal OS

10 tài liệu thiết kế gốc nằm tại `C:\Users\Admin\Downloads\`. Đây là **nguồn sự thật cấp field-level** — các skill trong harness chỉ tóm tắt phần kiến trúc/quy ước đã đọc kỹ; khi cần chi tiết field/endpoint/business rule cụ thể cho một module, Read trực tiếp file PDF tương ứng thay vì đoán.

| File | Nội dung | Đã tóm tắt vào skill? |
|------|---------|----------------------|
| `01_PRD_Personal_OS_Detailed_v1.pdf` | Product Requirements đầy đủ: mọi module, mock dashboard, roadmap 4 phase | Tóm tắt sơ bộ trong `personal-os-team/SKILL.md` (roadmap) — đọc PDF khi cần chi tiết field của một module |
| `02_Business_Rules_Personal_OS_v1.pdf` | Quy tắc nghiệp vụ, validation, ràng buộc theo module | **Chưa tóm tắt** — backend-engineer/ai-engineer phải đọc trước khi viết logic nghiệp vụ của module đó |
| `03_Database_Design_ERD_Detailed_v1.pdf` | ERD chi tiết cấp field, khóa ngoại, cardinality | **Chưa tóm tắt** — database-architect phải đọc trước khi thêm field/quan hệ mới |
| `04_API_Specification_Personal_OS_v1.pdf` | Danh sách endpoint, request/response DTO chính xác | **Chưa tóm tắt** — backend-engineer đọc trước khi tạo controller/DTO của module |
| `05_UI_UX_Specification_Personal_OS_v1.pdf` | Layout màn hình, tương tác, chi tiết component | **Chưa tóm tắt** — frontend-engineer đọc trước khi dựng UI của một màn hình cụ thể |
| `06_System_Architecture_Personal_OS_v1.pdf` | Monorepo, Clean Architecture, cache/queue/auth/deploy/security | Đã tóm tắt đầy đủ trong `personal-os-team/SKILL.md` + `deployment-ops/SKILL.md` |
| `07_AI_Design_Personal_OS_v1.pdf` | Thiết kế tính năng AI: flow, prompt, model | **Chưa tóm tắt** — ai-engineer đọc trước khi implement một tính năng AI cụ thể |
| `08_Development_Guide_Personal_OS_v1.pdf` | Quy trình dev, coding convention, testing, DoD | Đã tóm tắt đầy đủ trong `nestjs-module-scaffold`, `nextjs-feature-scaffold`, `cross-boundary-qa` |
| `09_Prisma_Schema_Design_Personal_OS_v1.pdf` | Model/enum/quy tắc field/migration strategy | Đã tóm tắt đầy đủ trong `prisma-schema-design/SKILL.md` |
| `10_SQL_Database_Design_Personal_OS_v1.pdf` | Thiết kế SQL/DDL cấp thấp | **Chưa tóm tắt** — database-architect đọc khi cần đối chiếu constraint/DDL không có trong Prisma doc |

## Nguyên tắc dùng

- Không đoán field/endpoint không có trong skill — Read PDF liên quan trước khi quyết định.
- Khi đọc xong một phần PDF và rút ra quy ước tái sử dụng được, cập nhật lại SKILL.md tương ứng (nguyên tắc tiến hóa harness) để lần sau không phải đọc lại toàn bộ PDF.
