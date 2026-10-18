import { useEffect, useState } from 'react';
import { PlayerBadge } from '../components';
import { importBundle, inspectBundle } from '../../storage/bundle';
import type { BundlePreview } from '../../storage/bundle';
import { useT } from '../../i18n';
import { useFmt } from '../format';

/** Shows what a shared game or backup contains and lets the player add it to their archive. */
export function ImportPreview({ text, onAdded, onCancel }: { text: string; onAdded: (ids: string[]) => void; onCancel: () => void }) {
  const t = useT();
  const f = useFmt();
  const [preview, setPreview] = useState<BundlePreview | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    inspectBundle(text).then((p) => alive && setPreview(p));
    return () => {
      alive = false;
    };
  }, [text]);

  if (!preview) return <p className="muted center-text">…</p>;
  if (!preview.ok) {
    return (
      <div className="stack">
        <div className="banner banner-bad" role="alert">
          {t('import.error.' + preview.error)}
        </div>
        <button type="button" className="btn btn-outline" onClick={onCancel}>
          {t('common.back')}
        </button>
      </div>
    );
  }
  const n = preview.fresh.length;
  return (
    <div className="stack">
      {preview.fresh.slice(0, 3).map((g) => (
        <div key={g.id} className="card col">
          <strong className="big">{g.name}</strong>
          <small className="muted">
            {f.date(g.createdAt)}
            {g.placeLabel ? ` · ${g.placeLabel}` : ''} · {t('import.turns', { n: g.turns })}
          </small>
          <div className="row gap wrap">
            {g.players.map((p, i) => (
              <span key={i} className="row gap">
                <PlayerBadge name={p} seat={i} size={24} />
                <span>{p}</span>
              </span>
            ))}
          </div>
          {g.winner && (
            <small className="muted">
              {t('home.winner')}: <strong>{g.winner}</strong>
            </small>
          )}
        </div>
      ))}
      {n > 3 && <p className="muted small">{t('import.more', { n: n - 3 })}</p>}
      {n === 0 && (
        <div className="banner banner-ok" role="status">
          {t('import.already')}
        </div>
      )}
      {n > 0 && preview.existing > 0 && <p className="muted small">{t('import.someExist', { n: preview.existing })}</p>}
      {preview.invalid > 0 && <p className="muted small">{t('import.invalid', { n: preview.invalid })}</p>}
      {n > 0 && (
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const ids = await importBundle(text);
            setBusy(false);
            onAdded(ids);
          }}
        >
          {t('import.add', { n })}
        </button>
      )}
      <button type="button" className="btn btn-quiet" onClick={onCancel}>
        {n === 0 ? t('common.back') : t('common.cancel')}
      </button>
    </div>
  );
}
