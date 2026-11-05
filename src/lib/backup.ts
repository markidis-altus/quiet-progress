import type { State } from "./types";
import { getState, normalize, update } from "./store";
import { isV1, migrateV1 } from "./migrate";
import { todayISO, range } from "./dates";
import { dayProgress } from "./stats";

/** Save a file: on iPhone this opens the share sheet ("Save to Files" / iCloud Drive); elsewhere it downloads. */
async function saveFile(name: string, mime: string, text: string) {
  const file = new File([text], name, { type: mime });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare && nav.canShare({ files: [file] }) && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
    try {
      await nav.share({ files: [file], title: name });
      return true;
    } catch (e) {
      if ((e as Error).name === "AbortError") return false;
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return true;
}

export async function exportBackup() {
  const payload = { app: "quiet-progress", version: 2, exportedAt: new Date().toISOString(), data: getState() };
  const ok = await saveFile(`quiet-progress-backup-${todayISO()}.json`, "application/json", JSON.stringify(payload, null, 1));
  if (ok) update((s) => { s.settings.lastBackup = new Date().toISOString(); });
  return ok;
}

const csvCell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function exportCSV() {
  const s = getState();
  const dates = new Set<string>([
    ...Object.keys(s.habitLog), ...Object.keys(s.tasks), ...Object.keys(s.briefs), ...Object.keys(s.weight.entries),
  ]);
  if (!dates.size) return false;
  const sorted = [...dates].sort();
  const all = range(sorted[0], sorted[sorted.length - 1]);
  const rows = [["date", "habits_done", "habits_due", "tasks_done", "tasks_total", `weight_${s.settings.unit}`, "habits_ticked", "brief_focus", "brief"]];
  for (const d of all) {
    const p = dayProgress(s, d);
    const b = s.briefs[d];
    const names = (s.habitLog[d] ?? []).map((id) => s.habits.find((h) => h.id === id)?.name).filter(Boolean).join("; ");
    rows.push([d, p.habitsDone, p.habitsDue, p.tasksDone, p.tasks, s.weight.entries[d], names, b?.focus, b?.text].map(csvCell) as string[]);
  }
  return saveFile(`quiet-progress-${todayISO()}.csv`, "text/csv", rows.map((r) => r.join(",")).join("\n"));
}

/** Parse a backup file from this app (v2) or the original tracker (v1). */
export function parseBackup(text: string): { state: State; from: "v1" | "v2" } {
  const parsed = JSON.parse(text);
  const inner = parsed && parsed.data ? parsed.data : parsed;
  if (inner && inner.version === 2 && Array.isArray(inner.habits)) return { state: normalize(inner), from: "v2" };
  if (isV1(inner)) return { state: migrateV1(inner), from: "v1" };
  throw new Error("That file isn't a Quiet Progress backup.");
}

export function daysSinceBackup(s: State) {
  if (!s.settings.lastBackup) return null;
  return Math.floor((Date.now() - new Date(s.settings.lastBackup).getTime()) / 86400000);
}
