import { paletteFor } from '../palette';
import type { Game } from '../../storage/types';

export interface ShareLabels {
  title: string;
  dateLine: string;
  place?: string;
  footer: string;
  ranking: { rank: string; name: string; seat: number; score: string; style: string }[];
  awards: { title: string; who: string; detail: string }[];
  headline: string;
}

export type ShareTheme = 'light' | 'dark' | 'colourful';

const THEMES = {
  light: {
    bg: '#F2F4F7',
    surface: '#FFFFFF',
    text: '#111418',
    muted: '#5B636E',
    border: '#D8DDE4',
    primary: '#1D5FD6',
    onPrimary: '#FFFFFF',
    gray: '#6B7480'
  },
  dark: {
    bg: '#14171C',
    surface: '#1E232B',
    text: '#FFFFFF',
    muted: '#A8B0BB',
    border: '#333A44',
    primary: '#5B9BFF',
    onPrimary: '#0B0E12',
    gray: '#3A414C'
  },
  colourful: {
    bg: '#0F3D99',
    surface: '#FFFFFF',
    text: '#111418',
    muted: '#4A525D',
    border: '#C9D6F2',
    primary: '#F2C94C',
    onPrimary: '#111418',
    gray: '#7FB6F5'
  }
} as const;

function shapePath(ctx: CanvasRenderingContext2D, clip: string, x: number, y: number, s: number) {
  ctx.beginPath();
  if (clip.startsWith('circle')) {
    ctx.arc(x + s / 2, y + s / 2, s / 2, 0, Math.PI * 2);
    return;
  }
  if (clip.startsWith('inset')) {
    ctx.roundRect(x + s * 0.06, y + s * 0.06, s * 0.88, s * 0.88, s * 0.2);
    return;
  }
  const pts = [...clip.matchAll(/(-?[\d.]+)%?\s+(-?[\d.]+)%?(?=,|\))/g)].map((m) => [Number(m[1]) / 100, Number(m[2]) / 100]);
  pts.forEach(([px, py], i) => (i ? ctx.lineTo(x + px * s, y + py * s) : ctx.moveTo(x + px * s, y + py * s)));
  ctx.closePath();
}

function badge(ctx: CanvasRenderingContext2D, name: string, seat: number, x: number, y: number, s: number) {
  const p = paletteFor(seat);
  shapePath(ctx, p.shape, x, y, s);
  ctx.fillStyle = p.colour;
  ctx.fill();
  ctx.fillStyle = '#111418';
  ctx.font = `800 ${s * 0.46}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name.trim().charAt(0).toUpperCase(), x + s / 2, y + s / 2 + s * 0.03);
}

function fit(ctx: CanvasRenderingContext2D, text: string, max: number): string {
  if (ctx.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '…').width > max) t = t.slice(0, -1);
  return t + '…';
}

export const SHARE_SIZE = { w: 1080, h: 1350 };

/** Draws the 1080x1350 dashboard. Never includes coordinates; the place label only when passed in. */
export function drawShare(canvas: HTMLCanvasElement, game: Game, L: ShareLabels, themeKey: ShareTheme): void {
  const { w, h } = SHARE_SIZE;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const T = THEMES[themeKey];
  const font = (weight: number, px: number) => `${weight} ${px}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.fillStyle = T.bg;
  ctx.fillRect(0, 0, w, h);

  // brand band
  const bandBg = themeKey === 'colourful' ? '#0A2C73' : T.primary;
  const bandFg = themeKey === 'colourful' ? '#FFFFFF' : T.onPrimary;
  ctx.fillStyle = bandBg;
  ctx.fillRect(0, 0, w, 290);
  ctx.strokeStyle = bandFg;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(66, 48, 44, 44, 10);
  ctx.stroke();
  ctx.fillStyle = bandFg;
  for (const [cx, cy] of [
    [78, 60],
    [98, 60],
    [88, 70],
    [78, 80],
    [98, 80]
  ]) {
    ctx.beginPath();
    ctx.arc(cx, cy, 3.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = font(800, 30);
  ctx.fillText('Dices with Friends', 126, 82);
  ctx.font = font(800, 68);
  ctx.fillText(fit(ctx, L.title, w - 128), 64, 174);
  ctx.font = font(600, 26);
  ctx.globalAlpha = 0.92;
  ctx.fillText(fit(ctx, L.dateLine + (L.place ? ` · ${L.place}` : ''), w - 128), 64, 226);
  ctx.globalAlpha = 1;
  ctx.font = font(700, 26);
  ctx.fillText(fit(ctx, L.headline, w - 128), 64, 266);

  // podium
  const top = L.ranking.filter((r) => r.rank === L.ranking[0].rank || true).slice(0, 3);
  const order = [top[1], top[0], top[2]].filter(Boolean);
  const colW = (w - 128 - 40) / 3;
  const baseY = 650;
  order.forEach((r, i) => {
    const cx = 64 + i * (colW + 20) + colW / 2;
    const place = r === top[0] ? 1 : r === top[1] ? 2 : 3;
    const barH = place === 1 ? 160 : place === 2 ? 120 : 90;
    badge(ctx, r.name, r.seat, cx - 44, baseY - barH - 150, 88);
    ctx.fillStyle = themeKey === 'colourful' ? '#FFFFFF' : T.text;
    ctx.textAlign = 'center';
    ctx.font = font(800, 32);
    ctx.fillText(fit(ctx, r.name, colW - 10), cx, baseY - barH - 28);
    ctx.fillStyle = themeKey === 'colourful' ? '#C9D6F2' : T.muted;
    ctx.font = font(700, 28);
    ctx.fillText(r.score, cx, baseY - barH + 4);
    ctx.fillStyle = place === 1 ? T.primary : T.gray;
    ctx.beginPath();
    ctx.roundRect(cx - colW / 2, baseY - barH + 16, colW, barH - 16, [18, 18, 0, 0]);
    ctx.fill();
    ctx.fillStyle = place === 1 ? T.onPrimary : '#FFFFFF';
    ctx.font = font(800, 52);
    ctx.fillText(r.rank, cx, baseY - barH + 80);
  });

  // ranking list
  const rows = L.ranking.slice(0, 8);
  const rowH = rows.length > 5 ? 60 : 90;
  const listTop = baseY;
  ctx.fillStyle = T.surface;
  ctx.fillRect(64, listTop, w - 128, rows.length * rowH);
  ctx.fillStyle = T.primary;
  ctx.fillRect(64, listTop - 6, w - 128, 6);
  rows.forEach((r, i) => {
    const y = listTop + i * rowH;
    ctx.strokeStyle = T.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(64, y + rowH);
    ctx.lineTo(w - 64, y + rowH);
    ctx.stroke();
    ctx.textAlign = 'left';
    ctx.fillStyle = '#5B636E';
    ctx.font = font(800, 32);
    ctx.fillText(r.rank, 92, y + rowH / 2 + 11);
    const bs = Math.min(56, rowH - 10);
    badge(ctx, r.name, r.seat, 150, y + (rowH - bs) / 2, bs);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#111418';
    ctx.font = font(800, 32);
    ctx.fillText(fit(ctx, r.name, 440), 232, y + rowH / 2 - 2);
    ctx.fillStyle = '#5B636E';
    ctx.font = font(600, 22);
    ctx.fillText(fit(ctx, r.style, 440), 232, y + rowH / 2 + 28);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#111418';
    ctx.font = font(800, 38);
    ctx.fillText(r.score, w - 92, y + rowH / 2 + 13);
  });

  // awards
  const aTop = listTop + rows.length * rowH + 30;
  const aw = (w - 128 - 40) / 3;
  L.awards.slice(0, 3).forEach((a, i) => {
    const x = 64 + i * (aw + 20);
    ctx.fillStyle = T.surface;
    const ah = rows.length > 5 ? 120 : 140;
    ctx.beginPath();
    ctx.roundRect(x, aTop, aw, ah, 18);
    ctx.fill();
    ctx.textAlign = 'left';
    ctx.fillStyle = '#5B636E';
    ctx.font = font(700, 18);
    ctx.fillText(fit(ctx, a.title.toUpperCase(), aw - 36), x + 20, aTop + ah * 0.26);
    ctx.fillStyle = '#111418';
    ctx.font = font(800, 30);
    ctx.fillText(fit(ctx, a.who, aw - 36), x + 20, aTop + ah * 0.57);
    ctx.fillStyle = themeKey === 'dark' ? '#1D5FD6' : '#1D5FD6';
    ctx.font = font(600, 22);
    ctx.fillText(fit(ctx, a.detail, aw - 36), x + 20, aTop + ah * 0.84);
  });

  // footer
  ctx.fillStyle = themeKey === 'colourful' ? '#C9D6F2' : T.muted;
  ctx.font = font(600, 22);
  ctx.textAlign = 'left';
  ctx.fillText(L.footer, 64, h - 40);
  void game;
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('png'))), 'image/png'));
}
