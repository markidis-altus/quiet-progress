import type { Habit, ISODate, State } from "./types";
import { addDays, diffDays, mondayOf, range, todayISO } from "./dates";

export const isActive = (h: Habit, d: ISODate) => d >= h.start && (!h.end || d < h.end);
export const isDone = (s: State, hid: string, d: ISODate) => !!s.habitLog[d]?.includes(hid);
export const activeHabits = (s: State, d: ISODate) => s.habits.filter((h) => isActive(h, d));

/** Ticks and target in the Monday–Sunday week containing d. */
export function weekCount(s: State, h: Habit, d: ISODate) {
  const mon = mondayOf(d);
  let done = 0;
  for (let i = 0; i < 7; i++) if (isDone(s, h.id, addDays(mon, i))) done++;
  return { done, target: Math.min(7, h.freq) };
}

/** Is this habit still asking for a tick on day d? Weekly habits stop once the week's target is met. */
export function isDue(s: State, h: Habit, d: ISODate) {
  if (!isActive(h, d)) return false;
  if (h.freq >= 7) return true;
  if (isDone(s, h.id, d)) return true;
  return weekCount(s, h, d).done < h.freq;
}

/** v1-compatible scoring: credit per Mon–Sun week capped at the (prorated) weekly target. */
export function habitCredit(s: State, h: Habit, from: ISODate, to: ISODate) {
  const lo = from > h.start ? from : h.start;
  const hiEx = h.end && h.end <= to ? addDays(h.end, -1) : to;
  let credit = 0, target = 0, count = 0;
  if (lo > hiEx) return { credit, target, count, rate: null as number | null };
  let chunkStart = lo;
  while (chunkStart <= hiEx) {
    const weekEnd = addDays(mondayOf(chunkStart), 6);
    const chunkEnd = weekEnd < hiEx ? weekEnd : hiEx;
    const len = diffDays(chunkStart, chunkEnd) + 1;
    const t = h.freq >= 7 ? len : Math.max(1, Math.round((h.freq * len) / 7));
    let done = 0;
    for (const d of range(chunkStart, chunkEnd)) if (isDone(s, h.id, d)) done++;
    credit += Math.min(done, t);
    target += t;
    count += done;
    chunkStart = addDays(chunkEnd, 1);
  }
  return { credit, target, count, rate: target ? credit / target : null };
}

/** Overall habit progress across all habits for a date range. */
export function habitsProgress(s: State, from: ISODate, to: ISODate) {
  let credit = 0, target = 0, count = 0;
  const end = to > todayISO() ? todayISO() : to;
  if (from > end) return { rate: null as number | null, count: 0 };
  for (const h of s.habits) {
    const c = habitCredit(s, h, from, end);
    credit += c.credit;
    target += c.target;
    count += c.count;
  }
  return { rate: target ? credit / target : null, count };
}

export interface Streak { current: number; best: number; unit: "d" | "w" }
export function streak(s: State, h: Habit): Streak {
  const today = todayISO();
  if (h.freq >= 7) {
    let cur = 0;
    let d = isDone(s, h.id, today) ? today : addDays(today, -1);
    while (d >= h.start && isDone(s, h.id, d)) { cur++; d = addDays(d, -1); }
    let best = 0, run = 0;
    for (const day of range(h.start, today)) {
      if (isDone(s, h.id, day)) { run++; best = Math.max(best, run); } else run = 0;
    }
    return { current: cur, best, unit: "d" };
  }
  const met = (mon: ISODate) => weekCount(s, h, mon).done >= h.freq;
  let cur = 0;
  let w = mondayOf(today);
  if (!met(w)) w = addDays(w, -7);
  while (w >= mondayOf(h.start) && met(w)) { cur++; w = addDays(w, -7); }
  let best = 0, run = 0;
  for (let m = mondayOf(h.start); m <= today; m = addDays(m, 7)) {
    if (met(m)) { run++; best = Math.max(best, run); } else run = 0;
  }
  return { current: cur, best, unit: "w" };
}

/** Day summary: due habits done + tasks done. */
export function dayProgress(s: State, d: ISODate) {
  const due = s.habits.filter((h) => isDue(s, h, d));
  const hDone = due.filter((h) => isDone(s, h.id, d)).length;
  const tasks = s.tasks[d] ?? [];
  const tDone = tasks.filter((t) => t.done).length;
  const total = due.length + tasks.length;
  return {
    habitsDue: due.length, habitsDone: hDone,
    tasks: tasks.length, tasksDone: tDone,
    rate: total ? (hDone + tDone) / total : null,
    habitRate: due.length ? hDone / due.length : null,
  };
}

export const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/* ---------- weight ---------- */
export function weightSeries(s: State) {
  return Object.entries(s.weight.entries)
    .filter(([, v]) => v != null && !isNaN(v))
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, v]) => ({ date, v }));
}

/** Trailing 7-day average at each entry date. */
export function movingAvg(series: { date: string; v: number }[], days = 7) {
  return series.map((p) => {
    const lo = addDays(p.date, -(days - 1));
    const win = series.filter((q) => q.date >= lo && q.date <= p.date).map((q) => q.v);
    return { date: p.date, v: avg(win)! };
  });
}

/** Least-squares slope in units per week over the last `days` days. */
export function weeklyRate(series: { date: string; v: number }[], days = 28) {
  if (series.length < 2) return null;
  const last = series[series.length - 1].date;
  const pts = series.filter((p) => diffDays(p.date, last) < days);
  if (pts.length < 2) return null;
  const xs = pts.map((p) => diffDays(pts[0].date, p.date));
  const ys = pts.map((p) => p.v);
  const mx = avg(xs)!, my = avg(ys)!;
  let num = 0, den = 0;
  xs.forEach((x, i) => { num += (x - mx) * (ys[i] - my); den += (x - mx) ** 2; });
  return den ? (num / den) * 7 : null;
}

export const bandColor = (p: number | null) =>
  p == null ? "var(--muted)" : p >= 0.9 ? "var(--cyan)" : p >= 0.7 ? "var(--teal)" : p >= 0.4 ? "var(--yellow)" : "var(--red)";
export const pct = (p: number | null | undefined, dec = 0) => (p == null || isNaN(p) ? "—" : (p * 100).toFixed(dec) + "%");
