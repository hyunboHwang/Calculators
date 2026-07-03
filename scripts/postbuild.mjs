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

const SITE_URL = 'https://calculators-orpin.vercel.app' // 커스텀 도메인 연결 시 변경

const dist = new URL('../dist', import.meta.url).pathname
const routes = JSON.parse(
  readFileSync(new URL('../src/routes.json', import.meta.url), 'utf8'),
)
const template = readFileSync(join(dist, 'index.html'), 'utf8')

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

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
  const html = renderHead(template, route)
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

