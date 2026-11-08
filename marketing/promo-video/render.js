/**
 * Renders index.html to an MP4, one frame at a time.
 *
 *   node marketing/promo-video/render.js                 -> dashit-promo.mp4 (with music.wav if present)
 *   node marketing/promo-video/render.js --stills 0,300  -> PNG stills in ./stills for checking a frame
 *
 * Needs Playwright's Chromium and ffmpeg. Each frame is drawn by the page's
 * own renderFrame(n), screenshotted, and piped straight into ffmpeg.
 */
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { chromium } = require('playwright');

const here = __dirname;
const arg = name => {
  const i = process.argv.indexOf(name);
  return i === -1 ? null : process.argv[i + 1];
};

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(here, 'index.html') + '?render');
  await page.evaluate(() => window.ready);
  const total = await page.evaluate(() => window.TOTAL_FRAMES);
  const fps = await page.evaluate(() => window.FPS);
  const stage = await page.$('#stage');

  const stills = arg('--stills');
  if (stills) {
    const dir = path.join(here, 'stills');
    fs.mkdirSync(dir, { recursive: true });
    for (const f of stills.split(',').map(Number)) {
      await page.evaluate(n => window.renderFrame(n), f);
      await stage.screenshot({ path: path.join(dir, `f${String(f).padStart(4, '0')}.png`) });
    }
    await browser.close();
    console.log(`stills written to ${dir}`);
    return;
  }

  const out = path.resolve(arg('--out') || path.join(here, 'dashit-promo.mp4'));
  const music = path.join(here, 'music.wav');
  const withAudio = fs.existsSync(music) && !process.argv.includes('--silent');
  const ff = spawn('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
    ...(withAudio ? ['-i', music] : []),
    '-vf', 'scale=out_color_matrix=bt709:out_range=tv',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
    ...(withAudio ? ['-c:a', 'aac', '-b:a', '192k', '-shortest'] : []),
    '-movflags', '+faststart',
    out,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });

  const t0 = Date.now();
  for (let f = 0; f < total; f++) {
    await page.evaluate(n => window.renderFrame(n), f);
    const png = await stage.screenshot({ type: 'png' });
    if (!ff.stdin.write(png)) await new Promise(r => ff.stdin.once('drain', r));
    if (f % 60 === 0) console.log(`frame ${f}/${total}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  await new Promise((res, rej) => ff.on('close', code => (code === 0 ? res() : rej(new Error('ffmpeg exited ' + code)))));
  await browser.close();
  console.log(`wrote ${out} (${total} frames, ${withAudio ? 'with' : 'no'} audio)`);
})().catch(err => { console.error(err); process.exit(1); });
