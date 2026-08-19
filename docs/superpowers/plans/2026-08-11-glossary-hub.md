# 용어사전(Glossary Hub) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 이 사이트의 계산기·가이드 52개 페이지에 흩어진 226개 고유 용어 설명을 가나다순으로 재구성한 통합 용어사전 페이지 `/glossary`를 추가한다.

**Architecture:** 새 함수 `buildGlossaryIndex()`(`src/lib/glossaryIndex.ts`)가 기존 `pageContent.js`의 모든 `glossary` 배열을 순회해 용어별로 집계·정렬한다. 이 함수를 React 페이지(`GlossaryPage.tsx`)와 빌드 후처리 스크립트(`scripts/postbuild.mjs`)가 각각 import해서 동일한 데이터로 화면용 사전과 크롤러용 정적 HTML을 만든다. 새로운 용어 설명은 조사하지 않고, 이미 검증된 텍스트만 재구성한다.

**Tech Stack:** React 19 + TypeScript, Tailwind CSS, Node 24 네이티브 TypeScript 실행(postbuild.mjs가 `.ts` 파일을 직접 import).

**Spec:** `docs/superpowers/specs/2026-08-11-glossary-hub-design.md`

## Global Constraints

- Vitest 등 테스트 프레임워크는 도입하지 않는다 — 검증은 수동 실행 스크립트와 `npx tsc -b --noEmit && npm run build && npm run lint`로 한다.
- 같은 용어가 여러 페이지에서 **동일한 정의**로 등장하면 하나로 합치고 모든 출처를 나열한다. **정의가 실제로 다르면**(문맥별 의미 차이) 합치지 않고 각각 별도 정의로 보여주며 출처를 함께 표시한다.
- 새 그룹 `"용어사전"`을 `groups.json`에 추가해 사이드바에 독립 노출한다("가이드" 그룹에 넣지 않는 이유: `App.tsx`가 `route.group !== '가이드'`인 라우트에만 `<InfoSection>`을 자동 렌더링하기 때문).
- 초성 점프 네비게이션, 카테고리 분류는 넣지 않는다(YAGNI) — 검색창과 "관련 계산기/가이드" 링크로 대체한다.

---

### Task 1: `buildGlossaryIndex()` 데이터 함수

**Files:**
- Create: `src/lib/glossaryIndex.ts`

**Interfaces:**
- Consumes: `pageContent`(`src/lib/pageContent.js`)의 각 항목의 `glossary?: {term, definition}[]`, `routes`(`src/routes.json`)의 `{id, label, path}`.
- Produces: `export interface GlossarySource { id: string; label: string; path: string }`, `export interface GlossaryDefinition { text: string; sources: GlossarySource[] }`, `export interface GlossaryEntry { term: string; definitions: GlossaryDefinition[] }`, `export function buildGlossaryIndex(): GlossaryEntry[]` — Task 2(페이지)와 Task 4(postbuild)가 이 세 타입과 함수를 import해서 쓴다.

- [ ] **Step 1: `src/lib/glossaryIndex.ts` 새 파일 작성**

```ts
import { pageContent } from './pageContent'
import routes from '../routes.json'

interface GlossaryContentEntry {
  glossary?: { term: string; definition: string }[]
}

const content = pageContent as Record<string, GlossaryContentEntry>

export interface GlossarySource {
  id: string
  label: string
  path: string
}

export interface GlossaryDefinition {
  text: string
  sources: GlossarySource[]
}

export interface GlossaryEntry {
  term: string
  definitions: GlossaryDefinition[]
}

/**
 * 모든 계산기·가이드 페이지의 glossary 항목을 용어 기준으로 집계한다.
 * 같은 용어·같은 정의는 하나로 합치고 출처를 모두 모은다. 같은 용어라도
 * 정의 텍스트가 다르면(문맥별 의미 차이) 별도 정의로 분리해 보존한다.
 */
export function buildGlossaryIndex(): GlossaryEntry[] {
  // term -> definition text -> sources
  const byTerm = new Map<string, Map<string, GlossarySource[]>>()

  for (const [id, c] of Object.entries(content)) {
    if (!c.glossary || c.glossary.length === 0) continue
    const route = routes.find((r) => r.id === id)
    if (!route) continue
    const source: GlossarySource = { id, label: route.label, path: route.path }

    for (const g of c.glossary) {
      if (!byTerm.has(g.term)) byTerm.set(g.term, new Map())
      const defMap = byTerm.get(g.term)!
      if (!defMap.has(g.definition)) defMap.set(g.definition, [])
      defMap.get(g.definition)!.push(source)
    }
  }

  const entries: GlossaryEntry[] = [...byTerm.entries()].map(([term, defMap]) => ({
    term,
    definitions: [...defMap.entries()].map(([text, sources]) => ({ text, sources })),
  }))

  entries.sort((a, b) => a.term.localeCompare(b.term, 'ko'))
  return entries
}
```

- [ ] **Step 2: 총 항목 수·고유 용어 수를 조사 결과와 대조 검증**

```bash
node --input-type=module -e "
import { buildGlossaryIndex } from '/Users/hwanghyeonbo/persnal_project/calculator/src/lib/glossaryIndex.ts'
const entries = buildGlossaryIndex()
const totalDefs = entries.reduce((s, e) => s + e.definitions.length, 0)
const totalSources = entries.reduce((s, e) => s + e.definitions.reduce((s2, d) => s2 + d.sources.length, 0), 0)
console.log('고유 용어 수:', entries.length, '(기대값 226)')
console.log('총 (용어,정의) 조합 수:', totalDefs)
console.log('총 source 링크 수(raw glossary 항목 수와 같아야 함):', totalSources, '(기대값 257)')
"
```

기대 결과: 고유 용어 수 226, 총 source 링크 수 257(브레인스토밍 단계에서 확인한 raw glossary 항목 수와 정확히 일치해야 함 — 항목이 중복 집계되거나 누락되지 않았다는 뜻).

- [ ] **Step 3: 정의가 여러 개로 분리된 용어("과세표준") 확인**

```bash
node --input-type=module -e "
import { buildGlossaryIndex } from '/Users/hwanghyeonbo/persnal_project/calculator/src/lib/glossaryIndex.ts'
const entries = buildGlossaryIndex()
const multi = entries.filter(e => e.definitions.length > 1)
console.log('정의가 여러 개인 용어 수:', multi.length, '(기대값 18)')
const tb = entries.find(e => e.term === '과세표준')
console.log('과세표준 정의 개수:', tb.definitions.length, '(기대값 3)')
console.log(tb.definitions.map(d => ({ text: d.text.slice(0, 20), sources: d.sources.map(s => s.id) })))
"
```

기대 결과: 정의가 여러 개인 용어 18개, "과세표준"은 정의 3개(salary/freelanceTax/propertyTax 각각 출처).

- [ ] **Step 4: `npx tsc -b --noEmit`로 타입 오류 없는지 확인**

```bash
cd /Users/hwanghyeonbo/persnal_project/calculator && npx tsc -b --noEmit
```

- [ ] **Step 5: 커밋**

```bash
git add src/lib/glossaryIndex.ts
git commit -m "feat: 용어사전 데이터 함수 buildGlossaryIndex 추가"
```

---

### Task 2: 페이지 컴포넌트 + 라우팅 등록

**Files:**
- Create: `src/pages/GlossaryPage.tsx`
- Modify: `src/routes.json` (`holdingTaxGuide` 항목 바로 뒤, `about` 항목 앞에 삽입)
- Modify: `src/groups.json` (배열 끝에 `"용어사전"` 추가)
- Modify: `src/App.tsx` (lazy import 레지스트리에 한 줄 추가)

**Interfaces:**
- Consumes: Task 1의 `buildGlossaryIndex`, `GlossaryEntry` (from `../lib/glossaryIndex`).
- Produces: 라우트 `id: "glossaryHub"`, `path: "/glossary"`, `group: "용어사전"` — Task 3(콘텐츠)이 `pageContent.js`에서 이 id로 항목을 찾는다.

- [ ] **Step 1: `src/groups.json`을 다음으로 교체**

```json
["주식", "직장인", "나이", "대출", "날짜", "셀러", "부동산", "자동차", "생활", "용어사전"]
```

- [ ] **Step 2: `src/routes.json`에서 `"id": "holdingTaxGuide"` 항목이 끝나는 지점(다음이 `about` 항목) 바로 앞에 삽입**

```json
  {
    "id": "glossaryHub",
    "path": "/glossary",
    "label": "용어사전",
    "group": "용어사전",
    "title": "금융·세금·정책 용어사전 — 계산기 226개 용어 총정리 | 계산기",
    "description": "연봉·세금·대출·부동산·정부지원금 계산기와 가이드에서 검증한 용어 226개를 가나다순으로 모았습니다. 용어를 검색하고 관련 계산기·가이드로 바로 이동하세요."
  },
```

- [ ] **Step 3: `src/App.tsx`의 lazy import 레지스트리에서 `holdingTaxGuide: lazy(...)` 줄 바로 아래(또는 `about: lazy(...)` 줄 바로 위)에 추가**

```ts
  glossaryHub: lazy(() => import('./pages/GlossaryPage')),
```

- [ ] **Step 4: `src/pages/GlossaryPage.tsx` 새 파일 작성**

```tsx
import { useMemo, useState } from 'react'
import { buildGlossaryIndex } from '../lib/glossaryIndex'

export default function GlossaryPage() {
  const entries = useMemo(() => buildGlossaryIndex(), [])
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return entries
    return entries.filter(
      (e) =>
        e.term.toLowerCase().includes(q) ||
        e.definitions.some((d) => d.text.toLowerCase().includes(q)),
    )
  }, [entries, query])

  return (
    <div>
      <h1 className="text-2xl font-bold">용어사전</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        이 사이트의 계산기·가이드에서 검증한 용어 설명 {entries.length}개를 가나다순으로
        모았습니다. 각 용어 아래 링크로 관련 계산기·가이드를 바로 확인할 수 있습니다.
      </p>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="용어 검색 (예: 공정시장가액비율, 간이세액표)"
        className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
      />

      {filtered.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">일치하는 용어가 없습니다.</p>
      ) : (
        <dl className="mt-6 space-y-5">
          {filtered.map((e) => (
            <div
              key={e.term}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <dt className="text-base font-semibold text-slate-800">{e.term}</dt>
              {e.definitions.map((d, i) => (
                <dd key={i} className="mt-2">
                  <p className="text-sm leading-relaxed text-slate-600">{d.text}</p>
                  <p className="mt-1.5 text-xs text-slate-400">
                    관련:{' '}
                    {d.sources.map((s, si) => (
                      <span key={s.id}>
                        {si > 0 && ', '}
                        <a
                          href={`${s.path}/`}
                          className="text-emerald-700 underline decoration-emerald-300 underline-offset-2 hover:text-emerald-800"
                        >
                          {s.label}
                        </a>
                      </span>
                    ))}
                  </p>
                </dd>
              ))}
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}
```

- [ ] **Step 5: 빌드 확인**

```bash
cd /Users/hwanghyeonbo/persnal_project/calculator
npx tsc -b --noEmit && npm run build 2>&1 | grep -i glossary
```
`✓ /glossary/index.html`가 출력되는지 확인한다.

- [ ] **Step 6: 린트 확인**

```bash
npm run lint 2>&1 | grep -i glossary || echo "no glossary lint issues"
```

- [ ] **Step 7: 커밋**

```bash
git add src/pages/GlossaryPage.tsx src/routes.json src/groups.json src/App.tsx
git commit -m "feat: 용어사전 페이지(/glossary) 추가"
```

---

### Task 3: 콘텐츠(pageContent.js) — 소개문·FAQ

**Files:**
- Modify: `src/lib/pageContent.js` (`holdingTaxGuide` 항목이 끝나는 지점, `privacy` 항목 앞에 삽입)

**Interfaces:**
- Consumes: 없음(정적 콘텐츠).
- Produces: `pageContent.glossaryHub` — `App.tsx`가 `group !== '가이드'`인 라우트에 자동 렌더링하는 `<InfoSection pageId="glossaryHub" />`가 이 항목의 `intro`/`faqs`를 읽는다.

- [ ] **Step 1: `src/lib/pageContent.js`에서 `holdingTaxGuide: { ... }` 항목이 끝나는 지점(다음이 `about:` 항목) 바로 앞에 삽입**

```js
  glossaryHub: {
    intro: [
      '이 용어사전은 이 사이트의 계산기·가이드 226개 용어 설명을 가나다순으로 모은 것입니다. 새로 조사한 내용이 아니라, 각 계산기·가이드 페이지에서 이미 검증해 사용 중인 설명을 그대로 재구성했습니다.',
      '같은 용어가 여러 계산기에서 똑같이 설명되면 하나로 합쳐 관련 페이지를 모두 링크했고, 문맥에 따라 정의가 실제로 다른 용어(예: "과세표준"은 연봉·프리랜서·재산세에서 각각 다른 의미)는 억지로 합치지 않고 정의별로 따로 보여줍니다.',
    ],
    faqs: [
      { q: '이 용어사전은 어떻게 만들어졌나요?', a: '이 사이트의 모든 계산기·가이드 페이지 하단 "용어 설명" 섹션에 이미 있는 내용을 자동으로 모아 가나다순으로 정리한 것입니다. 새로운 용어 설명을 별도로 작성하지 않았으며, 각 계산기·가이드에서 검증된 설명을 그대로 재사용합니다.' },
      { q: '같은 용어인데 정의가 여러 개 나오는 경우가 있는 이유는 무엇인가요?', a: '"과세표준"처럼 계산기마다 실제로 다른 의미로 쓰이는 용어가 있습니다. 억지로 하나의 정의로 합치면 부정확해지므로, 이런 경우는 각 계산기 맥락에 맞는 정의를 모두 따로 보여줍니다.' },
      { q: '찾는 용어가 없어요.', a: '이 용어사전은 이 사이트의 계산기·가이드에 실제로 등장하는 용어만 담고 있습니다. 새 계산기·가이드가 추가되면 그때 사용된 용어도 자동으로 포함됩니다.' },
    ],
  },

```

- [ ] **Step 2: 빌드 후 InfoSection이 자동으로 intro/FAQ를 렌더링하는지 확인**

```bash
cd /Users/hwanghyeonbo/persnal_project/calculator
npx tsc -b --noEmit && npm run build 2>&1 | tail -5
grep -o "이 용어사전은 어떻게 만들어졌나요" dist/glossary/index.html
```
출력이 있으면 정상(자동 InfoSection 렌더링 + postbuild.mjs의 기존 `pageContent[route.id]` 처리 로직이 이미 intro/faqs를 프리렌더링하므로 Task 4 이전에도 이 부분은 보여야 함).

- [ ] **Step 3: 커밋**

```bash
git add src/lib/pageContent.js
git commit -m "docs: 용어사전 소개문·FAQ 콘텐츠 추가"
```

---

### Task 4: postbuild.mjs 크롤러용 사전 프리렌더링 + 최종 검증

**Files:**
- Modify: `scripts/postbuild.mjs`

**Interfaces:**
- Consumes: Task 1의 `buildGlossaryIndex` (from `../src/lib/glossaryIndex.ts`).

- [ ] **Step 1: `scripts/postbuild.mjs` 상단 import에 한 줄 추가** (기존 `import { buildSalaryTable } from '../src/lib/salary.ts'` 바로 아래)

```js
import { buildGlossaryIndex } from '../src/lib/glossaryIndex.ts'
```

- [ ] **Step 2: `prerenderBody()` 함수 안, `if (route.id === 'salaryTable') { ... }` 블록 바로 다음(내부 링크 주석 전)에 아래 블록 추가**

```js
  if (route.id === 'glossaryHub') {
    const entries = buildGlossaryIndex()
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

```

- [ ] **Step 3: 빌드 후 정적 HTML에 226개 용어가 모두 포함됐는지 확인**

```bash
cd /Users/hwanghyeonbo/persnal_project/calculator
npm run build 2>&1 | tail -5
node -e "
const fs = require('fs');
const html = fs.readFileSync('dist/glossary/index.html', 'utf8');
const dtCount = (html.match(/<dt /g) || []).length;
console.log('정적 HTML의 dt(용어) 개수:', dtCount, '(기대값 226)');
const text = html.replace(/<script[\s\S]*?<\/script>/g,'').replace(/<style[\s\S]*?<\/style>/g,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
console.log('텍스트 길이:', text.length);
"
```

기대 결과: `dtCount` 226, 텍스트 길이가 다른 계산기 페이지 평균(약 3,200자)을 크게 웃돎.

- [ ] **Step 4: 전체 검증 스위트 실행**

```bash
cd /Users/hwanghyeonbo/persnal_project/calculator
npx tsc -b --noEmit && npm run build 2>&1 | tail -15 && npm run lint
```

모두 통과해야 하며, 기존 파일들의 `only-export-components` warning 외 새로운 오류가 없어야 한다.

- [ ] **Step 5: sitemap.xml에 새 라우트가 포함됐는지 확인**

```bash
grep -c "glossary" dist/sitemap.xml
```
1 이상이면 정상.

- [ ] **Step 6: 사이드바에 "용어사전" 그룹이 노출되는지 확인**

```bash
grep -o "용어사전" dist/index.html | head -1
```
출력이 있으면 정상(사이드바는 `groups.json`+`routes.json` 기반으로 모든 페이지에 공통 렌더링되므로 어느 페이지에서 확인해도 무방하다).

- [ ] **Step 7: 최종 커밋**

```bash
git add scripts/postbuild.mjs
git commit -m "feat: 용어사전 크롤러용 정적 프리렌더링 추가"
```
