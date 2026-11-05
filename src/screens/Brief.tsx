import { useEffect, useRef, useState } from "react";
import type { Brief as BriefT, ISODate } from "../lib/types";
import { update, useStore } from "../lib/store";
import { addDays, fmt, fmtLong, relativeLabel, todayISO } from "../lib/dates";
import { activeHabits, dayProgress, isDone, isDue } from "../lib/stats";
import { sortTasks } from "../components/tasks";
import { Empty, Icon } from "../components/ui";

const PROMPTS: { label: string; insert: string }[] = [
  { label: "Top 3", insert: "Top 3:\n1. §\n2. \n3. " }, // § marks where the cursor goes
  { label: "Make it a good day", insert: "What would make today good: " },
  { label: "Watch out for", insert: "Watch out for: " },
  { label: "Grateful for", insert: "Grateful for: " },
  { label: "Wins", insert: "Wins: " },
  { label: "Tomorrow", insert: "For tomorrow: " },
];

const words = (b?: BriefT) => ((b?.focus ?? "") + " " + (b?.text ?? "")).trim().split(/\s+/).filter(Boolean).length;
const hasBrief = (b?: BriefT) => !!(b && ((b.focus && b.focus.trim()) || (b.text && b.text.trim())));

/** Consecutive days with a brief, ending today (or yesterday if today isn't written yet). */
export function briefStreak(briefs: Record<ISODate, BriefT>) {
  let d = todayISO();
  if (!hasBrief(briefs[d])) d = addDays(d, -1);
  let n = 0;
  while (hasBrief(briefs[d])) { n++; d = addDays(d, -1); }
  return n;
}

function setBrief(date: ISODate, patch: Partial<BriefT>) {
  update((s) => {
    const next: BriefT = { ...(s.briefs[date] ?? {}), ...patch, updated: new Date().toISOString() };
    if (!next.focus?.trim() && !next.text?.trim()) delete s.briefs[date];
    else s.briefs[date] = next;
  });
}

export function Brief({ date, setDate, goToday }: { date: ISODate; setDate: (d: ISODate) => void; goToday: () => void }) {
  const s = useStore();
  const today = todayISO();
  const b = s.briefs[date];
  const [q, setQ] = useState("");
  const ta = useRef<HTMLTextAreaElement>(null);
  const caret = useRef<number | null>(null); // where to put the cursor after a prompt is inserted
  const lastPos = useRef<number | null>(null); // cursor position before the text box lost focus
  const streak = briefStreak(s.briefs);

  // grow the text box with its content (iOS Safari has no auto-sizing textareas),
  // and place the cursor once React has written the new text
  useEffect(() => {
    const el = ta.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.max(180, el.scrollHeight + 2) + "px";
    if (caret.current != null) {
      const at = caret.current;
      caret.current = null;
      el.focus();
      el.setSelectionRange(at, at);
    }
  }, [b?.text, date]);

  const insert = (raw: string) => {
    const mark = raw.indexOf("§");
    const text = raw.replace("§", "");
    const el = ta.current;
    const cur = b?.text ?? "";
    const focused = el != null && document.activeElement === el;
    const pos = Math.min(cur.length, focused ? el!.selectionStart ?? cur.length : lastPos.current ?? cur.length);
    const before = cur.slice(0, pos), after = cur.slice(pos);
    const pre = before && !before.endsWith("\n") ? "\n" : "";
    caret.current = (before + pre).length + (mark >= 0 ? mark : text.length);
    setBrief(date, { text: before + pre + text + after });
  };

  // at-a-glance: what's on for this day
  const habits = activeHabits(s, date).filter((h) => isDue(s, h, date));
  const tasks = sortTasks(s.tasks[date] ?? []);
  const timed = tasks.filter((t) => t.time && !t.done);
  const p = dayProgress(s, date);

  const query = q.trim().toLowerCase();
  const past = Object.entries(s.briefs)
    .filter(([d, x]) => d !== date && hasBrief(x))
    .filter(([, x]) => !query || (x.focus ?? "").toLowerCase().includes(query) || (x.text ?? "").toLowerCase().includes(query))
    .sort(([a], [z]) => (a < z ? 1 : -1))
    .slice(0, 60);

  return (
    <div className="screen">
      <header className="top">
        <div>
          <div className="eyebrow">{fmtLong(date)}</div>
          <h1>Brief</h1>
        </div>
        <div className="row gap4" style={{ alignItems: "center" }}>
          {date !== today && <button className="btn ghost sm" onClick={() => setDate(today)}>Today</button>}
          <button className="icon-btn" onClick={() => setDate(addDays(date, -1))} aria-label="Previous day"><Icon name="left" /></button>
          <button className="icon-btn" onClick={() => setDate(addDays(date, 1))} aria-label="Next day"><Icon name="right" /></button>
        </div>
      </header>

      <div className="row between small" style={{ marginBottom: 10, alignItems: "center" }}>
        <b>{relativeLabel(date)}</b>
        {streak > 0 && <span className="streak"><Icon name="flame" size={13} stroke={2.2} />{streak}-day brief streak</span>}
      </div>

      <section className="card glance">
        <div className="row between" style={{ alignItems: "center" }}>
          <div className="h3">At a glance</div>
          <button className="btn ghost sm" onClick={goToday}>Open day <Icon name="arrowRight" size={14} /></button>
        </div>
        <div className="glance-stats">
          <span><b>{p.habitsDone}/{p.habitsDue}</b> habits</span>
          <span><b>{p.tasksDone}/{p.tasks}</b> tasks</span>
          {s.weight.entries[date] != null && <span><b>{s.weight.entries[date]}</b> {s.settings.unit}</span>}
        </div>
        {habits.length > 0 && (
          <div className="glance-habits">
            {habits.map((h) => (
              <span key={h.id} className={"ghabit" + (isDone(s, h.id, date) ? " on" : "")} title={h.name}>{h.emoji} {h.name}</span>
            ))}
          </div>
        )}
        {timed.length > 0 && (
          <div className="glance-times">
            {timed.slice(0, 5).map((t) => <div key={t.id}><span className="chip"><Icon name="clock" size={11} />{t.time}</span> {t.text}</div>)}
            {timed.length > 5 && <div className="muted tiny">+{timed.length - 5} more scheduled</div>}
          </div>
        )}
      </section>

      <section className="card brief-card">
        <label className="field" style={{ marginBottom: 10 }}>
          <span>Main focus</span>
          <input className="focus-in" value={b?.focus ?? ""} placeholder="The one thing that matters most today"
            onChange={(e) => setBrief(date, { focus: e.target.value })} enterKeyHint="next"
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); ta.current?.focus(); } }} />
        </label>
        <textarea ref={ta} className="brief-text" value={b?.text ?? ""}
          placeholder={date < today ? "How did the day go?" : "Write your brief for the day — plans, priorities, how you want it to go…"}
          onChange={(e) => setBrief(date, { text: e.target.value })} aria-label="Brief"
          onBlur={(e) => { lastPos.current = e.currentTarget.selectionStart; }} />
        <div className="prompts">
          {PROMPTS.map((pr) => (
            <button key={pr.label} className="chip-btn" onClick={() => insert(pr.insert)}
              onMouseDown={(e) => e.preventDefault() /* keep the text box focused */}>+ {pr.label}</button>
          ))}
        </div>
        <div className="row between tiny muted" style={{ marginTop: 10 }}>
          <span>{words(b)} words</span>
          <span>{b ? `Saved ${new Date(b.updated).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}` : "Saves as you type"}</span>
        </div>
      </section>

      <section>
        <div className="sec-head"><h2>Past briefs</h2><span className="muted small">{Object.values(s.briefs).filter(hasBrief).length} written</span></div>
        {Object.keys(s.briefs).length > 1 || query ? (
          <div className="search" style={{ marginBottom: 10 }}>
            <Icon name="search" size={17} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search briefs" type="search" aria-label="Search briefs" />
          </div>
        ) : null}
        {past.length === 0 ? (
          <div className="card"><Empty icon="edit" title={query ? "No briefs match" : "Your briefs will collect here"}>{query ? `Nothing contains “${q}”.` : "A few lines each morning is enough. Look back to see what you planned and how it went."}</Empty></div>
        ) : (
          <div className="card list">
            {past.map(([d, x]) => (
              <button key={d} className="past" onClick={() => { setDate(d); window.scrollTo({ top: 0 }); }}>
                <div className="row between" style={{ alignItems: "baseline" }}>
                  <b>{fmt(d, { weekday: "short", day: "numeric", month: "short", year: d.slice(0, 4) !== today.slice(0, 4) ? "numeric" : undefined })}</b>
                  <span className="tiny muted">{words(x)} words</span>
                </div>
                {x.focus && <div className="past-focus">{x.focus}</div>}
                {x.text && <div className="past-text">{x.text}</div>}
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
