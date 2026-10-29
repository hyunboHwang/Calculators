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
import { tablesFor } from '../src/lib/tables.ts'

// topics.ts는 JSON import(Vite 전용)라 postbuild에서는 fs로 직접 읽는다
const topics = JSON.parse(readFileSync(new URL('../src/topics.json', import.meta.url), 'utf8'))

const popularLinks = JSON.parse(
  readFileSync(new URL('../src/popularLinks.json', import.meta.url), 'utf8'),
)

const lifeIds = ['age', 'celebration', 'insuranceAge', 'pensionAge', 'dday', 'dateCalc', 'discharge', 'dueDate', 'bmi', 'generalCalculator'] // src/lib/topics.ts LIFE_IDS와 동일

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
  if (route.group === '주제') {
    html += `<nav aria-label="현재 위치" class="text-xs text-muted"><a href="/">홈</a> › ${esc(route.label)}</nav>`
  }
  html += `<h1 class="text-2xl font-bold text-slate-900">${esc(h1)}</h1>`
  html += `<p class="mt-2">${esc(route.description)}</p>`
  if (c?.updatedAt) {
    html += `<p class="mt-1 text-xs">최종 업데이트: ${esc(c.updatedAt.replaceAll('-', '. '))}.</p>`
    if (route.group !== '주제') html += `<p class="mt-1 text-xs">작성·운영: 계산기 운영자(1인 개발자) · <a href="/about/">운영자 소개</a> · <a href="/verification/">검증 방식</a></p>`
  }

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

    for (const t of tablesFor(route.id)) {
      html += `<h2 class="mt-6 text-lg font-bold text-slate-900">${esc(t.title)}</h2>`
      html += `<table class="mt-2 w-full text-sm"><thead><tr>${t.headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>`
      html += t.rows.map((row) => `<tr>${row.map((cell) => `<td>${esc(String(cell))}</td>`).join('')}</tr>`).join('')
      html += `</tbody></table>`
      if (t.note) html += `<p class="mt-1 text-xs">${esc(t.note)}</p>`
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

    if (c.changelog?.length) {
      html += `<h2 class="mt-6 text-lg font-bold text-slate-900">변경 이력</h2>`
      html += `<ul class="mt-2 list-disc pl-5">`
      html += c.changelog.map((l) => `<li class="mt-1">${esc(l.date)} — ${esc(l.text)}</li>`).join('')
      html += `</ul>`
    }

    if (c.sources?.length) {
      html += `<h2 class="mt-6 text-lg font-bold text-slate-900">참고 자료</h2>`
      html += `<ul class="mt-2 list-disc pl-5">`
      html += c.sources
        .map((s) => `<li class="mt-1"><a href="${esc(s.url)}">${esc(s.label)}</a></li>`)
        .join('')
      html += `</ul>`
    }

    if (c.relatedGuides?.length) {
      html += `<h2 class="mt-6 text-lg font-bold text-slate-900">관련 가이드</h2>`
      html += `<ul class="mt-2 list-disc pl-5">`
      html += c.relatedGuides
        .map((g) => `<li class="mt-1"><a href="${urlOf(g.path)}">${esc(g.label)}</a></li>`)
        .join('')
      html += `</ul>`
    }

    if (c.relatedCalculators?.length) {
      html += `<h2 class="mt-6 text-lg font-bold text-slate-900">관련 계산기</h2>`
      html += `<ul class="mt-2 list-disc pl-5">`
      html += c.relatedCalculators
        .map((cal) => `<li class="mt-1"><a href="${urlOf(cal.path)}">${esc(cal.label)}</a></li>`)
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

  const H2 = 'mt-8 font-serif text-xl font-bold text-ink'
  const link = (r) => `<a href="${urlOf(r.path)}">${esc(r.label)}</a>`
  const topicStats = (t) => {
    const members = t.members.flatMap((id) => routes.find((r) => r.id === id) ?? [])
    const guides = members.filter((r) => r.group === '가이드')
    return { members, guides, calcs: members.filter((r) => r.group !== '가이드') }
  }
  const operatorLine = `<a href="/about/">운영자 소개</a> · <a href="/verification/">계산기 검증 방식</a>`

  if (route.group === '주제') {
    const topic = topics.find((t) => t.path === route.path)
    if (topic) {
      const { guides, calcs } = topicStats(topic)
      if (guides.length) {
        html += `<h2 class="${H2}">이 주제의 가이드</h2><ul class="mt-2 list-disc pl-5">`
        html += guides
          .map((g) => {
            const u = pageContent[g.id]?.updatedAt
            return `<li class="mt-1">${link(g)} — ${esc(g.description)}${u ? ` (최종 업데이트 ${esc(u.replaceAll('-', '. '))}.)` : ''}</li>`
          })
          .join('')
        html += `</ul>`
      }
      if (calcs.length) {
        html += `<h2 class="${H2}">이 주제의 계산기</h2><ul class="mt-2 list-disc pl-5">`
        html += calcs.map((r) => `<li class="mt-1">${link(r)} — ${esc(r.description)}</li>`).join('')
        html += `</ul>`
      }
      html += `<nav class="mt-6 text-sm" aria-label="다른 주제"><b>다른 주제</b> `
      html += topics.filter((t) => t.id !== topic.id).map((t) => `<a href="${urlOf(t.path)}">${esc(t.label)}</a>`).join(' · ')
      html += `</nav><p class="mt-3 text-xs">작성·운영: 계산기 운영자(1인 개발자) · ${operatorLine}</p>`
    }
  }

  if (route.id === 'home') {
    html += `<h2 class="${H2}">주제별로 보기</h2><ol class="mt-2 list-decimal pl-5">`
    html += topics
      .map((t) => {
        const { guides, calcs } = topicStats(t)
        const parts = [guides.length && `가이드 ${guides.length}`, calcs.length && `계산기 ${calcs.length}`].filter(Boolean)
        const counts = parts.length ? ` (${parts.join(' · ')})` : ''
        return `<li class="mt-1"><a href="${urlOf(t.path)}">${esc(t.label)}</a> — ${esc(t.summary)}${counts}</li>`
      })
      .join('')
    html += `</ol><p class="mt-2"><a href="/guides/">가이드 전체 보기</a></p>`
    const recent = routes
      .filter((r) => r.group === '가이드')
      .flatMap((r) => (pageContent[r.id]?.changelog ?? []).map((l) => ({ ...l, r })))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5)
    if (recent.length) {
      html += `<h2 class="${H2}">최근 업데이트된 가이드</h2><ul class="mt-2 list-disc pl-5">`
      html += recent.map((u) => `<li class="mt-1">${esc(u.date)} ${link(u.r)} — ${esc(u.text)}</li>`).join('')
      html += `</ul>`
    }
    html += `<h2 class="${H2}">많이 쓰는 계산기</h2><ul class="mt-2 list-disc pl-5">`
    html += popularLinks.calculators
      .flatMap((id) => routes.find((r) => r.id === id) ?? [])
      .map((r) => `<li class="mt-1">${link(r)}</li>`)
      .join('')
    html += `</ul><h2 class="${H2}">운영자와 검증 방식</h2><p class="mt-2">1인 개발자가 직접 만들고 운영합니다. 계산 기준은 공식기관 자료로 확인하고, 실제 사례와 대조하며, 기준이 바뀌면 수정 이력을 남깁니다. ${operatorLine}</p>`
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

  // 내부 링크 — 전체 라우트를 나열하지 않고, 실제로 연관 있는 같은 카테고리
  // 계산기만 남깁니다(가이드/정보/용어사전은 그룹 규모가 다르거나 이미 자체
  // relatedGuides/relatedCalculators로 연결되어 있어 제외).
  if (!['가이드', '정보', '용어사전', '주제'].includes(route.group)) {
    const siblings = routes.filter((r) => r.group === route.group && r.id !== route.id)
    if (siblings.length > 0) {
      html += `<h2 class="mt-6 text-lg font-bold text-slate-900">${esc(route.group)} 관련 계산기</h2>`
      html += `<nav class="mt-2 text-xs" aria-label="${esc(route.group)} 계산기">`
      html += siblings.map((r) => `<a href="${urlOf(r.path)}">${esc(r.label)}</a>`).join(' · ')
      html += `</nav>`
    }
  }
  // 전 페이지 공통 인기 링크 — 사이트 전체의 내부 링크 허브 (App.tsx 푸터와 같은 목록)
  for (const [title, ids] of [
    ['인기 계산기', popularLinks.calculators],
    ['인기 가이드', popularLinks.guides],
    ['생활 계산기', lifeIds],
  ]) {
    const links = routes.filter((r) => ids.includes(r.id) && r.id !== route.id)
    html += `<nav class="mt-4 text-xs" aria-label="${title}"><b>${title}</b> `
    html += links.map((r) => `<a href="${urlOf(r.path)}">${esc(r.label)}</a>`).join(' · ')
    html += `</nav>`
  }
  html += `</div>`
  return html
}

const NON_CALCULATOR_GROUPS = ['홈', '가이드', '정보', '용어사전', '게임', '주제']

function jsonLdFor(route) {
  const pageUrl = SITE_URL + urlOf(route.path)
  const name = route.title.split(' | ')[0]
  const org = {
    '@type': 'Organization',
    name: '계산기',
    url: `${SITE_URL}/`,
    logo: `${SITE_URL}/favicon.svg`,
  }
  const graph = []
  if (route.path === '/') {
    graph.push({ '@type': 'WebSite', name: '계산기', url: `${SITE_URL}/`, inLanguage: 'ko' }, org)
  } else {
    const crumbs = [{ name: '홈', url: `${SITE_URL}/` }]
    if (route.group === '가이드' && route.id !== 'guidesIndex') {
      crumbs.push({ name: '가이드', url: `${SITE_URL}/guides/` })
    }
    crumbs.push({ name, url: pageUrl })
    if (route.group === '주제') {
      const topic = topics.find((t) => t.path === route.path)
      graph.push({
        '@type': 'CollectionPage',
        name,
        url: pageUrl,
        description: route.description,
        inLanguage: 'ko',
        hasPart: (topic?.members ?? [])
          .flatMap((id) => routes.find((r) => r.id === id && r.group === '가이드') ?? [])
          .map((r) => ({ '@type': 'WebPage', name: r.label, url: SITE_URL + urlOf(r.path) })),
      })
    }
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: crumbs.map((c, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: c.name,
        item: c.url,
      })),
    })
  }
  if (!NON_CALCULATOR_GROUPS.includes(route.group)) {
    graph.push({
      '@type': 'WebApplication',
      name,
      url: pageUrl,
      description: route.description,
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Web',
      inLanguage: 'ko',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    })
  }
  const updatedAt = pageContent[route.id]?.updatedAt
  if (route.group === '가이드' && updatedAt) {
    graph.push({
      '@type': 'Article',
      headline: name,
      description: route.description,
      inLanguage: 'ko',
      mainEntityOfPage: pageUrl,
      dateModified: updatedAt,
      author: { '@type': 'Organization', name: '계산기 운영자', url: `${SITE_URL}/about/` },
      publisher: org,
    })
  }
  const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })
  return `<script type="application/ld+json">${json.replace(/</g, '\\u003c')}</script>`
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
    .replace(
      /(<meta name="robots" content=")[^"]*(")/,
      route.noindex ? '$1noindex,follow$2' : '$1index,follow$2',
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
    .replace('</head>', `${jsonLdFor(route)}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${prerenderBody(route)}</div>`)
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
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
  .filter((r) => !r.noindex)
  .map((r) => {
    const url = SITE_URL + (r.path === '/' ? '/' : `${r.path}/`)
    const c = pageContent[r.id]
    const lastmod = c?.updatedAt ?? c?.verification?.lastVerified
    return `  <url>\n    <loc>${url}</loc>\n${lastmod ? `    <lastmod>${lastmod}</lastmod>\n` : ''}  </url>`
  })
  .join('\n')}
</urlset>
`
writeFileSync(join(dist, 'sitemap.xml'), sitemap)
console.log('✓ sitemap.xml')

// 404.html — 앱 번들 없이 정적으로, 색인 제외
writeFileSync(
  join(dist, '404.html'),
  `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex" />
    <title>페이지를 찾을 수 없습니다 | 계산기</title>
  </head>
  <body style="font-family:system-ui,sans-serif;max-width:32rem;margin:4rem auto;padding:0 1rem;line-height:1.7">
    <h1>페이지를 찾을 수 없습니다</h1>
    <p>주소가 바뀌었거나 존재하지 않는 페이지입니다.</p>
    <p><a href="/">계산기 홈</a> · <a href="/guides/">가이드</a> · <a href="/salary/">연봉 실수령액 계산기</a></p>
  </body>
</html>
`,
)
console.log('✓ 404.html')

// robots.txt
writeFileSync(
  join(dist, 'robots.txt'),
  `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`,
)
console.log('✓ robots.txt')

