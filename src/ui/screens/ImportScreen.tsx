import { useEffect, useState } from 'react';
import { BackButton } from '../components';
import { ImportPreview } from './ImportPreview';
import { decodePayload } from '../../storage/bundle';
import { useT } from '../../i18n';
import { navigate } from '../router';

/** Opens a shared game from a link: `#/import/<payload>`. */
export function ImportScreen({ payload }: { payload?: string }) {
  const t = useT();
  const [state, setState] = useState<{ text: string } | { error: string } | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const r = payload ? await decodePayload(payload) : ({ ok: false, error: 'bad-format' } as const);
      if (alive) setState(r.ok ? { text: r.text } : { error: r.error });
    })();
    return () => {
      alive = false;
    };
  }, [payload]);

  return (
    <div className="screen">
      <header className="app-head">
        <BackButton href="#/archive" label={t('common.back')} />
        <h1>{t('import.title')}</h1>
      </header>
      <main className="content" tabIndex={0}>
        {!state && <p className="muted center-text">…</p>}
        {state && 'error' in state && (
          <div className="stack">
            <div className="banner banner-bad" role="alert">
              {t('import.link.' + state.error)}
            </div>
            <a className="btn btn-outline" href="#/archive">
              {t('common.back')}
            </a>
          </div>
        )}
        {state && 'text' in state && (
          <ImportPreview
            text={state.text}
            onCancel={() => navigate('archive', true)}
            onAdded={(ids) => navigate(ids[0] ? `game/${ids[0]}` : 'archive', true)}
          />
        )}
        <p className="muted small">{t('import.safe')}</p>
      </main>
    </div>
  );
}
