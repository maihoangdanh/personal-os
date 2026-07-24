# Analytics — biểu đồ theo ngày trong tháng (thiết kế)

Trạng thái: **Thiết kế đã trình bày và được duyệt** (2026-07-24) — sẵn sàng viết implementation
plan. CHƯA code.

Nguồn: brainstorm trực tiếp với người dùng ngay sau khi trang `/analytics` (số liệu tổng hợp
theo tháng, 5 card) vừa deploy — người dùng muốn thêm góc nhìn chi tiết theo TỪNG NGÀY trong
tháng thay vì chỉ 1 con số tổng.

## Vấn đề

Trang `/analytics` hiện chỉ hiện 1 số tổng/tháng cho mỗi module (vd "Task hoàn thành 5/8"),
không cho thấy phân bố theo ngày trong tháng đó — không biết ngày nào làm nhiều/ít, ngày nào chi
tiêu đột biến, ngày nào bỏ lỡ thói quen.

## Quyết định đã chốt (qua AskUserQuestion, không đoán)

| Câu hỏi | Quyết định |
|---|---|
| Module nào cần chart theo ngày? | **Task, Habit, Finance** — Goal/Project KHÔNG (chỉ có giá trị hiện tại, không có lịch sử theo ngày, giữ nguyên như thiết kế Analytics gốc) |
| Vị trí trên trang? | **Section riêng bên dưới** 5 card hiện có, không nhét vào trong card |
| Task chart hiện gì? | **2 cột/ngày**: số hoàn thành VÀ tổng số đến hạn ngày đó |
| Habit chart hiện gì? | **Heatmap kiểu GitHub** — mỗi habit 1 hàng riêng, mỗi ô là 1 ngày |
| Finance chart hiện gì? | **2 cột/ngày**: thu và chi |

## Kiến trúc — 3 endpoint mới, tính runtime (không cần bảng mới)

Tất cả dùng lại đúng logic "thuộc về" đã có ở endpoint `monthly-stats` (Task/Habit) và
`sumRealized`/loại Transfer (Finance) — chỉ khác là gom kết quả theo TỪNG NGÀY thay vì 1 tổng
cho cả tháng. Mỗi endpoint chỉ 1 query lấy toàn bộ dữ liệu trong tháng, rồi gom nhóm theo ngày ở
tầng service (KHÔNG query lặp lại theo từng ngày — tránh N+1).

### Task — `GET /tasks/monthly-stats/daily?month=YYYY-MM`

1 query `prisma.task.findMany` với where-clause giống `taskCountsInRange` (deadline HOẶC
completedAt trong tháng, loại ARCHIVED, scoped user), chỉ select `deadline`, `completedAt`,
`status`. Gom trong service: với mỗi task, nếu `deadline` rơi vào tháng → +1 `totalCount` cho
ngày đó; nếu `status=DONE` và `completedAt` rơi vào tháng → +1 `completedCount` cho ngày đó (2
ngày này có thể khác nhau cho cùng 1 task — mỗi ngày là 1 chỉ số độc lập, không phải cùng 1 sự
kiện).

Response:
```json
{
  "month": "2026-07",
  "days": [
    { "date": "2026-07-01", "completedCount": 2, "totalCount": 3 },
    { "date": "2026-07-02", "completedCount": 0, "totalCount": 0 }
  ]
}
```
`days` LUÔN đủ số ngày thật của tháng đó (kể cả ngày 0/0), không bỏ ngày rỗng — để frontend vẽ
trục ngày liên tục không bị hụt cột.

### Habit — `GET /habits/monthly-stats/daily?month=YYYY-MM`

1 query lấy danh sách habit (`findManyScoped`, đã có), 1 query `prisma.habitLog.findMany` lấy
toàn bộ log trong tháng của mọi habit user đó (`logDate` trong khoảng, `habit: {userId}`), chỉ
select `habitId`, `logDate`. Gom theo `habitId` trong service.

Response:
```json
{
  "month": "2026-07",
  "days": ["2026-07-01", "2026-07-02", "..."],
  "habits": [
    { "habitId": "h1", "name": "Đọc sách", "checkedDates": ["2026-07-01", "2026-07-03"] },
    { "habitId": "h2", "name": "Tập thể dục", "checkedDates": ["2026-07-02"] }
  ]
}
```

### Finance — `GET /finance/report/daily?month=YYYY-MM`

1 query `prisma.transaction.findMany` với where-clause giống `sumRealized` (loại Transfer qua
`transferGroupId: null`, scoped qua `wallet: {userId}`, `transactionDate` trong tháng), chỉ
select `type`, `amount`, `transactionDate`. Gom theo ngày + loại (INCOME/EXPENSE) trong service.

Response:
```json
{
  "month": "2026-07",
  "days": [
    { "date": "2026-07-01", "income": 500000, "expense": 120000 },
    { "date": "2026-07-02", "income": 0, "expense": 0 }
  ]
}
```

## Frontend — 3 biểu đồ tự vẽ (SVG/HTML thuần, không thêm thư viện chart mới)

Section mới trong `AnalyticsView.tsx`, đặt SAU khối 5 card hiện có. Màu lấy từ palette Tailwind
đã có sẵn của app (`primary`, `success`, `destructive`, `muted`) — không phát minh màu mới.

### Chart Task — cột nhóm

Mỗi ngày 2 cột cạnh nhau: "Hoàn thành" (`bg-primary`), "Tổng đến hạn" (`bg-muted-foreground/25`
hoặc viền `border-border`). Trục X = ngày trong tháng (1..N). Hover 1 ngày hiện tooltip số liệu
chính xác ngày đó. Cần legend (2 series).

### Chart Finance — cột phân cực quanh mốc 0

Mỗi ngày: cột Thu đẩy LÊN từ mốc 0 (`bg-success`), cột Chi đẩy XUỐNG từ mốc 0 (`bg-destructive`)
— khớp màu Thu/Chi đã dùng ở `TxRow`/`ReportTab` hiện có trong trang Finance. Hover hiện số tiền
chính xác. Cần legend (2 series, tuy màu đã đủ gợi ý qua hướng lên/xuống).

### Chart Habit — heatmap kiểu GitHub

Mỗi hàng = 1 habit (label tên habit bên trái), mỗi cột = 1 ngày trong tháng. Ô tô đậm `bg-primary`
khi có check-in ngày đó, `bg-muted`/nhạt khi không. Hover 1 ô hiện tên habit + ngày + có/không
check-in. KHÔNG cần legend riêng (1 "series" ý nghĩa nhị phân duy nhất — có/không — đã tự rõ qua
độ đậm nhạt + tooltip, tên habit đã ghi trực tiếp ở đầu hàng).

## Việc CHƯA quyết định / để ngỏ khi triển khai

- Chiều rộng/chiều cao chính xác từng cột/ô — chi tiết trình bày, điều chỉnh khi nhìn bản thật.
- Có cần responsive thu gọn heatmap Habit trên mobile không (nhiều habit × 31 ngày có thể chật)
  — xử lý bằng `overflow-x-auto` như các bảng dài khác trong app đã làm (vd Calendar Lưới).
- Trạng thái loading/rỗng khi tháng không có dữ liệu — dùng skeleton `animate-pulse` nhất quán
  với các card khác, không cần quyết định riêng.

## Bước tiếp theo

Viết implementation plan (writing-plans skill) từ spec này, decompose theo layer: (1) Backend —
3 endpoint mới (Task/Habit/Finance daily), (2) Frontend — 3 chart component + tích hợp vào
`AnalyticsView.tsx`.
