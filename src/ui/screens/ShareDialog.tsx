import { useEffect, useRef, useState } from 'react';
import { Segmented, Sheet, Switch } from '../components';
import { canvasToBlob, drawShare, SHARE_SIZE } from '../share/renderImage';
import type { ShareTheme } from '../share/renderImage';
import { copyPng, downloadBlob, sharePng } from '../../platform/share';
import { translate, useT } from '../../i18n';
import { useSettings } from '../../state/settingsStore';
import type { Game } from '../../storage/types';
import { useFmt } from '../format';

export function ShareDialog({ game, onClose }: { game: Game; onClose: () => void }) {
  const t = useT();
  const f = useFmt();
  const lang = useSettings((s) => s.settings.language);
  const appTheme = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  const [theme, setTheme] = useState<ShareTheme>(appTheme);
  const [place, setPlace] = useState(false);
  const [url, setUrl] = useState('');
  const [msg, setMsg] = useState('');
  const blobRef = useRef<Blob | null>(null);

  useEffect(() => {
    const review = game.review!;
    const tr = (k: string, p?: Record<string, string | number>) => translate(lang, k, p);
    const nameOf = (id: string) => game.players.find((p) => p.playerId === id)?.name ?? '';
    const seatOf = (id: string) => game.players.find((p) => p.playerId === id)?.seat ?? 0;
    const ranking = game.result!.ranking;
    const labels = {
      title: game.name,
      dateLine: `${f.date(game.createdAt)} · ${game.endCondition.type === 'target' ? tr('share.first', { n: f.n(game.endCondition.targetScore) }) : `${Math.round(game.endCondition.limitMs / 60000)} min`}`,
      place: place ? game.placeLabel : undefined,
      footer: tr('share.footer'),
      headline: tr(`headline.${review.headline.key}`, review.headline.params),
      ranking: ranking.map((r) => ({
        rank: ranking.filter((x) => x.rank === r.rank).length > 1 ? tr('final.tie', { n: r.rank }) : String(r.rank),
        name: nameOf(r.playerId),
        seat: seatOf(r.playerId),
        score: f.n(r.score),
        style: tr(`style.${review.players[r.playerId].style}.name`)
      })),
      awards: review.awards
        .filter((a) => a.key !== 'winner')
        .slice(0, 3)
        .map((a) => ({
          title: tr(`award.${a.key}.title`),
          who: nameOf(a.playerId),
          detail: tr(`award.${a.key}.detail`, { n: f.n(a.value) })
        }))
    };
    const canvas = document.createElement('canvas');
    drawShare(canvas, game, labels, theme);
    let revoked = false;
    canvasToBlob(canvas).then((b) => {
      if (revoked) return;
      blobRef.current = b;
      setUrl((old) => {
        if (old) URL.revokeObjectURL(old);
        return URL.createObjectURL(b);
      });
    });
    return () => {
      revoked = true;
    };
  }, [game, theme, place, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const file = `${game.name.replace(/[^\w-]+/g, '_')}.png`;
  return (
    <Sheet title={t('share.title')} onClose={onClose}>
      <div className="share-preview">
        {url ? (
          <img src={url} alt={t('share.alt', { name: game.name })} width={SHARE_SIZE.w / 4} height={SHARE_SIZE.h / 4} />
        ) : (
          <span className="muted">…</span>
        )}
      </div>
      <Segmented
        value={theme}
        label={t('share.theme')}
        options={[
          { value: appTheme, label: t('share.appTheme') },
          { value: 'colourful', label: t('share.colourful') }
        ]}
        onChange={setTheme}
      />
      {game.placeLabel && (
        <div className="card flush">
          <Switch checked={place} onChange={setPlace} label={t('share.place')} note={game.placeLabel} />
        </div>
      )}
      <div className="stack">
        <button
          type="button"
          className="btn btn-primary"
          disabled={!url}
          onClick={async () => {
            if (!blobRef.current) return;
            const r = await sharePng(blobRef.current, file, game.name);
            if (r === 'unsupported') {
              downloadBlob(blobRef.current, file);
              setMsg(t('share.downloaded'));
            }
          }}
        >
          {t('share.share')}
        </button>
        <div className="grid2">
          <button
            type="button"
            className="btn btn-outline"
            disabled={!url}
            onClick={() => blobRef.current && downloadBlob(blobRef.current, file)}
          >
            {t('share.download')}
          </button>
          <button
            type="button"
            className="btn btn-outline"
            disabled={!url}
            onClick={async () => setMsg((await copyPng(blobRef.current!)) ? t('share.copied') : t('share.copyFailed'))}
          >
            {t('share.copy')}
          </button>
        </div>
        <p className="muted small" role="status">
          {msg || t('share.privacy')}
        </p>
      </div>
    </Sheet>
  );
}
