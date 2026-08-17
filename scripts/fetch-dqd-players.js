/**
 * 从懂球帝抓取球员中英文名对照表
 *
 * 流程：
 *   1. 对每个 team_id 调 roster API 拿球员列表（含中文 person_name + person_id）
 *   2. 对每个球员拉详情页 HTML，从 NUXT 提取 person_en_name
 *   3. 输出 { "Mikel Arteta": "阿尔特塔", "E. Haaland": "哈兰德", ... }
 *
 * 用法：
 *   node scripts/fetch-dqd-players.js                          # 默认：英超全 20 队
 *   node scripts/fetch-dqd-players.js --laliga                 # 西甲全 20 队
 *   node scripts/fetch-dqd-players.js --epl --laliga --seriea --bundesliga --ligue1  # 多联赛批量
 *   node scripts/fetch-dqd-players.js --csl                    # 中超全 16 队
 *   node scripts/fetch-dqd-players.js 50000513                 # 单队测试
 *
 * 输出：public/data/mappings/players-zh.json （合并已有）
 */

const https = require('https')
const http = require('http')
const fs = require('fs')
const path = require('path')

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
const REFERER_BASE = 'https://www.dongqiudi.com/'

const ROOT = path.resolve(__dirname, '..')
const OUT_PATH = path.join(ROOT, 'public/data/mappings/players-zh.json')
const OUT_NAT_PATH = path.join(ROOT, 'public/data/mappings/players-nationality.json')
const TEAMS_PATH = path.join(ROOT, 'public/data/eng.1/teams.json')

// 五大联赛 + 中超的 dongqiudi season_id（2026-25 赛季，实测 2026-07-30）
// 用 standing API 批量探查 season_id 候选范围（24590–24670 / 26300–26340）锁定
const LEAGUE_SEASON = {
  eng: 24646, // 英超（阿森纳/曼城/曼联）
  esp: 24651, // 西甲（巴萨/皇马/比利亚雷亚尔）
  ita: 24596, // 意甲（国米/那不勒斯/罗马）
  ger: 24648, // 德甲（拜仁/多特/RB莱比锡）
  fra: 24652, // 法甲（巴黎/朗斯/里尔）
  chn: 26322, // 中超（成都蓉城/重庆铜梁龙/云南玉昆）
}

/** 通用 GET，返回字符串（自动 gzip 解压） */
function get(url, referer = REFERER_BASE) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': UA,
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Accept-Encoding': 'gzip, deflate',
        'Referer': referer,
      },
    }, (res) => {
      if (res.statusCode !== 200) {
        res.resume()
        reject(new Error(`HTTP ${res.statusCode}`))
        return
      }
      const chunks = []
      const encoding = res.headers['content-encoding']
      const raw = res.statusCode === 200 ? res : null
      if (encoding === 'gzip') {
        res.pipe(require('zlib').createGunzip()).on('data', c => chunks.push(c)).on('end', () => resolve(Buffer.concat(chunks).toString('utf8'))).on('error', reject)
      } else if (encoding === 'deflate') {
        res.pipe(require('zlib').createInflate()).on('data', c => chunks.push(c)).on('end', () => resolve(Buffer.concat(chunks).toString('utf8'))).on('error', reject)
      } else {
        res.on('data', c => chunks.push(c)).on('end', () => resolve(Buffer.concat(chunks).toString('utf8'))).on('error', reject)
      }
    }).on('error', reject)
  })
}

/** 拉 roster API，返回球员列表 [{ person_id, person_name, type }] */
async function fetchRoster(teamId) {
  const url = `https://www.dongqiudi.com/sport-data/soccer/biz/dqd/v1/team/member_v2/${teamId}?app=dqd`
  const referer = `https://www.dongqiudi.com/team/${teamId}`
  const text = await get(url, referer)
  const j = JSON.parse(text)
  if (j.code !== 0) throw new Error(`roster API code=${j.code}`)
  // data.list 是分组数组，每组有 type 和 data[]
  const list = j.data?.list ?? []
  const players = []
  for (const group of list) {
    const arr = group.data ?? []
    for (const p of arr) {
      if (p.person_id && p.person_name) {
        players.push({
          person_id: p.person_id,
          person_name: p.person_name,
          type: group.type, // goalkeeper/defender/midfielder/attacker/coach
        })
      }
    }
  }
  return players
}

const vm = require('vm')

/** 从球员详情页 HTML 提取 NUXT 数据里的 person_en_name + person_name
 *  HTML 里 NUXT 是 IIFE：(function(a,b,...){return {data:[{detail:{base_info:{person_en_name:dH,...}}}]}})("v1",...)
 *  变量名混淆，需用 vm 沙箱执行后取 base_info 字段 */
async function fetchPlayerDetail(personId) {
  const url = `https://www.dongqiudi.com/player/${personId}`
  const referer = `https://www.dongqiudi.com/player/${personId}`
  const html = await get(url, referer)
  // 提取 window.__NUXT__=...; 整段
  const nuxtMatch = html.match(/window\.__NUXT__=([\s\S]+?)<\/script>/)
  if (!nuxtMatch) throw new Error('NUXT not found')
  const code = nuxtMatch[1].replace(/;$/, '')
  // 沙箱执行
  const sandbox = { window: {} }
  try {
    vm.createContext(sandbox)
    vm.runInContext(`window.__NUXT__=${code}`, sandbox, { timeout: 5000 })
  } catch (e) {
    throw new Error('NUXT eval failed: ' + e.message)
  }
  const nuxt = sandbox.window.__NUXT__
  const baseInfo = nuxt?.data?.[0]?.detail?.base_info
  if (!baseInfo) throw new Error('base_info not found')
  return {
    enName: baseInfo.person_en_name || '',
    cnName: baseInfo.person_name || '',
    nationality: baseInfo.nationality || '',
  }
}

/** 把英文名扩展成多种格式：完整 + 原序短名 (X. Last / X Last) + 反序 (名 姓) + 反序短名 + 去重音版
 *  反序用于兜底 ESPN 西方序"名 姓"与 dongqiudi 中国序"姓 名"的差异（中国/韩国球员常见）
 *  去重音版用于兜底 ESPN 简化音标写法（如 dongqiudi "Kinský" ↔ ESPN "Kinsky"） */
function expandNameVariants(enName, cnName, out) {
  if (!enName || !cnName) return
  out[enName] = cnName
  const deAccName = enName.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  if (deAccName !== enName) out[deAccName] = cnName
  const parts = enName.split(/\s+/)
  if (parts.length >= 2) {
    const first = parts[0]
    const rest = parts.slice(1).join(' ')
    // 原序短名 "Mikel Arteta" → "M. Arteta" + "M Arteta"
    out[`${first.charAt(0)}. ${rest}`] = cnName
    out[`${first.charAt(0)} ${rest}`] = cnName
    // 反序：dongqiudi 中国序"姓 名" ↔ ESPN 西方序"名 姓"
    // 例如 "Fu Huan" → "Huan Fu"、"H. Fu"、"H Fu"，匹配 ESPN displayName/shortName
    const reversed = `${rest} ${first}`
    out[reversed] = cnName
    out[`${rest.charAt(0)}. ${first}`] = cnName
    out[`${rest.charAt(0)} ${first}`] = cnName
    // 去重音版短名 + 反序短名（兜底 ESPN 不带音标写法）
    if (deAccName !== enName) {
      const dFirst = first.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      const dRest = rest.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      out[`${dFirst.charAt(0)}. ${dRest}`] = cnName
      out[`${dRest} ${dFirst}`] = cnName
      out[`${dRest.charAt(0)}. ${dFirst}`] = cnName
    }
  }
}

/** 主入口
 *  用法：
 *    node scripts/fetch-dqd-players.js                          # 默认：英超全 20 队
 *    node scripts/fetch-dqd-players.js --laliga                  # 西甲全 20 队
 *    node scripts/fetch-dqd-players.js --epl --laliga --seriea --bundesliga --ligue1 --csl  # 全 6 联赛
 *    node scripts/fetch-dqd-players.js 50000513                  # 单队测试
 */
async function main() {
  const args = process.argv.slice(2)
  let teamIds = []

  // 各联赛 season_id（实测 2026-07-30，standing API 探查锁定）
  const LEAGUES = {
    epl:      { name: '英超', seasonId: 24646, ref: 'https://www.dongqiudi.com/' },
    laliga:   { name: '西甲', seasonId: 24651, ref: 'https://www.dongqiudi.com/' },
    seriea:   { name: '意甲', seasonId: 24596, ref: 'https://www.dongqiudi.com/' },
    bundesliga: { name: '德甲', seasonId: 24648, ref: 'https://www.dongqiudi.com/' },
    ligue1:   { name: '法甲', seasonId: 24652, ref: 'https://www.dongqiudi.com/' },
    csl:      { name: '中超', seasonId: 26322, ref: 'https://www.dongqiudi.com/' },
  }

  if (args.length && !args[0].startsWith('--')) {
    teamIds = args
  } else {
    const want = args.filter(a => a.startsWith('--')).map(a => a.slice(2))
    const leagues = want.length ? want : ['epl']
    for (const key of leagues) {
      const league = LEAGUES[key]
      if (!league) {
        console.log(`未知联赛 --${key}，跳过（已知：${Object.keys(LEAGUES).join(', ')}）`)
        continue
      }
      console.log(`拉取 ${league.name} 球队列表 (season_id=${league.seasonId})...`)
      const standingUrl = `https://www.dongqiudi.com/sport-data/soccer/biz/data/standing?season_id=${league.seasonId}&app=dqd&version=850&platform=ios&language=zh-cn`
      const text = await get(standingUrl, league.ref)
      const j = JSON.parse(text)
      const data = j.content?.rounds?.[0]?.content?.data ?? []
      const ids = data.map(t => t.team_id)
      console.log(`  ${league.name} ${ids.length} 队`)
      teamIds.push(...ids)
    }
  }

  console.log(`开始抓取 ${teamIds.length} 个球队的球员译名...`)
  const out = {}
  const natOut = {}
  let processed = 0
  for (const teamId of teamIds) {
    console.log(`[${++processed}/${teamIds.length}] team ${teamId}`)
    let roster
    try {
      roster = await fetchRoster(teamId)
      console.log(`  roster: ${roster.length} 人`)
    } catch (e) {
      console.log(`  roster 失败: ${e.message}`)
      continue
    }
    let pIdx = 0
    for (const p of roster) {
      pIdx++
      try {
        // 200ms 间隔防限流
        await new Promise(r => setTimeout(r, 200))
        const det = await fetchPlayerDetail(p.person_id)
        if (det.enName && det.cnName) {
          expandNameVariants(det.enName, det.cnName, out)
          if (det.nationality) expandNameVariants(det.enName, det.nationality, natOut)
          if (pIdx % 5 === 0) {
            console.log(`  [${pIdx}/${roster.length}] ${det.enName} → ${det.cnName}`)
          }
        }
      } catch (e) {
        console.log(`  [${pIdx}/${roster.length}] ${p.person_id} ${p.person_name} 失败: ${e.message}`)
      }
    }
  }

  // 合并到已有 players-zh.json
  let existing = { players: {} }
  try {
    existing = JSON.parse(fs.readFileSync(OUT_PATH, 'utf8'))
  } catch {}
  const before = Object.keys(existing.players).length
  // 已有优先（手填 > 自动抓）
  const merged = { ...out, ...existing.players }
  const after = Object.keys(merged).length
  existing.players = merged
  existing._generated = new Date().toISOString().slice(0, 10)
  existing._source = '懂球帝球队阵容 + 球员详情页 (ESPN 英文 ↔ 懂球帝中文)'
  existing._totalKeys = after
  fs.writeFileSync(OUT_PATH, JSON.stringify(existing, null, 2))
  let existingNat = { players: {} }
  try { existingNat = JSON.parse(fs.readFileSync(OUT_NAT_PATH, 'utf8')) } catch {}
  const mergedNat = { ...natOut, ...(existingNat.players || {}) }
  fs.writeFileSync(OUT_NAT_PATH, JSON.stringify({
    _generated: new Date().toISOString().slice(0, 10),
    _source: '懂球帝球员详情页 base_info.nationality',
    players: mergedNat,
    _totalKeys: Object.keys(mergedNat).length,
  }, null, 2))
  console.log(`国籍映射：${Object.keys(mergedNat).length} 条 → ${OUT_NAT_PATH}`)
  console.log(`\n抓取完成：新增 ${after - before} 个译名（之前 ${before} 个 → 合并后 ${after} 个）`)
  console.log(`输出：${OUT_PATH}`)
}

main().catch(e => {
  console.error('Fatal:', e)
  process.exit(1)
})
