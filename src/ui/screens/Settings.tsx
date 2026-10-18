import { useEffect, useRef, useState } from 'react';
import { BottomNav, ConfirmDialog, Segmented, Switch } from '../components';
import { BUILT_IN_PRESETS } from '../../engine/presets';
import { exportAll, importAll } from '../../storage/backup';
import type { ImportReport } from '../../storage/backup';
import { listPresets, resetAll } from '../../storage/repo';
import type { Preset } from '../../storage/types';
import { useGame } from '../../state/gameStore';
import { useSettings } from '../../state/settingsStore';
import { downloadBlob } from '../../platform/share';
import { useT } from '../../i18n';
import { navigate } from '../router';

export function Settings() {
  const t = useT();
  const { settings, update } = useSettings();
  const init = useGame((s) => s.init);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [exclude, setExclude] = useState(false);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [pending, setPending] = useState<{ text: string; report: ImportReport } | null>(null);
  const [done, setDone] = useState('');
  const [reset, setReset] = useState<0 | 1 | 2>(0);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listPresets().then(setPresets);
    navigator.storage
      ?.persisted?.()
      .then(setPersisted)
      .catch(() => setPersisted(null));
  }, []);

  const allPresets = [...BUILT_IN_PRESETS.map((p) => ({ id: p.id, name: p.name })), ...presets.map((p) => ({ id: p.id, name: p.name }))];

  return (
    <div className="screen">
      <header className="app-head">
        <h1>{t('nav.settings')}</h1>
      </header>
      <main className="content">
        <section>
          <h2 className="eyebrow">{t('set.language')}</h2>
          <Segmented
            value={settings.language}
            label={t('set.language')}
            options={[
              { value: 'cs', label: 'Čeština' },
              { value: 'en', label: 'English' }
            ]}
            onChange={(v) => update({ language: v })}
          />
        </section>
        <section>
          <h2 className="eyebrow">{t('set.theme')}</h2>
          <Segmented
            value={settings.theme}
            label={t('set.theme')}
            options={[
              { value: 'system', label: t('set.system') },
              { value: 'light', label: t('set.light') },
              { value: 'dark', label: t('set.dark') }
            ]}
            onChange={(v) => update({ theme: v })}
          />
        </section>
        <section>
          <h2 className="eyebrow">{t('set.during')}</h2>
          <div className="card flush">
            <Switch checked={settings.sound} onChange={(v) => update({ sound: v })} label={t('set.sound')} note={t('set.soundNote')} />
            <Switch
              checked={settings.vibration}
              onChange={(v) => update({ vibration: v })}
              label={t('set.vibration')}
              note={t('set.vibrationNote')}
            />
            <Switch
              checked={settings.saveLocationByDefault}
              onChange={(v) => update({ saveLocationByDefault: v })}
              label={t('set.location')}
              note={t('set.locationNote')}
            />
            <label className="switch-row">
              <span className="switch-text">
                <strong>{t('set.preset')}</strong>
                <small>{t('set.presetNote')}</small>
              </span>
              <select className="select" value={settings.defaultPresetId} onChange={(e) => update({ defaultPresetId: e.target.value })}>
                {allPresets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>
        <section>
          <h2 className="eyebrow">{t('set.backup')}</h2>
          <div className="card col">
            <p className="muted">{t('set.backupBody')}</p>
            <label className="check">
              <input type="checkbox" checked={exclude} onChange={(e) => setExclude(e.target.checked)} /> {t('set.excludeLoc')}
            </label>
            <div className="grid2">
              <button
                type="button"
                className="btn btn-primary"
                onClick={async () =>
                  downloadBlob(
                    await exportAll({ excludeLocation: exclude }),
                    `dices-with-friends-${new Date().toISOString().slice(0, 10)}.json`
                  )
                }
              >
                {t('set.export')}
              </button>
              <button type="button" className="btn btn-outline" onClick={() => fileRef.current?.click()}>
                {t('set.import')}
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              hidden
              aria-label={t('set.import')}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (!file) return;
                const text = await file.text();
                setDone('');
                setPending({ text, report: await importAll(text, false) });
              }}
            />
            <small className="muted">{t('set.importNote')}</small>
          </div>
          <div className="banner" role="status">
            {persisted === null ? t('set.storageUnknown') : persisted ? t('set.storageOk') : t('set.storageWarn')}
          </div>
          {done && (
            <div className="banner banner-ok" role="status">
              {done}
            </div>
          )}
        </section>
        <section>
          <h2 className="eyebrow danger">{t('set.danger')}</h2>
          <button type="button" className="btn btn-danger" onClick={() => setReset(1)}>
            {t('set.reset')}
          </button>
          <p className="muted small">{t('set.resetNote')}</p>
        </section>
        <p className="muted small center-text">Dices with Friends · v0.1 · {t('set.footer')}</p>
      </main>
      <BottomNav active="settings" />
      {pending && (
        <ConfirmDialog
          title={t('set.importTitle')}
          confirmLabel={t('set.importConfirm')}
          onCancel={() => setPending(null)}
          body={
            pending.report.ok
              ? t('set.importSummary', { n: pending.report.newGames, e: pending.report.existingGames, i: pending.report.invalidGames })
              : t('set.importBad')
          }
          onConfirm={async () => {
            if (pending.report.ok) {
              const r = await importAll(pending.text, true);
              setDone(t('set.imported', { n: r.newGames }));
            }
            setPending(null);
          }}
        />
      )}
      {reset === 1 && (
        <ConfirmDialog
          title={t('set.reset1Title')}
          body={t('set.reset1Body')}
          confirmLabel={t('set.resetContinue')}
          danger
          onCancel={() => setReset(0)}
          onConfirm={() => setReset(2)}
        />
      )}
      {reset === 2 && (
        <ConfirmDialog
          title={t('set.reset2Title')}
          body={t('set.reset2Body')}
          confirmLabel={t('set.resetEverything')}
          danger
          onCancel={() => setReset(0)}
          onConfirm={async () => {
            await resetAll();
            setReset(0);
            await init();
            navigate('', true);
          }}
        />
      )}
    </div>
  );
}
