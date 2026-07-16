---
name: deployment-ops
description: >
  Quy trình chạy dev trực tiếp (không Docker) với Supabase Postgres, cấu hình CI/CD GitHub Flow,
  bảo mật hạ tầng và monitoring cho Personal OS. Docker/Nginx chỉ dùng cho production sau này,
  không dùng cho local dev. Dùng khi thiết lập/sửa môi trường dev, deploy, pipeline CI/CD, hoặc
  hardening bảo mật (HTTPS/CORS/Helmet/Rate Limit).
---

# Deployment Ops

## Quyết định đã chốt: không Docker cho local dev

Dự án hiện là 1 người build, không phải team — ưu tiên vòng lặp sửa code nhanh hơn là parity
dev↔prod. `apps/web` và `apps/api` chạy trực tiếp bằng `npm run dev`/`pnpm dev` trên máy, không
qua container. Chỉ Postgres cần một dịch vụ thật — dùng **Supabase** (managed Postgres, free
tier) thay vì cài Postgres local hay Docker Compose.

## Local Development — Supabase

1. Tạo project trên [supabase.com](https://supabase.com), lấy connection string Postgres
   (Settings → Database). Supabase cấp 2 dạng: **direct connection** (dùng cho Prisma Migrate)
   và **connection pooler/pgbouncer** (dùng cho runtime query nếu app serverless/nhiều
   connection ngắn hạn — với NestJS chạy dài hạn thông thường thì direct connection là đủ,
   chỉ cân nhắc pooler nếu sau này deploy serverless).
2. Đặt `DATABASE_URL` trong `.env` của `apps/api` (và `packages/database` nếu Prisma CLI chạy
   từ đó) trỏ tới connection string Supabase — **không commit `.env`**.
3. Chạy migration bình thường qua Prisma CLI nhắm thẳng vào Supabase — không cần khác gì so với
   Postgres local: `npx prisma migrate dev --name {migration}`.
4. Redis/BullMQ (reminder, queue, cache) **hoãn tới khi thực sự cần** (thường từ lúc làm
   Notification/Reminder trở đi) — MVP đầu (Auth/Task/Habit/Dashboard cơ bản) không đụng queue.
   Khi cần, có thể dùng Upstash Redis (free tier, không cần Docker) theo cùng tinh thần với
   Supabase, hoặc quyết định lại lúc đó.
5. Object Storage (avatar, attachment, export PDF/CSV) — PRD gốc đã đề xuất "Supabase Storage
   hoặc S3-compatible (MinIO)". Vì đã dùng Supabase cho Postgres, Supabase Storage là lựa chọn
   tự nhiên để tránh thêm một dịch vụ mới — nhưng đây là quyết định riêng, cần xác nhận với
   người dùng khi module đầu tiên cần upload file (Attachment/Avatar) thay vì tự chọn.

## Kiến trúc production (chưa cần cho giai đoạn dev hiện tại)

Giữ tham khảo cho sau này khi thực sự deploy: `Nginx → API + Web + Worker` phía sau, cộng
`PostgreSQL` (có thể tiếp tục dùng Supabase hoặc tự host), `Redis`, `Object Storage`,
`Backup Service` (bắt buộc — dữ liệu tài chính người dùng không có backup là rủi ro nghiêm
trọng). Docker Compose/Nginx chỉ setup khi dự án thật sự chuẩn bị deploy, không phải bây giờ.

## CI/CD — GitHub Flow

Branch: `main` (production) · `develop` (integration) · `feature/*` · `hotfix/*` · `release/*`.
Bắt buộc Pull Request + Code Review trước khi merge vào `develop`/`main`.

```
CI:  Lint → Test → Build
CD:  Deploy Staging → Smoke Test → Deploy Production → Monitor
```

Không bỏ qua Smoke Test sau Deploy Staging — đây là bước chặn lỗi tích hợp trước khi lên
production, đặc biệt quan trọng với app quản lý dữ liệu tài chính thật của người dùng.

## Security checklist (bắt buộc, không phải "nice to have")

- [ ] HTTPS bắt buộc mọi môi trường trừ local dev
- [ ] CORS whitelist đúng domain frontend, không dùng `*` ở production
- [ ] Helmet middleware bật trên NestJS
- [ ] Rate limit trên endpoint auth và endpoint tốn tài nguyên (AI Chat, export)
- [ ] Input validation qua `class-validator` ở mọi DTO (đã enforce trong
      `nestjs-module-scaffold`, devops chỉ xác nhận không có endpoint nào skip)
- [ ] SQL Injection: dùng Prisma parameterized query, cấm raw SQL nối chuỗi thủ công
- [ ] XSS: sanitize input hiển thị lại (journal entry, comment), Next.js tự escape JSX mặc định
      nhưng chú ý `dangerouslySetInnerHTML`
- [ ] CSRF: chỉ cần nếu dùng cookie-based session; nếu dùng JWT header thuần thì rủi ro thấp hơn
- [ ] Secret không commit vào git — dùng `.env` + secret manager, tách biệt theo môi trường

## Monitoring & Logging

Application Log, Access Log, Error Log, Audit Log (đã yêu cầu ở tầng backend cho hành động nhạy
cảm), Health Check endpoint (`/health` trên mỗi service để Nginx/orchestrator dùng), Metrics cơ
bản (request rate, error rate, queue depth cho BullMQ).

## Quy trình thiết lập/sửa đổi hạ tầng

1. Xác định thay đổi thuộc dev (Supabase + chạy trực tiếp) hay production (Docker/Nginx, chưa
   active ở giai đoạn hiện tại) — không trộn cấu hình.
2. Nếu thêm một dịch vụ mới vào dev workflow (v.d. Upstash Redis khi bắt đầu làm Notification),
   `SendMessage` toàn nhóm trước — thay đổi này ảnh hưởng biến môi trường của mọi người.
3. Nếu cần endpoint mới cho health-check/metrics (khi tới giai đoạn production), yêu cầu
   `backend-engineer`.
4. Viết/sửa `.github/workflows/*` theo pipeline Lint → Test → Build → Deploy Staging → Smoke
   Test → Deploy Production → Monitor — không bỏ bước (áp dụng khi dự án bắt đầu deploy thật).
5. Xác nhận security checklist trên trước khi coi một thay đổi hạ tầng là "hoàn tất".
6. Ghi tóm tắt vào `_workspace/{phase}_devops_{artifact}.md`.
