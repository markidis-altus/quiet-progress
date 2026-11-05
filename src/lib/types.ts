/** ISO calendar date in local time, e.g. "2026-11-05". */
export type ISODate = string;

export interface Habit {
  id: string;
  name: string;
  emoji: string;
  color: string;
  /** Target ticks per Monday–Sunday week. 7 = daily. */
  freq: number;
  /** First day the habit counts. */
  start: ISODate;
  /** First day it no longer counts (archived). */
  end?: ISODate;
}

export type Priority = 0 | 1 | 2 | 3; // none, low, medium, high

export interface Task {
  id: string;
  text: string;
  done: boolean;
  time?: string; // "HH:MM"
  priority: Priority;
  note?: string;
}

export type CheckinKey = "mood" | "energy" | "focus" | "motivation";
export interface Checkin {
  mood?: number;
  energy?: number;
  focus?: number;
  motivation?: number;
  note?: string;
}

export interface Settings {
  theme: "system" | "dark" | "light";
  unit: "kg" | "lb";
  /** Height in cm, optional — enables BMI. */
  height?: number;
  lastBackup?: string; // ISO timestamp
}

export interface State {
  version: 2;
  habits: Habit[];
  /** date → ids of habits ticked that day */
  habitLog: Record<ISODate, string[]>;
  /** date → tasks planned for that day (in display order) */
  tasks: Record<ISODate, Task[]>;
  checkins: Record<ISODate, Checkin>;
  weight: { goal?: number; entries: Record<ISODate, number> };
  settings: Settings;
}

export const CHECKIN_KEYS: { key: CheckinKey; label: string; color: string }[] = [
  { key: "mood", label: "Mood", color: "var(--cyan)" },
  { key: "energy", label: "Energy", color: "var(--yellow)" },
  { key: "focus", label: "Focus", color: "var(--purple)" },
  { key: "motivation", label: "Motivation", color: "var(--pink)" },
];

export const HABIT_COLORS = ["#785FFA", "#1BD5AD", "#3FE0E8", "#FFD84D", "#FF6B6B", "#E44B8A", "#FF9F43", "#7BD88F"];
