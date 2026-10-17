export interface Position { lat: number; lon: number; accuracyM?: number }

/** One user-triggered lookup. Resolves undefined on denial, timeout or missing API. */
export function getPosition(timeoutMs = 6000): Promise<Position | undefined> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return resolve(undefined);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude, accuracyM: p.coords.accuracy }),
      () => resolve(undefined),
      { timeout: timeoutMs, maximumAge: 60000 }
    );
  });
}
