// Renders public/icon.svg into the PNG icons the manifest needs. Run with: node scripts/make-icons.mjs
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';

const svg = readFileSync('public/icon.svg', 'utf8');
const maskable = svg.replace('<rect width="512" height="512" rx="112" fill="#1D5FD6"/>', '<rect width="512" height="512" fill="#1D5FD6"/>').replace(/<rect x="96".*?<\/g>/s, (m) => `<g transform="translate(256 256) scale(0.78) translate(-256 -256)">${m}</g>`);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage();
const render = async (markup, size, file) => {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<body style="margin:0;background:transparent"><div style="width:${size}px;height:${size}px">${markup.replace('<svg ', `<svg width="${size}" height="${size}" `)}</div></body>`);
  await page.screenshot({ path: file, omitBackground: true });
};
await render(svg, 192, 'public/icon-192.png');
await render(svg, 512, 'public/icon-512.png');
await render(maskable, 512, 'public/icon-maskable-512.png');
await browser.close();
