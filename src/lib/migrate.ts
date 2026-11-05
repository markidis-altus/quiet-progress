/* Converts data from the original single-file tracker (v1) into the v2 model.
   v1 kept a separate habit list per month of 2026, tasks in Monday-based weeks,
   and weights per month. v2 keys everything by calendar date. */
import type { Habit, State, Task } from "./types";
import { HABIT_COLORS } from "./types";
import { addDays, toISO, todayISO } from "./dates";

const V1_YEAR = 2026;
const V1_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface V1Habit { name: string; freq?: number; checks: boolean[] }
interface V1Month { habits: V1Habit[]; mood: (number | null)[]; motivation: (number | null)[] }
interface V1Task { text: string; done: boolean; time?: string }
interface V1Day { tasks: V1Task[]; energy: number | null; focus: number | null; motivation: number | null }
interface V1 {
  habits: { months: Record<string, V1Month> };
  tasks: { weeks: { name: string; start: string; days: V1Day[] }[] };
  weight?: { goal: number | null; unit: string; months: Record<string, (number | null)[]> };
}

export function isV1(x: unknown): x is V1 {
  const o = x as V1;
  return !!o && typeof o === "object" && !!o.habits?.months && Array.isArray(o.tasks?.weeks);
}

const rid = () => Math.random().toString(36).slice(2, 10);
const EMOJI_GUESS: [RegExp, string][] = [
  [/gym|lift|workout|train/i, "🏋️"], [/run|jog/i, "🏃"], [/walk|steps/i, "🚶"], [/read|book/i, "📚"],
  [/water|hydrat/i, "💧"], [/sleep|bed/i, "😴"], [/medit|breath|mindful/i, "🧘"], [/journal|write/i, "✍️"],
  [/stretch|yoga/i, "🤸"], [/study|learn|course/i, "🎓"], [/eat|meal|diet|food|cook/i, "🥗"],
  [/pray/i, "🙏"], [/code|program/i, "💻"], [/sugar|alcohol|smok|no /i, "🚫"], [/vitamin|supplement|pill/i, "💊"],
];
export const guessEmoji = (name: string) => EMOJI_GUESS.find(([re]) => re.test(name))?.[1] ?? "✨";

export function migrateV1(v1: V1): State {
  const today = todayISO();
  const habits = new Map<string, Habit & { lastMonth: number }>();
  const habitLog: State["habitLog"] = {};
  const checkins: State["checkins"] = {};
  const tasks: State["tasks"] = {};
  const entries: Record<string, number> = {};

  V1_MONTHS.forEach((mk, mi) => {
    const m = v1.habits.months[mk];
    if (!m) return;
    const monthStart = toISO(new Date(V1_YEAR, mi, 1));
    m.habits.forEach((h) => {
      const name = (h.name || "").trim();
      if (!name) return; // unnamed rows were placeholders
      const key = name.toLowerCase();
      let hb = habits.get(key);
      const freq = h.freq == null || h.freq >= 7 ? 7 : Math.max(1, h.freq);
      if (!hb) {
        hb = { id: rid(), name, emoji: guessEmoji(name), color: HABIT_COLORS[habits.size % HABIT_COLORS.length], freq, start: monthStart, lastMonth: mi };
        habits.set(key, hb);
      }
      // keep the frequency of the latest month that is not in the future
      if (monthStart <= today) hb.freq = freq;
      hb.lastMonth = Math.max(hb.lastMonth, mi);
      h.checks.forEach((c, d) => {
        if (!c) return;
        const date = toISO(new Date(V1_YEAR, mi, d + 1));
        (habitLog[date] ??= []).includes(hb!.id) || habitLog[date].push(hb!.id);
      });
    });
    // v1 mood/motivation default to 0 = "not set"
    m.mood.forEach((v, d) => {
      if (v) (checkins[toISO(new Date(V1_YEAR, mi, d + 1))] ??= {}).mood = v;
    });
    m.motivation.forEach((v, d) => {
      if (v) (checkins[toISO(new Date(V1_YEAR, mi, d + 1))] ??= {}).motivation = v;
    });
  });

  // habits that stop appearing before the current month become archived
  const curMonth = new Date().getFullYear() === V1_YEAR ? new Date().getMonth() : 11;
  const outHabits: Habit[] = [...habits.values()].map(({ lastMonth, ...h }) =>
    lastMonth < curMonth ? { ...h, end: toISO(new Date(V1_YEAR, lastMonth + 1, 1)) } : h
  );

  v1.tasks.weeks.forEach((w) => {
    w.days.forEach((day, di) => {
      const date = addDays(w.start, di);
      const list: Task[] = day.tasks
        .filter((t) => t.text && t.text.trim())
        .map((t) => ({ id: rid(), text: t.text.trim(), done: !!t.done, time: t.time || undefined, priority: 0 }));
      if (list.length) tasks[date] = [...(tasks[date] ?? []), ...list];
      const c = checkins[date] ?? {};
      if (day.energy != null) c.energy = day.energy;
      if (day.focus != null) c.focus = day.focus;
      if (day.motivation != null) c.motivation = c.motivation != null ? Math.round((c.motivation + day.motivation) / 2) : day.motivation;
      if (Object.keys(c).length) checkins[date] = c;
    });
  });

  if (v1.weight) {
    V1_MONTHS.forEach((mk, mi) => {
      (v1.weight!.months[mk] ?? []).forEach((v, d) => {
        if (v != null && !isNaN(v)) entries[toISO(new Date(V1_YEAR, mi, d + 1))] = v;
      });
    });
  }

  return {
    version: 2,
    habits: outHabits,
    habitLog,
    tasks,
    checkins,
    weight: { goal: v1.weight?.goal ?? undefined, entries },
    settings: { theme: "system", unit: v1.weight?.unit === "lb" ? "lb" : "kg" },
  };
}
