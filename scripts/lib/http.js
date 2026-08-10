/**
 * 通用 HTTPS 请求库（零依赖：仅 Node 内置模块 https/zlib/fs）
 *
 * 能力：
 *   - UA 伪装 + gzip/deflate/br 自动解压
 *   - 网络错误 / 5xx / 429 自动重试（指数退避），4xx 不重试
 *   - writeJsonIfChanged：数据无变化不写盘 → git diff 为空 → 工作流「数据无变化不 commit」
 *
 * 项目约定：请求间隔 ≥200ms（调用方用 sleep 控制）
 */
'use strict';

const https = require('https');
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

/**
 * curl 风格 UA（2026-08-10 救火实测结论）：ESPN site.api 的 Akamai 反爬会拦
 * 「服务器 IP + 浏览器 UA」组合返回 403，但放行诚实的 curl UA。
 * 凡是服务端抓 site.api 的调用（scoreboard）一律传 { ua: UA_CURL }。
 */
const UA_CURL = 'curl/8.5.0';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function httpRequest(url, opts = {}) {
  const {
    method = 'GET',
    headers = {},
    body = null,
    timeout = 20000,
    retries = 3,
    retryDelayMs = 2000,
    ua = UA, // 覆盖默认 UA（site.api 服务端抓取需传 UA_CURL，见常量注释）
  } = opts;

  const attempt = () => new Promise((resolve, reject) => {
    const u = new URL(url);
    const reqHeaders = {
      'User-Agent': ua,
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      ...headers,
    };
    if (body) {
      reqHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
      reqHeaders['Content-Length'] = Buffer.byteLength(body);
    }

    const req = https.request(
      {
        hostname: u.hostname,
        path: u.pathname + u.search,
        method,
        timeout,
        headers: reqHeaders,
      },
      (res) => {
        if (res.statusCode >= 500 || res.statusCode === 429) {
          res.resume();
          reject(Object.assign(new Error(`HTTP ${res.statusCode} for ${url}`), { statusCode: res.statusCode, retryable: true }));
          return;
        }
        if (res.statusCode >= 400) {
          res.resume();
          reject(Object.assign(new Error(`HTTP ${res.statusCode} for ${url}`), { statusCode: res.statusCode, retryable: false }));
          return;
        }
        const chunks = [];
        let stream = res;
        const enc = res.headers['content-encoding'];
        if (enc === 'gzip') stream = res.pipe(zlib.createGunzip());
        else if (enc === 'deflate') stream = res.pipe(zlib.createInflate());
        else if (enc === 'br') stream = res.pipe(zlib.createBrotliDecompress());
        stream.on('data', (c) => chunks.push(c));
        stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        stream.on('error', reject);
      }
    );
    req.on('timeout', () => {
      req.destroy();
      reject(Object.assign(new Error(`请求超时: ${url}`), { retryable: true }));
    });
    req.on('error', (e) => {
      e.retryable = true;
      reject(e);
    });
    if (body) req.write(body);
    req.end();
  });

  return (async () => {
    let lastErr;
    for (let i = 0; i <= retries; i += 1) {
      try {
        return await attempt();
      } catch (e) {
        lastErr = e;
        if (!e.retryable || i === retries) break;
        await sleep(retryDelayMs * (i + 1));
      }
    }
    throw lastErr;
  })();
}

async function fetchJson(url, opts) {
  const text = await httpRequest(url, opts);
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(`JSON 解析失败 (${url}): ${text.slice(0, 200)}`);
  }
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const text = `${JSON.stringify(data, null, 2)}\n`;
  fs.writeFileSync(filePath, text, 'utf8');
  return text.length;
}

/**
 * 稳定序列化：键排序 + 忽略 updateTime 字段。
 * 用于比较「业务数据」是否变化（抓取时间戳每次都变，不参与比较）。
 */
function stableStringify(obj) {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return `[${obj.map(stableStringify).join(',')}]`;
  return `{${Object.keys(obj)
    .filter((k) => k !== 'updateTime')
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
    .join(',')}}`;
}

/**
 * 数据无变化则不写盘（保持旧文件与旧 updateTime 不动）。
 * @returns {boolean} 是否写入了新数据
 */
function writeJsonIfChanged(filePath, data) {
  if (fs.existsSync(filePath)) {
    try {
      const old = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (stableStringify(old) === stableStringify(data)) return false;
    } catch (e) {
      // 旧文件损坏 → 直接覆盖
    }
  }
  writeJson(filePath, data);
  return true;
}

module.exports = { UA, UA_CURL, sleep, httpRequest, fetchJson, writeJson, writeJsonIfChanged };
