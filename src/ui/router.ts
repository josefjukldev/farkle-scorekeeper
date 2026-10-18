import { useEffect, useState } from 'react';

export interface Route {
  name: string;
  arg?: string;
  sub?: string;
}

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  return { name: parts[0] ?? 'home', arg: parts[1], sub: parts[2] };
}

export function navigate(path: string, replace = false): void {
  const target = '#/' + path.replace(/^\//, '');
  if (replace) history.replaceState(null, '', target);
  else location.hash = target;
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(location.hash));
  useEffect(() => {
    const on = () => setRoute(parseHash(location.hash));
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}
