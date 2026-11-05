import { useState } from "react";
import { useStore } from "../lib/store";
import { addDays, DOW_SHORT, dowIndex, fmtShort, MONTHS, MONTHS_FULL, range, todayISO, toISO } from "../lib/dates";
import { avg, bandColor, checkinScore, correlation, dayProgress, habitCredit, habitsProgress, pct, streak } from "../lib/stats";
import { CHECKIN_KEYS } from "../lib/types";
import { Bar, Empty, Icon } from "../components/ui";
import { Chart, YearHeat } from "../components/charts";

export function Insights() {
  const s = useStore();
  const today = todayISO();
  const [year, setYear] = useState(new Date().getFullYear());
  const y0 = `${year}-01-01`, y1 = `${year}-12-31`;
  const end = y1 < today ? y1 : today;
  const days = y0 <= end ? range(y0, end) : [];

  const months = MONTHS.map((_, m) => {
    const a = toISO(new Date(year, m, 1)), b = toISO(new Date(year, m + 1, 0));
    const hp = habitsProgress(s, a, b);
    const scores = range(a, b < today ? b : today).map((d) => checkinScore(s, d)).filter((v): v is number => v != null);
    const tasks = range(a, b).flatMap((d) => s.tasks[d] ?? []);
    return { m, rate: a > today ? null : hp.rate, ticks: hp.count, mind: avg(scores), tasks: tasks.length, tasksDone: tasks.filter((t) => t.done).length };
  });

  const yp = habitsProgress(s, y0, y1);
  const dps = days.map((d) => ({ d, ...dayProgress(s, d) }));
  const perfect = dps.filter((x) => x.rate === 1 && x.habitsDue + x.tasks > 0).length;
  const yearTasks = dps.reduce((a, x) => a + x.tasksDone, 0);
  const mindAll = avg(days.map((d) => checkinScore(s, d)).filter((v): v is number => v != null));
  const bestStreak = s.habits.map((h) => ({ h, st: streak(s, h) })).sort((a, b) => b.st.best - a.st.best)[0];

  // last 12 weeks by weekday
  const last84 = range(addDays(today, -83), today);
  const byDow = Array.from({ length: 7 }, (_, i) => avg(last84.filter((d) => dowIndex(d) === i).map((d) => dayProgress(s, d).habitRate).filter((v): v is number => v != null)));

  // habits ↔ mood
  const pairs = range(addDays(today, -89), today)
    .map((d) => ({ h: dayProgress(s, d).habitRate, m: checkinScore(s, d) }))
    .filter((x): x is { h: number; m: number } => x.h != null && x.m != null);
  const r = correlation(pairs.map((p) => p.h), pairs.map((p) => p.m));
  const hi = avg(pairs.filter((p) => p.h >= 0.8).map((p) => p.m));
  const lo = avg(pairs.filter((p) => p.h < 0.5).map((p) => p.m));

  const last30 = range(addDays(today, -29), today);
  const anyData = s.habits.length || Object.keys(s.tasks).length || Object.keys(s.checkins).length;
  const bestDow = byDow.some((v) => v != null) ? byDow.indexOf(Math.max(...byDow.map((v) => v ?? -1))) : -1;
  const worstDow = byDow.some((v) => v != null) ? byDow.indexOf(Math.min(...byDow.map((v) => v ?? 2))) : -1;

  return (
    <div className="screen">
      <header className="top">
        <div><div className="eyebrow">Yearly dashboard</div><h1>Insights</h1></div>
        <div className="row gap4" style={{ alignItems: "center" }}>
          <button className="icon-btn" onClick={() => setYear(year - 1)} aria-label="Previous year"><Icon name="left" /></button>
          <b>{year}</b>
          <button className="icon-btn" onClick={() => setYear(year + 1)} aria-label="Next year"><Icon name="right" /></button>
        </div>
      </header>

      {!anyData ? (
        <div className="card"><Empty icon="insights" title="Insights appear as you track">A week of ticks and check-ins is enough to start seeing patterns.</Empty></div>
      ) : (
        <div className="stack">
          <div className="kpis tiles">
            <div className="card"><span>Habit progress</span><b style={{ color: bandColor(yp.rate) }}>{pct(yp.rate, 1)}</b><em>{yp.count} ticks</em></div>
            <div className="card"><span>Perfect days</span><b>{perfect}</b><em>everything done</em></div>
            <div className="card"><span>Tasks done</span><b>{yearTasks}</b><em>this year</em></div>
            <div className="card"><span>Mindset</span><b>{pct(mindAll)}</b><em>average check-in</em></div>
          </div>

          <div className="card">
            <div className="h3">Month by month</div>
            <Chart height={180} labels={MONTHS.map((m) => m[0])} tickEvery={1} yMin={0} yMax={100} fmtY={(v) => Math.round(v) + "%"}
              series={[
                { label: "Habit progress", color: "var(--purple)", kind: "bar", values: months.map((m) => (m.rate == null ? null : m.rate * 100)) },
                { label: "Mindset", color: "var(--pink)", width: 2.5, values: months.map((m) => (m.mind == null ? null : m.mind * 100)) },
              ]} />
          </div>

          <div className="card">
            <div className="h3" style={{ marginBottom: 8 }}>Every day of {year}</div>
            <YearHeat year={year} value={(d) => (d <= today ? dayProgress(s, d).habitRate : null)} />
            <div className="row gap8 small muted" style={{ marginTop: 8, alignItems: "center" }}>
              less <span className="hm-key" style={{ opacity: 0.3 }} /><span className="hm-key" style={{ opacity: 0.6 }} /><span className="hm-key" /> more
            </div>
          </div>

          {s.habits.length > 0 && (
            <div className="card">
              <div className="h3" style={{ marginBottom: 10 }}>Habits this year</div>
              {s.habits.map((h) => ({ h, c: habitCredit(s, h, y0, end), st: streak(s, h) }))
                .filter((x) => x.c.target > 0)
                .sort((a, b) => (b.c.rate ?? 0) - (a.c.rate ?? 0))
                .map(({ h, c, st }) => (
                  <div className="lead" key={h.id}>
                    <span className="emoji sm" style={{ background: h.color + "26" }}>{h.emoji}</span>
                    <div className="grow" style={{ minWidth: 0 }}>
                      <div className="row between small"><span className="ellipsis">{h.name}</span><b>{pct(c.rate)}</b></div>
                      <Bar value={c.rate} color={h.color} />
                      <div className="muted tiny" style={{ marginTop: 2 }}>{c.count} ticks · best streak {st.best}{st.unit}</div>
                    </div>
                  </div>
                ))}
            </div>
          )}

          <div className="card">
            <div className="h3">Your week (last 12 weeks)</div>
            <Chart height={140} labels={DOW_SHORT} tickEvery={1} yMin={0} yMax={100} fmtY={(v) => Math.round(v) + "%"}
              series={[{ label: "Habit completion", color: "var(--cyan)", kind: "bar", values: byDow.map((v) => (v == null ? null : v * 100)) }]} />
            {bestDow >= 0 && bestDow !== worstDow && (
              <p className="insight">Strongest on <b>{DOW_SHORT[bestDow]}</b>, weakest on <b>{DOW_SHORT[worstDow]}</b>. Plan lighter on {DOW_SHORT[worstDow]}s, or set a reminder.</p>
            )}
          </div>

          <div className="card">
            <div className="h3">Habits &amp; how you feel</div>
            {r == null ? (
              <p className="muted small">After a couple of weeks of ticks plus check-ins, this shows whether your habits line up with your mood.</p>
            ) : (
              <>
                <div className="kpis three" style={{ marginTop: 8 }}>
                  <div><span>Mindset on strong days</span><b style={{ color: "var(--teal)" }}>{pct(hi)}</b></div>
                  <div><span>On weak days</span><b style={{ color: "var(--red)" }}>{pct(lo)}</b></div>
                  <div><span>Link (r)</span><b>{r.toFixed(2)}</b></div>
                </div>
                <p className="insight">
                  {r > 0.3 ? "Clear pattern: days you keep your habits are days you feel better." :
                    r > 0.1 ? "A mild link between keeping your habits and feeling better." :
                      r < -0.1 ? "Interesting — your mood is higher on lighter habit days. Maybe the list is too heavy?" :
                        "No clear link yet between habits and mood."}
                  {" "}<span className="muted">({pairs.length} days, last 90.)</span>
                </p>
              </>
            )}
          </div>

          <div className="card">
            <div className="h3">Check-ins · last 30 days</div>
            <Chart height={170} labels={last30.map((d) => fmtShort(d))} yMin={0} yMax={10} fmtY={(v) => String(Math.round(v))}
              series={CHECKIN_KEYS.map(({ key, label, color }) => ({ label, color, values: last30.map((d) => s.checkins[d]?.[key] ?? null) }))} />
          </div>

          <div className="month-grid">
            {months.map((m) => (
              <div className="card mcard" key={m.m}>
                <b>{MONTHS_FULL[m.m]}</b>
                <div className="krow"><span>Habits</span><b>{pct(m.rate, 1)}</b></div>
                <div className="krow"><span>Mindset</span><b>{pct(m.mind)}</b></div>
                <div className="krow"><span>Tasks</span><b>{m.tasksDone}/{m.tasks}</b></div>
                <Bar value={m.rate} height={5} />
              </div>
            ))}
          </div>
          {bestStreak && bestStreak.st.best > 1 && (
            <p className="insight center">Longest streak so far: <b>{bestStreak.h.emoji} {bestStreak.h.name}</b> — {bestStreak.st.best} {bestStreak.st.unit === "d" ? "days" : "weeks"} in a row.</p>
          )}
        </div>
      )}
    </div>
  );
}
