import { useAppStore } from '../stores/app'
import { useTeamsStore } from '../stores/teams'
import { isLeagueSlug, type LeagueSlug } from '../utils/constants'

const inFlight = new Map<LeagueSlug, Promise<void>>()

/**
 * 加载顺序契约核心：幂等 + 同一联赛并发调用复用在途请求。
 * App.vue 与各页面视图 setup 里都先 await 它（深链安全，规格 §五）。
 */
export async function ensureLeague(slug: string): Promise<LeagueSlug> {
  if (!isLeagueSlug(slug)) throw new Error(`invalid league slug: ${slug}`)
  useAppStore().setLeague(slug)
  let p = inFlight.get(slug)
  if (!p) {
    p = useTeamsStore()
      .ensure(slug)
      .then(() => undefined)
      .finally(() => inFlight.delete(slug))
    inFlight.set(slug, p)
  }
  await p
  return slug
}
