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
import { buildSalaryTable } from '../src/lib/salary.ts'
import { buildGlossaryIndex } from '../src/lib/glossaryIndex.ts'

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
    if (c.operatorIntro?.length) {
      html += `<h2 class="mt-6 text-lg font-bold text-slate-900">운영자 소개</h2>`
      html += c.operatorIntro.map((p) => `<p class="mt-3">${esc(p)}</p>`).join('')
    }

    if (c.verification) {
      html += `<h2 class="mt-6 text-lg font-bold text-slate-900">계산 기준</h2>`
      html += `<ul class="mt-2 list-disc pl-5">`
      html += `<li class="mt-1">적용 기준: ${esc(c.verification.basis)}</li>`
      html += `<li class="mt-1">마지막 검증: ${esc(c.verification.lastVerified)}</li>`
      if (c.sources?.length) {
        html += `<li class="mt-1">공식 자료: ${esc(c.sources.map((s) => s.label).join(' / '))}</li>`
      }
      html += `<li class="mt-1">계산 대상: ${esc(c.verification.scope)}</li>`
      html += `<li class="mt-1">제외 사항: ${esc(c.verification.excludes)}</li>`
      html += `</ul>`
    }

    html += c.intro.map((p) => `<p class="mt-3">${esc(p)}</p>`).join('')

    if (c.steps?.length) {
      html += `<h2 class="mt-6 text-lg font-bold text-slate-900">검증 5단계</h2>`
      html += `<ol class="mt-2 list-decimal pl-5">`
      html += c.steps
        .map((s) => `<li class="mt-1"><b>${esc(s.title)}</b> — ${esc(s.desc)}</li>`)
        .join('')
      html += `</ol>`
    }

    if (c.corrections?.length) {
      html += `<h2 class="mt-6 text-lg font-bold text-slate-900">실제 오류 발견·수정 사례</h2>`
      html += c.corrections
        .map(
          (item) =>
            `<h3 class="mt-3 font-semibold text-slate-800">${esc(item.title)}</h3><p class="mt-1">${esc(item.desc)}</p>`,
        )
        .join('')
    }

    if (c.formula) {
      html += `<h2 class="mt-6 text-lg font-bold text-slate-900">${esc(c.formula.title)}</h2>`
      html += `<ol class="mt-2 list-decimal pl-5">`
      html += c.formula.steps
        .map((s) => `<li class="mt-1">${esc(s.replace(/^\d+\.\s+/, ''))}</li>`)
        .join('')
      html += `</ol>`
    }

    if (c.glossary?.length) {
      html += `<h2 class="mt-6 text-lg font-bold text-slate-900">용어 설명</h2>`
      html += c.glossary
        .map(
          (g) =>
            `<h3 class="mt-3 font-semibold text-slate-800">${esc(g.term)}</h3><p class="mt-1">${esc(g.definition)}</p>`,
        )
        .join('')
    }

    if (c.examples?.length) {
      html += `<h2 class="mt-6 text-lg font-bold text-slate-900">숫자로 보는 예시</h2>`
      html += c.examples
        .map(
          (ex) =>
            `<h3 class="mt-3 font-semibold text-slate-800">${esc(ex.title)}</h3><p class="mt-1">${esc(ex.result)}</p>`,
        )
        .join('')
    }

    if (c.faqs?.length) {
      html += `<h2 class="mt-6 text-lg font-bold text-slate-900">자주 묻는 질문</h2>`
      html += c.faqs
        .map(
          (f) =>
            `<h3 class="mt-3 font-semibold text-slate-800">${esc(f.q)}</h3><p class="mt-1">${esc(f.a)}</p>`,
        )
        .join('')
    }

    if (c.sources?.length) {
      html += `<h2 class="mt-6 text-lg font-bold text-slate-900">참고 자료</h2>`
      html += `<ul class="mt-2 list-disc pl-5">`
      html += c.sources
        .map((s) => `<li class="mt-1"><a href="${esc(s.url)}">${esc(s.label)}</a></li>`)
        .join('')
      html += `</ul>`
    }
  }

  if (route.id === 'guidesIndex') {
    const guideRoutes = routes.filter((r) => r.group === '가이드' && r.id !== 'guidesIndex')
    html += `<h2 class="mt-6 text-lg font-bold text-slate-900">전체 가이드</h2>`
    html += `<ul class="mt-2 list-disc pl-5">`
    html += guideRoutes
      .map(
        (r) =>
          `<li class="mt-1"><a href="${urlOf(r.path)}">${esc(r.label)}</a> — ${esc(r.description)}</li>`,
      )
      .join('')
    html += `</ul>`
  }

  if (route.id === 'salaryTable') {
    const rows = buildSalaryTable()
    const won = (n) => n.toLocaleString('ko-KR')
    html += `<h2 class="mt-6 text-lg font-bold text-slate-900">연봉대별 월 실수령액표</h2>`
    html += `<table class="mt-2 w-full text-sm"><thead><tr>`
    html += `<th>연봉</th><th>월급(세전)</th><th>국민연금(1인 가구 기준)</th><th>건강보험(1인 가구 기준)</th><th>고용보험(1인 가구 기준)</th><th>소득세(1인 가구 기준)</th><th>공제 합계(1인 가구 기준)</th><th>월 실수령액(1인)</th><th>월 실수령액(2인)</th><th>월 실수령액(3인)</th><th>월 실수령액(4인+)</th>`
    html += `</tr></thead><tbody>`
    html += rows
      .map(
        (r) =>
          `<tr><td>${won(r.annualSalary)}</td><td>${won(r.monthlyGross)}</td><td>-${won(r.pension)}</td><td>-${won(r.health)}</td><td>-${won(r.employment)}</td><td>-${won(r.incomeTaxTotal)}</td><td>-${won(r.totalDeduction)}</td><td>${won(r.net[0])}</td><td>${won(r.net[1])}</td><td>${won(r.net[2])}</td><td>${won(r.net[3])}</td></tr>`,
      )
      .join('')
    html += `</tbody></table>`
  }

  if (route.id === 'glossaryHub') {
    const entries = buildGlossaryIndex(routes)
    html += `<h2 class="mt-6 text-lg font-bold text-slate-900">전체 용어 (${entries.length}개)</h2>`
    html += `<dl class="mt-2">`
    html += entries
      .map((e) => {
        const defs = e.definitions
          .map(
            (d) =>
              `<p class="mt-1">${esc(d.text)} — 관련: ${d.sources
                .map((s) => `<a href="${urlOf(s.path)}">${esc(s.label)}</a>`)
                .join(', ')}</p>`,
          )
          .join('')
        return `<dt class="mt-3 font-semibold text-slate-800">${esc(e.term)}</dt>${defs}`
      })
      .join('')
    html += `</dl>`
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

