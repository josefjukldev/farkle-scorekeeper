import { useState } from 'react';
import { BUILT_IN_PRESETS } from '../../engine/presets';
import { validateRuleSet } from '../../engine/validate';
import type { Face, RuleSet } from '../../engine/types';
import { Segmented, Sheet, Stepper, Switch } from '../components';
import { useT } from '../../i18n';

const FACES: Face[] = [1, 2, 3, 4, 5, 6];

export function RulesEditor({ rules, onApply, onSavePreset, onClose }: {
  rules: RuleSet;
  onApply: (r: RuleSet) => void;
  onSavePreset: (r: RuleSet, name: string) => void;
  onClose: () => void;
}) {
  const t = useT();
  const [r, setR] = useState<RuleSet>(rules);
  const [name, setName] = useState('');
  const errors = validateRuleSet(r);
  const set = (patch: Partial<RuleSet>) => setR((x) => ({ ...x, id: 'custom', name: x.id === 'custom' ? x.name : t('rules.custom'), ...patch }));
  const num = (label: string, value: number, change: (v: number) => void, lo: number, hi: number, step = 50, show?: string) => (
    <Stepper key={label} label={label} value={value} display={show ?? String(value)} onDec={() => change(Math.max(lo, value - step))} onInc={() => change(Math.min(hi, value + step))} />
  );
  const tripleOf = (f: Face) => r.tripleBase[f];
  const example = (() => {
    const v = tripleOf(2);
    if (r.nOfKindMode === 'multiplier') return `3× ${v} · 4× ${v * 2} · 5× ${v * 3} · 6× ${v * 4}`;
    if (r.nOfKindMode === 'doubling') return `3× ${v} · 4× ${v * 2} · 5× ${v * 4} · 6× ${v * 8}`;
    if (r.nOfKindMode === 'table') return t('rules.tableNote');
    return `3× ${v} · ${t('rules.notScored')}`;
  })();

  return (
    <Sheet title={t('rules.title')} onClose={onClose}>
      <div className={'banner ' + (errors.length ? 'banner-bad' : 'banner-ok')} role="status">
        {errors.length ? t('rules.invalid', { fields: errors.join(', ') }) : t('rules.valid')}
      </div>

      <h3 className="eyebrow">{t('rules.presetBase')}</h3>
      <Segmented value={BUILT_IN_PRESETS.some((p) => p.id === r.id) ? r.id : 'custom'} label={t('rules.presetBase')}
        options={[...BUILT_IN_PRESETS.map((p) => ({ value: p.id, label: p.name })), { value: 'custom', label: t('rules.custom') }]}
        onChange={(id) => { const p = BUILT_IN_PRESETS.find((x) => x.id === id); if (p) setR(p); }} />

      <h3 className="eyebrow">{t('rules.scoring')}</h3>
      <div className="card flush">
        {num(t('rules.single', { f: 1 }), r.single1, (v) => set({ single1: v }), 0, 1000)}
        {num(t('rules.single', { f: 5 }), r.single5, (v) => set({ single5: v }), 0, 1000)}
        {FACES.map((f) => num(t('rules.triple', { f }), tripleOf(f), (v) => set({ tripleBase: { ...r.tripleBase, [f]: v } }), 0, 5000))}
      </div>

      <h3 className="eyebrow">{t('rules.ofKind')}</h3>
      <Segmented value={r.nOfKindMode} label={t('rules.ofKind')} cols={2}
        options={[{ value: 'multiplier', label: t('rules.multiplier') }, { value: 'doubling', label: t('rules.doubling') }, { value: 'table', label: t('rules.table') }, { value: 'off', label: t('rules.off') }]}
        onChange={(v) => set({ nOfKindMode: v })} />
      <div className="card"><small className="eyebrow">{t('rules.example')}</small><strong>{example}</strong></div>

      <h3 className="eyebrow">{t('rules.special')}</h3>
      <div className="card flush">
        <Switch checked={r.hotDice} onChange={(v) => set({ hotDice: v })} label={t('rules.hotDice')} note={t('rules.hotDiceNote')} />
        <Switch checked={r.straight != null} onChange={(v) => set({ straight: v ? 1000 : null })} label={t('rules.straightOn')} note={t('rules.straightNote')} />
        {r.straight != null && num(t('rules.straight'), r.straight, (v) => set({ straight: v }), 0, 5000)}
      </div>

      <h3 className="eyebrow">{t('rules.banking')}</h3>
      <div className="card flush">
        {num(t('rules.minBank'), r.minBank, (v) => set({ minBank: v }), 0, 2000)}
        {num(t('rules.firstEntry'), r.firstEntryMin ?? 0, (v) => set({ firstEntryMin: v === 0 ? null : v }), 0, 2000, 50, r.firstEntryMin == null ? t('rules.offShort') : String(r.firstEntryMin))}
        <Switch checked={r.bustPenalty != null} onChange={(v) => set({ bustPenalty: v ? { afterConsecutive: 3, points: 500 } : null })} label={t('rules.penalty')} note={t('rules.penaltyNote')} />
        {r.bustPenalty && num(t('rules.penaltyPoints'), r.bustPenalty.points, (v) => set({ bustPenalty: { ...r.bustPenalty!, points: v } }), 50, 2000)}
      </div>
      <p className="muted small">{t('rules.bankDice')}</p>
      <Segmented value={r.bankRestriction} label={t('rules.bankDice')} cols={3}
        options={[{ value: 'anytime', label: t('rules.bankAny') }, { value: 'atMostTwoOrHot', label: t('rules.bankAtMost2') }, { value: 'exactlyTwoOrHot', label: t('rules.bankExact2') }]}
        onChange={(v) => set({ bankRestriction: v })} />

      <h3 className="eyebrow">{t('rules.ends')}</h3>
      <p className="muted small">{t('rules.finalRound')}</p>
      <Segmented value={r.finalRound} label={t('rules.finalRound')} cols={3}
        options={[{ value: 'oneMoreTurnEach', label: t('rules.oneMore') }, { value: 'equalTurns', label: t('rules.equal') }, { value: 'none', label: t('rules.endNow') }]}
        onChange={(v) => set({ finalRound: v })} />
      <p className="muted small">{t('rules.timeFinish')}</p>
      <Segmented value={r.timeFinish} label={t('rules.timeFinish')}
        options={[{ value: 'finishTurn', label: t('rules.finishTurn') }, { value: 'immediate', label: t('rules.immediate') }]}
        onChange={(v) => set({ timeFinish: v })} />

      <div className="stack">
        <button type="button" className="btn btn-primary" disabled={errors.length > 0} onClick={() => onApply(r)}>{t('rules.use')}</button>
        <label className="field">
          <span className="eyebrow">{t('rules.presetName')}</span>
          <input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
        </label>
        <button type="button" className="btn btn-outline" disabled={errors.length > 0 || name.trim().length === 0} onClick={() => onSavePreset({ ...r, id: crypto.randomUUID(), name: name.trim() }, name.trim())}>{t('rules.save')}</button>
      </div>
    </Sheet>
  );
}
