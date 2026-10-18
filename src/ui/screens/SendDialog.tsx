import { useEffect, useState } from 'react';
import { Sheet, Switch } from '../components';
import { buildBundle, encodePayload, linkFor } from '../../storage/bundle';
import { getDeviceId, getTurns } from '../../storage/repo';
import type { Game } from '../../storage/types';
import { downloadBlob } from '../../platform/share';
import { useT } from '../../i18n';

const safeName = (s: string) => s.replace(/[^\p{L}\p{N}_-]+/gu, '_').slice(0, 40) || 'game';

/** "Send to players": the game as a link or a file. Coordinates are never included. */
export function SendDialog({ game, onClose }: { game: Game; onClose: () => void }) {
  const t = useT();
  const [includePlace, setIncludePlace] = useState(false);
  const [compact, setCompact] = useState(true);
  const [link, setLink] = useState('');
  const [json, setJson] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      const [turns, deviceId] = await Promise.all([getTurns(game.id), getDeviceId()]);
      const bundle = buildBundle(game, turns, { includePlace, compact, deviceId });
      const payload = await encodePayload(bundle);
      if (!alive) return;
      setLink(linkFor(payload));
      setJson(JSON.stringify(bundle));
    })();
    return () => {
      alive = false;
    };
  }, [game, includePlace, compact]);

  const title = t('send.shareTitle', { name: game.name });
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setMsg(t('send.copied'));
    } catch {
      setMsg(t('send.copyFailed'));
    }
  };
  const shareLink = async () => {
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (nav.share) {
      try {
        await nav.share({ title, text: title, url: link });
        return;
      } catch {
        return; // cancelled
      }
    }
    await copy();
  };
  const shareFile = async () => {
    const file = new File([json], `${safeName(game.name)}.dices.json`, { type: 'application/json' });
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean; share?: (d: ShareData) => Promise<void> };
    if (nav.share && nav.canShare?.({ files: [file] })) {
      try {
        await nav.share({ files: [file], title });
        return;
      } catch {
        return;
      }
    }
    downloadBlob(file, file.name);
    setMsg(t('send.downloaded'));
  };

  return (
    <Sheet title={t('send.title')} onClose={onClose}>
      <p className="muted body-text">{t('send.intro')}</p>
      <div className="card flush">
        {game.placeLabel && <Switch checked={includePlace} onChange={setIncludePlace} label={t('send.place')} note={game.placeLabel} />}
        <Switch checked={compact} onChange={setCompact} label={t('send.compact')} note={t('send.compactNote')} />
      </div>
      <label className="field">
        <span className="eyebrow">{t('send.link')}</span>
        <input readOnly value={link} aria-label={t('send.link')} onFocus={(e) => e.currentTarget.select()} />
        <small className="muted">{t('send.length', { n: link.length })}</small>
      </label>
      <div className="stack">
        <button type="button" className="btn btn-primary" disabled={!link} onClick={shareLink}>
          {t('send.shareLink')}
        </button>
        <div className="grid2">
          <button type="button" className="btn btn-outline" disabled={!link} onClick={copy}>
            {t('send.copy')}
          </button>
          <button type="button" className="btn btn-outline" disabled={!json} onClick={shareFile}>
            {t('send.file')}
          </button>
        </div>
        <p className="muted small" role="status">
          {msg || t('send.warning')}
        </p>
      </div>
    </Sheet>
  );
}
