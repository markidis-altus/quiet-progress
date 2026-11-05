import { useState } from "react";
import type { Habit } from "../lib/types";
import { useStore } from "../lib/store";
import { addDays, DOW_LETTER, dowIndex, mondayOf, MONTHS_FULL, monthDays, range, todayISO } from "../lib/dates";
import { habitCredit, habitsProgress, isActive, isDone, pct, streak } from "../lib/stats";
import { Bar, Empty, Icon, Segmented } from "../components/ui";
import { Chart, Heatmap } from "../components/charts";
import { freqLabel, HabitDetail, HabitEditor, toggleHabit } from "../components/habits";

export function Habits() {
  const s = useStore();
  const [view, setView] = useState<"list" | "month">("list");
  const [editing, setEditing] = useState<Habit | "new" | null>(null);
  const [detail, setDetail] = useState<Habit | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const today = todayISO();
  const active = s.habits.filter((h) => !h.end || h.end > today);
  const archived = s.habits.filter((h) => h.end && h.end <= today);

  return (
    <div className="screen">
      <header className="top">
        <div><div className="eyebrow">{active.length} active</div><h1>Habits</h1></div>
        <button className="btn primary sm" onClick={() => setEditing("new")}><Icon name="plus" size={16} />New</button>
      </header>
      <Segmented value={view} onChange={setView} options={[{ v: "list", label: <><Icon name="list" size={15} /> Overview</> }, { v: "month", label: <><Icon name="grid" size={15} /> Month grid</> }]} />

      {s.habits.length === 0 && (
        <div className="card" style={{ marginTop: 14 }}>
          <Empty icon="habits" title="Build your list">Start small: two or three habits you can keep even on a bad day.</Empty>
          <button className="btn primary block" onClick={() => setEditing("new")}>Add a habit</button>
        </div>
      )}

      {view === "list" && (
        <div className="stack" style={{ marginTop: 14 }}>
          {active.map((h) => <HabitCard key={h.id} h={h} onOpen={() => setDetail(h)} />)}
          {archived.length > 0 && (
            <>
              <button className="btn ghost block" onClick={() => setShowArchived(!showArchived)}>
                <Icon name="archive" size={16} />{showArchived ? "Hide" : "Show"} archived ({archived.length})
              </button>
              {showArchived && archived.map((h) => <HabitCard key={h.id} h={h} onOpen={() => setDetail(h)} />)}
            </>
          )}
        </div>
      )}

      {view === "month" && s.habits.length > 0 && <MonthGrid ym={ym} setYm={setYm} onOpen={setDetail} />}

      {editing && <HabitEditor habit={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} />}
      {detail && <HabitDetail habit={detail} onClose={() => setDetail(null)} onEdit={() => { setEditing(detail); setDetail(null); }} />}
    </div>
  );
}

function HabitCard({ h, onOpen }: { h: Habit; onOpen: () => void }) {
  const s = useStore();
  const today = todayISO();
  const st = streak(s, h);
  const r30 = habitCredit(s, h, addDays(today, -29), today);
  // last 16 Mon–Sun weeks, so the heatmap columns line up with real weeks
  const cells = range(addDays(mondayOf(today), -105), today).map((d) => ({
    date: d, v: !isActive(h, d) ? null : isDone(s, h.id, d) ? 1 : 0,
  }));
  return (
    <button className={"card habit-card" + (h.end && h.end <= today ? " archived" : "")} onClick={onOpen}>
      <div className="row gap12" style={{ alignItems: "center" }}>
        <span className="emoji lg" style={{ background: h.color + "26", borderColor: h.color + "55" }}>{h.emoji}</span>
        <div className="grow" style={{ minWidth: 0 }}>
          <div className="habit-name">{h.name}</div>
          <div className="muted small">{freqLabel(h.freq)}</div>
        </div>
        <div className="streak-box">
          <Icon name="flame" size={16} stroke={2.2} style={{ color: st.current ? "var(--yellow)" : "var(--muted)" }} />
          <b>{st.current}</b><small>{st.unit}</small>
          <div className="muted tiny">best {st.best}{st.unit}</div>
        </div>
      </div>
      <div className="row gap8" style={{ alignItems: "center", margin: "10px 0 8px" }}>
        <span className="muted tiny" style={{ width: 52 }}>30 days</span>
        <div className="grow"><Bar value={r30.rate} /></div>
        <b className="small" style={{ width: 40, textAlign: "right" }}>{pct(r30.rate)}</b>
      </div>
      <Heatmap cells={cells} color={h.color} cell={10} gap={3} />
    </button>
  );
}

function MonthGrid({ ym, setYm, onOpen }: { ym: { y: number; m: number }; setYm: (v: { y: number; m: number }) => void; onOpen: (h: Habit) => void }) {
  const s = useStore();
  const days = monthDays(ym.y, ym.m);
  const first = days[0], last = days[days.length - 1];
  const today = todayISO();
  const habits = s.habits.filter((h) => h.start <= last && (!h.end || h.end > first));
  const prog = habitsProgress(s, first, last);
  const shift = (k: number) => { const d = new Date(ym.y, ym.m + k, 1); setYm({ y: d.getFullYear(), m: d.getMonth() }); };
  const daily = days.map((d) => {
    const act = habits.filter((h) => isActive(h, d));
    if (d > today || !act.length) return null;
    return act.filter((h) => isDone(s, h.id, d)).length / act.length;
  });
  const ticks = days.reduce((a, d) => a + (s.habitLog[d]?.length ?? 0), 0);

  return (
    <div className="stack" style={{ marginTop: 14 }}>
      <div className="card">
        <div className="row between" style={{ alignItems: "center" }}>
          <button className="icon-btn" onClick={() => shift(-1)} aria-label="Previous month"><Icon name="left" /></button>
          <div style={{ textAlign: "center" }}>
            <div className="h2">{MONTHS_FULL[ym.m]} {ym.y}</div>
            <div className="muted tiny" style={{ letterSpacing: 2 }}>HABIT TRACKER</div>
          </div>
          <button className="icon-btn" onClick={() => shift(1)} aria-label="Next month"><Icon name="right" /></button>
        </div>
        <div className="kpis three" style={{ marginTop: 12 }}>
          <div><span>Habits</span><b>{habits.length}</b></div>
          <div><span>Ticks</span><b>{ticks}</b></div>
          <div><span>Progress</span><b>{pct(prog.rate, 1)}</b></div>
        </div>
      </div>

      <div className="card pad0">
        <div className="mgrid-wrap">
          <table className="mgrid">
            <thead>
              <tr>
                <th className="stick" />
                {days.map((d) => <th key={d} className={(d === today ? "today " : "") + (dowIndex(d) === 6 ? "wkend" : "")}>{DOW_LETTER[dowIndex(d)]}<br />{+d.slice(8)}</th>)}
                <th className="an">%</th>
              </tr>
            </thead>
            <tbody>
              {habits.map((h) => {
                const c = habitCredit(s, h, first, last > today ? today : last);
                return (
                  <tr key={h.id}>
                    <td className="stick"><button className="mname" onClick={() => onOpen(h)}><span>{h.emoji}</span>{h.name}</button></td>
                    {days.map((d) => {
                      const act = isActive(h, d), on = isDone(s, h.id, d);
                      return (
                        <td key={d} className={dowIndex(d) === 6 ? "wkend" : ""}>
                          {act ? (
                            <button className={"mcell" + (on ? " on" : "")} style={{ ["--c" as string]: h.color }} onClick={() => toggleHabit(h.id, d)} aria-label={`${h.name} ${d}`} />
                          ) : <span className="mcell off" />}
                        </td>
                      );
                    })}
                    <td className="an"><b style={{ color: c.rate == null ? "var(--muted)" : undefined }}>{pct(c.rate)}</b></td>
                  </tr>
                );
              })}
              <tr className="foot">
                <td className="stick muted">Daily</td>
                {daily.map((v, i) => <td key={i} className={dowIndex(days[i]) === 6 ? "wkend" : ""}>{v == null ? "" : Math.round(v * 100)}</td>)}
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="h3">Daily completion</div>
        <Chart height={140} labels={days.map((d) => String(+d.slice(8)))} yMin={0} yMax={100} fmtY={(v) => Math.round(v) + "%"}
          series={[{ label: "Habits done", color: "var(--purple)", kind: "area", values: daily.map((v) => (v == null ? null : v * 100)) }]} />
      </div>
    </div>
  );
}
