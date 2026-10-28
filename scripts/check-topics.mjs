// 모든 가이드·계산기 라우트가 정확히 한 주제에 속하는지 검사. 새 계산기/가이드 추가 시 topics.json 갱신 필요.
import { readFileSync } from 'node:fs'

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'))
const routes = read('../src/routes.json')
const groups = read('../src/groups.json')
let topics
try { topics = read('../src/topics.json') } catch (e) { console.error('FAIL — topics.json 읽기 실패:', e.message); process.exit(1) }

// 주제에 속하지 않는 생활 계산기 10개(도구 패널 전용). routes.json의 group 값 '생활'은 4개뿐이라 id로 지정한다.
const LIFE = ['age','celebration','insuranceAge','pensionAge','dday','dateCalc','discharge','dueDate','bmi','generalCalculator']
const ids = new Set(routes.map((r) => r.id))
const guides = routes.filter((r) => r.group === '가이드' && r.id !== 'guidesIndex').map((r) => r.id)
const calcs = routes.filter((r) => groups.includes(r.group) && r.group !== '용어사전' && !LIFE.includes(r.id)).map((r) => r.id)
const expected = [...guides, ...calcs]

const all = topics.flatMap((t) => t.members)
const dup = all.filter((id, i) => all.indexOf(id) !== i)
const unknown = all.filter((id) => !ids.has(id))
const missing = expected.filter((id) => !all.includes(id))
const extra = all.filter((id) => ids.has(id) && !expected.includes(id))
const topicIds = topics.map((t) => t.id).join(' ')

const errs = []
if (topicIds !== 'work tax property support finance') errs.push(`주제 id: ${topicIds}`)
if (dup.length) errs.push(`중복: ${dup}`)
if (unknown.length) errs.push(`routes에 없는 id: ${unknown}`)
if (missing.length) errs.push(`누락: ${missing}`)
if (extra.length) errs.push(`주제 대상이 아닌 id: ${extra}`)
if (errs.length) { console.error('FAIL\n' + errs.join('\n')); process.exit(1) }
console.log(`OK — 주제 ${topics.length}개, 가이드 ${guides.length}, 계산기 ${calcs.length}`)
