import { useState } from "react";
import type { Habit, ISODate } from "../lib/types";
import { CHECKIN_KEYS } from "../lib/types";
import { update, useStore } from "../lib/store";
import { addDays, DOW_LETTER, fmtLong, fromISO, relativeLabel, todayISO, weekDays } from "../lib/dates";
import { activeHabits, checkinScore, dayProgress, pct, weightSeries } from "../lib/stats";
import { daysSinceBackup, exportBackup } from "../lib/backup";
import { isIOSOtherBrowser } from "../lib/offline";
import { Empty, Icon, Ring, ScorePicker, toast } from "../components/ui";
import { HabitDetail, HabitEditor, HabitRow } from "../components/habits";
import { moveTask, TaskList, TaskRow, TaskSheet } from "../components/tasks";

export function Today({ date, setDate, openSettings }: { date: ISODate; setDate: (d: ISODate) => void; openSettings: () => void }) {
  const s = useStore();
  const today = todayISO();
  const [editing, setEditing] = useState<Habit | "new" | null>(null);
  const [detail, setDetail] = useState<Habit | null>(null);
  const [overdueOpen, setOverdueOpen] = useState<{ date: string; id: string } | null>(null);
  const [showAllOverdue, setShowAllOverdue] = useState(false);
  const habits = activeHabits(s, date);
  const p = dayProgress(s, date);
  const score = checkinScore(s, date);
  const c = s.checkins[date] ?? {};
  const week = weekDays(date);

  const overdue = date === today
    ? Object.entries(s.tasks)
        .filter(([d]) => d < today && d >= addDays(today, -30))
        .flatMap(([d, list]) => list.filter((t) => !t.done).map((t) => ({ d, t })))
        .sort((a, b) => (a.d < b.d ? -1 : 1))
    : [];

  const setCheckin = (k: string, v: number | string | undefined) =>
    update((st) => {
      const cur: Record<string, unknown> = { ...(st.checkins[date] ?? {}), [k]: v };
      for (const key of Object.keys(cur)) if (cur[key] == null || cur[key] === "") delete cur[key];
      if (Object.keys(cur).length) st.checkins[date] = cur; else delete st.checkins[date];
    });

  const series = weightSeries(s);
  const wToday = s.weight.entries[date];
  const prev = [...series].reverse().find((e) => e.date < date);
  const hasData = s.habits.length > 0 || Object.keys(s.tasks).length > 0;
  const since = daysSinceBackup(s);
  const needBackup = hasData && (since == null || since >= 7);

  return (
    <div className="screen">
      <header className="top">
        <div>
          <div className="eyebrow">{fmtLong(date)}</div>
          <h1>{relativeLabel(date)}</h1>
        </div>
        <div className="row gap4">
          {date !== today && <button className="btn ghost sm" onClick={() => setDate(today)}>Today</button>}
          <button className="icon-btn" onClick={openSettings} aria-label="Settings"><Icon name="gear" /></button>
        </div>
      </header>

      <div className="weekstrip">
        <button className="icon-btn" onClick={() => setDate(addDays(date, -7))} aria-label="Previous week"><Icon name="left" /></button>
        {week.map((d, i) => {
          const dp = dayProgress(s, d);
          return (
            <button key={d} className={"wday" + (d === date ? " on" : "") + (d === today ? " today" : "")} onClick={() => setDate(d)}>
              <span className="wl">{DOW_LETTER[i]}</span>
              <Ring value={d > today ? null : dp.rate} size={34} stroke={4}>
                <span className="wn">{fromISO(d).getDate()}</span>
              </Ring>
            </button>
          );
        })}
        <button className="icon-btn" onClick={() => setDate(addDays(date, 7))} aria-label="Next week"><Icon name="right" /></button>
      </div>

      {isIOSOtherBrowser && (
        <div className="banner">
          <span>This browser can't install the app or run it offline. Open this page in <b>Safari</b>, then Share → Add to Home Screen.</span>
          <button className="btn primary sm" onClick={async () => { try { await navigator.clipboard.writeText(location.href); toast("Link copied — paste it in Safari"); } catch { toast(location.href); } }}>Copy link</button>
        </div>
      )}

      {needBackup && (
        <div className="banner">
          <span>{since == null ? "Your data lives only on this phone." : `Last backup was ${since} days ago.`} Save a copy to Files.</span>
          <button className="btn primary sm" onClick={async () => (await exportBackup()) && toast("Backup saved")}>Back up</button>
        </div>
      )}

      <section className="card hero">
        <Ring value={p.rate} size={112} stroke={11}>
          <b className="big">{pct(p.rate)}</b>
          <span className="muted tiny">of today</span>
        </Ring>
        <div className="hero-stats">
          <div><span>Habits</span><b>{p.habitsDone}<small>/{p.habitsDue}</small></b></div>
          <div><span>Tasks</span><b>{p.tasksDone}<small>/{p.tasks}</small></b></div>
          <div><span>Mindset</span><b>{score == null ? "—" : pct(score)}</b></div>
        </div>
      </section>

      <section>
        <div className="sec-head">
          <h2>Habits</h2>
          <button className="btn ghost sm" onClick={() => setEditing("new")}><Icon name="plus" size={16} />New</button>
        </div>
        {habits.length === 0 ? (
          <div className="card">
            <Empty icon="habits" title="No habits yet">Add the few things you want to do regularly — daily or a few times a week.</Empty>
            <button className="btn primary block" onClick={() => setEditing("new")}>Add your first habit</button>
          </div>
        ) : (
          <div className="card list">
            {habits.map((h) => <HabitRow key={h.id} h={h} date={date} onOpen={() => setDetail(h)} />)}
          </div>
        )}
      </section>

      <section>
        <div className="sec-head"><h2>Tasks</h2><span className="muted small">{p.tasksDone}/{p.tasks} done</span></div>
        {overdue.length > 0 && (
          <div className="card list overdue">
            <div className="row between" style={{ marginBottom: 4 }}>
              <b className="small" style={{ color: "var(--yellow)" }}>Carried over · {overdue.length}</b>
              <button className="btn ghost sm" onClick={() => { overdue.forEach((o) => moveTask(o.d, o.t.id, today)); toast(`Moved ${overdue.length} to today`); }}>
                Move all to today
              </button>
            </div>
            {overdue.slice(-(showAllOverdue ? overdue.length : 3)).reverse().map((o) => (
              <TaskRow key={o.t.id} date={o.d} t={o.t} showDate onOpen={() => setOverdueOpen({ date: o.d, id: o.t.id })} />
            ))}
            {overdue.length > 3 && (
              <button className="btn ghost sm block" style={{ margin: "6px 0" }} onClick={() => setShowAllOverdue(!showAllOverdue)}>
                {showAllOverdue ? "Show fewer" : `Show all ${overdue.length}`}
              </button>
            )}
          </div>
        )}
        <div className="card list">
          <TaskList date={date} empty="Nothing planned. Add a task below — start with a time like “9:30” to schedule it, end with ! for priority." />
        </div>
      </section>

      <section>
        <div className="sec-head"><h2>Check-in</h2><span className="muted small">{score == null ? "How are you today?" : "Score " + pct(score)}</span></div>
        <div className="card">
          {CHECKIN_KEYS.map(({ key, label, color }) => (
            <div className="checkin" key={key}>
              <div className="row between"><span>{label}</span><b style={{ color }}>{c[key] ?? "–"}</b></div>
              <ScorePicker value={c[key]} color={color} onChange={(v) => setCheckin(key, v)} />
            </div>
          ))}
          <textarea className="note" rows={2} placeholder="A line about today (optional)" value={c.note ?? ""} onChange={(e) => setCheckin("note", e.target.value)} />
        </div>
      </section>

      <section>
        <div className="sec-head"><h2>Weight</h2><span className="muted small">{s.weight.goal != null ? `Goal ${s.weight.goal} ${s.settings.unit}` : ""}</span></div>
        <div className="card row gap12" style={{ alignItems: "center" }}>
          <input className="weight-in" type="number" inputMode="decimal" step="0.1" placeholder={prev ? String(prev.v) : "—"}
            value={wToday ?? ""} aria-label="Weight"
            onChange={(e) => {
              const v = e.target.value === "" ? undefined : parseFloat(e.target.value);
              update((st) => { if (v == null || isNaN(v) || v <= 0) delete st.weight.entries[date]; else st.weight.entries[date] = v; });
            }} />
          <span className="muted">{s.settings.unit}</span>
          <div className="grow" style={{ textAlign: "right" }}>
            {wToday != null && prev ? (
              <span style={{ color: wToday - prev.v <= 0 ? "var(--teal)" : "var(--yellow)", fontWeight: 600 }}>
                {wToday - prev.v > 0 ? "+" : ""}{(wToday - prev.v).toFixed(1)} since {relativeLabel(prev.date).toLowerCase()}
              </span>
            ) : <span className="muted small">{prev ? `Last: ${prev.v} ${s.settings.unit}` : "Optional — weigh in when you like"}</span>}
          </div>
        </div>
      </section>

      {editing && <HabitEditor habit={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} />}
      {detail && <HabitDetail habit={detail} onClose={() => setDetail(null)} onEdit={() => { setEditing(detail); setDetail(null); }} />}
      {overdueOpen && <TaskSheet date={overdueOpen.date} id={overdueOpen.id} onClose={() => setOverdueOpen(null)} />}
    </div>
  );
}
