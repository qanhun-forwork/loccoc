// Usage: node render.mjs stills <outdir> f1 f2 ...   |   node render.mjs film <out.mp4-video-only>
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const [mode, out, ...rest] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--force-color-profile=srgb', '--font-render-hinting=none'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1080 }, deviceScaleFactor: 1 });
await page.goto('file://' + path.join(here, 'index.html'));
await page.evaluate(() => window.ready);
const shot = async f => { await page.evaluate(f => seek(f), f); return page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1080, height: 1080 } }); };
if (mode === 'stills') {
  const fs = await import('node:fs');
  for (const f of rest) fs.writeFileSync(path.join(out, `f${String(f).padStart(3, '0')}.png`), await shot(+f));
} else {
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', '60000/1001', '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let i = 0; i < 720; i++) {
    const buf = await shot(i / 2);
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 60 === 0) console.log(`master frame ${i}/720  f${i / 2}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
}
await browser.close();
