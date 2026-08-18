/**
 * 下载国旗 PNG 到本地（零依赖，仅 Node 内置模块）
 *
 * 用途：把 flag-map.js 里用到的所有国旗从 flagcdn 下载到 public/flags/{iso2}.png，
 * 替代 ESPN 盗链。const 图片为静态资源（非抓取数据），可 git add。
 *
 * 用法：node scripts/fetch-flags.js
 * 幂等：已存在的图会覆盖重下；失败清单打印出来人工处理。
 */
'use strict';

const https = require('https');
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const { FLAG_MAP } = require('./lib/flag-map');

const FLAG_DIR = path.join(__dirname, '..', 'public', 'flags');
const BASE = 'https://flagcdn.com/w80/';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const INTERVAL_MS = 100;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// PNG 签名校验（89 50 4E 47）。简单国旗是 80x53 调色板 PNG，压缩后仅 ~120 字节，
// 不能用字节数阈值判断，用 magic bytes 才准确。
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
  const isos = [...new Set(Object.values(FLAG_MAP))];
  const failed = [];
  fs.mkdirSync(FLAG_DIR, { recursive: true });

  for (const iso of isos) {
    try {
      const r = await download(`${BASE}${iso}.png`);
      if (r.ok && isPng(r.buffer)) {
        fs.writeFileSync(path.join(FLAG_DIR, `${iso}.png`), r.buffer);
      } else {
        failed.push({ iso, status: r.ok ? `非 PNG(${r.buffer ? r.buffer.length : 0}B)` : r.status });
      }
    } catch (e) {
      failed.push({ iso, status: e.message });
    }
    await sleep(INTERVAL_MS);
  }

  console.log(`成功 ${isos.length - failed.length}/${isos.length}`);
  if (failed.length) {
    console.log('失败清单（需人工处理/兜底）：');
    for (const f of failed) console.log(`  ${f.iso} -> ${f.status}`);
  } else {
    console.log('全部下载完成。');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});