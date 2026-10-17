import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { paletteFor } from './palette';
import { useT } from '../i18n';

export function PlayerBadge({ name, seat, size = 40 }: { name: string; seat: number; size?: number }) {
  const p = paletteFor(seat);
  return (
    <span
      aria-hidden="true"
      className="badge"
      style={{ width: size, height: size, background: p.colour, clipPath: p.shape, fontSize: size * 0.46 }}
    >
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label, cols }: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
  cols?: number;
}) {
  return (
    <div role="group" aria-label={label} className="seg" style={{ gridTemplateColumns: `repeat(${cols ?? options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Switch({ checked, onChange, label, note }: { checked: boolean; onChange: (v: boolean) => void; label: string; note?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} className="switch-row" onClick={() => onChange(!checked)}>
      <span className="switch-text">
        <strong>{label}</strong>
        {note && <small>{note}</small>}
      </span>
      <span aria-hidden="true" className={'track' + (checked ? ' on' : '')}><span className="knob" /></span>
    </button>
  );
}

export function Stepper({ label, value, onDec, onInc, display }: { label: string; value: number; onDec: () => void; onInc: () => void; display?: string }) {
  return (
    <div className="stepper-row">
      <span className="grow"><strong>{label}</strong></span>
      <button type="button" className="icon-btn" aria-label={`− ${label}`} onClick={onDec}>−</button>
      <output className="stepper-val" aria-live="polite">{display ?? value}</output>
      <button type="button" className="icon-btn" aria-label={`+ ${label}`} onClick={onInc}>+</button>
    </div>
  );
}

/** Bottom sheet with focus trap and Esc to close. */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const t = useT();
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const first = ref.current?.querySelector<HTMLElement>('button, input, [tabindex]');
    first?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && ref.current) {
        const f = [...ref.current.querySelectorAll<HTMLElement>('button:not(:disabled), input, a[href]')];
        if (!f.length) return;
        const a = f[0], z = f[f.length - 1];
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
        else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
      }
    };
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('keydown', key); prev?.focus(); };
  }, [onClose]);
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} ref={ref} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" aria-label={t('common.close')} onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({ title, body, confirmLabel, danger, onConfirm, onCancel }: {
  title: string; body?: string; confirmLabel: string; danger?: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  const t = useT();
  return (
    <Sheet title={title} onClose={onCancel}>
      {body && <p className="muted body-text">{body}</p>}
      <div className="stack">
        <button type="button" className={'btn ' + (danger ? 'btn-danger-solid' : 'btn-primary')} onClick={onConfirm}>{confirmLabel}</button>
        <button type="button" className="btn btn-quiet" onClick={onCancel}>{t('common.cancel')}</button>
      </div>
    </Sheet>
  );
}

export function BottomNav({ active }: { active: 'home' | 'archive' | 'settings' }) {
  const t = useT();
  const items: { key: 'home' | 'archive' | 'settings'; href: string; label: string; icon: ReactNode }[] = [
    { key: 'home', href: '#/', label: t('nav.home'), icon: <path d="M4 11 12 4l8 7v9H4z" /> },
    { key: 'archive', href: '#/archive', label: t('nav.archive'), icon: <path d="M4 7h16v4H4zM6 11v9h12v-9M10 15h4" /> },
    { key: 'settings', href: '#/settings', label: t('nav.settings'), icon: <><circle cx="12" cy="12" r="3" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" /></> }
  ];
  return (
    <nav aria-label={t('nav.main')} className="bottom-nav">
      {items.map((i) => (
        <a key={i.key} href={i.href} aria-current={active === i.key ? 'page' : undefined} className={active === i.key ? 'on' : ''}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{i.icon}</svg>
          {i.label}
        </a>
      ))}
    </nav>
  );
}

export function BackButton({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} className="icon-btn back" aria-label={label}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
    </a>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="section">
      <h3 className="eyebrow">{title}</h3>
      {children}
    </section>
  );
}
