/**
 * 后处理脚本：对 players-zh.json 补反序 + 去重音变体
 *
 * 背景：旧版 expandNameVariants 只展开原序（"Mikel Arteta" + "M. Arteta" + "M Arteta"），
 * 但中国/韩国球员 dongqiudi en_name 用中国序"姓 名"（如 "Fu Huan"），
 * ESPN displayName 用西方序"名 姓"（如 "Huan Fu"），原表无法匹配。
 * 另外 dongqiudi 含音标写法（如 "Antonín Kinský"）而 ESPN 简化（如 "Antonín Kinsky"），
 * 需补去重音版 key。
 *
 * 此脚本遍历已有 zh.json，识别"完整名"key（首词 ≥2 字符、非 "X." 形式），
 * 为每个补反序 + 反序短名 + 去重音版变体。幂等：多次跑结果一致。
 *
 * 用法：node scripts/augment-player-zh.js
 */

const fs = require('fs')
const path = require('path')

const OUT_PATH = path.resolve(__dirname, '..', 'public/data/mappings/players-zh.json')
const deAcc = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')

/** 判断 key 是否为完整名（不是短名变体） */
function isFullName(key) {
  const parts = key.split(/\s+/)
  if (parts.length < 2) return false
  // 首词是单字母（"M Arteta"）或带点首字母（"M. Arteta"）→ 短名变体，跳过
  if (parts[0].length === 1) return false
  if (/^[A-Za-z]\.$/.test(parts[0])) return false
  return true
}

function main() {
  const data = JSON.parse(fs.readFileSync(OUT_PATH, 'utf8'))
  const players = data.players || {}
  const before = Object.keys(players).length

  // 收集所有完整名 key（先收集再修改，避免迭代时新增 key 干扰）
  const fullNames = Object.keys(players).filter(isFullName)
  console.log(`完整名 key: ${fullNames.length} / 总 ${before}`)

  let added = 0
  const tryAdd = (k, v) => { if (!(k in players)) { players[k] = v; added++ } }

  for (const name of fullNames) {
    const cn = players[name]
    const parts = name.split(/\s+/)
    if (parts.length < 2) continue
    const first = parts[0]
    const rest = parts.slice(1).join(' ')

    // 反序 + 反序短名
    tryAdd(`${rest} ${first}`, cn)
    tryAdd(`${rest.charAt(0)}. ${first}`, cn)
    tryAdd(`${rest.charAt(0)} ${first}`, cn)

    // 去重音版（完整 + 短名 + 反序）
    const dName = deAcc(name)
    if (dName !== name) {
      tryAdd(dName, cn)
      const dFirst = deAcc(first)
      const dRest = deAcc(rest)
      tryAdd(`${dFirst.charAt(0)}. ${dRest}`, cn)
      tryAdd(`${dRest} ${dFirst}`, cn)
      tryAdd(`${dRest.charAt(0)}. ${dFirst}`, cn)
    }
  }

  const after = Object.keys(players).length
  data.players = players
  data._totalKeys = after
  data._generated = new Date().toISOString().slice(0, 10)
  data._source = '懂球帝球队阵容 + 球员详情页 (ESPN 英文 ↔ 懂球帝中文) + 反序/去重音后处理'
  fs.writeFileSync(OUT_PATH, JSON.stringify(data, null, 2))
  console.log(`新增 ${added} 个变体（${before} → ${after}）`)
}

main()
