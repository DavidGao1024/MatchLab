/**
 * 下载队徽到本地（零依赖，仅 Node 内置模块）
 *
 * 用途：把 teams.json 里 ESPN 盗链的 logo/logoDark 下载到 public/logos/{id}.png
 * 与 {id}-dark.png，替代 a.espncdn.com 热链。图片为静态资源，可 git add。
 *
 * 用法：node scripts/fetch-logos.js（在 fetch-espn-core.js 改本地路径、数据重生前跑）
 * 幂等：已存在的图会覆盖重下；失败清单打印出来人工处理。
 */
'use strict';

const https = require('https');
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const DATA_ROOT = path.join(__dirname, '..', 'public', 'data');
const LOGO_DIR = path.join(__dirname, '..', 'public', 'logos');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const INTERVAL_MS = 100;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function isPng(buf) {
  return buf && buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
}

function download(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': UA } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        if (redirects >= 3) {
          reject(new Error(`重定向过多: ${url}`));
          return;
        }
        resolve(download(new URL(res.headers.location, url).toString(), redirects + 1));
        return;
      }
      if (res.statusCode >= 400) {
        res.resume();
        resolve({ ok: false, status: res.statusCode });
        return;
      }
      const chunks = [];
      let stream = res;
      const enc = res.headers['content-encoding'];
      if (enc === 'gzip') stream = res.pipe(zlib.createGunzip());
      else if (enc === 'deflate') stream = res.pipe(zlib.createInflate());
      else if (enc === 'br') stream = res.pipe(zlib.createBrotliDecompress());
      stream.on('data', (c) => chunks.push(c));
      stream.on('end', () => resolve({ ok: true, buffer: Buffer.concat(chunks) }));
      stream.on('error', reject);
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error(`超时: ${url}`)));
    req.setTimeout(20000);
  });
}

async function main() {
  const jobs = [];
  const seen = new Set();
  for (const league of fs.readdirSync(DATA_ROOT)) {
    const tf = path.join(DATA_ROOT, league, 'teams.json');
    if (!fs.existsSync(tf)) continue;
    const t = JSON.parse(fs.readFileSync(tf, 'utf8'));
    for (const team of t.teams || []) {
      const id = team.id;
      if (seen.has(id)) continue;
      seen.add(id);
      if (team.logo && team.logo.startsWith('http')) jobs.push({ id, url: team.logo, file: `${id}.png` });
      if (team.logoDark && team.logoDark.startsWith('http')) jobs.push({ id, url: team.logoDark, file: `${id}-dark.png` });
    }
  }

  const failed = [];
  fs.mkdirSync(LOGO_DIR, { recursive: true });
  for (const j of jobs) {
    try {
      const r = await download(j.url);
      if (r.ok && isPng(r.buffer)) {
        fs.writeFileSync(path.join(LOGO_DIR, j.file), r.buffer);
      } else {
        failed.push({ id: j.id, file: j.file, status: r.ok ? `非 PNG(${r.buffer ? r.buffer.length : 0}B)` : r.status });
      }
    } catch (e) {
      failed.push({ id: j.id, file: j.file, status: e.message });
    }
    await sleep(INTERVAL_MS);
  }

  console.log(`队徽成功 ${jobs.length - failed.length}/${jobs.length}（队数 ${seen.size}）`);
  if (failed.length) {
    console.log('失败清单（需人工处理/兜底）：');
    for (const f of failed) console.log(`  ${f.id} ${f.file} -> ${f.status}`);
  } else {
    console.log('全部下载完成。');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});