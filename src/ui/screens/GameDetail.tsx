import { useEffect, useState } from 'react';
import { BackButton, ConfirmDialog, PlayerBadge, Segmented, Sheet } from '../components';
import { deleteArchived, getGame, getTurns, renameGame } from '../../storage/repo';
import type { Game, Turn } from '../../storage/types';
import type { GameReview } from '../../review/types';
import { translate, useT } from '../../i18n';
import { useSettings } from '../../state/settingsStore';
import { useFmt } from '../format';
import { navigate } from '../router';
import { paletteFor } from '../palette';
import { ShareDialog } from './ShareDialog';

export function reviewText(lang: 'en' | 'cs', review: GameReview, playerId: string, name: (id: string) => string) {
  const a = review.players[playerId];
  const tr = (k: string, p?: Record<string, string | number>) => translate(lang, k, p);
  return { name: tr(`style.${a.style}.name`), tag: a.tag ? tr(`tag.${a.tag}`) : undefined, text: tr(`style.${a.style}.fb.${a.variant}`, a.params), who: name(playerId) };
}

export function GameDetail({ id }: { id: string }) {
  const t = useT();
  const f = useFmt();
  const lang = useSettings((s) => s.settings.language);
  const [game, setGame] = useState<Game | undefined | null>(undefined);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [tab, setTab] = useState<'overview' | 'players' | 'log' | 'chart'>('overview');
  const [sheet, setSheet] = useState<'share' | 'rename' | 'delete' | null>(null);
  const [name, setName] = useState('');

  const load = async () => {
    const g = await getGame(id);
    setGame(g ?? null);
    if (g) { setTurns(await getTurns(id)); setName(g.name); }
  };
  useEffect(() => { void load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (game === undefined) return <div className="screen" />;
  if (game === null || !game.review || !game.result) {
    return <div className="screen"><header className="app-head"><BackButton href="#/archive" label={t('common.back')} /><h1>{t('detail.missing')}</h1></header></div>;
  }
  const review = game.review;
  const nameOf = (pid: string) => game.players.find((p) => p.playerId === pid)?.name ?? '';
  const seatOf = (pid: string) => game.players.find((p) => p.playerId === pid)?.seat ?? 0;
  const tr = (k: string, p?: Record<string, string | number>) => translate(lang, k, p);
  const headline = tr(`headline.${review.headline.key}`, review.headline.params);
  const s = review.summary;
  const summary = tr(s.endType === 'target' ? 'summary.target' : 'summary.time', { ...s, end: f.n(Number(s.end)), biggest: f.n(Number(s.biggest)) });
  const ranking = game.result.ranking;
  const tieOf = (r: number) => ranking.filter((x) => x.rank === r).length > 1;

  return (
    <div className="screen">
      <header className="app-head">
        <BackButton href="#/archive" label={t('common.back')} />
        <span className="grow col"><h1>{game.name}</h1><small className="muted">{f.date(game.createdAt)}{game.placeLabel ? ` · ${game.placeLabel}` : ''}</small></span>
      </header>
      <div className="row gap pad-x">
        <button type="button" className="btn btn-primary grow" onClick={() => setSheet('share')}>{t('detail.share')}</button>
        <button type="button" className="btn btn-outline" onClick={() => setSheet('rename')}>{t('detail.rename')}</button>
        <button type="button" className="btn btn-danger" onClick={() => setSheet('delete')}>{t('detail.delete')}</button>
      </div>
      <div className="pad-x top">
        <Segmented value={tab} label={t('detail.tabs')} cols={4} onChange={setTab}
          options={[{ value: 'overview', label: t('detail.overview') }, { value: 'players', label: t('detail.players') }, { value: 'log', label: t('detail.log') }, { value: 'chart', label: t('detail.chart') }]} />
      </div>
      <main className="content">
        {tab === 'overview' && (
          <>
            <div className="card hl"><h2 className="big">{headline}</h2><p className="muted">{summary}</p></div>
            <div className="card flush">
              {ranking.map((r) => (
                <div key={r.playerId} className="row gap rank-row">
                  <strong className="rank">{tieOf(r.rank) ? t('final.tie', { n: r.rank }) : r.rank}</strong>
                  <PlayerBadge name={nameOf(r.playerId)} seat={seatOf(r.playerId)} size={32} />
                  <strong className="grow">{nameOf(r.playerId)}</strong>
                  <strong className="score-sm">{f.n(r.score)}</strong>
                </div>
              ))}
            </div>
            <h2 className="eyebrow">{t('detail.awards')}</h2>
            <div className="list tight">
              {review.awards.map((a, i) => (
                <div key={i} className="card row gap">
                  <PlayerBadge name={nameOf(a.playerId)} seat={seatOf(a.playerId)} size={36} />
                  <span className="grow col"><small className="eyebrow">{tr(`award.${a.key}.title`)}</small><strong>{nameOf(a.playerId)}</strong></span>
                  <strong className="primary">{tr(`award.${a.key}.detail`, { n: f.n(a.value) })}</strong>
                </div>
              ))}
            </div>
          </>
        )}
        {tab === 'players' && (
          <div className="list">
            {ranking.map((r) => {
              const st = review.stats[r.playerId];
              const rt = reviewText(lang, review, r.playerId, nameOf);
              return (
                <div key={r.playerId} className="card col">
                  <div className="row gap">
                    <PlayerBadge name={rt.who} seat={seatOf(r.playerId)} size={40} />
                    <span className="grow col"><strong>{rt.who}</strong><strong className="primary">{rt.name}{rt.tag ? ` · ${rt.tag}` : ''}</strong></span>
                    <strong className="score-sm">{f.n(r.score)}</strong>
                  </div>
                  <p>{rt.text}</p>
                  <div className="grid3 stats">
                    <div><small className="muted">{t('detail.avgBanked')}</small><strong>{f.n(Math.round(st.avgBank))}</strong></div>
                    <div><small className="muted">{t('detail.bustRate')}</small><strong>{Math.round(st.bustRate * 100)}%</strong></div>
                    <div><small className="muted">{t('detail.bestTurn')}</small><strong>{f.n(st.bestTurn)}</strong></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {tab === 'log' && (
          <div className="list tight">
            {[...turns].reverse().map((x) => (
              <div key={x.id} className="card row gap">
                <small className="muted w34">R{x.round}</small>
                <PlayerBadge name={nameOf(x.playerId)} seat={seatOf(x.playerId)} size={28} />
                <strong className="grow">{nameOf(x.playerId)}</strong>
                <small className="muted">{f.n(x.scoreAfter)}</small>
                <strong className={x.result === 'banked' ? '' : 'danger'}>{x.result === 'banked' ? `+${f.n(x.turnTotal)}` : t('board.bust')}</strong>
              </div>
            ))}
          </div>
        )}
        {tab === 'chart' && <ScoreChart game={game} turns={turns} />}
      </main>
      {sheet === 'share' && <ShareDialog game={game} onClose={() => setSheet(null)} />}
      {sheet === 'rename' && (
        <Sheet title={t('detail.rename')} onClose={() => setSheet(null)}>
          <label className="field"><span className="eyebrow">{t('new.name')}</span><input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} /></label>
          <button type="button" className="btn btn-primary" disabled={!name.trim()} onClick={async () => { await renameGame(game.id, name.trim()); setSheet(null); await load(); }}>{t('common.save')}</button>
        </Sheet>
      )}
      {sheet === 'delete' && <ConfirmDialog title={t('detail.deleteTitle')} body={t('detail.deleteBody')} confirmLabel={t('detail.delete')} danger onCancel={() => setSheet(null)} onConfirm={async () => { await deleteArchived(game.id); navigate('archive', true); }} />}
    </div>
  );
}

function ScoreChart({ game, turns }: { game: Game; turns: Turn[] }) {
  const t = useT();
  const f = useFmt();
  const rounds = Math.max(1, ...turns.map((x) => x.round));
  const series = game.players.map((p) => {
    const pts: number[] = [];
    let score = 0;
    for (let r = 1; r <= rounds; r++) {
      const last = turns.filter((x) => x.playerId === p.playerId && x.round <= r).pop();
      score = last ? last.scoreAfter : score;
      pts.push(score);
    }
    return { p, pts };
  });
  const max = Math.max(1000, ...series.flatMap((s) => s.pts));
  const X = (i: number) => (rounds === 1 ? 191 : 52 + (i / (rounds - 1)) * 270);
  const Y = (v: number) => 200 - (v / max) * 180;
  const ticks = [0, Math.round(max / 2 / 500) * 500, Math.round(max / 500) * 500];
  return (
    <>
      <div className="card">
        <h2 className="eyebrow">{t('detail.byRound')}</h2>
        <svg viewBox="0 0 350 240" width="100%" role="img" aria-label={t('detail.chartAria', { list: [...game.result!.ranking].map((r) => `${game.players.find((p) => p.playerId === r.playerId)?.name} ${f.n(r.score)}`).join(', ') })}>
          {ticks.map((v) => <g key={v}><line x1="52" x2="330" y1={Y(v)} y2={Y(v)} stroke="var(--border)" /><text x="46" y={Y(v) + 4} textAnchor="end" fontSize="11" fill="var(--muted)">{f.n(v)}</text></g>)}
          {series.map(({ p, pts }) => (
            <g key={p.playerId}>
              <polyline fill="none" stroke={paletteFor(p.seat).colour} strokeWidth="3" strokeLinejoin="round" points={pts.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ')} />
              <circle cx={X(pts.length - 1)} cy={Y(pts[pts.length - 1])} r="6" fill={paletteFor(p.seat).colour} stroke="var(--surface)" strokeWidth="2" />
            </g>
          ))}
          <text x="52" y="226" fontSize="11" fill="var(--muted)">R1</text>
          <text x="330" y="226" textAnchor="end" fontSize="11" fill="var(--muted)">R{rounds}</text>
        </svg>
      </div>
      <div className="grid2">
        {series.map(({ p, pts }) => <div key={p.playerId} className="card row gap"><PlayerBadge name={p.name} seat={p.seat} size={24} /><strong className="grow">{p.name}</strong><span className="muted">{f.n(pts[pts.length - 1])}</span></div>)}
      </div>
    </>
  );
}
