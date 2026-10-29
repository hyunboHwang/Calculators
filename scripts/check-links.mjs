// dist/**/index.html 의 내부 href가 dist(또는 public 자산)에 대응 파일이 있는지 검사
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'

const dist = new URL('../dist', import.meta.url).pathname
if (!existsSync(dist)) {
  console.error('dist 없음 — npm run build 먼저')
  process.exit(1)
}
const walk = (d) =>
  readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(d, e.name)) : e.name === 'index.html' ? [join(d, e.name)] : [],
  )
const fails = []
for (const file of walk(dist)) {
  const html = readFileSync(file, 'utf8')
  for (const [, raw] of html.matchAll(/<a\s[^>]*?href="([^"]*)"/g)) {
    if (/^(https?:|\/\/|mailto:|tel:|#)/.test(raw) || !raw) continue
    const p = raw.split(/[?#]/)[0].replace(/&amp;/g, '&')
    if (!p) continue
    const target = join(dist, p)
    const ok = p.endsWith('/') || !/\.[a-z0-9]+$/i.test(p)
      ? existsSync(join(target, 'index.html'))
      : existsSync(target) && statSync(target).isFile()
    if (!ok) fails.push(`${file.replace(dist, '')}: ${raw}`)
  }
}
if (fails.length) {
  console.error(`깨진 내부 링크 ${fails.length}건\n` + [...new Set(fails)].join('\n'))
  process.exit(1)
}
console.log('OK — 내부 링크 정상')
