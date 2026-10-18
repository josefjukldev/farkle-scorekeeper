import { useEffect, useMemo, useState } from 'react';
import { BackButton, PlayerBadge, Segmented, Switch } from '../components';
import { RulesEditor } from './RulesEditor';
import { BUILT_IN_PRESETS, DEFAULT_TARGET, HOUSE_RULES, TARGET_PRESETS, TIME_PRESETS_MIN } from '../../engine/presets';
import { validateEnd, validatePlayerNames } from '../../engine/validate';
import type { EndCondition, RuleSet } from '../../engine/types';
import { useGame } from '../../state/gameStore';
import { useSettings } from '../../state/settingsStore';
import { listPresets, listRecentPlayers, savePreset } from '../../storage/repo';
import type { Player, Preset } from '../../storage/types';
import { getPosition } from '../../platform/geolocation';
import { useT } from '../../i18n';
import { useFmt } from '../format';
import { navigate } from '../router';
import { paletteFor } from '../palette';

const defaultName = (lang: string) =>
  `Farkle – ${new Intl.DateTimeFormat(lang === 'cs' ? 'cs-CZ' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date())}`;

export function NewGame() {
  const t = useT();
  const f = useFmt();
  const settings = useSettings((s) => s.settings);
  const createGame = useGame((s) => s.createGame);
  const [name, setName] = useState(() => defaultName(settings.language));
  const [players, setPlayers] = useState<string[]>(['', '']);
  const [recent, setRecent] = useState<Player[]>([]);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [rules, setRules] = useState<RuleSet>(HOUSE_RULES);
  const [mode, setMode] = useState<'target' | 'time'>(settings.lastEndCondition?.type ?? 'target');
  const [target, setTarget] = useState(
    settings.lastEndCondition?.type === 'target' ? settings.lastEndCondition.targetScore : DEFAULT_TARGET
  );
  const [minutes, setMinutes] = useState(
    settings.lastEndCondition?.type === 'time' ? Math.round(settings.lastEndCondition.limitMs / 60000) : 30
  );
  const [custom, setCustom] = useState(false);
  const [saveLoc, setSaveLoc] = useState(settings.saveLocationByDefault);
  const [place, setPlace] = useState('');
  const [editRules, setEditRules] = useState(false);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  useEffect(() => {
    (async () => {
      const [rp, ps] = await Promise.all([listRecentPlayers(8), listPresets()]);
      setRecent(rp);
      setPresets(ps);
      const last = settings.lastPlayerIds.map((id) => rp.find((p) => p.id === id)?.name).filter((n): n is string => !!n);
      if (last.length >= 2) setPlayers(last);
      const all = [...BUILT_IN_PRESETS, ...ps.map((p) => p.rules)];
      setRules(all.find((r) => r.id === settings.defaultPresetId) ?? HOUSE_RULES);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const end: EndCondition = mode === 'target' ? { type: 'target', targetScore: target } : { type: 'time', limitMs: minutes * 60000 };
  const nameErr = name.trim().length < 1 || name.trim().length > 60;
  const playerErrs = useMemo(() => validatePlayerNames(players), [players]);
  const endErrs = validateEnd(end, rules);
  const step1Ok = !nameErr && playerErrs.length === 0;
  const valid = step1Ok && endErrs.length === 0;
  const allRules = [...BUILT_IN_PRESETS, ...presets.map((p) => p.rules)];

  const setPlayer = (i: number, v: string) => setPlayers((p) => p.map((x, k) => (k === i ? v : x)));
  const move = (i: number, d: number) =>
    setPlayers((p) => {
      const j = i + d;
      if (j < 0 || j >= p.length) return p;
      const c = [...p];
      [c[i], c[j]] = [c[j], c[i]];
      return c;
    });
  const shuffle = () => setPlayers((p) => [...p].sort(() => Math.random() - 0.5));
  const addPlayer = (n = '') => setPlayers((p) => (p.length >= 8 ? p : [...p.filter((x, i) => x.trim() || i < 2 || n === ''), n]));

  const errOf = (i: number): string | undefined =>
    playerErrs.includes(`name-${i}-length`)
      ? t('new.errLength')
      : playerErrs.includes(`name-${i}-duplicate`)
        ? t('new.errDuplicate')
        : undefined;

  const start = async () => {
    setTouched(true);
    if (!valid || busy) return;
    setBusy(true);
    await createGame({
      name,
      players: players.map((n, i) => ({ name: n, colour: paletteFor(i).colour })),
      rules,
      end,
      placeLabel: saveLoc ? place : undefined
    });
    navigate('handover');
    // location is looked up in the background so a pending permission prompt never blocks the game
    if (saveLoc) {
      const id = useGame.getState().game?.id;
      void getPosition().then((pos) => {
        if (pos && id) void useGame.getState().attachLocation(id, { ...pos, label: place || undefined });
      });
    }
  };

  const chips = mode === 'target' ? TARGET_PRESETS : TIME_PRESETS_MIN;
  const cur = mode === 'target' ? target : minutes;

  return (
    <div className="screen">
      <header className="app-head">
        {step === 1 ? (
          <BackButton href="#/" label={t('common.back')} />
        ) : (
          <button type="button" className="icon-btn back" aria-label={t('common.back')} onClick={() => setStep(1)}>
            ‹
          </button>
        )}
        <h1 className="grow">{t('new.title')}</h1>
        <span className="muted small">{t('new.step', { n: step })}</span>
      </header>
      <main className="content">
        {step === 1 && (
          <>
            <label className="field">
              <span className="eyebrow">{t('new.name')}</span>
              <input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} aria-invalid={touched && nameErr} />
              {touched && nameErr && <small className="err">{t('new.errName')}</small>}
            </label>

            <section>
              <div className="row between">
                <h2 className="eyebrow">{t('new.players', { n: players.length })}</h2>
                <button type="button" className="link-btn" onClick={shuffle}>
                  {t('new.shuffle')}
                </button>
              </div>
              <div className="list tight players">
                {players.map((p, i) => (
                  <div key={i}>
                    <div className="row gap">
                      <PlayerBadge name={p || '?'} seat={i} size={40} />
                      <input
                        aria-label={t('new.playerN', { n: i + 1 })}
                        value={p}
                        maxLength={24}
                        onChange={(e) => setPlayer(i, e.target.value)}
                        className="grow"
                        aria-invalid={touched && !!errOf(i)}
                      />
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label={t('new.up', { n: i + 1 })}
                        disabled={i === 0}
                        onClick={() => move(i, -1)}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label={t('new.down', { n: i + 1 })}
                        disabled={i === players.length - 1}
                        onClick={() => move(i, 1)}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label={t('new.remove', { n: i + 1 })}
                        disabled={players.length <= 2}
                        onClick={() => setPlayers((x) => x.filter((_, k) => k !== i))}
                      >
                        ✕
                      </button>
                    </div>
                    {(touched || p.length > 0) && errOf(i) && p.length > 0 && <small className="err">{errOf(i)}</small>}
                  </div>
                ))}
              </div>
              <div className="row gap wrap top">
                <button type="button" className="btn btn-dashed" disabled={players.length >= 8} onClick={() => addPlayer('')}>
                  ＋ {t('new.add')}
                </button>
                {recent
                  .filter((r) => !players.some((p) => p.trim().toLowerCase() === r.name.toLowerCase()))
                  .slice(0, 5)
                  .map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      className="chip"
                      onClick={() =>
                        setPlayers((p) => {
                          const i = p.findIndex((x) => !x.trim());
                          if (i >= 0) return p.map((x, k) => (k === i ? r.name : x));
                          return p.length >= 8 ? p : [...p, r.name];
                        })
                      }
                    >
                      {r.name}
                    </button>
                  ))}
              </div>
              {touched && playerErrs.includes('player-count') && <small className="err">{t('new.errCount')}</small>}
            </section>
          </>
        )}

        {step === 2 && (
          <>
            <section>
              <h2 className="eyebrow">{t('new.ends')}</h2>
              <Segmented
                value={mode}
                label={t('new.ends')}
                options={[
                  { value: 'target', label: t('new.target') },
                  { value: 'time', label: t('new.time') }
                ]}
                onChange={(m) => {
                  setMode(m);
                  setCustom(false);
                }}
              />
              <div className="row gap wrap top">
                {chips.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={'chip big' + (!custom && cur === c ? ' on' : '')}
                    aria-pressed={!custom && cur === c}
                    onClick={() => {
                      setCustom(false);
                      if (mode === 'target') setTarget(c);
                      else setMinutes(c);
                    }}
                  >
                    {mode === 'target' ? f.n(c) : `${c} min`}
                  </button>
                ))}
                <button type="button" className={'chip big' + (custom ? ' on' : '')} aria-pressed={custom} onClick={() => setCustom(true)}>
                  {t('new.custom')}
                </button>
              </div>
              {custom && (
                <label className="field top">
                  <span className="muted small">{mode === 'target' ? t('new.customTarget') : t('new.customTime')}</span>
                  <input
                    inputMode="numeric"
                    value={cur}
                    onChange={(e) => {
                      const v = Number(e.target.value.replace(/\D/g, ''));
                      if (mode === 'target') setTarget(v);
                      else setMinutes(v);
                    }}
                    aria-invalid={endErrs.length > 0}
                  />
                </label>
              )}
              {endErrs.length > 0 && <small className="err">{mode === 'target' ? t('new.errTarget') : t('new.errTime')}</small>}
              <p className="muted small hide-short">
                {mode === 'target' ? t('new.noteTarget', { n: f.n(target) }) : t('new.noteTime', { n: minutes })}
              </p>
            </section>

            <section>
              <h2 className="eyebrow">{t('new.rules')}</h2>
              <div className="row gap">
                <select
                  aria-label={t('new.rules')}
                  className="grow select"
                  value={allRules.some((r) => r.id === rules.id) ? rules.id : 'custom'}
                  onChange={(e) => {
                    const r = allRules.find((x) => x.id === e.target.value);
                    if (r) setRules(r);
                    else setEditRules(true);
                  }}
                >
                  {allRules.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                  {!allRules.some((r) => r.id === rules.id) && <option value="custom">{rules.name}</option>}
                </select>
                <button type="button" className="btn btn-outline small-btn" onClick={() => setEditRules(true)}>
                  {t('new.edit')}
                </button>
              </div>
              <p className="muted small hide-short">
                {t('new.rulesSummary', { min: rules.minBank, dice: t('new.dice.' + rules.bankRestriction) })}
              </p>
            </section>

            <section>
              <h2 className="eyebrow">{t('new.place')}</h2>
              <div className="card flush">
                <Switch checked={saveLoc} onChange={setSaveLoc} label={t('new.saveLocation')} note={t('new.locationNote')} />
              </div>
              {saveLoc && (
                <label className="field top">
                  <span className="muted small">{t('new.placeLabel')}</span>
                  <input value={place} maxLength={40} onChange={(e) => setPlace(e.target.value)} />
                </label>
              )}
            </section>
          </>
        )}
      </main>
      <div className="action-bar single">
        {step === 1 ? (
          <button
            type="button"
            className="btn btn-primary big-btn"
            disabled={!step1Ok}
            onClick={() => setStep(2)}
            onMouseDown={() => setTouched(true)}
          >
            {t('new.next')}
          </button>
        ) : (
          <button type="button" className="btn btn-primary big-btn" disabled={!valid || busy} onClick={start}>
            {t('new.start')}
          </button>
        )}
      </div>
      {editRules && (
        <RulesEditor
          rules={rules}
          onClose={() => setEditRules(false)}
          onApply={(r) => {
            setRules(r);
            setEditRules(false);
          }}
          onSavePreset={async (r, n) => {
            const now = Date.now();
            await savePreset({ id: r.id, name: n, builtIn: false, rules: r, createdAt: now, updatedAt: now });
            setPresets(await listPresets());
            setRules(r);
            setEditRules(false);
          }}
        />
      )}
    </div>
  );
}
