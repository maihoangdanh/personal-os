/**
 * Helper chuyển đổi giữa ISO-8601 string (wire format của backend) và giá trị của
 * <input type="datetime-local"> (local time, không timezone). Dùng chung cho mọi form dialog.
 */

/** Chuyển giá trị input datetime-local (local time) → ISO string UTC cho backend. */
export function localInputToIso(local: string): string | undefined {
  if (!local) return undefined;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

/** Chuyển ISO (từ response) → giá trị datetime-local để prefill khi sửa. */
export function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
