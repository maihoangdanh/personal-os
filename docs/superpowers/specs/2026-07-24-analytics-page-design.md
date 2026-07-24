# Trang Analytics tổng hợp — thiết kế

Trạng thái: **Thiết kế đã trình bày và được duyệt** (2026-07-24) — sẵn sàng viết implementation
plan. CHƯA code.

Nguồn: brainstorm trực tiếp với người dùng, phiên 2026-07-24 ("Thiếu một báo cáo đo lường tổng
thể").

## Vấn đề

App hiện có report riêng lẻ cho từng module (Finance có `/finance` tab Tổng quan, Task/Habit/
Goal/Project chỉ hiện số trên trang riêng hoặc widget Dashboard nhỏ) — không có 1 nơi tổng hợp
số liệu đo lường hiệu suất cá nhân xuyên suốt tất cả module theo 1 khung thời gian chung
(tháng), có so sánh với kỳ trước.

## Quyết định đã chốt (qua AskUserQuestion, không đoán)

| Câu hỏi | Quyết định |
|---|---|
| Loại báo cáo? | **Trang Analytics tổng hợp** — dashboard số liệu, không phải AI tự viết văn bản tổng kết |
| Gồm module nào? | **Cả 5**: Task, Habit, Goal, Project, Finance |
| Độ sâu dữ liệu? | **Snapshot hiện tại + so với kỳ trước** — không cần biểu đồ xu hướng nhiều kỳ |
| Vị trí trong app? | **Trang mới riêng** trong Sidebar (không nhét thêm vào Dashboard đã khá nhiều widget) |
| Kỳ báo cáo? | **Theo tháng**, có chọn tháng khác (khớp Finance Report đã có) |

## Vị trí & điều hướng

- Route mới `/analytics`, thêm mục "Analytics" vào `NAV_GROUPS` trong
  `apps/web/src/components/layout/Sidebar.tsx` — nhóm riêng, đặt sau nhóm "Finance", trước
  "Assistant" (giữ đúng thứ tự logic hiện có: Dashboard → Daily → Goal & Project → Finance →
  **Analytics** → Assistant → System).
- Bộ chọn tháng + nút "Hôm nay" — tái dùng logic tương tự bộ chọn tháng đã có ở trang Finance
  (`apps/web/src/features/finance/components/*` — đọc cách trang Finance hiện chọn tháng để giữ
  UI nhất quán, không phát minh cách chọn tháng mới).

## Nguồn dữ liệu theo từng module (đã phân tích để tối thiểu việc build mới)

Nguyên tắc phân loại: module nào có **bản ghi lịch sử gắn timestamp thật** (Task.deadline/
completedAt, HabitLog.logDate, Transaction.createdAt) thì tính runtime theo tháng bất kỳ được,
KHÔNG cần bảng snapshot mới. Module nào chỉ có **giá trị hiện tại** (Goal.progress,
Project.progress — tính từ trạng thái sống, không có dấu thời gian lịch sử) thì so tháng trước
sẽ cần thêm 1 bảng snapshot mới (như đã làm cho `NetWorthSnapshot`/`WeeklyTaskStat` trước đó) —
**không làm ở bản đầu này** (YAGNI, tránh việc lớn ngoài yêu cầu), chỉ hiện số hiện tại cho 2
module này.

### Task — endpoint mới `GET /tasks/monthly-stats?month=YYYY-MM`

Tương tự `GET /tasks/weekly-stats` đã có (`apps/api/src/task/task.service.ts` +
`task.controller.ts`, xem `_workspace/33_backend_weekly-completion.md`) nhưng theo THÁNG thay vì
tuần, và **tính hoàn toàn runtime** (không upsert snapshot — khác
weekly-stats, vì mục đích ở đây chỉ cần con số của 1 tháng bất kỳ do người dùng chọn, không cần
tích luỹ lịch sử tự động qua cron). Định nghĩa "task thuộc tháng" giữ nguyên tinh thần đã dùng:
`deadline` trong tháng HOẶC `completedAt` trong tháng, loại `ARCHIVED`.

Response:
```json
{
  "month": "2026-07",
  "completedCount": 12,
  "totalCount": 20,
  "completionPercent": 60,
  "previousMonth": { "month": "2026-06", "completionPercent": 45 } | null,
  "changePercent": 15
}
```
`changePercent` = điểm phần trăm chênh lệch (không phải % tương đối) — nhất quán với cách
`weekly-stats` đã làm. `previousMonth`/`changePercent` = `null` nếu tháng trước không có task nào
(không bịa số).

### Habit — endpoint mới `GET /habits/monthly-stats?month=YYYY-MM`

Đếm tổng `HabitLog` có `logDate` trong tháng được chọn (tất cả habit của user), so với tháng
trước. Kèm streak dài nhất hiện tại (tái dùng logic đã có ở `GET /habits/:id/streak`, lặp cho
từng habit — chấp nhận N+1 vì số habit nhỏ, giống cách `useLongestHabitStreak` frontend đã làm).

Response:
```json
{
  "month": "2026-07",
  "checkinCount": 45,
  "previousMonth": { "month": "2026-06", "checkinCount": 38 } | null,
  "changePercent": null,
  "habitCount": 4,
  "longestCurrentStreak": { "habitName": "Đọc sách 30 phút", "currentStreak": 26 } | null
}
```
`changePercent` ở đây là % thay đổi SỐ LƯỢNG check-in (tương đối, khác Task/Finance dùng điểm
phần trăm — vì check-in count không phải tỉ lệ %) — công thức
`(checkinCount - previousMonth.checkinCount) / previousMonth.checkinCount * 100`, `null` nếu
tháng trước = 0 check-in (tránh chia 0) hoặc chưa có dữ liệu tháng trước.

### Finance — KHÔNG cần endpoint mới

Gọi `GET /finance/report?month=YYYY-MM` (đã có, nhận tháng bất kỳ) **2 lần**: tháng đang chọn +
tháng trước liền kề. Tính `changePercent` cho `profit`/`savingRatePercent` ở **frontend** (điểm
phần trăm chênh lệch cho `savingRatePercent`, tương tự Task).

### Goal — KHÔNG so tháng trước, chỉ số hiện tại

Gọi `GET /goals?status=ACTIVE` (đã có). Hiện: số lượng goal ACTIVE, trung bình `progress` của
các goal đó (tính ở frontend, không cần backend mới).

### Project — KHÔNG so tháng trước, chỉ số hiện tại

Gọi `GET /projects?status=ACTIVE` (đã có, sau khi sửa `projectKeys` — xem
`apps/web/src/features/projects/hooks/useProjects.ts`). Hiện: số lượng project ACTIVE, trung
bình `progress`.

## Bố cục trang (frontend)

Trang mới `apps/web/src/features/analytics/components/AnalyticsView.tsx`, route
`apps/web/src/app/(app)/analytics/page.tsx`. Header: eyebrow + tiêu đề "Analytics" + bộ chọn
tháng (tái dùng style `PageHeader` đã dùng ở các trang khác). Bên dưới: 5 card theo thứ tự
**Task → Habit → Finance → Goal → Project**, mỗi card:
- Tiêu đề module + icon (tái dùng icon đã dùng ở Sidebar cho module đó — `ListChecks` cho Task,
  `Repeat` cho Habit, `Wallet` cho Finance, `Target` cho Goal, `FolderKanban` cho Project).
- Số liệu chính (to, serif — khớp style `StatStrip`/`NetWorthWidget`).
- Badge % thay đổi so tháng trước (CHỈ Task/Habit/Finance có; ẨN hẳn badge với Goal/Project —
  không hiện gì thay vì hiện "—" hay "0%" giả).
- Link "Xem chi tiết →" (`CardLink` có sẵn) trỏ về `/tasks`, `/habits`, `/finance`, `/goals`,
  `/projects` tương ứng.

Layout: grid responsive (2 cột desktop, 1 cột mobile) — theo đúng pattern
`grid-cols-2 gap-3.5 lg:grid-cols-4` đã dùng ở `StatStrip`, điều chỉnh số cột phù hợp với 5 card
(vd `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` để card cuối không lẻ dòng khó nhìn — quyết định
cụ thể để ngỏ cho lúc code, không phải quyết định nghiệp vụ cần duyệt trước).

## Việc CHƯA quyết định / để ngỏ khi triển khai

- Số cột chính xác của grid 5 card (chi tiết trình bày, không phải quyết định nghiệp vụ).
- Component chọn tháng: tái dùng y hệt component Finance đang dùng hay viết lại tối giản hơn —
  quyết định khi đọc code Finance thật lúc implement.

## Bước tiếp theo

Viết implementation plan (writing-plans skill) từ spec này, decompose theo layer: (1) Backend —
2 endpoint mới (`/tasks/monthly-stats`, `/habits/monthly-stats`), (2) Frontend — trang
`AnalyticsView` + 5 card + Sidebar entry.
