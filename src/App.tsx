import { useEffect, useState } from "react";
import { addDays, todayISO } from "./lib/dates";
import { migratedOnLoad, useStore } from "./lib/store";
import { ConfirmHost, Icon, ToastHost, toast } from "./components/ui";
import { Today } from "./screens/Today";
import { Habits } from "./screens/Habits";
import { Tasks } from "./screens/Tasks";
import { Weight } from "./screens/Weight";
import { Insights } from "./screens/Insights";
import { Settings } from "./screens/Settings";

type Tab = "today" | "habits" | "tasks" | "weight" | "insights";
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "today", label: "Today", icon: "today" },
  { id: "habits", label: "Habits", icon: "habits" },
  { id: "tasks", label: "Tasks", icon: "tasks" },
  { id: "weight", label: "Weight", icon: "weight" },
  { id: "insights", label: "Insights", icon: "insights" },
];

const readTab = (): Tab => {
  try { const t = localStorage.getItem("qp-tab") as Tab; if (TABS.some((x) => x.id === t)) return t; } catch { /* ignore */ }
  return "today";
};

export function App() {
  const s = useStore();
  const [tab, setTabState] = useState<Tab>(readTab);
  const [date, setDate] = useState(todayISO());
  const [settings, setSettings] = useState(false);
  const setTab = (t: Tab) => {
    setTabState(t);
    try { localStorage.setItem("qp-tab", t); } catch { /* ignore */ }
    window.scrollTo({ top: 0 });
  };

  // theme
  useEffect(() => {
    const root = document.documentElement;
    if (s.settings.theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", s.settings.theme);
    const dark = s.settings.theme === "dark" || (s.settings.theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#0B102A" : "#F4F5FB");
  }, [s.settings.theme]);

  // when the app comes back after midnight, jump "today" forward
  useEffect(() => {
    let last = todayISO();
    const onVis = () => {
      if (document.visibilityState !== "visible") return;
      const now = todayISO();
      if (now !== last) { setDate((d) => (d === last ? now : d)); last = now; }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => { if (migratedOnLoad) toast("Imported your data from the original tracker"); }, []);

  // keyboard shortcuts on a computer: 1–5 switch tabs, ←/→ move the day
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest("input,textarea,select,[role=dialog]") || e.metaKey || e.ctrlKey || e.altKey) return;
      const n = +e.key;
      if (n >= 1 && n <= 5) setTab(TABS[n - 1].id);
      else if (e.key === "ArrowLeft" && (tab === "today" || tab === "tasks")) setDate((d) => addDays(d, tab === "tasks" ? -7 : -1));
      else if (e.key === "ArrowRight" && (tab === "today" || tab === "tasks")) setDate((d) => addDays(d, tab === "tasks" ? 7 : 1));
      else if (e.key === "t") setDate(todayISO());
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });

  return (
    <div className="app">
      <main>
        {tab === "today" && <Today date={date} setDate={setDate} openSettings={() => setSettings(true)} />}
        {tab === "habits" && <Habits />}
        {tab === "tasks" && <Tasks date={date} setDate={setDate} />}
        {tab === "weight" && <Weight />}
        {tab === "insights" && <Insights />}
      </main>
      <nav className="tabbar" aria-label="Sections">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)} aria-current={tab === t.id}>
            <Icon name={t.icon} size={23} stroke={tab === t.id ? 2.4 : 1.9} />
            <span>{t.label}</span>
          </button>
        ))}
        <button className="tab-settings" onClick={() => setSettings(true)} aria-label="Settings"><Icon name="gear" size={22} /><span>Settings</span></button>
      </nav>
      {settings && <Settings onClose={() => setSettings(false)} />}
      <ToastHost />
      <ConfirmHost />
    </div>
  );
}
