/**
 * 时间展示格式与 PRD 一致：YYYY-MM-DD HH:mm
 */
const PAD = (n: number) => String(n).padStart(2, '0');

export function formatDateTime(input: Date | string | number): string {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = PAD(d.getMonth() + 1);
  const day = PAD(d.getDate());
  const h = PAD(d.getHours());
  const min = PAD(d.getMinutes());
  return `${y}-${m}-${day} ${h}:${min}`;
}
