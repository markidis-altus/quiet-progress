import { useState } from "react";
import { undo, update, useStore } from "../lib/store";
import { addDays, diffDays, fmt, fmtShort, relativeLabel, todayISO } from "../lib/dates";
import { avg, movingAvg, weeklyRate, weightSeries } from "../lib/stats";
import { Empty, Icon, Segmented, toast } from "../components/ui";
import { Chart } from "../components/charts";

const RANGES = { "1M": 30, "3M": 91, "6M": 182, "1Y": 365, All: 100000 } as const;
type R = keyof typeof RANGES;
const f1 = (v: number | null | undefined, sign = false) => (v == null || isNaN(v) ? "—" : (sign && v > 0 ? "+" : "") + v.toFixed(1));

export function Weight() {
  const s = useStore();
  const unit = s.settings.unit;
  const today = todayISO();
  const [r, setR] = useState<R>("3M");
  const [date, setDate] = useState(today);
  const [val, setVal] = useState("");
  const series = weightSeries(s);
  const ma = movingAvg(series);
  const latest = series[series.length - 1];
  const goal = s.weight.goal;
  const rate = weeklyRate(series);
  const smooth = ma.length ? ma[ma.length - 1].v : null;
  const ago30 = [...series].reverse().find((e) => diffDays(e.date, latest?.date ?? today) >= 28);
  const change30 = latest && ago30 ? latest.v - ago30.v : null;
  const toGo = goal != null && smooth != null ? smooth - goal : null;
  // projection: only when the trend is heading toward the goal
  let eta: string | null = null;
  if (toGo != null && rate && Math.abs(toGo) > 0.2 && Math.sign(rate) === -Math.sign(toGo)) {
    const weeks = Math.abs(toGo / rate);
    if (weeks < 260) eta = fmt(addDays(today, Math.round(weeks * 7)), { day: "numeric", month: "short", year: "numeric" });
  }
  const bmi = s.settings.height && smooth ? (unit === "kg" ? smooth : smooth * 0.4536) / (s.settings.height / 100) ** 2 : null;

  const from = addDays(today, -RANGES[r] + 1);
  const shown = series.filter((e) => e.date >= from);
  const shownMa = ma.filter((e) => e.date >= from);

  const add = () => {
    const v = parseFloat(val);
    if (isNaN(v) || v <= 0) return;
    update((st) => { st.weight.entries[date] = v; });
    setVal("");
    toast(`Saved ${v} ${unit} for ${relativeLabel(date).toLowerCase()}`);
  };
  const remove = (d: string) => {
    update((st) => { delete st.weight.entries[d]; }, "Entry deleted");
    toast("Entry deleted", { label: "Undo", run: undo });
  };

  return (
    <div className="screen">
      <header className="top">
        <div><div className="eyebrow">{series.length} weigh-ins</div><h1>Weight</h1></div>
      </header>

      <form className="card row gap8 wrap" style={{ alignItems: "center" }} onSubmit={(e) => { e.preventDefault(); add(); }}>
        <input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value || today)} aria-label="Date" style={{ flex: "1 1 130px" }} />
        <input className="weight-in" type="number" inputMode="decimal" step="0.1" placeholder={latest ? String(latest.v) : unit}
          value={val} onChange={(e) => setVal(e.target.value)} aria-label="Weight" style={{ flex: "1 1 90px" }} />
        <button className="btn primary" type="submit" disabled={!val}>Save</button>
      </form>

      {series.length === 0 ? (
        <div className="card" style={{ marginTop: 12 }}><Empty icon="weight" title="No weigh-ins yet">You don't need an entry every day — the trend line smooths out daily noise.</Empty></div>
      ) : (
        <>
          <div className="kpis tiles" style={{ marginTop: 12 }}>
            <div className="card"><span>Latest</span><b>{f1(latest.v)}<small> {unit}</small></b><em>{relativeLabel(latest.date)}</em></div>
            <div className="card"><span>Trend (7-day)</span><b>{f1(smooth)}<small> {unit}</small></b><em>smoothed</em></div>
            <div className="card"><span>Per week</span><b style={{ color: rate == null ? undefined : (goal != null ? Math.sign(rate) === -Math.sign(toGo ?? 0) : rate <= 0) ? "var(--teal)" : "var(--yellow)" }}>{f1(rate, true)}</b><em>last 4 weeks</em></div>
            <div className="card"><span>30-day change</span><b>{f1(change30, true)}</b><em>{ago30 ? `since ${fmtShort(ago30.date)}` : "need more data"}</em></div>
            <div className="card">
              <span>Goal</span>
              <div className="row gap4" style={{ alignItems: "baseline" }}>
                <input className="goal-in" type="number" inputMode="decimal" step="0.1" value={goal ?? ""} placeholder="set"
                  onChange={(e) => { const g = parseFloat(e.target.value); update((st) => { st.weight.goal = isNaN(g) || g <= 0 ? undefined : g; }); }} aria-label="Goal weight" />
                <small className="muted">{unit}</small>
              </div>
              <em>{toGo == null ? "tap to set" : Math.abs(toGo) < 0.2 ? "you're there 🎉" : `${f1(Math.abs(toGo))} to go`}</em>
            </div>
            <div className="card"><span>{bmi ? "BMI" : "Goal date"}</span><b>{bmi ? bmi.toFixed(1) : eta ? <small style={{ fontSize: 15 }}>{eta}</small> : "—"}</b><em>{bmi ? (eta ? "goal ≈ " + eta : "add goal for ETA") : eta ? "at current pace" : "needs a trend toward goal"}</em></div>
          </div>

          <div className="card" style={{ marginTop: 12 }}>
            <div className="row between" style={{ alignItems: "center", marginBottom: 6 }}>
              <div className="h3">Trend</div>
              <Segmented value={r} onChange={setR} options={(Object.keys(RANGES) as R[]).map((k) => ({ v: k, label: k }))} />
            </div>
            {shown.length ? (
              <Chart height={190} labels={shown.map((e) => fmtShort(e.date))} fmtY={(v) => v.toFixed(1)}
                guide={goal != null ? { value: goal, label: `goal ${goal}`, color: "var(--teal)" } : undefined}
                series={[
                  { label: "Weigh-in", color: "var(--cyan)", kind: "dots", values: shown.map((e) => e.v) },
                  { label: "7-day trend", color: "var(--purple)", width: 2.5, values: shownMa.map((e) => e.v) },
                ]} />
            ) : <div className="muted small pad-y">No entries in this range.</div>}
          </div>

          <MonthlyAverages series={series} unit={unit} />

          <div className="card list" style={{ marginTop: 12 }}>
            <div className="h3" style={{ marginBottom: 6 }}>History</div>
            {[...series].reverse().slice(0, 40).map((e, i, arr) => {
              const prev = arr[i + 1];
              const d = prev ? e.v - prev.v : null;
              return (
                <div className="hist" key={e.date}>
                  <span>{fmt(e.date, { weekday: "short", day: "numeric", month: "short" })}</span>
                  <b>{f1(e.v)} <small className="muted">{unit}</small></b>
                  <span className="small" style={{ width: 48, textAlign: "right", color: d == null ? "var(--muted)" : d <= 0 ? "var(--teal)" : "var(--yellow)" }}>{f1(d, true)}</span>
                  <button className="icon-btn sm" onClick={() => remove(e.date)} aria-label="Delete entry"><Icon name="trash" size={15} /></button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function MonthlyAverages({ series, unit }: { series: { date: string; v: number }[]; unit: string }) {
  const byMonth = new Map<string, number[]>();
  series.forEach((e) => { const k = e.date.slice(0, 7); byMonth.set(k, [...(byMonth.get(k) ?? []), e.v]); });
  const keys = [...byMonth.keys()].sort().slice(-12);
  if (keys.length < 2) return null;
  return (
    <div className="card" style={{ marginTop: 12 }}>
      <div className="h3">Monthly averages</div>
      <Chart height={140} labels={keys.map((k) => fmt(k + "-01", { month: "short" }))} fmtY={(v) => v.toFixed(1)} tickEvery={1}
        series={[{ label: `Average (${unit})`, color: "var(--yellow)", values: keys.map((k) => avg(byMonth.get(k)!)) }]} />
    </div>
  );
}
