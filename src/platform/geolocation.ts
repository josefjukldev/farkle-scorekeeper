export interface Position { lat: number; lon: number; accuracyM?: number }

/** One user-triggered lookup. Resolves undefined on denial, timeout or missing API. */
export function getPosition(timeoutMs = 6000): Promise<Position | undefined> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return resolve(undefined);
    // a permission prompt that is ignored never calls back, so enforce the timeout ourselves
    const timer = setTimeout(() => resolve(undefined), timeoutMs + 500);
    const done = (p: Position | undefined) => { clearTimeout(timer); resolve(p); };
    navigator.geolocation.getCurrentPosition(
      (p) => done({ lat: p.coords.latitude, lon: p.coords.longitude, accuracyM: p.coords.accuracy }),
      () => done(undefined),
      { timeout: timeoutMs, maximumAge: 60000 }
    );
  });
}
