---
name: nextjs-feature-scaffold
description: >
  Quy trình dựng một feature UI hoàn chỉnh trong apps/web của Personal OS (Next.js 15, App
  Router, shadcn/ui, Tailwind, Framer Motion, React Query). Dùng khi tạo màn hình mới (Dashboard,
  Todo, Habit Tracker, Goal Tree, Kanban, Timeline/Gantt, Finance, Analytics, Settings) hoặc
  thêm component vào feature đã có.
---

# Next.js Feature Scaffold

## Cấu trúc bắt buộc mỗi feature

```
apps/web/src/features/{module}/
  page.tsx / (route trong app/)  # Server Component mặc định
  components/
    {Component}.tsx              # Client Component nếu cần tương tác (drag-drop, form, chart)
  hooks/
    use{Resource}.ts             # React Query hook — nơi duy nhất gọi API
  services/
    {resource}.service.ts        # fetch wrapper, KHÔNG gọi fetch trực tiếp trong component
  types/
    {resource}.types.ts          # PHẢI khớp response thật của backend, không tự suy diễn
  store/
    use{Module}Store.ts          # client state cục bộ (Zustand hoặc tương tự), KHÔNG dùng cho
                                  # server state — server state luôn qua React Query
```

## Nguyên tắc phân tầng

- **Server Components mặc định**, chỉ đánh dấu `'use client'` khi thực sự cần state/effect/
  event handler (Kanban drag-drop, form nhập liệu, biểu đồ tương tác, real-time dashboard).
- **React Query cho mọi server state** — không dùng `useState` + `useEffect` tự fetch. Cache,
  invalidation, loading/error state đều qua React Query để nhất quán toàn app.
- **`services/` là lớp duy nhất gọi API** — component/hook không tự `fetch()` rải rác, tránh mỗi
  nơi xử lý lỗi/header khác nhau.

## Quy trình dựng feature mới

1. Xác nhận `backend-engineer` đã báo endpoint sẵn sàng (`SendMessage` kèm DTO thật) — nếu chưa,
   có thể dựng UI với mock rõ ràng đánh dấu `TODO: chờ API`, nhưng không báo "hoàn tất" tới khi
   thay bằng type thật.
2. Đọc `_workspace/{phase}_backend_{module}.md` hoặc DTO thật trong `apps/api` để viết
   `types/{resource}.types.ts` khớp chính xác — kiểm tra riêng: wrapping (`{ data: [...] }` hay
   mảng trần?), field optional/nullable, kiểu ngày tháng (ISO string qua wire → parse ở
   frontend, không giả định `Date` object tới thẳng qua JSON).
3. Đọc `05_UI_UX_Specification_Personal_OS_v1.pdf` phần màn hình này (đường dẫn trong
   `personal-os-team/references/source-docs.md`) để lấy layout/interaction chính xác thay vì tự
   thiết kế lại.
4. Viết `services/` → `hooks/` (React Query) → `components/` → `page.tsx`.
5. Với danh sách dài (Task list, Transaction history), dùng pagination hoặc virtualized table —
   không render toàn bộ danh sách không giới hạn (Performance guideline của Development Guide).
6. Ghi tóm tắt page/component đã tạo vào `_workspace/{phase}_frontend_{module}.md`.

## Ghi chú riêng theo module (khi áp dụng)

- **Dashboard**: màn hình mở mỗi sáng — ưu tiên skeleton loading tốt, cache theo React Query
  `staleTime` hợp lý vì đây là first-paint hàng ngày của người dùng thật.
- **Eisenhower Matrix**: 4 quadrant (Do Now / Schedule / Delegate / Ignore) — task tự động rơi
  vào quadrant dựa trên `urgent`+`important`, không để user tự kéo thả sai logic nghiệp vụ.
- **Kanban**: cần drag-drop → Client Component, cập nhật optimistic qua React Query
  `useMutation` với `onMutate` rollback khi lỗi.
- **Gantt/Timeline**: dữ liệu lớn theo thời gian — cân nhắc virtualization nếu số lượng task cao.
- **Finance charts**: dùng Recharts hoặc ECharts (đã chọn trong System Architecture) — nhất
  quán một thư viện cho toàn app, không trộn cả hai.
