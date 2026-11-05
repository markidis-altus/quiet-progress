import { useEffect, useRef, useState } from "react";
import { emptyState, replaceState, undo, update, useStore } from "../lib/store";
import { daysSinceBackup, exportBackup, exportCSV, parseBackup } from "../lib/backup";
import { isIOS, isIOSOtherBrowser, isStandalone, offlineStatus, OFFLINE_TEXT, type OfflineStatus } from "../lib/offline";
import { Icon, Segmented, Sheet, confirmDialog, toast } from "../components/ui";

function OfflineCard() {
  const [st, setSt] = useState<OfflineStatus | null>(null);
  useEffect(() => {
    let alive = true;
    const check = () => offlineStatus().then((v) => alive && setSt(v));
    check();
    const t = setInterval(check, 2000); // flips to "ready" as soon as the copy is saved
    return () => { alive = false; clearInterval(t); };
  }, []);
  if (!st) return null;
  const t = OFFLINE_TEXT[st];
  return (
    <div className={"offline-card" + (t.ok ? " ok" : "")}>
      <span className="dot" />
      <div>
        <b>{t.title}</b>
        <div className="small muted">{t.body}</div>
        {t.ok && st === "ready" && isIOS && !isStandalone() && (
          <div className="small muted" style={{ marginTop: 4 }}>
            Not installed yet: tap <Icon name="share" size={14} /> Share → Add to Home Screen, then open it from the icon once with internet.
          </div>
        )}
      </div>
    </div>
  );
}

export function Settings({ onClose }: { onClose: () => void }) {
  const s = useStore();
  const file = useRef<HTMLInputElement>(null);
  const [help, setHelp] = useState(false);
  const since = daysSinceBackup(s);

  const restore = async (f: File) => {
    try {
      const { state, from } = parseBackup(await f.text());
      const ok = await confirmDialog("Restore this backup?", `It replaces everything in the app with the file's data${from === "v1" ? " (converted from the original tracker)" : ""}.`, "Restore", true);
      if (!ok) return;
      replaceState(state);
      toast(`Restored ${state.habits.length} habits`, { label: "Undo", run: undo });
      onClose();
    } catch (e) {
      toast((e as Error).message || "Couldn't read that file");
    }
  };

  const changeUnit = async (u: "kg" | "lb") => {
    if (u === s.settings.unit) return;
    const n = Object.keys(s.weight.entries).length;
    const convert = n > 0 && (await confirmDialog(`Convert ${n} weigh-ins to ${u}?`, "Choose Cancel to keep the numbers and only change the label.", "Convert"));
    const k = u === "lb" ? 2.20462 : 1 / 2.20462;
    update((st) => {
      st.settings.unit = u;
      if (convert) {
        for (const d of Object.keys(st.weight.entries)) st.weight.entries[d] = Math.round(st.weight.entries[d] * k * 10) / 10;
        if (st.weight.goal != null) st.weight.goal = Math.round(st.weight.goal * k * 10) / 10;
      }
    });
  };

  const reset = async () => {
    const ok = await confirmDialog("Erase everything?", "All habits, tasks, briefs and weights on this device will be cleared. Make a backup first.", "Erase", true);
    if (!ok) return;
    replaceState(emptyState());
    toast("Everything cleared", { label: "Undo", run: undo });
    onClose();
  };

  return (
    <Sheet open onClose={onClose} title="Settings">
      <OfflineCard />
      {!isStandalone() && isIOS && !isIOSOtherBrowser && (
        <div className="banner" style={{ marginBottom: 14 }}>
          <span>Install: tap <Icon name="share" size={15} /> <b>Share</b>, then <b>Add to Home Screen</b>. Then open it from the icon.</span>
        </div>
      )}

      <div className="h3">Appearance</div>
      <Segmented value={s.settings.theme} onChange={(v) => update((st) => { st.settings.theme = v; })}
        options={[{ v: "system", label: "Auto" }, { v: "dark", label: "Dark" }, { v: "light", label: "Light" }]} />

      <div className="h3" style={{ marginTop: 18 }}>Body</div>
      <div className="row gap12" style={{ alignItems: "flex-end" }}>
        <div className="field" style={{ flex: 1 }}>
          <span>Weight unit</span>
          <Segmented value={s.settings.unit} onChange={changeUnit} options={[{ v: "kg", label: "kg" }, { v: "lb", label: "lb" }]} />
        </div>
        <label className="field" style={{ flex: 1 }}>
          <span>Height (cm) — for BMI</span>
          <input type="number" inputMode="decimal" value={s.settings.height ?? ""} placeholder="optional"
            onChange={(e) => { const h = parseFloat(e.target.value); update((st) => { st.settings.height = isNaN(h) || h <= 0 ? undefined : h; }); }} />
        </label>
      </div>

      <div className="h3" style={{ marginTop: 18 }}>Your data</div>
      <p className="muted small" style={{ marginTop: 0 }}>
        Everything is stored on this device only — nothing is uploaded.
        {since == null ? " You haven't made a backup yet." : ` Last backup: ${since === 0 ? "today" : since + " days ago"}.`}
      </p>
      <div className="stack-sm">
        <button className="btn primary block" onClick={async () => (await exportBackup()) && toast("Backup saved")}>
          <Icon name="share" size={16} />Back up (save to Files / iCloud)
        </button>
        <button className="btn ghost block" onClick={() => file.current?.click()}>Restore from a backup file</button>
        <button className="btn ghost block" onClick={async () => { if (!(await exportCSV())) toast("Nothing to export yet"); }}>Export spreadsheet (CSV)</button>
        <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) restore(f); e.target.value = ""; }} />
      </div>
      <p className="muted tiny">Restore also accepts backups from the original Quiet Progress page; they're converted automatically.</p>

      <button className="btn ghost block" style={{ marginTop: 14 }} onClick={() => setHelp(!help)}>How it works</button>
      {help && (
        <div className="help">
          <p><b>Today</b> is your daily home: tick habits, plan and finish tasks and log your weight. The ring shows how much of the day is done. Use the week strip to look back or plan ahead.</p>
          <p><b>Brief</b> is where you write a few lines for the day: a main focus, then plans, priorities or how it went. Tap the prompts (Top 3, Watch out for…) to add a starter line. It saves as you type, past briefs are listed and searchable, and writing one every day builds a streak.</p>
          <p><b>Habits</b> can be daily or 1–6× a week. A 3× habit scores 100% for any week with 3 ticks, whichever days you choose — once met, it stops nagging you that week. Streaks count days (daily habits) or weeks (weekly ones). Archive a habit to stop tracking it while keeping its history. The month grid is the classic spreadsheet view.</p>
          <p><b>Tasks</b>: type “9:30 gym” to schedule a time, end with ! / !! / !!! for priority. Unfinished tasks from earlier days show on Today under “Carried over”.</p>
          <p><b>Weight</b>: weigh in whenever you like. The 7-day trend line irons out water-weight noise; the per-week rate and goal date are based on the last 4 weeks.</p>
          <p><b>Insights</b> pulls it together: month-by-month progress, a heatmap of the year, your strongest weekdays and whether habits line up with mood.</p>
          <p><b>Backups</b>: iPhone can clear website data, so back up now and then. On iPhone the backup opens the share sheet — choose “Save to Files” (iCloud Drive keeps it safe).</p>
        </div>
      )}

      <button className="btn danger block" style={{ marginTop: 18 }} onClick={reset}><Icon name="trash" size={16} />Erase all data</button>
      <p className="muted tiny center" style={{ marginTop: 14 }}>Quiet Progress 2.0 · works offline</p>
    </Sheet>
  );
}
