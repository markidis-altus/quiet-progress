import { useState } from "react";
import type { ISODate } from "../lib/types";
import { useStore } from "../lib/store";
import { addDays, DOW_SHORT, fmt, fmtShort, mondayOf, todayISO, weekDays } from "../lib/dates";
import { bandColor, pct } from "../lib/stats";
import { Icon, Ring } from "../components/ui";
import { Chart } from "../components/charts";
import { TaskList, TaskRow, TaskSheet } from "../components/tasks";

export function Tasks({ date, setDate }: { date: ISODate; setDate: (d: ISODate) => void }) {
  const s = useStore();
  const today = todayISO();
  const week = weekDays(date);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<{ date: string; id: string } | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const per = week.map((d) => {
    const list = s.tasks[d] ?? [];
    return { d, total: list.length, done: list.filter((t) => t.done).length };
  });
  const tot = per.reduce((a, x) => a + x.total, 0), done = per.reduce((a, x) => a + x.done, 0);
  const isThisWeek = mondayOf(date) === mondayOf(today);
  const query = q.trim().toLowerCase();
  const results = query
    ? Object.entries(s.tasks)
        .flatMap(([d, list]) => list.filter((t) => t.text.toLowerCase().includes(query) || t.note?.toLowerCase().includes(query)).map((t) => ({ d, t })))
        .sort((a, b) => (a.d < b.d ? 1 : -1))
        .slice(0, 60)
    : [];

  return (
    <div className="screen">
      <header className="top">
        <div><div className="eyebrow">{fmtShort(week[0])} – {fmtShort(week[6])}</div><h1>Tasks</h1></div>
        <div className="row gap4">
          {!isThisWeek && <button className="btn ghost sm" onClick={() => setDate(today)}>This week</button>}
          <button className="icon-btn" onClick={() => setDate(addDays(date, -7))} aria-label="Previous week"><Icon name="left" /></button>
          <button className="icon-btn" onClick={() => setDate(addDays(date, 7))} aria-label="Next week"><Icon name="right" /></button>
        </div>
      </header>

      <div className="search">
        <Icon name="search" size={17} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search all tasks" type="search" aria-label="Search tasks" />
      </div>

      {query ? (
        <div className="card list" style={{ marginTop: 12 }}>
          {results.length === 0 && <div className="muted small pad-y">No tasks match “{q}”.</div>}
          {results.map(({ d, t }) => <TaskRow key={t.id} date={d} t={t} showDate onOpen={() => setOpen({ date: d, id: t.id })} />)}
        </div>
      ) : (
        <>
          <section className="card week-summary">
            <Ring value={tot ? done / tot : null} size={92} stroke={10} color="var(--teal)">
              <b>{pct(tot ? done / tot : null)}</b>
            </Ring>
            <div className="grow" style={{ minWidth: 0 }}>
              <div className="row between small"><span className="muted">Week</span><span><b style={{ color: "var(--teal)" }}>{done}</b> done · <b style={{ color: "var(--red)" }}>{tot - done}</b> open</span></div>
              <Chart height={96} yTicks={false} labels={week.map((_, i) => DOW_SHORT[i][0])} yMin={0} tickEvery={1}
                series={[
                  { label: "Planned", color: "var(--track)", kind: "bar", values: per.map((x) => x.total) },
                  { label: "Done", color: "var(--teal)", kind: "bar", values: per.map((x) => x.done) },
                ]} />
            </div>
          </section>

          <div className="days">
            {week.map((d, i) => {
              const x = per[i];
              const rate = x.total ? x.done / x.total : null;
              const isCollapsed = collapsed[d] ?? (d < today && x.total > 0 && x.done === x.total);
              return (
                <section key={d} className={"card day" + (d === today ? " is-today" : "")}>
                  <button className="day-head" onClick={() => setCollapsed({ ...collapsed, [d]: !isCollapsed })}>
                    <div>
                      <b>{fmt(d, { weekday: "long" })}</b>
                      {d === today && <span className="badge">TODAY</span>}
                      <div className="muted tiny">{fmtShort(d)}{s.briefs[d] && <> · brief ✓</>}</div>
                    </div>
                    <div className="row gap8" style={{ alignItems: "center" }}>
                      <span className="small muted">{x.done}/{x.total}</span>
                      <b style={{ color: bandColor(rate), minWidth: 38, textAlign: "right" }}>{pct(rate)}</b>
                      <Icon name={isCollapsed ? "right" : "left"} size={16} style={{ transform: isCollapsed ? "none" : "rotate(-90deg)" }} />
                    </div>
                  </button>
                  {!isCollapsed && <TaskList date={d} compact />}
                </section>
              );
            })}
          </div>
        </>
      )}
      {open && <TaskSheet date={open.date} id={open.id} onClose={() => setOpen(null)} />}
    </div>
  );
}
