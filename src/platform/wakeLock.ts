type Sentinel = { release: () => Promise<void> };
let sentinel: Sentinel | null = null;

export async function keepAwake(on: boolean): Promise<void> {
  try {
    if (!on) {
      await sentinel?.release();
      sentinel = null;
      return;
    }
    const wl = (navigator as unknown as { wakeLock?: { request: (t: 'screen') => Promise<Sentinel> } }).wakeLock;
    if (wl && !sentinel) sentinel = await wl.request('screen');
  } catch {
    sentinel = null;
  }
}
