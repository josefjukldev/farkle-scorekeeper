import { useEffect, useRef } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useGame } from '../state/gameStore';
import { useSettings } from '../state/settingsStore';
import { exportCurrentGame } from './exportCurrent';
import { beep } from '../platform/haptics';
import { keepAwake } from '../platform/wakeLock';
import { useT } from '../i18n';
import { navigate, useRoute } from '../ui/router';
import { Home } from '../ui/screens/Home';
import { NewGame } from '../ui/screens/NewGame';
import { HandOver } from '../ui/screens/HandOver';
import { TurnEntry } from '../ui/screens/TurnEntry';
import { Confirm } from '../ui/screens/Confirm';
import { Board } from '../ui/screens/Board';
import { Final } from '../ui/screens/Final';
import { Archive } from '../ui/screens/Archive';
import { GameDetail } from '../ui/screens/GameDetail';
import { ImportScreen } from '../ui/screens/ImportScreen';
import { Settings } from '../ui/screens/Settings';
import { Stats } from '../ui/screens/Stats';
import { LiveBoard } from '../ui/screens/LiveBoard';

export function App() {
  const t = useT();
  const route = useRoute();
  const resumedRef = useRef(false);
  const ready = useGame((s) => s.ready);
  const game = useGame((s) => s.game);
  const error = useGame((s) => s.error);
  const init = useGame((s) => s.init);
  const checkTime = useGame((s) => s.checkTime);
  const clearError = useGame((s) => s.clearError);
  const lang = useSettings((s) => s.settings.language);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker
  } = useRegisterSW();

  useEffect(() => {
    void init();
  }, [init]);

  // resume an unfinished game when the app opens on the home route
  useEffect(() => {
    if (!ready || resumedRef.current) return;
    resumedRef.current = true;
    if (!game || route.name !== 'home') return;
    navigate(game.status === 'finishedPending' ? 'final' : game.activeTurn?.started ? 'turn' : 'handover', true);
  }, [ready, game, route.name]);

  // time-limited games: check the clock once a second
  useEffect(() => {
    if (game?.endCondition.type !== 'time') return;
    const id = setInterval(async () => {
      const ended = await checkTime(Date.now());
      if (ended) {
        beep();
        navigate('final');
      }
    }, 1000);
    return () => clearInterval(id);
  }, [game?.endCondition.type, game?.id, checkTime]);

  const active = !!game && game.status !== 'finishedPending' && game.status !== 'archived';
  useEffect(() => {
    void keepAwake(active);
  }, [active]);
  useEffect(() => {
    document.title = 'Dices with Friends';
    document.documentElement.lang = lang;
  }, [lang]);

  if (!ready) return <div className="screen" aria-busy="true" />;
  const withSide = !!game && active && ['turn', 'handover', 'confirm'].includes(route.name);
  let screen;
  switch (route.name) {
    case 'new':
      screen = <NewGame />;
      break;
    case 'handover':
      screen = <HandOver />;
      break;
    case 'turn':
      screen = <TurnEntry />;
      break;
    case 'confirm':
      screen = <Confirm route={route} />;
      break;
    case 'board':
      screen = <Board />;
      break;
    case 'final':
      screen = <Final />;
      break;
    case 'archive':
      screen = <Archive />;
      break;
    case 'game':
      screen = route.arg ? <GameDetail id={route.arg} fresh={route.sub === 'new'} /> : <Archive />;
      break;
    case 'import':
      screen = <ImportScreen payload={route.arg} />;
      break;
    case 'settings':
      screen = <Settings />;
      break;
    case 'stats':
      screen = <Stats />;
      break;
    default:
      screen = <Home />;
  }
  return (
    <>
      {error && (
        <div className="banner banner-bad sticky" role="alert">
          <strong>{t('error.storage')}</strong>
          <span className="row gap">
            {error.retry && (
              <button type="button" className="btn btn-outline small-btn" onClick={() => error.retry?.().then(clearError)}>
                {t('error.retry')}
              </button>
            )}
            {game && (
              <button type="button" className="btn btn-outline small-btn" onClick={() => exportCurrentGame(game)}>
                {t('error.export')}
              </button>
            )}
          </span>
        </div>
      )}
      {needRefresh && !game?.activeTurn?.started && (
        <div className="banner sticky" role="status">
          {t('pwa.update')}
          <button type="button" className="btn btn-primary small-btn" onClick={() => updateServiceWorker(true)}>
            {t('pwa.reload')}
          </button>
          <button type="button" className="icon-btn" aria-label={t('common.close')} onClick={() => setNeedRefresh(false)}>
            ✕
          </button>
        </div>
      )}
      <div className={'frame' + (withSide ? ' has-side' : '')}>
        <div className="frame-main">{screen}</div>
        {withSide && <LiveBoard />}
      </div>
    </>
  );
}
