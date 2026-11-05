import { useState } from "react";
import type { ISODate, Priority, Task } from "../lib/types";
import { update, uid, undo, useStore } from "../lib/store";
import { addDays, fmtShort, todayISO } from "../lib/dates";
import { Check, Icon, Segmented, Sheet, toast } from "./ui";

export const PRIORITY_COLORS = ["transparent", "var(--cyan)", "var(--yellow)", "var(--red)"];
const PRIORITY_LABELS = ["None", "Low", "Med", "High"];

/** Timed tasks first in clock order, then untimed in their original order; done tasks sink. */
export function sortTasks(list: Task[]) {
  return list
    .map((t, i) => ({ t, i }))
    .sort((a, b) => {
      if (a.t.done !== b.t.done) return a.t.done ? 1 : -1;
      const at = a.t.time || "", bt = b.t.time || "";
      if (at && bt) return at < bt ? -1 : at > bt ? 1 : a.i - b.i;
      if (at) return -1;
      if (bt) return 1;
      if (a.t.priority !== b.t.priority) return b.t.priority - a.t.priority;
      return a.i - b.i;
    })
    .map((x) => x.t);
}

/** "9:30 call mum !!" → time 09:30, priority 2. Also accepts 9am / 3.15pm / 14:00. */
export function parseQuick(input: string): { text: string; time?: string; priority: Priority } {
  let text = input.trim(), time: string | undefined, priority: Priority = 0;
  const bang = text.match(/\s*(!{1,3})$/);
  if (bang) { priority = bang[1].length as Priority; text = text.slice(0, bang.index).trim(); }
  const tm = text.match(/^(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?\s+/i);
  if (tm && (tm[2] || tm[3])) {
    let h = +tm[1];
    const m = tm[2] ? +tm[2] : 0;
    if (tm[3]) { const pm = tm[3].toLowerCase() === "pm"; if (pm && h < 12) h += 12; if (!pm && h === 12) h = 0; }
    if (h < 24 && m < 60) { time = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`; text = text.slice(tm[0].length); }
  }
  return { text, time, priority };
}

export function moveTask(from: ISODate, id: string, to: ISODate) {
  if (from === to) return;
  update((s) => {
    const list = s.tasks[from] ?? [];
    const i = list.findIndex((t) => t.id === id);
    if (i < 0) return;
    const [t] = list.splice(i, 1);
    if (!list.length) delete s.tasks[from];
    (s.tasks[to] ??= []).push(t);
  });
}

export function QuickAdd({ date, compact }: { date: ISODate; compact?: boolean }) {
  const [v, setV] = useState("");
  const add = () => {
    const p = parseQuick(v);
    if (!p.text) return;
    update((s) => { (s.tasks[date] ??= []).push({ id: uid(), text: p.text, time: p.time, priority: p.priority, done: false }); });
    setV("");
  };
  return (
    <form className={"quickadd" + (compact ? " compact" : "")} onSubmit={(e) => { e.preventDefault(); add(); }}>
      <Icon name="plus" size={18} />
      <input value={v} onChange={(e) => setV(e.target.value)} placeholder={compact ? "Add task" : "Add a task…  e.g. “9:30 gym !”"} enterKeyHint="done" aria-label="Add a task" />
      {v.trim() && <button type="submit" className="btn primary sm">Add</button>}
    </form>
  );
}

export function TaskRow({ date, t, onOpen, showDate }: { date: ISODate; t: Task; onOpen: () => void; showDate?: boolean }) {
  return (
    <div className={"task" + (t.done ? " done" : "")}>
      <Check on={t.done} color="var(--teal)" size={26} label={t.done ? "Mark not done" : "Mark done"}
        onClick={() => update((s) => { const x = s.tasks[date]?.find((y) => y.id === t.id); if (x) x.done = !x.done; })} />
      <button className="task-main" onClick={onOpen}>
        <span className="task-text">{t.text}</span>
        <span className="task-meta">
          {t.priority > 0 && <i className="prio" style={{ background: PRIORITY_COLORS[t.priority] }} />}
          {t.time && <span className="chip"><Icon name="clock" size={11} />{t.time}</span>}
          {showDate && <span className="chip">{fmtShort(date)}</span>}
          {t.note && <span className="chip">note</span>}
        </span>
      </button>
    </div>
  );
}

export function TaskList({ date, compact, empty }: { date: ISODate; compact?: boolean; empty?: string }) {
  const [open, setOpen] = useState<string | null>(null);
  const s = useStore();
  const tasks = sortTasks(s.tasks[date] ?? []);
  return (
    <div className="tasklist">
      {tasks.length === 0 && empty && <div className="muted small pad-y">{empty}</div>}
      {tasks.map((t) => <TaskRow key={t.id} date={date} t={t} onOpen={() => setOpen(t.id)} />)}
      <QuickAdd date={date} compact={compact} />
      {open && <TaskSheet date={date} id={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

export function TaskSheet({ date, id, onClose }: { date: ISODate; id: string; onClose: () => void }) {
  const s = useStore();
  const t = s.tasks[date]?.find((x) => x.id === id);
  const [moveDate, setMoveDate] = useState(date);
  if (!t) return null;
  const set = (fn: (t: Task) => void) => update((st) => { const x = st.tasks[date]?.find((y) => y.id === id); if (x) fn(x); });
  const move = (to: ISODate) => { moveTask(date, id, to); toast(`Moved to ${fmtShort(to)}`); onClose(); };
  const del = () => {
    update((st) => {
      st.tasks[date] = (st.tasks[date] ?? []).filter((x) => x.id !== id);
      if (!st.tasks[date].length) delete st.tasks[date];
    }, "Task deleted");
    toast("Task deleted", { label: "Undo", run: undo });
    onClose();
  };
  const today = todayISO();
  return (
    <Sheet open onClose={onClose} title="Task">
      <label className="field">
        <span>Task</span>
        <input value={t.text} onChange={(e) => set((x) => { x.text = e.target.value; })} />
      </label>
      <div className="row gap12">
        <label className="field" style={{ flex: 1 }}>
          <span>Time</span>
          <input type="time" value={t.time ?? ""} onChange={(e) => set((x) => { x.time = e.target.value || undefined; })} />
        </label>
        <label className="field" style={{ flex: 1.4 }}>
          <span>Priority</span>
          <Segmented value={String(t.priority)} onChange={(v) => set((x) => { x.priority = +v as Priority; })}
            options={PRIORITY_LABELS.map((l, i) => ({ v: String(i), label: l }))} />
        </label>
      </div>
      <label className="field">
        <span>Note</span>
        <textarea rows={3} value={t.note ?? ""} placeholder="Details, links, sub-steps…" onChange={(e) => set((x) => { x.note = e.target.value || undefined; })} />
      </label>
      <div className="field">
        <span>Move to</span>
        <div className="row gap8 wrap">
          {date !== today && <button className="btn ghost sm" onClick={() => move(today)}>Today</button>}
          <button className="btn ghost sm" onClick={() => move(addDays(date, 1))}>Next day</button>
          <button className="btn ghost sm" onClick={() => move(addDays(date, 7))}>+1 week</button>
          <input type="date" className="sm" value={moveDate} onChange={(e) => setMoveDate(e.target.value)} />
          {moveDate && moveDate !== date && <button className="btn primary sm" onClick={() => move(moveDate)}>Move</button>}
        </div>
      </div>
      <div className="row gap8" style={{ marginTop: 8 }}>
        <button className="btn primary grow" onClick={() => { set((x) => { x.done = !x.done; }); onClose(); }}>
          {t.done ? "Mark not done" : "Mark done"}
        </button>
        <button className="btn danger" onClick={del}><Icon name="trash" size={16} /> Delete</button>
      </div>
    </Sheet>
  );
}
