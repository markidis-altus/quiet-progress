import { useSyncExternalStore } from "react";
import type { State } from "./types";
import { migrateV1, isV1 } from "./migrate";

const KEY = "quiet-progress-v2";
const LEGACY_KEY = "quiet-progress-html-v1";

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export function emptyState(): State {
  return {
    version: 2,
    habits: [],
    habitLog: {},
    tasks: {},
    checkins: {},
    weight: { entries: {} },
    settings: { theme: "system", unit: "kg" },
  };
}

/** Fill in anything missing so older / partial saves never crash the app. */
export function normalize(s: Partial<State>): State {
  const base = emptyState();
  return {
    ...base,
    ...s,
    version: 2,
    habits: s.habits ?? [],
    habitLog: s.habitLog ?? {},
    tasks: s.tasks ?? {},
    checkins: s.checkins ?? {},
    weight: { entries: {}, ...(s.weight ?? {}) },
    settings: { ...base.settings, ...(s.settings ?? {}) },
  };
}

function load(): { state: State; migrated: boolean } {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { state: normalize(JSON.parse(raw)), migrated: false };
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy);
      if (isV1(parsed)) return { state: migrateV1(parsed), migrated: true };
    }
  } catch {
    /* fall through to a clean start */
  }
  return { state: emptyState(), migrated: false };
}

const loaded = load();
let state: State = loaded.state;
export const migratedOnLoad = loaded.migrated;
let version = 0;
const listeners = new Set<() => void>();
let saveTimer: number | undefined;
export let saveError = false;

function persist() {
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      saveError = false;
    } catch {
      saveError = true;
    }
  }, 250);
}
if (migratedOnLoad) persist();

const emit = () => {
  version++;
  listeners.forEach((l) => l());
};

/* ---- undo: snapshot before labelled changes ---- */
let undoSnap: { label: string; json: string } | null = null;
export const getUndo = () => undoSnap;
export function undo() {
  if (!undoSnap) return;
  state = normalize(JSON.parse(undoSnap.json));
  undoSnap = null;
  persist();
  emit();
}
export function clearUndo() {
  if (undoSnap) {
    undoSnap = null;
    emit();
  }
}

/** Mutate the state in place. Pass `undoLabel` for destructive changes to offer Undo. */
export function update(fn: (s: State) => void, undoLabel?: string) {
  if (undoLabel) undoSnap = { label: undoLabel, json: JSON.stringify(state) };
  fn(state);
  persist();
  emit();
}

export function replaceState(next: State) {
  undoSnap = { label: "Data replaced", json: JSON.stringify(state) };
  state = normalize(next);
  persist();
  emit();
}

export const getState = () => state;

/** Re-renders the caller on every change; returns the live state. */
export function useStore(): State {
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => version
  );
  return state;
}

/** Ask the browser not to evict our data (iOS honours this for Home Screen apps). */
export function requestPersistence() {
  try {
    navigator.storage?.persist?.();
  } catch {
    /* not supported */
  }
}
