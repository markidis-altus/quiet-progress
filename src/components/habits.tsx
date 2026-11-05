import { useState } from "react";
import type { Habit, ISODate } from "../lib/types";
import { HABIT_COLORS } from "../lib/types";
import { getState, uid, undo, update, useStore } from "../lib/store";
import { addDays, fmtShort, range, todayISO } from "../lib/dates";
import { habitCredit, isDone, pct, streak, weekCount } from "../lib/stats";
import { guessEmoji } from "../lib/migrate";
import { Bar, Check, Icon, Segmented, Sheet, confirmDialog, toast } from "./ui";
import { Heatmap } from "./charts";

const EMOJIS = ["✨", "🏋️", "🏃", "🚶", "📚", "💧", "😴", "🧘", "✍️", "🤸", "🎓", "🥗", "🙏", "💻", "🚫", "💊", "🎸", "🧹", "🌱", "☀️", "📵", "🦷", "💰", "❤️"];

export const freqLabel = (f: number) => (f >= 7 ? "Daily" : `${f}× / week`);

export function toggleHabit(hid: string, d: ISODate) {
  update((s) => {
    const list = (s.habitLog[d] ??= []);
    const i = list.indexOf(hid);
    if (i >= 0) list.splice(i, 1); else list.push(hid);
    if (!list.length) delete s.habitLog[d];
  });
}

export function HabitRow({ h, date, onOpen }: { h: Habit; date: ISODate; onOpen: () => void }) {
  const s = useStore();
  const done = isDone(s, h.id, date);
  const st = streak(s, h);
  const wk = weekCount(s, h, date);
  const metWeek = h.freq < 7 && wk.done >= h.freq && !done;
  return (
    <div className={"habit" + (done ? " done" : "") + (metWeek ? " met" : "")}>
      <button className="habit-main" onClick={onOpen}>
        <span className="emoji" style={{ background: h.color + "26", borderColor: h.color + "55" }}>{h.emoji}</span>
        <span className="habit-body">
          <span className="habit-name">{h.name}</span>
          <span className="habit-meta">
            {h.freq >= 7 ? "Daily" : <>{wk.done}/{h.freq} this week{metWeek && " ✓"}</>}
            {st.current > 0 && <span className="streak"><Icon name="flame" size={12} stroke={2.2} />{st.current}{st.unit}</span>}
          </span>
        </span>
      </button>
      <Check on={done} color={h.color} size={32} onClick={() => toggleHabit(h.id, date)} label={(done ? "Untick " : "Tick ") + h.name} />
    </div>
  );
}

export function HabitEditor({ habit, onClose }: { habit?: Habit; onClose: () => void }) {
  const isNew = !habit;
  const [name, setName] = useState(habit?.name ?? "");
  const [emoji, setEmoji] = useState(habit?.emoji ?? "");
  const [color, setColor] = useState(habit?.color ?? HABIT_COLORS[getState().habits.length % HABIT_COLORS.length]);
  const [freq, setFreq] = useState(String(habit?.freq ?? 7));
  const [start, setStart] = useState(habit?.start ?? todayISO());
  const save = () => {
    const n = name.trim();
    if (!n) return;
    const e = emoji.trim() || guessEmoji(n);
    update((s) => {
      if (habit) {
        const h = s.habits.find((x) => x.id === habit.id);
        if (h) Object.assign(h, { name: n, emoji: e, color, freq: +freq, start });
      } else {
        s.habits.push({ id: uid(), name: n, emoji: e, color, freq: +freq, start });
      }
    });
    toast(isNew ? "Habit added" : "Habit saved");
    onClose();
  };
  const archive = () => {
    if (!habit) return;
    const archived = !!habit.end;
    update((s) => {
      const h = s.habits.find((x) => x.id === habit.id);
      if (h) { if (archived) delete h.end; else h.end = addDays(todayISO(), 1); }
    }, archived ? "Habit restored" : "Habit archived");
    toast(archived ? "Habit restored" : "Habit archived — its history is kept", { label: "Undo", run: undo });
    onClose();
  };
  const del = async () => {
    if (!habit) return;
    const ok = await confirmDialog(`Delete “${habit.name}”?`, "This removes the habit and every tick it has. Archive it instead to keep the history.", "Delete", true);
    if (!ok) return;
    update((s) => {
      s.habits = s.habits.filter((x) => x.id !== habit.id);
      for (const d of Object.keys(s.habitLog)) {
        s.habitLog[d] = s.habitLog[d].filter((id) => id !== habit.id);
        if (!s.habitLog[d].length) delete s.habitLog[d];
      }
    }, "Habit deleted");
    toast("Habit deleted", { label: "Undo", run: undo });
    onClose();
  };
  return (
    <Sheet open onClose={onClose} title={isNew ? "New habit" : "Edit habit"}
      footer={<button className="btn primary block" disabled={!name.trim()} onClick={save}>{isNew ? "Add habit" : "Save"}</button>}>
      <div className="row gap12" style={{ alignItems: "flex-end" }}>
        <label className="field" style={{ width: 70 }}>
          <span>Icon</span>
          <input className="emoji-in" value={emoji} placeholder={guessEmoji(name)} onChange={(e) => setEmoji([...e.target.value].slice(-2).join(""))} />
        </label>
        <label className="field grow">
          <span>Name</span>
          <input value={name} autoFocus={isNew} placeholder="e.g. Read 20 pages" onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} />
        </label>
      </div>
      <div className="emoji-grid">
        {EMOJIS.map((e) => <button key={e} className={emoji === e ? "on" : ""} onClick={() => setEmoji(e)}>{e}</button>)}
      </div>
      <div className="field">
        <span>Colour</span>
        <div className="row gap8 wrap">
          {HABIT_COLORS.map((c) => (
            <button key={c} className={"swatch" + (c === color ? " on" : "")} style={{ background: c }} onClick={() => setColor(c)} aria-label={"Colour " + c} />
          ))}
        </div>
      </div>
      <div className="field">
        <span>How often</span>
        <Segmented value={freq} onChange={setFreq} options={[{ v: "7", label: "Daily" }, ...[1, 2, 3, 4, 5, 6].map((f) => ({ v: String(f), label: `${f}×` }))]} />
        <small className="muted">{+freq >= 7 ? "Every day counts." : `Any ${freq} days of each Mon–Sun week score 100% for that week.`}</small>
      </div>
      <label className="field">
        <span>Counts from</span>
        <input type="date" value={start} onChange={(e) => e.target.value && setStart(e.target.value)} />
      </label>
      {!isNew && (
        <div className="row gap8" style={{ marginTop: 6 }}>
          <button className="btn ghost grow" onClick={archive}><Icon name="archive" size={16} />{habit!.end ? "Restore" : "Archive"}</button>
          <button className="btn danger grow" onClick={del}><Icon name="trash" size={16} />Delete</button>
        </div>
      )}
    </Sheet>
  );
}

export function HabitDetail({ habit, onClose, onEdit }: { habit: Habit; onClose: () => void; onEdit: () => void }) {
  const s = useStore();
  const h = s.habits.find((x) => x.id === habit.id) ?? habit;
  const today = todayISO();
  const st = streak(s, h);
  const yearAgo = addDays(today, -364);
  const from = h.start > yearAgo ? h.start : yearAgo;
  const r30 = habitCredit(s, h, addDays(today, -29), today);
  const r90 = habitCredit(s, h, addDays(today, -89), today);
  const all = habitCredit(s, h, h.start, today);
  const cells = range(addDays(today, -364), today).map((d) => ({
    date: d,
    v: d < h.start || (h.end && d >= h.end) ? null : isDone(s, h.id, d) ? 1 : 0,
    title: `${fmtShort(d)}${isDone(s, h.id, d) ? " ✓" : ""}`,
  }));
  return (
    <Sheet open onClose={onClose} title={<span>{h.emoji} {h.name}</span>}
      footer={<button className="btn ghost block" onClick={onEdit}><Icon name="edit" size={16} />Edit habit</button>}>
      <div className="muted small" style={{ marginTop: -6, marginBottom: 12 }}>
        {freqLabel(h.freq)} · since {fmtShort(h.start)}{h.end ? ` · archived ${fmtShort(h.end)}` : ""}
      </div>
      <div className="kpis">
        <div><span>Current streak</span><b>{st.current}<small>{st.unit === "d" ? " days" : " wks"}</small></b></div>
        <div><span>Best streak</span><b>{st.best}<small>{st.unit === "d" ? " days" : " wks"}</small></b></div>
        <div><span>Last 30 days</span><b>{pct(r30.rate)}</b></div>
        <div><span>Last 90 days</span><b>{pct(r90.rate)}</b></div>
        <div><span>All time</span><b>{pct(all.rate)}</b></div>
        <div><span>Total ticks</span><b>{all.count}</b></div>
      </div>
      <div className="h3" style={{ margin: "16px 0 8px" }}>Last 12 months</div>
      <Heatmap cells={cells} color={h.color} onPick={(d) => d <= today && d >= from && toggleHabit(h.id, d)} />
      <div className="muted small" style={{ marginTop: 6 }}>Tap a square to fix a missed tick.</div>
      <div className="h3" style={{ margin: "16px 0 8px" }}>Last 8 weeks</div>
      {Array.from({ length: 8 }, (_, i) => {
        const mon = addDays(addDays(today, -((new Date().getDay() + 6) % 7)), -7 * (7 - i));
        const end = addDays(mon, 6);
        const c = habitCredit(s, h, mon, end > today ? today : end);
        return (
          <div className="row gap8" key={mon} style={{ marginBottom: 6, alignItems: "center" }}>
            <span className="muted small" style={{ width: 52 }}>{fmtShort(mon)}</span>
            <div className="grow"><Bar value={c.rate} /></div>
            <span className="small" style={{ width: 40, textAlign: "right" }}>{pct(c.rate)}</span>
          </div>
        );
      })}
    </Sheet>
  );
}
