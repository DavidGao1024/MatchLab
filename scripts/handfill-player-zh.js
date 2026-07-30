/**
 * 手填补丁：把 i18n.ts PLAYER_ZH 手填区同步到 players-zh.json
 *
 * 用途：让测试统计能反映手填补丁；让 zh.json 自身完整（不依赖代码内常量）。
 * 优先级：i18n.ts 加载时 { ...players-zh.json, ...PLAYER_ZH } 手填仍最高。
 *
 * 用法：node scripts/handfill-player-zh.js
 */

const fs = require('fs')
const path = require('path')

const OUT_PATH = path.resolve(__dirname, '..', 'public/data/mappings/players-zh.json')

const HAND_FILL = {
  // 中超外援/归化球员补丁（dongqiudi en_name 用中文拼音或常用简称，与 ESPN displayName 不一致）
  Serginho: '塞尔吉尼奥',
  'Guilherme Ramos': '吉列尔梅-拉莫斯',
  'Fábio Abreu': '法比奥-阿布雷乌',
  'Fabio Abreu': '法比奥-阿布雷乌',
  Dawhan: '达万',
  'Boubacar Konté': '孔特',
  'Aboubacar Konte': '孔特',
  'Chadrac Akolo': '沙德拉克',
  'Jeremy Dudziak': '杜齐亚克',
  'Uroš Spajić': '斯帕伊奇',
  'Uros Spajic': '斯帕伊奇',
  'Saulo Mineiro': '绍洛-米内罗',
  Saulo: '绍洛',
  'Wilson Manafá': '马纳法',
  'Rafael Ratão': '拉斐尔-拉唐',
  'Prince Ampem': '安佩姆',
  'Mateus Vital': '马特乌斯-维塔尔',
  'Óscar Melendo': '梅伦多',
  'Oscar Melendo': '梅伦多',
  'Jaume Grau': '豪梅-格劳',
  'Miguel Campos': '米格尔-坎波斯',
  'Alberto Quiles Piosa': '基莱斯',
  'Alberto Quiles': '基莱斯',
  'Guilherme Schettine': '吉列尔梅-谢蒂内',
  Xadas: '哈达斯',
  'Cristian Salvador': '克里斯蒂安-萨尔瓦多',
  'Aitor Córdoba': '艾托尔-科尔多瓦',
  'Aitor Cordoba': '艾托尔-科尔多瓦',
  'Jhonder Cádiz': '卡迪斯',
  'Jhonder Cadiz': '卡迪斯',
  'Kilian Bevis': '贝维斯',
  'Antoine Leautey': '洛泰',
  'Léo Souza': '莱昂纳多',
  Davidson: '戴维森',
  'Aziz Yakubu': '阿齐兹',
  Cryzan: '克雷桑',
  Crysan: '克雷桑',
  Zeca: '泽卡',
  'Valeri Qazaishvili': '卡扎伊什维利',
  'Felippe Cardoso': '费利佩-卡多索',
  'Marko Tolic': '托利奇',
  'Alexandru Mitriță': '米特里策',
  'Jin-seob Park': '朴镇燮',
  'Lucas Possignolo': '卢卡斯-波西诺洛',
  'Wellington Silva': '韦林顿-席尔瓦',
  'Issa Kallon': '伊萨-卡隆',
  Rômulo: '罗慕洛',
  Romulo: '罗慕洛',
  'Matheus Jussa': '马特乌斯-茹萨',
  'Egor Sorokin': '索罗金',
  'Landry Dimata': '迪马塔',
  'Ibrahim Amadou': '易卜拉欣-阿马杜',
  'Michael Ngadeu': '恩加德乌',
  'Oscar Taty Maritu': '奥斯卡',
  Cléber: '克莱伯',
  Cleber: '克莱伯',
  'Caio Vinicius': '卡约',
  'Alexandru Ioniță': '亚历山德鲁-约尼查',
  'Andrei Burcă': '布尔克',
  'Cephas Malele': '马莱莱',
  'Frank Acheampong': '阿奇姆彭',
  'Nicolae Stanciu': '斯坦丘',
  'Isnik Alimi': '阿利米',
  'Mamadou Traoré': '马马杜-特拉奥雷',
  'Mamadou Traore': '马马杜-特拉奥雷',
  'Nelson Coquenao da Luz': '内尔松-卢斯',
  'Nélson Luz': '内尔松-卢斯',
  'Nelson Luz': '内尔松-卢斯',
  'Samir Memisevic': '梅米舍维奇',
  'Bruno Viana': '布鲁诺-维亚纳',
  'Guy Mbenza': '居伊-姆本扎',
  Jeffinho: '热菲尼奥',
  'Takahiro Kunimoto': '邦本宜裕',
  Felipe: '费利佩',
  'Pavle Vagic': '瓦吉奇',
  'Wesley Moraes': '韦斯利',
  'Deabeas Owusu-Sekyere': '迪比斯-奥乌苏',
  'Albion Ademi': '阿尔比恩-阿代米',
  'Eden Karzev': '卡尔采夫',
  'Gabriel Xavier': '加布里埃尔-沙维尔',
  'Gustavo Sauer': '古斯塔沃-绍尔',
  'Adriano Firmino': '阿德里亚诺-菲尔米诺',
  Adriano: '阿德里亚诺',
  Cristian: '克里斯蒂安-萨尔瓦多',
  'Makhtar Gueye': '盖伊',
  Gabrielzinho: '加布里埃尔',
  'João Carlos Teixeira': '若昂-特谢拉',
  'Pedro Álvaro': '佩德罗-阿尔瓦罗',
  'Guilherme Madruga': '马德鲁加',
  'Saúl Guarirapa': '瓜里拉帕',
  'Maranhão': '佩德罗-马拉尼昂',
  'Lucas Maia': '卢卡斯-马亚',
  'Iago Maidana': '雅各-迈达纳',
  'Bruno Nazário': '紒萨里奥',
  'Felipe Silva': '费利佩',
  'Alexandru Cîmpanu': '肯帕努',
  'Alexandru Cimpanu': '肯帕努',
  'Chen Wai': '陈威',
  'Yang Xi': '杨希',
  'Kodjo Jean Claude Aziangbe': '让-克劳德',
  'Abraham Halik': '阿布拉汗-哈力克',
  'Ablahan Haliq': '阿布拉汗-哈力克',
  'Lucas Varone': '卢卡斯-马亚',
  'Nebijan Muhmet': '乃比江-莫合买提',
  'Nebijan Moxmet': '乃比江-莫合买提',
  Leonardo: '莱昂纳多',
  'John Hou Saeter': '侯永永',
  'Lü Zhuoyi': '吕焯毅',
  'Lyu Zhuoyi': '吕焯毅',
  'Zhao Hongli': '赵宏略',
  'Zhao Honglue': '赵宏略',
  'Maiwulang Mijiti': '买乌郎-米吉提',
  'Mewlan Mijit': '买乌郎-米吉提',
  'Yan Yiming': '杨一鸣',
  'Yang Yiming': '杨一鸣',
  'George Alexandru Cimpanu': '肯帕努',
  'Yeerjieti Yeerzhati': '叶尔杰提-叶尔扎提',
  'Yeerjieti Yeerzati': '叶尔杰提-叶尔扎提',
  'Denny Wang Yi': '王毅',
  'Denny Wang': '王毅',
  'Luis Nlavo': '路易斯-阿苏埃',
  'Luis Asué': '路易斯-阿苏埃',
  'Luis Asue': '路易斯-阿苏埃',
  'Andrei Radu': '伊翁努特-拉杜',
  'Ionuț Radu': '伊翁努特-拉杜',
  'Ionut Radu': '伊翁努特-拉杜',
  'Urko Gonzalez': '乌尔科-冈萨雷斯',
  'Urko González de Zárate': '乌尔科-冈萨雷斯',
  'Urko Gonzalez de Zárate': '乌尔科-冈萨雷斯',
  'Jonny Otto': '洪尼-奥托',
  'Mariano Díaz': '马里亚诺-迪亚斯',
  'Mariano Diaz': '马里亚诺-迪亚斯',
  'Álex Calatrava': '卡拉特拉瓦',
  'Alex Calatrava': '卡拉特拉瓦',
  Cala: '卡拉特拉瓦',
  Jonny: '洪尼-奥托',
  Mariano: '马里亚诺-迪亚斯',
  "Etienne Eto'O Pineda": '艾蒂安-埃托奥',
  "Etienne Eto'o": '艾蒂安-埃托奥',
  'Enrique Salas': '基克-萨拉斯',
  'Kike Salas': '基克-萨拉斯',
  'Etta Eyong': '埃永',
  'Karl Etta Eyong': '埃永',
  'Adrián de la Fuente': '阿德里安-德拉富恩特',
  'Adrián Dela': '阿德里安-德拉富恩特',
  'Adrian Dela': '阿德里安-德拉富恩特',
  'Unai Elgezabel': '埃尔格萨瓦尔',
  'Enrique Barja': '巴尔哈',
  'Kike Barja': '巴尔哈',
  'José Antonio Morente': '莫伦特',
  'Tete Morente': '莫伦特',
  'Yago Alonso': '亚戈-圣地亚哥',
  'Yago Santiago': '亚戈-圣地亚哥',
  'Daniel Mikolajewski': '米科瓦耶夫斯基',
  'Daniel Mikołajewski': '米科瓦耶夫斯基',
  'Enrico Del Prato': '德尔普拉托',
  'Enrico Delprato': '德尔普拉托',
  'Mikael Ellertsson': '埃勒特松',
  'Mikael Egill Ellertsson': '埃勒特松',
  'Sani Suleiman': '萨尼-苏莱曼',
  'Suleman Sani': '萨尼-苏莱曼',
  'Berkay Yilmaz': '贝尔卡伊-伊尔马兹',
  'Berkay Yılmaz': '贝尔卡伊-伊尔马兹',
  'Dmytro Bohdanov': '博格达诺夫',
  'Dmytro Bogdanov': '博格达诺夫',
  'Tom Krauss': '克劳斯',
  'Tom Krauß': '克劳斯',
  'Kouakou Gadou': '加杜',
  'Joane Gadou': '加杜',
  'Ifechukwu Ogbus': '布鲁诺-奥布斯',
  'Bruno Ogbus': '布鲁诺-奥布斯',
  'Aron Donnum': '多努姆',
  'Aron Dønnum': '多努姆',
  'Ali Almusrat': '阿里-优素福',
  'Ali Youssif': '阿里-优素福',
  'Urie-Michel Mboula': '姆布拉',
  'Michel Mboula': '姆布拉',
}

function main() {
  const data = JSON.parse(fs.readFileSync(OUT_PATH, 'utf8'))
  const players = data.players || {}
  const before = Object.keys(players).length

  let added = 0
  for (const [k, v] of Object.entries(HAND_FILL)) {
    if (players[k] !== v) { players[k] = v; added++ }
  }
  // 展开 shortName 变体
  for (const [name, cn] of Object.entries(HAND_FILL)) {
    const parts = name.split(/\s+/)
    if (parts.length >= 2) {
      const first = parts[0]
      const rest = parts.slice(1).join(' ')
      const shorts = [`${first.charAt(0)}. ${rest}`, `${first.charAt(0)} ${rest}`]
      for (const s of shorts) if (players[s] !== cn) { players[s] = cn; added++ }
    }
  }

  const after = Object.keys(players).length
  data.players = players
  data._totalKeys = after
  data._generated = new Date().toISOString().slice(0, 10)
  data._source = '懂球帝球队阵容 + 球员详情页 (ESPN 英文 ↔ 懂球帝中文) + 反序/去重音后处理 + 中超外援手填'
  fs.writeFileSync(OUT_PATH, JSON.stringify(data, null, 2))
  console.log(`手填补丁同步：${added} 条更新（${before} → ${after}）`)
}

main()
