# Calendar: trục giờ + Agenda view (thiết kế)

Trạng thái: **Thiết kế đã trình bày, đang chờ duyệt** — dừng lại theo yêu cầu người dùng để tiếp
tục sau, CHƯA viết implementation plan, CHƯA code.

Nguồn: brainstorm trực tiếp với người dùng trong phiên 2026-07-22 (sau khi hoàn tất Dashboard
StatStrip + NetWorthWidget + Goal progress hybrid).

## Vấn đề

`CalendarView.tsx` hiện tại chỉ hiện `CalendarEvent`, không hiện Task nào — và layout mỗi ngày
là 1 cột danh sách xếp chồng đơn giản (không có trục thời gian thật, không phải "timeline" theo
nghĩa người dùng muốn). Người dùng muốn: (1) Calendar hiện cả Task lẫn Event, (2) có dạng
timeline (trục giờ), (3) THÊM 1 dạng Agenda/list view riêng có thể tick hoàn thành task ngay
trên đó.

## Quyết định đã chốt (qua AskUserQuestion, không đoán)

| Câu hỏi | Quyết định |
|---|---|
| Có mấy view? | **2 view**: Lưới (giữ khung 7 cột hiện tại + thêm trục giờ) VÀ Agenda (list theo ngày, mới) |
| Chấm màu trong Agenda phân biệt gì? | **Task vs Event** (không phải theo Project) |
| Task đã tick xong hiện thế nào trong Agenda? | **Gạch ngang + mờ, vẫn hiện** (khớp Dashboard "Hôm nay" đã làm) — KHÔNG ẩn khỏi list |
| Chuyển giữa 2 view bằng gì? | **Tab đầu trang** (giống 2 tab Danh sách/Eisenhower ở trang Tasks) |
| Task không deadline hiện ở đâu trong view Lưới? | **Dải "không giờ"** trên cùng mỗi cột ngày |
| Agenda xử lý task không deadline thế nào? | **Bỏ qua hẳn** — Agenda chỉ hiện task/event CÓ thời điểm cụ thể |
| Agenda hiện khoảng thời gian nào? | **Cùng tuần đang xem ở view Lưới** — dùng chung bộ điều hướng tuần, không range riêng |

Người dùng gửi 1 ảnh tham khảo Agenda view: mỗi ngày 1 khối, header "T{thứ} {ngày}/{tháng}",
ngày rỗng hiện `· không có task` màu mờ ngay cạnh header, dưới header là list chấm màu + tên việc.

## Kiến trúc (đã xác nhận: CHỈ cần sửa frontend)

Backend đã có sẵn `dateFrom`/`dateTo` filter cho cả `GET /tasks` và `GET /calendar-events` —
**không cần endpoint mới, không cần sửa backend**. Cả 2 view dùng chung 1 khoảng tuần
(`computeRange()` đã có trong `apps/web/src/features/calendar/lib/range.ts`, cùng bộ điều
hướng ‹ Hôm nay › hiện có trong `CalendarView.tsx`), fetch song song:
- `useTaskList({ dateFrom, dateTo, ... })` (hook đã có trong `features/tasks/hooks/useTasks.ts`)
- `useCalendarEventList({ from, to })` (hook đã có trong `features/calendar/hooks/useCalendarEvents.ts`)

**Task nào xuất hiện trên Calendar:**
- Task có `deadline` nằm trong tuần đang xem → hiện đúng vị trí ngày/giờ đó (mọi status, kể cả
  DONE — hiện gạch ngang mờ, không bị lọc bỏ).
- Task đang mở (status khác DONE/ARCHIVED) KHÔNG có `deadline` → chỉ hiện ở view Lưới (dải
  "không giờ"), KHÔNG hiện ở Agenda.

**Tái dùng, không viết lại:**
- `apps/web/src/features/calendar/lib/range.ts` đã có sẵn `groupByDay()` + type `EventDayGroup`
  (hiện CHƯA được dùng ở đâu trong code — có vẻ làm dở từ trước) — mở rộng hàm này để gộp cả
  Task thay vì viết logic gom-nhóm-theo-ngày mới.
- `apps/web/src/features/tasks/components/TaskFormDialog.tsx` — mở khi bấm 1 Task trên Calendar
  (cả 2 view), KHÔNG tạo dialog task mới.
- `apps/web/src/features/calendar/components/CalendarEventFormDialog.tsx` — mở khi bấm 1 Event,
  giữ nguyên.
- `useCompleteTask()` / `useUpdateTask()` (`features/tasks/hooks/useTasks.ts`) — đã có optimistic
  update sẵn (patch cache `["dashboard","todayTasks"]` khi tích/gỡ tích, xem
  `_workspace/29`/session 2026-07-22 sửa Dashboard) — Agenda view tái dùng y hệt cho checkbox
  tick task, không viết logic tick mới.

## View "Lưới" (mặc định) — thêm trục giờ

Giữ khung 7 cột hiện tại (`CalendarView.tsx` phần render chính), nhưng mỗi cột chia 2 phần:
1. **Dải "không giờ"** trên cùng — task đang mở không deadline (ẩn hẳn dải này nếu ngày đó rỗng).
2. **Trục giờ 6:00–24:00** (18 khung giờ — chọn khoảng này thay vì đủ 0h-24h để tránh mảng trắng
   6 tiếng đêm gần như luôn rỗng; có thể chỉnh lại sau khi thấy dùng thật). Event/Task định vị
   đúng theo giờ bắt đầu (`top` tính theo % chiều cao cột), chiều cao khối tỉ lệ theo thời lượng:
   `estimateMinute` cho Task (nếu null, dùng 1 khối cao tối thiểu cố định), `endTime - startTime`
   cho Event.
3. Phân biệt màu: viền trái Task = màu `primary`/`--acc` (cam, khớp accent chính toàn app), Event
   = màu `accent-2` (xanh rêu, khớp mockup gốc `--accent-2`).

## View "Agenda" — danh sách theo ngày

Tab "Lưới" / "Agenda" đầu trang, cạnh bộ điều hướng tuần hiện có. Mỗi ngày trong tuần 1 khối:
- Header: `T{thứ} {ngày}/{tháng}` (font/style theo `groupByDay().label` hiện có, chỉnh lại định
  dạng ngắn gọn khớp ảnh mẫu). Ngày rỗng (không task có deadline, không event) → thêm
  `· không có task` màu `text-muted-foreground` ngay cạnh header (giữ nguyên đúng chữ trong ảnh
  mẫu người dùng gửi, dù về mặt kỹ thuật câu này cũng cover cả trường hợp thiếu event — chấp
  nhận được, không cần chữ chính xác tuyệt đối).
- Danh sách item trong ngày xếp theo giờ tăng dần (trộn Task + Event, sort chung theo thời gian).
- Mỗi item: chấm tròn màu (Task=primary, Event=accent-2) + tên.
  - **Task**: có checkbox đầu dòng — bấm tick/gỡ tick gọi `useCompleteTask`/`useUpdateTask` (y
    hệt cơ chế toggle đã xây ở Dashboard "Hôm nay", kể cả optimistic update). Task DONE → gạch
    ngang + chữ mờ, KHÔNG biến mất khỏi list.
  - **Event**: click mở `CalendarEventFormDialog`.
  - Click vào phần chữ của Task (không phải checkbox) mở `TaskFormDialog`.

## Việc CHƯA quyết định / để ngỏ khi triển khai

- Khoảng giờ chính xác của trục (6:00–24:00 là đề xuất, có thể người dùng muốn khác khi thấy bản
  thật — nên hỏi lại hoặc làm dễ chỉnh 1 hằng số).
- Chiều cao khối tối thiểu cho Task không có `estimateMinute`.
- Có cần kéo-thả (drag) để đổi giờ Task/Event ngay trên Lưới không — CHƯA hỏi, mặc định KHÔNG làm
  (chỉ click mở dialog sửa) trừ khi người dùng yêu cầu thêm khi quay lại.
- View nào là mặc định khi mở trang lần đầu — đề xuất "Lưới" (giữ hành vi hiện tại), có lưu lựa
  chọn cuối vào localStorage hay không (giống Dashboard layout switcher) — CHƯA hỏi.

## Bước tiếp theo (khi người dùng quay lại)

Người dùng đã xem thiết kế này và dừng lại để làm tiếp sau ("về nhà tao làm tiếp") — CHƯA bấm
duyệt chính thức. Khi quay lại: xác nhận lại thiết kế (đặc biệt phần "để ngỏ" ở trên), rồi mới
viết implementation plan (writing-plans skill) — KHÔNG code thẳng từ file này.
