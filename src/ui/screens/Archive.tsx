import { useEffect, useState } from 'react';
import { BottomNav, PlayerBadge, Sheet } from '../components';
import { ImportPreview } from './ImportPreview';
import { decodePayload, payloadFromLink } from '../../storage/bundle';
import { findDuplicateHints } from '../../review/crossGame';
import { navigate } from '../router';
import { listArchive } from '../../storage/repo';
import type { Game } from '../../storage/types';
import { useT } from '../../i18n';
import { useFmt } from '../format';

export function Archive() {
  const t = useT();
  const f = useFmt();
  const [all, setAll] = useState<Game[]>([]);
  const [q, setQ] = useState('');
  const [who, setWho] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    listArchive().then((g) => {
      setAll(g);
      setLoaded(true);
    });
  }, []);
  const names = [...new Set(all.flatMap((g) => g.players.map((p) => p.name)))].sort();
  const term = q.trim().toLowerCase();
  const fromMs = from ? new Date(from).getTime() : 0;
  const toMs = to ? new Date(to).getTime() + 86400000 : Infinity;
  const hints = findDuplicateHints(all);
  const nameOfGame = (id: string) => all.find((x) => x.id === id)?.name ?? '';
  const games = all
    .filter((g) => !who || g.players.some((p) => p.name === who))
    .filter((g) => !term || g.name.toLowerCase().includes(term) || g.players.some((p) => p.name.toLowerCase().includes(term)))
    .filter((g) => g.createdAt >= fromMs && g.createdAt < toMs);

  return (
    <div className="screen">
      <header className="app-head">
        <h1 className="grow">{t('nav.archive')}</h1>
        <button type="button" className="btn btn-outline small-btn" onClick={() => setImporting(true)}>
          {t('archive.import')}
        </button>
        <a href="#/stats" className="btn btn-outline small-btn">
          {t('stats.open')}
        </a>
      </header>
      <main className="content" tabIndex={0}>
        <label className="field">
          <span className="sr-only">{t('archive.search')}</span>
          <input type="search" placeholder={t('archive.search')} value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <div className="row gap wrap" role="group" aria-label={t('archive.filter')}>
          <button type="button" className={'chip' + (!who ? ' on' : '')} aria-pressed={!who} onClick={() => setWho('')}>
            {t('archive.all')}
          </button>
          {names.map((n) => (
            <button key={n} type="button" className={'chip' + (who === n ? ' on' : '')} aria-pressed={who === n} onClick={() => setWho(n)}>
              {n}
            </button>
          ))}
        </div>
        <div className="row gap">
          <label className="field grow">
            <span className="muted small">{t('archive.from')}</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="field grow">
            <span className="muted small">{t('archive.to')}</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
        <div className="list">
          {loaded && all.length === 0 && <p className="muted center-text">{t('archive.empty')}</p>}
          {loaded && all.length > 0 && games.length === 0 && <p className="muted center-text">{t('archive.noMatch')}</p>}
          {games.map((g) => {
            const w = g.players.find((p) => p.playerId === g.result?.winnerIds[0]);
            return (
              <a key={g.id} href={`#/game/${g.id}`} className="card row gap link-card">
                {w && <PlayerBadge name={w.name} seat={w.seat} size={44} />}
                <span className="grow col">
                  <strong>{g.name}</strong>
                  <small className="muted">
                    {f.date(g.createdAt)}
                    {g.placeLabel ? ` · ${g.placeLabel}` : ''}
                  </small>
                  <small className="muted">{g.players.map((p) => p.name).join(', ')}</small>
                  {(hints.has(g.id) || g.origin) && (
                    <span className="row gap wrap">
                      {g.origin && <small className="chip-sm">{t('detail.shared')}</small>}
                      {hints.has(g.id) && (
                        <small className="chip-sm warn">{t('archive.duplicate', { name: nameOfGame(hints.get(g.id)!) })}</small>
                      )}
                    </span>
                  )}
                </span>
                <span className="col right">
                  {w && (
                    <>
                      <small className="muted">{t('home.winner')}</small>
                      <strong>{w.name}</strong>
                    </>
                  )}
                  <small className="chip-sm">
                    {g.endCondition.type === 'target'
                      ? f.n(g.endCondition.targetScore)
                      : `${Math.round(g.endCondition.limitMs / 60000)} min`}
                  </small>
                </span>
              </a>
            );
          })}
        </div>
      </main>
      <BottomNav active="archive" />
      {importing && <ImportSheet onClose={() => setImporting(false)} />}
    </div>
  );
}

function ImportSheet({ onClose }: { onClose: () => void }) {
  const t = useT();
  const [link, setLink] = useState('');
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState('');

  const checkLink = async () => {
    const r = await decodePayload(payloadFromLink(link));
    if (r.ok) {
      setError('');
      setText(r.text);
    } else setError(t('import.link.' + r.error));
  };

  return (
    <Sheet title={t('import.title')} onClose={onClose}>
      {text === null ? (
        <div className="stack">
          <p className="muted body-text">{t('import.intro')}</p>
          <label className="field">
            <span className="eyebrow">{t('import.pasteLink')}</span>
            <input value={link} onChange={(e) => setLink(e.target.value)} aria-invalid={!!error} placeholder="https://…/#/import/…" />
          </label>
          {error && (
            <p className="err" role="alert">
              {error}
            </p>
          )}
          <button type="button" className="btn btn-primary" disabled={link.trim().length < 3} onClick={checkLink}>
            {t('import.check')}
          </button>
          <label className="btn btn-outline file-btn">
            {t('import.chooseFile')}
            <input
              type="file"
              accept="application/json,.json"
              className="sr-only"
              aria-label={t('import.chooseFile')}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) setText(await file.text());
              }}
            />
          </label>
        </div>
      ) : (
        <ImportPreview
          text={text}
          onCancel={() => setText(null)}
          onAdded={(ids) => {
            onClose();
            navigate(ids[0] ? `game/${ids[0]}` : 'archive');
          }}
        />
      )}
    </Sheet>
  );
}
