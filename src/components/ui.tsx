import { ReactNode, useEffect, useState } from "react";
import { bandColor } from "../lib/stats";

/* ---------- icons (inline, stroke-based) ---------- */
const P: Record<string, ReactNode> = {
  today: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  habits: <><path d="M4 12l4 4L20 6" /></>,
  tasks: <><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M8 9h8M8 13h8M8 17h5" /></>,
  brief: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h4" /></>,
  weight: <><path d="M5 20h14l-2-11H7z" /><circle cx="12" cy="6" r="2" /></>,
  insights: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>,
  left: <path d="M15 18l-6-6 6-6" />,
  right: <path d="M9 18l6-6-6-6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="M5 13l4 4L19 7" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  more: <><circle cx="5" cy="12" r="1.2" /><circle cx="12" cy="12" r="1.2" /><circle cx="19" cy="12" r="1.2" /></>,
  trash: <><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></>,
  edit: <><path d="M4 20h4L19 9l-4-4L4 16z" /></>,
  flame: <path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3-1-3 0-6 1-9z" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  grid: <><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></>,
  list: <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />,
  search: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></>,
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  archive: <><rect x="3" y="4" width="18" height="5" rx="1" /><path d="M5 9v10h14V9M10 13h4" /></>,
  share: <><path d="M12 3v12M7 8l5-5 5 5" /><path d="M5 13v7h14v-7" /></>,
};
export function Icon({ name, size = 20, stroke = 2, style }: { name: keyof typeof P | string; size?: number; stroke?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden>
      {P[name]}
    </svg>
  );
}

/* ---------- progress ring ---------- */
export function Ring({ value, size = 120, stroke = 12, color, children, track = "var(--track)" }: {
  value: number | null; size?: number; stroke?: number; color?: string; children?: ReactNode; track?: string;
}) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, v = Math.max(0, Math.min(1, value ?? 0));
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        {v > 0 && (
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color ?? bandColor(v)} strokeWidth={stroke}
            strokeLinecap="round" strokeDasharray={`${v * c} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: "stroke-dasharray .35s ease" }} />
        )}
      </svg>
      {children != null && <div className="ring-label">{children}</div>}
    </div>
  );
}

export function Bar({ value, color, height = 6 }: { value: number | null; color?: string; height?: number }) {
  const v = Math.max(0, Math.min(1, value ?? 0));
  return (
    <div className="bar" style={{ height }}>
      <div style={{ width: `${v * 100}%`, background: color ?? bandColor(value) }} />
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { v: T; label: ReactNode }[]; onChange: (v: T) => void }) {
  return (
    <div className="seg" role="tablist">
      {options.map((o) => (
        <button key={o.v} role="tab" aria-selected={o.v === value} className={o.v === value ? "on" : ""} onClick={() => onChange(o.v)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Check({ on, onClick, color = "var(--purple)", size = 28, label }: { on: boolean; onClick: () => void; color?: string; size?: number; label?: string }) {
  return (
    <button className={"check" + (on ? " on" : "")} style={{ width: size, height: size, ["--c" as string]: color }} onClick={onClick} aria-pressed={on} aria-label={label}>
      <Icon name="check" size={size * 0.6} stroke={3.2} />
    </button>
  );
}

/* ---------- bottom sheet ---------- */
export function Sheet({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    document.body.classList.add("noscroll");
    return () => { window.removeEventListener("keydown", k); document.body.classList.remove("noscroll"); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="sheet-bg" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal>
        <div className="sheet-grab" />
        {title && (
          <div className="sheet-head">
            <div className="h2">{title}</div>
            <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
          </div>
        )}
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </div>
  );
}

/* ---------- confirm dialog (replaces window.confirm, which is clunky in iOS web apps) ---------- */
type ConfirmReq = { title: string; body?: string; ok: string; danger?: boolean; resolve: (b: boolean) => void };
let pushConfirm: ((r: ConfirmReq) => void) | null = null;
export function confirmDialog(title: string, body?: string, ok = "OK", danger = false) {
  return new Promise<boolean>((resolve) => {
    if (!pushConfirm) return resolve(window.confirm(title));
    pushConfirm({ title, body, ok, danger, resolve });
  });
}
export function ConfirmHost() {
  const [req, setReq] = useState<ConfirmReq | null>(null);
  useEffect(() => { pushConfirm = setReq; return () => { pushConfirm = null; }; }, []);
  if (!req) return null;
  const done = (b: boolean) => { req.resolve(b); setReq(null); };
  return (
    <div className="sheet-bg center" onClick={() => done(false)}>
      <div className="dialog" onClick={(e) => e.stopPropagation()} role="alertdialog">
        <div className="h2">{req.title}</div>
        {req.body && <p className="muted" style={{ margin: "8px 0 0" }}>{req.body}</p>}
        <div className="row gap8" style={{ marginTop: 18, justifyContent: "flex-end" }}>
          <button className="btn ghost" onClick={() => done(false)}>Cancel</button>
          <button className={"btn " + (req.danger ? "danger" : "primary")} onClick={() => done(true)}>{req.ok}</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- toasts ---------- */
type ToastMsg = { id: number; text: string; action?: { label: string; run: () => void } };
let pushToast: ((t: ToastMsg) => void) | null = null;
let tid = 0;
export function toast(text: string, action?: ToastMsg["action"]) {
  pushToast?.({ id: ++tid, text, action });
}
export function ToastHost() {
  const [t, setT] = useState<ToastMsg | null>(null);
  useEffect(() => { pushToast = setT; return () => { pushToast = null; }; }, []);
  useEffect(() => {
    if (!t) return;
    const h = setTimeout(() => setT(null), t.action ? 5000 : 2200);
    return () => clearTimeout(h);
  }, [t]);
  if (!t) return null;
  return (
    <div className="toast" role="status">
      <span>{t.text}</span>
      {t.action && <button onClick={() => { t.action!.run(); setT(null); }}>{t.action.label}</button>}
    </div>
  );
}

export function Empty({ icon, title, children }: { icon: string; title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-ic"><Icon name={icon} size={26} /></div>
      <div className="h3">{title}</div>
      {children && <div className="muted small" style={{ marginTop: 4 }}>{children}</div>}
    </div>
  );
}
