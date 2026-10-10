import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from './server.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const output = join(root, 'output');
await mkdir(output, { recursive: true });

const server = await startServer(4173);
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1600, height: 900 },
    deviceScaleFactor: 1
  });
  const page = await context.newPage();
  const shotNames = new Set(['hero','validation','mm01','material-created','mm02-complete','batch-complete','impact']);
  let shotIndex = 0;
  await page.exposeFunction('onDemoMarker', async (marker) => {
    if (!shotNames.has(marker)) return;
    shotIndex += 1;
    const prefix = String(shotIndex).padStart(2, '0');
    await page.screenshot({ path: join(output, `${prefix}-${marker}.png`), fullPage: false });
  });
  await page.exposeFunction('onDemoComplete', () => {});
  await page.goto('http://127.0.0.1:4173/?director=1&capture=1&speed=0.82', { waitUntil: 'networkidle' });
  const layout = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight
  }));
  if (layout.scrollWidth > layout.innerWidth + 2 || layout.scrollHeight > layout.innerHeight + 2) {
    throw new Error(`Capture layout overflow: viewport ${layout.innerWidth}x${layout.innerHeight}, document ${layout.scrollWidth}x${layout.scrollHeight}`);
  }
  console.log(`Viewport verified: ${layout.innerWidth}x${layout.innerHeight} - no scrolling required`);
  await page.waitForFunction(() => window.__demoComplete === true, null, { timeout: 60000 });
  await page.waitForTimeout(450);
  await page.close();
  await context.close();
  console.log(`Screenshot capture complete: ${shotIndex} image(s) saved to output/`);
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
