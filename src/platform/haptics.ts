let enabled = true;
export const setHaptics = (on: boolean) => { enabled = on; };

type Kind = 'tick' | 'bust' | 'bank';
const PATTERNS: Record<Kind, number | number[]> = { tick: 12, bust: [60, 40, 60], bank: [20, 30, 40] };

export function haptic(kind: Kind): void {
  if (!enabled || typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  try { navigator.vibrate(PATTERNS[kind]); } catch { /* ignored */ }
}

let soundOn = false;
export const setSound = (on: boolean) => { soundOn = on; };

export function beep(): void {
  if (!soundOn || typeof AudioContext === 'undefined') return;
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    osc.frequency.value = 880;
    osc.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch { /* ignored */ }
}
