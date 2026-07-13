/**
 * 빌드 후처리 — SEO용 정적 페이지 생성
 *
 * 1. 각 라우트마다 dist/<경로>/index.html 생성 (title/description/canonical/og 치환)
 *    → 어떤 정적 호스팅에서도 /salary/ 같은 URL이 직접 열리고 크롤링됨
 * 2. dist/sitemap.xml, dist/robots.txt 생성
 *
 * ⚠️ 배포 도메인이 정해지면 아래 SITE_URL만 바꾸면 됩니다.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { pageContent } from '../src/lib/pageContent.js'

const SITE_URL = 'https://www.calculators.ai.kr'

const dist = new URL('../dist', import.meta.url).pathname
const routes = JSON.parse(
  readFileSync(new URL('../src/routes.json', import.meta.url), 'utf8'),
)
const template = readFileSync(join(dist, 'index.html'), 'utf8')

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

const urlOf = (path) => (path === '/' ? '/' : `${path}/`)

/**
 * JS 미실행 크롤러용 프리렌더 본문.
 * React가 마운트되면 즉시 교체되므로 사용자에게는 거의 보이지 않습니다.
 */
function prerenderBody(route) {
  const c = pageContent[route.id]
  const h1 = route.title.split(' | ')[0]

  let html = `<div class="mx-auto max-w-3xl px-4 py-8 text-sm leading-relaxed text-slate-600">`
  html += `<h1 class="text-2xl font-bold text-slate-900">${esc(h1)}</h1>`
  html += `<p class="mt-2">${esc(route.description)}</p>`

  if (c) {
    html += c.intro.map((p) => `<p class="mt-3">${esc(p)}</p>`).join('')
    if (c.faqs?.length) {
      html += `<h2 class="mt-6 text-lg font-bold text-slate-900">자주 묻는 질문</h2>`
      html += c.faqs
        .map(
          (f) =>
            `<h3 class="mt-3 font-semibold text-slate-800">${esc(f.q)}</h3><p class="mt-1">${esc(f.a)}</p>`,
        )
        .join('')
    }
  }

  // 내부 링크 (크롤러의 페이지 발견용)
  html += `<nav class="mt-8 text-xs" aria-label="전체 계산기">`
  html += routes
    .map((r) => `<a href="${urlOf(r.path)}">${esc(r.label)}</a>`)
    .join(' · ')
  html += `</nav></div>`
  return html
}

// meta 태그가 여러 줄로 포맷팅된 경우 대비: 개행 포함 매칭
function renderHead(html, route) {
  const url = SITE_URL + (route.path === '/' ? '/' : `${route.path}/`)
  return html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(route.title)}</title>`)
    .replace(
      /(<meta[\s\n]+name="description"[\s\n]+content=")[^"]*(")/,
      `$1${esc(route.description)}$2`,
    )
    .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`)
    .replace(
      /(<meta property="og:title" content=")[^"]*(")/,
      `$1${esc(route.title)}$2`,
    )
    .replace(
      /(<meta[\s\n]+property="og:description"[\s\n]+content=")[^"]*(")/,
      `$1${esc(route.description)}$2`,
    )
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${url}$2`)
}

for (const route of routes) {
  const html = renderHead(template, route).replace(
    '<div id="root"></div>',
    `<div id="root">${prerenderBody(route)}</div>`,
  )
  if (route.path === '/') {
    writeFileSync(join(dist, 'index.html'), html)
  } else {
    const dir = join(dist, route.path.slice(1))
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'index.html'), html)
  }
  console.log(`✓ ${route.path === '/' ? '/' : route.path + '/'}index.html`)
}

// sitemap.xml
const today = new Date().toISOString().slice(0, 10)
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
  .map((r) => {
    const url = SITE_URL + (r.path === '/' ? '/' : `${r.path}/`)
    return `  <url>\n    <loc>${url}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>monthly</changefreq>\n  </url>`
  })
  .join('\n')}
</urlset>
`
writeFileSync(join(dist, 'sitemap.xml'), sitemap)
console.log('✓ sitemap.xml')

// robots.txt
writeFileSync(
  join(dist, 'robots.txt'),
  `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`,
)
console.log('✓ robots.txt')

