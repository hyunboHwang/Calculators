/**
 * README.md의 "## 계산기 목록" 표를 src/routes.json 기준으로 재생성.
 * routes.json이 바뀔 때마다(계산기 추가/삭제/이름 변경) 실행되어 README를 최신 상태로 유지.
 */
import { readFileSync, writeFileSync } from 'node:fs'

const rootUrl = (p) => new URL(p, import.meta.url)
const GROUP_ORDER = JSON.parse(readFileSync(rootUrl('../src/groups.json'), 'utf8'))
const routes = JSON.parse(readFileSync(rootUrl('../src/routes.json'), 'utf8'))
const readmePath = rootUrl('../README.md')
const readme = readFileSync(readmePath, 'utf8')

const calculators = routes.filter((r) => GROUP_ORDER.includes(r.group))

const rows = GROUP_ORDER.flatMap((group) =>
  calculators
    .filter((r) => r.group === group)
    .map((r) => {
      const path = r.path === '/' ? '/' : `${r.path}/`
      return `| ${group} | ${r.label} | \`${path}\` |`
    }),
)

const section = [
  `## 계산기 목록 (${rows.length}개)`,
  '',
  '| 그룹 | 계산기 | 경로 |',
  '|---|---|---|',
  ...rows,
].join('\n')

const updated = readme.replace(
  /## 계산기 목록 \(\d+개\)\n\n\|.*?\n\|---.*?\n(?:\|.*\n?)*/s,
  `${section}\n`,
)

if (updated === readme) {
  console.log('update-readme: 계산기 목록 섹션을 찾지 못했거나 변경 사항이 없습니다.')
} else {
  writeFileSync(readmePath, updated)
  console.log(`update-readme: README.md 계산기 목록을 ${rows.length}개로 갱신했습니다.`)
}
