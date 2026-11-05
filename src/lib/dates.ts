import type { ISODate } from "./types";

const pad = (n: number) => String(n).padStart(2, "0");

export const toISO = (d: Date): ISODate => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fromISO = (s: ISODate): Date => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const todayISO = () => toISO(new Date());
export const addDays = (s: ISODate, k: number): ISODate => {
  const d = fromISO(s);
  d.setDate(d.getDate() + k);
  return toISO(d);
};
/** Days from a to b (b - a). */
export const diffDays = (a: ISODate, b: ISODate) =>
  Math.round((fromISO(b).getTime() - fromISO(a).getTime()) / 86400000);
/** Monday of the week containing s. */
export const mondayOf = (s: ISODate): ISODate => {
  const d = fromISO(s);
  return addDays(s, -((d.getDay() + 6) % 7));
};
export const weekDays = (s: ISODate): ISODate[] => {
  const m = mondayOf(s);
  return Array.from({ length: 7 }, (_, i) => addDays(m, i));
};
export const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
export const monthDays = (y: number, m: number): ISODate[] =>
  Array.from({ length: daysInMonth(y, m) }, (_, i) => toISO(new Date(y, m, i + 1)));
export const range = (from: ISODate, to: ISODate): ISODate[] => {
  const out: ISODate[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
};

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const MONTHS_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const DOW_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const DOW_LETTER = ["M", "T", "W", "T", "F", "S", "S"];

/** 0 = Monday … 6 = Sunday */
export const dowIndex = (s: ISODate) => (fromISO(s).getDay() + 6) % 7;

export const fmt = (s: ISODate, opts: Intl.DateTimeFormatOptions) => fromISO(s).toLocaleDateString("en-GB", opts);
export const fmtShort = (s: ISODate) => fmt(s, { day: "numeric", month: "short" });
export const fmtLong = (s: ISODate) => fmt(s, { weekday: "long", day: "numeric", month: "long" });

export function relativeLabel(s: ISODate): string {
  const d = diffDays(todayISO(), s);
  if (d === 0) return "Today";
  if (d === -1) return "Yesterday";
  if (d === 1) return "Tomorrow";
  return fmt(s, { weekday: "long" });
}
