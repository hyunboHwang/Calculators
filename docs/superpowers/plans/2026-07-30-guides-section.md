# 가이드 섹션 신설 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 계산기 도구가 아닌 장문 가이드 콘텐츠 섹션(`/guides`)을 신설한다 — 계산기 확장판 4편 + 정부지원금/청년정책 4편, 총 8편.

**Architecture:** 기존 계산기 인프라(라우팅 `routes.json`, 콘텐츠 스키마 `pageContent.js`+`InfoSection.tsx`, 정적 프리렌더 `postbuild.mjs`)를 재사용한다. 가이드는 `group: "가이드"`로 분류되어 `groups.json`(사이드바 아코디언)에는 절대 노출되지 않고, 별도 `/guides` 목록 페이지 + 사이드바/모바일 상단의 "📖 가이드" 링크로만 접근한다.

**Tech Stack:** React 19, TypeScript, Vite 8, 기존 `InfoSection.tsx`/`pageContent.js` 스키마 재사용, 새 라이브러리 없음.

## Global Constraints

- 테스트 프레임워크 없음 — 검증은 `npx tsc -b --noEmit`, `npm run build`, `npm run lint` + 수동/스크립트 확인.
- 가이드는 `groups.json`에 `"가이드"`를 추가하지 않는다 — 사이드바 아코디언에 노출 금지.
- 가이드 본문은 `src/lib/pageContent.js`에 기존 `PageInfo` 스키마(`intro`/`formula`/`glossary`/`faqs`/`sources`)로 저장한다. 새 스키마 필드 추가 금지.
- 사이드바 상단 링크·모바일 메뉴의 "가이드" 링크는 기존 SPA `navigate`/`handleNavigate`를 재사용해 새로고침 없이 이동한다.
- 가이드 본문 안의 "관련 계산기" 링크와 `/guides` 목록 페이지 안의 개별 글 링크는 일반 `<a href>` 새로고침 링크로 처리한다(각 페이지 컴포넌트가 `navigate` 클로저에 접근할 수 없는 위치이므로).
- 각 가이드 콘텐츠의 사실 관계(금액·자격요건·절차)는 담당 서브에이전트가 실제 진행한 웹 검색 결과를 그대로 반영한 것이며, 임의로 수치를 더하거나 "확인 필요" 문구를 임의로 지우지 않는다 — 이 계획에 적힌 그대로 verbatim 사용한다.

---

## Task 1: `GuideArticlePage.tsx` — 가이드 공용 레이아웃 컴포넌트

**Files:**
- Create: `src/components/GuideArticlePage.tsx`

**Interfaces:**
- Consumes: `routes.json`, `InfoSection` (기존)
- Produces: `GuideArticlePage({ pageId, relatedCalculators? })` — Task 5~12(개별 가이드 페이지)가 이 컴포넌트를 사용한다. `relatedCalculators?: { label: string; path: string }[]`.

- [ ] **Step 1: 파일 생성**

```tsx
import routes from '../routes.json'
import InfoSection from './InfoSection'

interface RelatedCalculator {
  label: string
  path: string
}

export default function GuideArticlePage({
  pageId,
  relatedCalculators,
}: {
  pageId: string
  relatedCalculators?: RelatedCalculator[]
}) {
  const route = routes.find((r) => r.id === pageId)

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold">{route?.label}</h1>
      <InfoSection pageId={pageId} />
      {relatedCalculators && relatedCalculators.length > 0 && (
        <div className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50/40 p-5">
          <h2 className="text-sm font-semibold text-slate-800">관련 계산기</h2>
          <ul className="mt-2 space-y-1">
            {relatedCalculators.map((c) => (
              <li key={c.path}>
                <a
                  href={`${c.path}/`}
                  className="text-sm text-emerald-700 underline decoration-emerald-300 underline-offset-2 hover:text-emerald-800"
                >
                  {c.label} →
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 타입 검증**

Run: `npx tsc -b --noEmit`
Expected: 에러 없음(이 파일을 아직 아무 데서도 import하지 않아 미사용 상태지만, TS는 이를 에러로 취급하지 않음).

- [ ] **Step 3: 커밋**

```bash
git add src/components/GuideArticlePage.tsx
git commit -m "feat: 가이드 공용 레이아웃 컴포넌트 GuideArticlePage 추가"
```

---

## Task 2: `GuidesIndexPage.tsx` — 가이드 목록 페이지

**Files:**
- Create: `src/pages/GuidesIndexPage.tsx`

**Interfaces:**
- Consumes: `routes.json` (Task 3에서 추가될 9개 가이드 라우트를 id로 조회 — 이 컴포넌트는 라우트가 아직 없어도 컴파일은 되고, `routes.find` 결과가 `undefined`인 항목은 필터링됨)
- Produces: `GuidesIndexPage` 컴포넌트 (default export) — Task 3이 `App.tsx`의 `components` 맵에 등록한다.

- [ ] **Step 1: 파일 생성**

```tsx
import routes from '../routes.json'

const TRACK1_IDS = [
  'yearEndTaxProcedureGuide',
  'jeonseDepositRecoveryGuide',
  'severanceInterimGuide',
  'unemploymentApplicationGuide',
]

const TRACK2_IDS = [
  'youthRentSubsidyGuide',
  'youthLeapAccountGuide',
  'youthJeonseLoanGuide',
  'nationalEmploymentSupportGuide',
]

function GuideList({ ids, title }: { ids: string[]; title: string }) {
  const items = ids
    .map((id) => routes.find((r) => r.id === id))
    .filter((r): r is (typeof routes)[number] => Boolean(r))

  if (items.length === 0) return null

  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold">{title}</h2>
      <div className="mt-3 space-y-2">
        {items.map((r) => (
          <a
            key={r.id}
            href={`${r.path}/`}
            className="block rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-emerald-300 hover:bg-emerald-50/30"
          >
            <p className="text-sm font-semibold text-slate-800">{r.label}</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">{r.description}</p>
          </a>
        ))}
      </div>
    </section>
  )
}

export default function GuidesIndexPage() {
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold">가이드</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-500">
        계산기와 함께 보면 도움이 되는 절차·정책 안내 아티클입니다. 모든 내용은 작성 시점 기준
        참고용이며, 정확한 신청·적용은 반드시 각 글에 표기된 공식 출처에서 최신 정보를
        확인하세요.
      </p>
      <GuideList ids={TRACK1_IDS} title="계산기 활용 가이드" />
      <GuideList ids={TRACK2_IDS} title="정부지원금·청년정책" />
    </div>
  )
}
```

- [ ] **Step 2: 타입 검증**

Run: `npx tsc -b --noEmit`
Expected: 에러 없음.

- [ ] **Step 3: 커밋**

```bash
git add src/pages/GuidesIndexPage.tsx
git commit -m "feat: 가이드 목록 페이지 GuidesIndexPage 추가"
```

---

## Task 3: `routes.json` 라우트 등록 + `App.tsx` 목록 페이지 배선 + 네비게이션 링크

**Files:**
- Modify: `src/routes.json`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: Task 2의 `GuidesIndexPage` (default export)
- Produces: 9개 라우트 메타데이터(routes.json) — Task 5~12가 각자의 라우트를 이 파일에서 이미 찾을 수 있다고 가정하고 작업한다(이 태스크에서 전부 미리 추가하므로).

- [ ] **Step 1: `src/routes.json` 배열 끝(`"정보"` 그룹 항목들 바로 앞)에 아래 9개 항목을 추가**

```json
  {
    "id": "guidesIndex",
    "path": "/guides",
    "label": "가이드",
    "group": "가이드",
    "title": "가이드 — 계산기 활용법과 정부지원금·청년정책 안내 | 계산기",
    "description": "연말정산·퇴직금·실업급여 같은 절차 가이드와 청년월세·청년도약계좌 같은 정부지원금 정보를 한곳에 모았습니다."
  },
  {
    "id": "yearEndTaxProcedureGuide",
    "path": "/guides/yearend-tax-procedure",
    "label": "연말정산 신고 절차 A to Z",
    "group": "가이드",
    "title": "2026년 연말정산 신고 절차 A to Z, 간소화서비스 제출부터 회사 정산·환급까지 | 계산기",
    "description": "홈택스 간소화서비스 개통일, 자료 제출, 회사 정산, 2월 급여 반영까지 2026년 연말정산 신고 절차를 순서대로 정리했습니다. 놓친 공제를 나중에 챙기는 방법도 안내합니다."
  },
  {
    "id": "jeonseDepositRecoveryGuide",
    "path": "/guides/jeonse-deposit-recovery",
    "label": "전세보증금 못 받았을 때 대처법",
    "group": "가이드",
    "title": "전세보증금 못 받았을 때 대처법 — 임차권등기명령·HUG 청구·강제경매 순서 | 계산기",
    "description": "전세보증금을 못 받았을 때 내용증명, 임차권등기명령, HUG 보증금반환보증 청구, 지급명령·소송, 강제경매까지 이어지는 실제 대응 순서와 방법을 정리했습니다."
  },
  {
    "id": "severanceInterimGuide",
    "path": "/guides/severance-interim-settlement",
    "label": "퇴직금 중간정산 가능한 경우",
    "group": "가이드",
    "title": "퇴직금 중간정산 가능한 경우 9가지 정리 — 주택구입·요양·개인회생·임금피크제까지 | 계산기",
    "description": "퇴직금 중간정산은 원칙적으로 금지이며 시행령이 정한 법정 사유가 있을 때만 예외적으로 가능합니다. 주택구입·전세보증금·요양·개인회생 등 9가지 사유와 필요 서류, 세금까지 정리했습니다."
  },
  {
    "id": "unemploymentApplicationGuide",
    "path": "/guides/unemployment-application",
    "label": "실업급여 신청 절차·준비서류",
    "group": "가이드",
    "title": "실업급여 신청 절차와 준비 서류 총정리 — 이직확인서·수급자격 인정부터 첫 지급까지 | 계산기",
    "description": "퇴사 후 이직확인서 처리 확인부터 고용24 구직등록, 고용센터 수급자격 인정 신청, 실업인정일 재취업활동 신고까지 실업급여 신청 절차와 준비 서류를 순서대로 정리했습니다."
  },
  {
    "id": "youthRentSubsidyGuide",
    "path": "/guides/youth-rent-subsidy",
    "label": "2026년 청년월세 지원 총정리",
    "group": "가이드",
    "title": "2026년 청년월세 지원 총정리 — 신청자격·소득기준·월 20만원 지원금액·신청기간 | 계산기",
    "description": "2026년 청년월세 지원(월 20만원, 최대 24개월) 신청 대상, 소득·재산 기준, 신청 기간과 방법을 정부24·복지로 공식 정보로 정리했습니다."
  },
  {
    "id": "youthLeapAccountGuide",
    "path": "/guides/youth-leap-account",
    "label": "청년도약계좌 총정리",
    "group": "가이드",
    "title": "청년도약계좌 가입조건·정부기여금·중도해지 총정리 2026 | 계산기",
    "description": "청년도약계좌 가입조건(만 19~34세, 소득기준), 정부기여금 매칭 구조, 중도해지 불이익을 정리하고 2025년 12월 신규가입 종료 및 후속 상품 청년미래적금 전환 방법까지 안내합니다."
  },
  {
    "id": "youthJeonseLoanGuide",
    "path": "/guides/youth-jeonse-loan",
    "label": "청년 전세자금대출(버팀목) 총정리",
    "group": "가이드",
    "title": "청년전용 버팀목전세자금대출 자격·한도·금리 총정리 — 2026년 기준 신청방법까지 | 계산기",
    "description": "만 19~34세 무주택 청년을 위한 청년전용 버팀목전세자금대출의 소득·자산·나이 요건, 대출한도, 소득구간별 금리, 신청 절차와 필요서류를 주택도시기금 공식 자료 기준으로 정리했습니다."
  },
  {
    "id": "nationalEmploymentSupportGuide",
    "path": "/guides/national-employment-support",
    "label": "국민취업지원제도 신청 조건",
    "group": "가이드",
    "title": "2026년 국민취업지원제도 I유형·II유형 신청 조건과 구직촉진수당 지급액 | 계산기",
    "description": "국민취업지원제도 I유형·II유형의 소득·재산·연령 기준과 구직촉진수당 월 지급액·지급기간, 신청 절차·준비서류를 고용24·정부24 공식 정보로 정리하고 최신 공고 확인 방법도 안내합니다."
  },
```

(JSON 배열이므로 바로 앞 항목의 닫는 `},`와 `"정보"` 그룹 항목 사이에 위 9개를 콤마로 구분해 삽입한다.)

- [ ] **Step 2: `src/App.tsx`의 `components` 맵에 `guidesIndex` 항목 추가**

`components` 객체 리터럴의 마지막 항목(`privacy: lazy(...)`) 바로 앞에 추가:

```tsx
  guidesIndex: lazy(() => import('./pages/GuidesIndexPage')),
```

- [ ] **Step 3: 데스크톱 사이드바 상단에 "가이드" 링크 추가**

`src/App.tsx`에서 `<aside>` 안, 로고/태그라인을 담은 `<div className="px-5 py-6">...</div>` 블록 바로 다음, `<Sidebar ... />` 바로 앞에 추가:

```tsx
          <div className="px-5 pb-3">
            <a
              href="/guides/"
              onClick={(e) => {
                e.preventDefault()
                navigate('/guides')
              }}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-emerald-300 hover:bg-emerald-50/40"
            >
              📖 가이드
            </a>
          </div>
```

- [ ] **Step 4: 모바일 상단 메뉴에 "가이드" 링크 추가**

`src/App.tsx`의 모바일 `<nav>` 안, `{groups.map((g) => (...))}` 바로 앞에 추가:

```tsx
              <a
                href="/guides/"
                onClick={(e) => {
                  e.preventDefault()
                  handleNavigate('/guides')
                }}
                className="mb-4 flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600"
              >
                📖 가이드
              </a>
```

- [ ] **Step 5: 타입 검증 + 빌드**

Run: `npx tsc -b --noEmit && npm run build`
Expected: 성공. `dist/guides/index.html`이 생성되고, 아직 콘텐츠가 없는 8개 가이드 라우트(`/guides/yearend-tax-procedure` 등)는 `DEFAULT_PAGE`(수익률 계산기)로 폴백 렌더링되는 것이 정상(Task 5~12에서 각자 채워짐).

- [ ] **Step 6: 커밋**

```bash
git add src/routes.json src/App.tsx
git commit -m "feat: 가이드 라우트 9개 등록 및 사이드바/모바일 가이드 링크 추가"
```

---

## Task 4: `postbuild.mjs` — 가이드 목록 페이지 크롤러용 정적 HTML

**Files:**
- Modify: `scripts/postbuild.mjs`

**Interfaces:**
- Consumes: `routes`(이미 로드됨), `route.id === 'guidesIndex'`
- Produces: 없음

- [ ] **Step 1: `prerenderBody` 함수 안, 기존 `if (c) { ... }` 블록 바로 다음(내부 링크 `<nav>` 블록 바로 앞)에 추가**

```js
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
```

- [ ] **Step 2: 빌드 + 확인**

Run: `npm run build`

```bash
grep -c "전체 가이드" dist/guides/index.html
```
Expected: `1` 이상 출력.

- [ ] **Step 3: 커밋**

```bash
git add scripts/postbuild.mjs
git commit -m "feat: 가이드 목록 페이지 프리렌더에 전체 가이드 링크 목록 추가"
```

---

## Task 5: 가이드 — 연말정산 신고 절차 A to Z (`yearEndTaxProcedureGuide`)

라우트는 Task 3에서 이미 추가됨(`/guides/yearend-tax-procedure`). 이 태스크는 (1) `pageContent.js`에 콘텐츠 추가, (2) 페이지 컴포넌트 파일 생성, (3) `App.tsx`에 이 페이지를 등록한다.

콘텐츠는 담당 서브에이전트가 국세청 홈택스·정책브리핑 등 공식 출처를 실제로 웹 검색·확인해 작성했다(최종 확인일 2026-07-30). 아래 verbatim 그대로 사용한다.

**Files:**
- Modify: `src/lib/pageContent.js`
- Create: `src/pages/guides/YearEndTaxProcedureGuide.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: Task 1의 `GuideArticlePage({ pageId, relatedCalculators? })`
- Produces: 없음

- [ ] **Step 1: `src/lib/pageContent.js` 맨 끝(마지막 계산기 항목 뒤, 파일을 닫는 `}` 앞)에 추가**

```js

  yearEndTaxProcedureGuide: {
    intro: [
      '연말정산은 매월 간이세액표로 미리 뗀 소득세(기납부세액)와 1년치 소득·공제를 확정해 계산한 실제 세금(결정세액)의 차액을 정산하는 절차로, 매년 1~2월에 진행되고 그해 2월 급여에 결과가 반영되는 것이 일반적입니다. "13월의 월급"이라 불리지만 실제로는 이미 낸 세금 중 더 낸 부분을 돌려받거나, 덜 낸 부분을 추가로 내는 정산 과정입니다.',
      '전체 흐름은 크게 네 단계입니다. ① 근로자가 홈택스 연말정산 간소화서비스에서 소득·세액공제 자료를 조회·확인하고 회사에 제공, ② 소득·세액공제신고서와 증빙자료를 회사에 제출, ③ 회사(인사·급여 담당)가 제출된 자료를 검토해 결정세액을 계산, ④ 환급액 또는 추가납부액을 급여에 반영하고 회사가 지급명세서(원천징수영수증)를 국세청에 제출하는 순서로 진행됩니다.',
      '2026년(2025년 귀속분) 기준으로 홈택스 안내에 따르면 간소화서비스는 1월 15일(목)부터 이용할 수 있고, 1월 15~20일은 이용자가 몰려 접속이 지연될 수 있어 21일(수) 이후 접속하면 비교적 여유 있게 이용할 수 있습니다. 또한 회사가 근로자 명단을 홈택스에 등록해두면 근로자가 자료를 직접 내려받아 제출하지 않아도 되는 "일괄제공서비스"도 있는데, 이 경우 회사의 근로자 명단 등록은 전년도 11월 30일까지, 근로자의 동의는 12월 1일부터 다음 해 1월 15일까지, 자료 추가·수정 요청은 1월 10일까지 진행됩니다. 정확한 오픈일과 마감일은 매년 조금씩 달라질 수 있으니 해당 연도 홈택스 공지로 다시 확인하세요.',
      '간소화자료를 확인했다면 "편리한 연말정산" 서비스로 온라인에서 소득·세액공제신고서를 작성해 회사에 제출합니다(회사별로 통상 1월 말~2월 초까지 마감). 회사는 제출받은 자료를 검토해 결정세액을 확정하고, 이 금액과 기납부세액의 차액(환급 또는 추가납부)을 대부분 2월분 급여에 반영해 지급합니다. 이후 회사는 근로소득 지급명세서(원천징수영수증)를 다음 해 3월 10일까지 국세청에 제출해야 하며, 이 서류가 근로자의 소득금액증명 등 각종 서류 발급의 기준이 됩니다.',
      '간소화서비스에는 모든 지출이 자동으로 잡히지 않습니다. 시력보정용 안경·콘택트렌즈 구입비, 중고등학생 교복 구입비, 월세 세액공제(임대차계약서+계좌이체 내역), 취학 전 아동 학원비, 해외교육비, 일부 기부금 등은 조회되지 않는 경우가 많아 근로자가 직접 영수증·확인서를 발급받아 회사에 제출해야 공제받을 수 있습니다.',
      '회사에 제출을 마친 뒤 공제 항목을 빠뜨린 것을 나중에 알았다면 늦지 않았습니다. 5월 종합소득세 신고 기간(정기신고)에 맞춰 홈택스에서 기존 연말정산 내역을 불러와 누락 항목을 추가 신고하거나, 그 기간도 놓쳤다면 경정청구로 최대 5년 이내에 돌려받을 수 있습니다. (최종 확인일: 2026-07-30, 정확한 일정·기한은 매년 국세청 홈택스 공지로 다시 확인하시기 바랍니다.)',
    ],
    formula: {
      title: '연말정산 신고는 이렇게 진행됩니다',
      steps: [
        '1월 중순(홈택스 안내 기준 1월 15일 개통, 15~20일은 혼잡하니 21일 이후 이용 권장) 홈택스 연말정산 간소화서비스에서 소득·세액공제 자료를 조회하고, 일괄제공서비스를 이용 중이라면 회사에 자료를 제공할지 동의합니다.',
        '간소화자료에 뜨지 않는 추가 공제 항목(월세, 안경, 교복비, 취학전 학원비, 해외교육비 등)의 영수증·계약서를 별도로 준비합니다.',
        '"편리한 연말정산" 서비스로 소득·세액공제신고서를 온라인으로 작성해 회사에 제출합니다(회사별로 통상 1월 말~2월 초 마감).',
        '회사가 제출된 자료를 검토해 결정세액을 계산하고, 연중 미리 뗀 기납부세액과 비교해 환급액 또는 추가납부액을 확정합니다.',
        '확정된 금액을 대부분 2월분 급여에 반영해 지급하고, 회사는 3월 10일까지 근로소득 지급명세서(원천징수영수증)를 국세청에 제출합니다.',
        '신고 후 놓친 공제를 발견했다면 5월 종합소득세 신고 기간에 추가 신고하거나, 그 기간이 지났다면 경정청구(최대 5년 이내)로 추가 환급을 신청할 수 있습니다.',
      ],
    },
    glossary: [
      { term: '간소화서비스', definition: '국세청 홈택스가 신용카드사, 보험사, 병원, 학교 등에서 수집한 소득·세액공제 증빙자료를 근로자가 한 번에 조회·다운로드할 수 있게 제공하는 서비스입니다. 매년 1월 중순에 개통됩니다.' },
      { term: '일괄제공서비스', definition: '회사가 연말정산 대상 근로자 명단을 홈택스에 등록하고 근로자가 동의하면, 근로자가 직접 자료를 내려받아 제출하지 않아도 국세청이 간소화자료를 회사로 바로 전달해주는 서비스입니다.' },
      { term: '편리한 연말정산', definition: '근로자가 홈택스에서 온라인으로 소득·세액공제신고서를 작성해 제출하고, 회사는 이를 내려받아 지급명세서 작성에 활용할 수 있게 해주는 서비스입니다.' },
      { term: '원천징수영수증(지급명세서)', definition: '1년간 받은 급여와 각종 공제 내역, 최종 확정된 결정세액이 정리된 문서입니다. 회사가 매년 3월 10일까지 국세청에 제출하며, 근로자에게도 발급됩니다.' },
      { term: '경정청구', definition: '이미 신고·정산이 끝난 뒤 놓친 공제나 오류를 발견했을 때, 더 낸 세금을 돌려달라고 다시 청구하는 절차입니다. 최대 5년 이내에 신청할 수 있습니다.' },
    ],
    faqs: [
      { q: '간소화서비스는 언제부터 이용할 수 있나요?', a: '홈택스 안내에 따르면 1월 15일부터 자료 조회가 가능하지만, 15~20일은 이용자가 몰려 접속이 지연될 수 있어 21일 이후 여유 있게 이용하는 것이 좋습니다. 정확한 오픈일은 매년 국세청 홈택스 공지로 확정되니 해당 연도 공지를 다시 확인하세요.' },
      { q: '일괄제공서비스와 편리한 연말정산은 뭐가 다른가요?', a: '일괄제공서비스는 회사가 근로자 명단을 등록하고 근로자가 동의만 하면 국세청이 간소화자료를 회사로 바로 넘겨주는 서비스이고, 편리한 연말정산은 근로자가 그 자료를 바탕으로 온라인에서 소득·세액공제신고서를 직접 작성해 제출하는 서비스입니다. 두 서비스를 함께 쓰면 자료 내려받기부터 신고서 작성까지 한 번에 끝낼 수 있습니다.' },
      { q: '간소화자료에 없는 공제는 어떻게 챙기나요?', a: '시력보정용 안경 구입비, 중고등학생 교복비, 월세 세액공제, 취학 전 아동 학원비, 해외교육비, 일부 기부금 등은 간소화서비스에 자동으로 뜨지 않는 경우가 많습니다. 각 판매처(안경점, 교복점 등)에 연말정산용 영수증을 요청하거나 임대차계약서·계좌이체 내역을 직접 준비해 회사에 제출해야 공제받을 수 있습니다.' },
      { q: '회사에 자료를 언제까지 제출해야 하나요?', a: '회사마다 다르지만 통상 1월 말부터 2월 초까지 소득·세액공제신고서와 증빙 자료 제출을 요청합니다. 정확한 마감일은 소속 회사 인사·급여 담당 부서의 공지를 따르세요.' },
      { q: '환급금은 언제 들어오나요?', a: '회사가 정산을 마치면 대부분 2월분 급여에 환급액(또는 추가납부액)을 반영해 지급합니다. 정확한 지급 시점은 회사의 급여 지급일에 따라 달라질 수 있습니다.' },
      { q: '연말정산을 끝냈는데 공제 항목을 빠뜨린 걸 나중에 알았어요.', a: '5월 종합소득세 신고 기간(정기신고)에 추가로 반영해 신고하거나, 그 기간을 놓쳤다면 경정청구로 최대 5년 이내에 돌려받을 수 있습니다. 홈택스에서 [세금신고]→[종합소득세 신고]로 들어가 기존 연말정산 내역을 불러온 뒤 누락 항목만 수정해 제출하면 됩니다.' },
      { q: '회사가 지급명세서를 언제까지 국세청에 내야 하나요?', a: '근로소득 지급명세서(원천징수영수증)는 다음 해 3월 10일까지 국세청에 제출해야 합니다. 이 서류가 근로자의 소득금액증명 등 각종 서류 발급의 기준이 되므로, 회사가 기한을 넘기면 근로자도 불편을 겪을 수 있습니다.' },
      { q: '예상 환급액을 미리 알아볼 수 있나요?', a: '네. 신용카드 사용액, 연금저축·IRP, 월세 등 항목별 예상 지출을 넣으면 결정세액과 환급/추가납부 예상액을 계산해주는 연말정산 환급액 계산기를 이용해 미리 가늠해볼 수 있습니다.' },
    ],
    sources: [
      { label: '국세청 홈택스 연말정산 간소화서비스', url: 'https://www.hometax.go.kr/ui/pp/yrs_index.html' },
      { label: '국세청 - 2025년 귀속 연말정산 종합안내', url: 'https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?mi=2304&cntntsId=238938' },
      { label: '대한민국 정책브리핑 - 연말정산 간소화자료 일괄제공 서비스', url: 'https://www.korea.kr/news/policyNewsView.do?newsId=148955097' },
    ],
  },
```

- [ ] **Step 2: `src/pages/guides/YearEndTaxProcedureGuide.tsx` 생성**

```tsx
import GuideArticlePage from '../../components/GuideArticlePage'

export default function YearEndTaxProcedureGuide() {
  return (
    <GuideArticlePage
      pageId="yearEndTaxProcedureGuide"
      relatedCalculators={[{ label: '연말정산 환급액 계산기', path: '/year-end-tax' }]}
    />
  )
}
```

- [ ] **Step 3: `src/App.tsx`의 `components` 맵에 추가** (`guidesIndex` 항목 바로 다음)

```tsx
  yearEndTaxProcedureGuide: lazy(() => import('./pages/guides/YearEndTaxProcedureGuide')),
```

- [ ] **Step 4: 검증**

Run: `npx tsc -b --noEmit && npm run build`
Expected: 성공. `dist/guides/yearend-tax-procedure/index.html`이 생성되고 본문에 "연말정산" 관련 텍스트가 포함되는지 확인:

```bash
grep -c "간소화서비스" dist/guides/yearend-tax-procedure/index.html
```
Expected: 1 이상.

- [ ] **Step 5: 커밋**

```bash
git add src/lib/pageContent.js src/pages/guides/YearEndTaxProcedureGuide.tsx src/App.tsx
git commit -m "content: 가이드 - 연말정산 신고 절차 A to Z 추가"
```

---

## Task 6: 가이드 — 전세보증금 못 받았을 때 대처법 (`jeonseDepositRecoveryGuide`)

라우트는 Task 3에서 이미 추가됨(`/guides/jeonse-deposit-recovery`). 담당 서브에이전트가 법제처 찾기쉬운 생활법령정보·HUG·대한법률구조공단 공식 자료를 검색해 작성했다(최종 확인일 2026-07-30). 검증 과정에서 "임의경매"가 아니라 "강제경매"가 정확한 용어임을 확인해 정정했고, 절차 순서도 내용증명을 먼저 오도록 실무 순서에 맞춰 배치했다 — 이 정정된 버전을 verbatim 사용한다.

**Files:**
- Modify: `src/lib/pageContent.js`
- Create: `src/pages/guides/JeonseDepositRecoveryGuide.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: Task 1의 `GuideArticlePage`
- Produces: 없음

- [ ] **Step 1: `src/lib/pageContent.js`에 추가**

```js

  jeonseDepositRecoveryGuide: {
    intro: [
      '전세 계약이 끝났는데도 집주인이 보증금을 돌려주지 않으면, 마음이 급해져서 일단 짐부터 빼거나 전입신고를 새 집으로 옮기고 싶어지기 마련입니다. 하지만 이렇게 하면 주택임대차보호법상 대항력과 우선변제권을 잃을 수 있어 오히려 보증금을 돌려받기가 더 어려워집니다. 이사를 가야 하는 상황이라도, 먼저 권리를 지키는 절차부터 밟은 뒤 움직여야 합니다.',
      '가장 먼저 할 일은 내용증명우편으로 반환 요구 사실을 명확히 남기는 것입니다. 법적 강제력은 없지만, 이후 임차권등기명령·지급명령·소송 어디로 가더라도 "반환을 요구했다"는 증거가 되고, 집주인이 "몰랐다"고 발뺌하는 것을 막아줍니다.',
      '그다음 핵심 절차가 임차권등기명령입니다. 임대차가 종료됐는데 보증금을 돌려받지 못한 임차인이 임차주택 소재지 관할 법원에 신청하면, 법원이 등기를 마쳐줍니다. 이 등기가 완료된 뒤에는 이사하고 전입신고를 다른 곳으로 옮겨도 기존에 확보한 대항력과 우선변제권이 그대로 유지됩니다. 즉, 이사는 임차권등기가 등기부에 실제로 기재된 것을 확인한 뒤에 해야 안전합니다.',
      '전세보증금반환보증(HUG)에 가입되어 있다면, 계약 종료 후 일정 기간이 지나고 임차권등기명령 절차를 진행한 상태에서 이행청구를 할 수 있습니다. 서류 제출부터 심사, 대위변제까지 통상 6~8주 정도 걸리며, HUG가 먼저 보증금을 대신 지급한 뒤 집주인에게 구상권을 행사하는 구조입니다.',
      '보증보험에 가입하지 않았거나 보증 대상이 아닌 금액이 있다면, 직접 집주인을 상대로 지급명령이나 보증금반환청구소송을 진행해야 합니다. 지급명령은 법정 출석 없이 서면으로 진행되어 비용과 시간이 적게 들지만, 집주인이 이의신청을 하면 정식 소송으로 전환됩니다. 보증금반환청구소송은 금액이 3,000만원을 넘어도 소액사건심판법에 따라 신속하게 진행되도록 하는 특례가 적용됩니다.',
      '소송에서 승소해 확정판결(또는 확정된 지급명령·조정조서 등 집행권원)을 받았는데도 집주인이 돈을 주지 않으면, 마지막 단계로 그 주택에 대한 강제경매를 신청할 수 있습니다. 법원이 경매를 진행해 매각대금에서 우선순위에 따라 배당을 받는 절차이며, 이때 확정일자·전입신고 등 우선변제권을 증명할 자료를 배당요구 종기 전에 반드시 제출해야 합니다.',
      '경제적 여유가 없거나 절차가 막막하다면 대한법률구조공단(국번 없이 132)에서 무료 법률상담과 소송대리 지원을 받을 수 있고, 소송 비용도 승소 후 상대방에게 청구해 돌려받을 수 있는 경우가 많습니다. 혼자 판단하기보다 각 단계에서 공식 기관의 확인을 받는 것이 안전합니다.',
    ],
    formula: {
      title: '전세보증금을 못 받으면 이 순서로 대응하세요',
      steps: [
        '1단계 — 내용증명 발송: 계약 종료일, 반환받지 못한 금액, 반환 기한, 미이행 시 법적 조치 예고를 명확히 적어 발송합니다. 이후 모든 절차의 증거 자료가 됩니다.',
        '2단계 — 임차권등기명령 신청(이사 전 필수): 임차주택 소재지 관할 법원에 신청합니다. 임대인 소유 등기사항증명서, 임대차계약서 등이 필요하며, 등기가 등기부에 기재된 것을 확인한 뒤에 이사·전출해야 대항력·우선변제권이 유지됩니다.',
        '3단계 — HUG 전세보증금반환보증 이행청구(가입한 경우): 임차권등기명령 절차를 진행한 상태에서 보증채무이행청구서 등을 제출합니다. 심사를 거쳐 HUG가 보증금을 대신 지급합니다(평균 6~8주 소요).',
        '4단계 — 지급명령 또는 보증금반환청구소송(미가입이거나 보증 범위를 벗어난 경우): 지급명령은 비용이 적고 빠르지만 이의신청 시 소송으로 전환됩니다. 소송은 금액과 무관하게 소액사건심판법의 신속 처리 특례를 적용받을 수 있습니다.',
        '5단계 — 강제경매 신청: 확정판결·확정된 지급명령·조정조서 등 집행권원을 확보한 뒤에도 반환이 없으면, 부동산 소재지 법원에 강제경매를 신청하고 배당요구 종기 전에 우선변제권 자료를 제출해 배당을 받습니다.',
        '이 모든 과정이 버겁다면 대한법률구조공단(132, klac.or.kr)에서 무료 법률상담·소송대리를 먼저 확인하세요.',
      ],
    },
    glossary: [
      { term: '대항력', definition: '임차인이 주택의 인도(입주)와 전입신고를 마치면 그다음 날부터 발생하는 권리로, 집주인이 바뀌어도 새 집주인에게 임대차 내용을 주장할 수 있게 해줍니다. 이사·전출을 하면 원칙적으로 사라지므로, 이사 전에 임차권등기명령으로 미리 지켜둬야 합니다.' },
      { term: '우선변제권', definition: '대항력에 더해 임대차계약서에 확정일자를 받으면 발생하는 권리로, 집이 경매에 넘어갔을 때 다른 채권자보다 먼저 보증금을 배당받을 수 있게 해줍니다.' },
      { term: '임차권등기명령', definition: '임대차가 끝났는데 보증금을 못 받은 임차인이 법원에 신청해 등기를 마치는 제도(주택임대차보호법 제3조의3)입니다. 등기가 완료되면 이사·전출을 해도 기존의 대항력·우선변제권이 그대로 유지되며, 신청·등기 비용은 집주인에게 청구할 수 있습니다.' },
      { term: '전세보증금반환보증(HUG)', definition: '주택도시보증공사(HUG)가 집주인 대신 임차인에게 보증금을 먼저 지급하고, 이후 집주인에게 구상권을 행사하는 보증 상품입니다. 계약 종료 후 일정 기간이 지나고 임차권등기명령 절차가 진행된 상태에서 이행청구가 가능합니다.' },
      { term: '집행권원', definition: '강제집행(강제경매 등)을 신청할 수 있는 근거가 되는 공식 문서로, 확정판결·가집행선고부 판결·화해조서·조정조서·확정된 지급명령 등이 해당합니다. 집행권원 없이는 강제경매를 신청할 수 없습니다.' },
    ],
    faqs: [
      { q: '보증금을 못 받았는데 직장·자녀 학교 문제로 이사를 가야 합니다. 어떻게 하나요?', a: '짐만 빼고 전입신고를 그대로 유지하면 대항력이 살아있지만, 새 거주지로 전입신고까지 옮겨야 한다면 반드시 먼저 임차권등기명령을 신청하고 등기부에 등기가 실제로 기재된 것을 확인한 뒤에 이사·전출하세요. 등기 전에 이사하면 대항력과 우선변제권을 잃을 위험이 있습니다.' },
      { q: '전세보증금반환보증(HUG)에 가입하지 않았으면 어떻게 하나요?', a: 'HUG 이행청구를 이용할 수 없으므로, 내용증명 → 임차권등기명령 이후 집주인을 상대로 직접 지급명령이나 보증금반환청구소송을 진행해야 합니다. 대한법률구조공단(132)에서 무료 법률상담·소송대리 지원 여부를 먼저 확인해보세요.' },
      { q: '소송 비용은 얼마나 드나요?', a: '법원에 내는 인지대(청구금액에 비례)와 송달료(피고 1인당 통상 7~8만원 수준)가 기본 비용입니다. 승소하면 소송비용확정신청을 통해 이 비용을 집주인에게 청구해 돌려받을 수 있습니다. 정확한 금액은 대한법률구조공단이나 법원 전자소송 사이트에서 확인하세요.' },
      { q: '내용증명은 꼭 보내야 하나요? 안 보내면 안 되나요?', a: '법적 의무는 아니지만 실무상 첫 단계로 강력히 권장됩니다. 즉시 강제력은 없지만, 이후 임차권등기명령·지급명령·소송에서 "반환을 요구한 사실"과 "수령했다는 사실"을 입증하는 핵심 증거가 되기 때문입니다.' },
      { q: '임차권등기명령과 보증금반환소송을 동시에 진행해도 되나요?', a: '네, 서로 다른 절차이므로 동시에 진행할 수 있습니다. 임차권등기명령은 권리(대항력·우선변제권) 보전을 위한 절차이고, 소송은 실제로 돈을 받아내기 위한 집행권원 확보 절차입니다.' },
      { q: '집주인이 연락을 끊거나 잠적하면 어떻게 하나요?', a: '내용증명이 반송돼도 절차 진행에는 영향이 적으며, 소송에서 주소를 확인할 수 없으면 공시송달 절차로 진행할 수 있습니다. 집주인 재산이 처분될 우려가 크다면 임차권등기명령과 별개로 가압류를 함께 검토하세요.' },
      { q: 'HUG 이행청구 후 실제로 돈을 받기까지 얼마나 걸리나요?', a: '서류 제출(이행청구) → 심사 → 대위변제까지 평균 6~8주 정도 소요되며, 추가 서류를 요청받으면 더 길어질 수 있습니다. 정확한 진행 상황은 HUG 콜센터나 마이홈 앱에서 확인할 수 있습니다.' },
      { q: '전세사기가 의심되는 경우도 같은 절차로 대응하면 되나요?', a: '기본적인 순서(내용증명 → 임차권등기명령 → 반환청구)는 동일하지만, 다수 피해자가 얽힌 전세사기 사안은 대한법률구조공단의 전세사기 피해자 대상 무료 소송지원 제도, 관할 지자체·국토교통부의 피해자 지원 창구를 함께 확인하는 것이 좋습니다. 개별 사안의 지원 요건은 반드시 해당 기관 공식 안내로 확인하세요.' },
    ],
    sources: [
      { label: '찾기쉬운 생활법령정보 — 보증금의 회수', url: 'https://easylaw.go.kr/CSP/CnpClsMain.laf?popMenu=ov&csmSeq=629&ccfNo=5&cciNo=2&cnpClsNo=1' },
      { label: '주택도시보증공사(HUG) — 전세보증금반환보증 이용절차', url: 'https://www.khug.or.kr/hug/web/ig/dr/igdr000002.jsp' },
      { label: '대한법률구조공단', url: 'https://www.klac.or.kr/pil/main' },
    ],
  },
```

- [ ] **Step 2: `src/pages/guides/JeonseDepositRecoveryGuide.tsx` 생성**

```tsx
import GuideArticlePage from '../../components/GuideArticlePage'

export default function JeonseDepositRecoveryGuide() {
  return (
    <GuideArticlePage
      pageId="jeonseDepositRecoveryGuide"
      relatedCalculators={[{ label: '전월세 전환율 계산기', path: '/jeonse-conversion' }]}
    />
  )
}
```

- [ ] **Step 3: `src/App.tsx`의 `components` 맵에 추가**

```tsx
  jeonseDepositRecoveryGuide: lazy(() => import('./pages/guides/JeonseDepositRecoveryGuide')),
```

- [ ] **Step 4: 검증**

Run: `npx tsc -b --noEmit && npm run build`

```bash
grep -c "임차권등기명령" dist/guides/jeonse-deposit-recovery/index.html
```
Expected: 1 이상.

- [ ] **Step 5: 커밋**

```bash
git add src/lib/pageContent.js src/pages/guides/JeonseDepositRecoveryGuide.tsx src/App.tsx
git commit -m "content: 가이드 - 전세보증금 못 받았을 때 대처법 추가"
```

---

## Task 7: 가이드 — 퇴직금 중간정산 가능한 경우 (`severanceInterimGuide`)

라우트는 Task 3에서 이미 추가됨(`/guides/severance-interim-settlement`). 담당 서브에이전트가 고용노동부 FAQ·법제처 생활법령정보 등 4개 독립 출처를 교차 확인해 9가지 법정 사유 목록을 검증했다(최종 확인일 2026-07-30).

**Files:**
- Modify: `src/lib/pageContent.js`
- Create: `src/pages/guides/SeveranceInterimGuide.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: Task 1의 `GuideArticlePage`
- Produces: 없음

- [ ] **Step 1: `src/lib/pageContent.js`에 추가**

```js

  severanceInterimGuide: {
    intro: [
      '퇴직금은 원칙적으로 "퇴직할 때" 지급하는 급여이며, 재직 중에 미리 정산해서 받는 것(중간정산)은 원칙적으로 금지되어 있습니다. 근로자퇴직급여 보장법 제8조 제2항은 "주택구입 등 대통령령으로 정하는 사유가 있는 경우"에 한해 예외적으로 중간정산을 허용하고, 그 구체적인 사유는 시행령 제3조에서 하나하나 열거하고 있습니다. 즉 여기 나열된 사유에 해당하지 않으면 회사가 아무리 호의적이어도 적법한 중간정산 자체가 성립하지 않습니다.',
      '2026년 현재 시행령 제3조가 정한 사유는 크게 다섯 갈래입니다. ① 무주택자의 주택 구입, ② 무주택자의 전세금·임차보증금 부담(같은 사업장에서 1회 한정), ③ 본인·배우자·부양가족이 6개월 이상 요양이 필요한 질병·부상으로 연간 임금총액의 12.5%(1,000분의 125)를 초과하는 의료비를 부담하는 경우, ④·⑤ 신청일로부터 역산 5년 이내의 파산선고 또는 개인회생절차 개시 결정, ⑥·⑦ 임금피크제 시행이나 소정근로시간 단축 합의로 임금이 줄어드는 경우, ⑧ (2018~2021년 주 52시간제 단계적 시행에 따른 경과조치 성격의) 법정근로시간 단축으로 임금이 감소한 경우, ⑨ 태풍·홍수 등 재난으로 주거시설 피해나 부양가족의 부상·실종 등을 입은 경우입니다.',
      '사유마다 요구하는 증빙서류가 다릅니다. 주택 구입은 매매계약서·건물등기부등본·주민등록등본을, 전세·보증금은 임대차계약서와 잔금 지급 영수증을, 요양비는 진단서(또는 건강보험공단 장기요양확인서)와 의료비 영수증을, 파산·개인회생은 법원의 선고문·결정문을 제출해야 합니다. 대부분 사유는 "잔금 지급일" "요양 종료일" "파산선고일" 등 특정 시점으로부터 1개월 이내, 또는 신청일로부터 역산 5년 이내처럼 신청 가능 기간이 정해져 있어 시기를 놓치면 같은 사유로도 신청이 반려될 수 있습니다.',
      '가장 많이 오해하는 지점은 "법정 사유에 해당하면 회사가 무조건 정산해줘야 한다"는 생각입니다. 실제로는 정반대에 가깝습니다. 법정 사유는 회사가 중간정산을 "해줘도 되는" 사유의 한도일 뿐이고, 회사가 근로자의 요구에 반드시 응해야 할 의무는 없습니다. 대법원도 취업규칙이나 단체협약에 중간정산 근거가 있더라도 개별 근로자의 구체적 요구에 회사가 승낙해야만 유효한 중간정산이 성립한다고 보고 있어, 신청 전에 회사(인사팀)와 지급 여부를 먼저 확인하는 것이 안전합니다.',
      '한 가지 더 구분해야 할 점은, 이 사유들은 회사가 직접 퇴직금을 관리하는 일반 퇴직금·확정급여형(DB) 퇴직연금 기준이라는 것입니다. 확정기여형(DC) 퇴직연금 가입자는 "중도인출"이라는 별도 제도를 이용하며, 사유는 대체로 비슷하지만 담보대출 원리금 상환처럼 DC형에만 있는 사유도 추가로 있어 완전히 같지는 않습니다. 본인이 DB형인지 DC형인지 먼저 확인하세요.',
      '중간정산을 받으면 그 시점 이후의 근무기간만 새로운 재직기간으로 다시 계산됩니다. 정산받은 금액과 별개로, 정산 이후 근속분에 대한 예상 퇴직금은 이 사이트의 퇴직금 계산기에서 중간정산 완료일(또는 그다음 날)을 입사일로 입력해 바로 확인할 수 있습니다.',
      '이 글은 일반적인 안내를 위한 참고 자료이며, 개별 사안의 정확한 해당 여부와 필요 서류는 고용노동부·근로복지공단 또는 사내 인사·노무 담당자를 통해 최종 확인하시기 바랍니다. (최종 확인일: 2026-07-30)',
    ],
    formula: {
      title: '퇴직금 중간정산, 이 사유일 때만 가능합니다',
      steps: [
        '① 무주택자 주택 구입 — 본인 명의로 주택을 구입할 때. 소유권 이전등기 후 1개월 이내 신청, 매매계약서·건물등기부등본 등 제출.',
        '② 무주택자 전세금·임차보증금 부담 — 주거 목적의 전세금 또는 「주택임대차보호법」상 보증금을 부담할 때. 같은 사업장에서 근무하는 동안 1회로 한정.',
        '③ 6개월 이상 요양 의료비 — 본인·배우자·부양가족의 질병·부상으로 6개월 이상 요양이 필요하고, 본인이 부담한 의료비가 연간 임금총액의 12.5%(1,000분의 125)를 초과할 때.',
        '④ 파산선고 — 신청일로부터 역산해 5년 이내에 「채무자 회생 및 파산에 관한 법률」에 따른 파산선고를 받았을 때.',
        '⑤ 개인회생절차개시 결정 — 신청일로부터 역산해 5년 이내에 개인회생절차 개시 결정을 받았을 때.',
        '⑥ 임금피크제 시행 — 취업규칙·단체협약 등으로 정년연장이나 재고용 조건으로 임금피크제를 실시해 임금이 줄어들 때.',
        '⑦ 소정근로시간 단축 — 1일 1시간 이상 또는 1주 5시간 이상 소정근로시간을 줄이기로 합의하고, 그 단축된 시간으로 3개월 이상 계속 근로하기로 했을 때.',
        '⑧ 법정근로시간 단축에 따른 임금 감소 — 근로기준법 개정(주 68→52시간 단계적 시행)에 따라 소정근로시간이 줄어 임금이 감소했을 때(2018~2021년 시행 당시의 경과조치 성격이 강해 현재는 해당 사례가 드묾).',
        '⑨ 재난 피해 — 태풍·지진·홍수 등 고용노동부장관이 고시하는 재난으로 주거시설 피해, 부양가족의 부상·실종, 15일 이상 입원 등의 피해를 입었을 때.',
      ],
    },
    glossary: [
      { term: '무주택자', definition: '중간정산 신청 시점에 본인 명의의 주택을 소유하고 있지 않은 근로자를 말합니다. 주민등록등본·건물등기부등본·재산세 (미)과세증명서 등으로 무주택 여부를 확인합니다.' },
      { term: '개인회생절차개시 결정 / 파산선고', definition: '둘 다 「채무자 회생 및 파산에 관한 법률」에 따른 절차이지만, 개인회생은 일정 소득으로 채무를 분할 상환하며 재기하는 절차이고 파산선고는 재산으로 채무를 청산하는 절차입니다. 두 사유 모두 결정·선고일로부터 역산 5년 이내여야 중간정산 사유로 인정됩니다.' },
      { term: '임금피크제', definition: '일정 연령 이상 근로자의 정년을 보장하거나 연장하는 대신, 그 연령부터 임금을 단계적으로 낮추는 제도입니다. 이 제도 시행으로 임금이 줄어드는 근로자는 그 실시 시점에 중간정산을 신청할 수 있습니다.' },
      { term: 'DC형 퇴직연금 중도인출', definition: '확정기여형(DC) 퇴직연금 가입자가 적립금 일부를 미리 찾는 절차로, 퇴직금 중간정산과 사유가 상당 부분 겹치지만 담보대출 원리금 상환 등 DC형에만 있는 사유가 추가되어 있어 완전히 동일하지는 않습니다.' },
      { term: '중간정산 기준일', definition: '중간정산이 실제로 이루어진 날로, 이후 근무기간은 이 날짜(또는 그다음 날)를 새로운 입사일로 보고 퇴직금을 다시 계산합니다.' },
    ],
    faqs: [
      { q: '법정 사유에 해당하는데 회사가 거부하면 어떻게 하나요?', a: '법정 사유는 회사가 중간정산을 "해줄 수 있는" 한도일 뿐, 근로자가 요구한다고 회사가 반드시 응해야 하는 의무 규정이 아닙니다. 취업규칙이나 단체협약에 중간정산 제도가 있어도 개별 신청에 회사가 승낙하지 않으면 지급받을 수 없으므로, 신청 전 인사팀과 지급 가능 여부를 먼저 확인하는 것이 안전합니다.' },
      { q: '중간정산을 받으면 세금은 어떻게 되나요?', a: '중간정산 받은 금액도 일반 퇴직금과 동일하게 퇴직소득세로 과세되며, 근속연수공제·환산급여 방식이 적용되어 일반 소득세보다 세부담이 낮습니다. 다만 중간정산 이후 계속 근무하다 최종 퇴직할 때는, 중간정산 이전 근속기간과 이후 근속기간을 합산해 정산하는 방식(근속연수 합산 정산)을 선택할 수도 있어 유불리를 비교해볼 필요가 있습니다.' },
      { q: '같은 사유로 여러 번 중간정산을 받을 수 있나요?', a: '사유마다 다릅니다. 전세금·임차보증금 부담은 "같은 사업장에서 근무하는 동안 1회"로 명시적으로 제한되지만, 주택 구입이나 요양비, 파산·개인회생 등은 조건을 다시 충족하면 이론적으로 재신청이 가능합니다. 다만 실무에서는 회사가 반복 신청을 거부하는 경우가 많습니다.' },
      { q: '중간정산 후 퇴직금은 어떻게 다시 계산하나요?', a: '중간정산이 이루어진 날(또는 그다음 날)을 새로운 입사일로 보고, 그 이후 근무기간만으로 퇴직금을 다시 계산합니다. 이 사이트의 퇴직금 계산기에 중간정산 완료일을 입사일로 입력하면 정산 이후 예상 퇴직금을 바로 확인할 수 있습니다.' },
      { q: 'DC형 퇴직연금 가입자도 이 사유들이 그대로 적용되나요?', a: '대부분 겹치지만 완전히 같지는 않습니다. DC형은 "중도인출"이라는 별도 제도를 쓰며, 담보대출 원리금 상환을 위한 인출처럼 DC형에만 있는 사유가 추가로 있습니다. 본인이 DB형(일반 퇴직금)인지 DC형인지 먼저 확인 후 해당 제도의 사유를 확인해야 합니다.' },
      { q: '증빙서류를 늦게 내면 신청이 취소되나요?', a: '주택 구입은 소유권 이전등기 후 1개월 이내, 전세·보증금은 잔금 지급 후 1개월 이내처럼 대부분 사유에 신청 가능 기간이 정해져 있습니다. 이 기간을 넘기면 같은 사유라도 정산이 반려될 수 있으므로 계약·지급 시점부터 서류를 미리 준비하는 것이 좋습니다.' },
      { q: '임금피크제나 근로시간 단축도 근로자가 먼저 신청해야 하나요?', a: '네. 제도 자체는 회사가 시행하더라도, 그로 인해 임금이 줄어드는 근로자가 중간정산을 원하면 별도로 신청해야 합니다. 제도 시행이 자동으로 중간정산을 발생시키지는 않습니다.' },
      { q: '중간정산 신청서 양식은 어디서 구하나요?', a: '법에서 정한 표준 양식은 없으며, 회사마다 자체 양식(퇴직금 중간정산 신청서)을 갖추고 있는 경우가 많습니다. 회사에 양식이 없다면 사유·증빙서류를 첨부한 일반 신청서로도 처리가 가능한지 인사팀에 문의하세요.' },
    ],
    sources: [
      { label: '고용노동부 FAQ — 퇴직금 중간정산 사유', url: 'https://www.moel.go.kr/faq/faqView.do?seqRepeat=111' },
      { label: '찾기쉬운 생활법령정보(법제처) — 퇴직금 중간정산', url: 'https://easylaw.go.kr/CSP/CnpClsMain.laf?popMenu=ov&csmSeq=999&ccfNo=2&cciNo=1&cnpClsNo=1' },
    ],
  },
```

- [ ] **Step 2: `src/pages/guides/SeveranceInterimGuide.tsx` 생성**

```tsx
import GuideArticlePage from '../../components/GuideArticlePage'

export default function SeveranceInterimGuide() {
  return (
    <GuideArticlePage
      pageId="severanceInterimGuide"
      relatedCalculators={[{ label: '퇴직금 계산기', path: '/severance' }]}
    />
  )
}
```

- [ ] **Step 3: `src/App.tsx`의 `components` 맵에 추가**

```tsx
  severanceInterimGuide: lazy(() => import('./pages/guides/SeveranceInterimGuide')),
```

- [ ] **Step 4: 검증**

Run: `npx tsc -b --noEmit && npm run build`

```bash
grep -c "무주택자" dist/guides/severance-interim-settlement/index.html
```
Expected: 1 이상.

- [ ] **Step 5: 커밋**

```bash
git add src/lib/pageContent.js src/pages/guides/SeveranceInterimGuide.tsx src/App.tsx
git commit -m "content: 가이드 - 퇴직금 중간정산 가능한 경우 추가"
```

---

## Task 8: 가이드 — 실업급여 신청 절차·준비서류 (`unemploymentApplicationGuide`)

라우트는 Task 3에서 이미 추가됨(`/guides/unemployment-application`). 담당 서브에이전트가 고용24(work24.go.kr)·고용노동부 공식 보도자료·법제처 생활법령정보를 검색해 작성했다(최종 확인일 2026-07-30). ei.go.kr(구 고용보험 홈페이지)이 work24.go.kr로 통합된 사실도 확인했다.

**Files:**
- Modify: `src/lib/pageContent.js`
- Create: `src/pages/guides/UnemploymentApplicationGuide.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: Task 1의 `GuideArticlePage`
- Produces: 없음

- [ ] **Step 1: `src/lib/pageContent.js`에 추가**

```js

  unemploymentApplicationGuide: {
    intro: [
      '실업급여(구직급여)는 퇴사했다고 자동으로 나오는 돈이 아니라, 정해진 순서를 하나씩 밟아야 지급이 시작됩니다. 큰 흐름은 이직확인서 처리 확인 → 고용24 구직등록 → 수급자격 신청자 온라인 교육 이수 → 고용센터 방문(또는 요건 충족 시 모바일 사전 제출) 수급자격 인정 신청 → 실업인정일마다 재취업활동 신고, 이렇게 다섯 단계입니다. 어느 한 단계를 건너뛰면 다음 단계로 넘어갈 수 없거나 지급이 늦어지므로, 순서대로 준비하는 것이 가장 빠른 길입니다.',
      '첫 단추는 이직확인서입니다. 마지막으로 다닌 회사가 고용보험 피보험자격 상실신고서와 이직확인서를 고용센터에 제출해야 하는데, 근로자나 고용센터가 발급을 요청한 날부터 10일 이내에 제출할 의무가 있습니다. 처리 여부는 본인이 직접 고용24(work24.go.kr)에서 조회할 수 있고, 회사가 기한을 넘기면 1차 10만원, 2차 20만원, 3차 30만원의 과태료가 부과됩니다. 회사가 계속 미루더라도 이직확인서 없이 고용센터에 사정을 설명하고 신청 절차를 진행할 수 있으니, 이 때문에 신청 자체를 포기할 필요는 없습니다.',
      '이직확인서 처리와 별개로, 고용24에서 이력서를 등록해 구직 신청(구직등록)을 하고 "수급자격 신청자 온라인 교육"을 이수해야 합니다. 이 교육은 약 1시간 분량으로 실업급여 제도, 신청 절차, 부정수급 방지 내용을 담고 있으며 PC·스마트폰 어디서든 볼 수 있습니다. 다만 수강 신청 후 7일이 지나면 신청이 무효화되어 처음부터 다시 신청해야 하니, 신청과 동시에 바로 끝까지 시청하는 편이 안전합니다. 이 교육을 마쳐야 다음 단계인 고용센터 방문(또는 온라인 사전 제출)이 가능해집니다.',
      '교육을 마치면 거주지(또는 희망 취업지역·이전 사업장 관할) 고용복지플러스센터에 신분증을 지참해 방문하고, 수급자격 인정신청서(근로자는 별지 제75호서식, 자영업자는 별지 제75호의2서식)를 제출합니다. 퇴사 후 이직확인서·상실신고서가 이미 처리되었고 비자발적 이직이 확인된 경우에는 고용24 앱에서 신청서를 먼저 제출한 뒤 고용센터 방문 시 신분증 확인 등 최소한의 절차만 거치는 모바일 사전 제출도 가능합니다. 신청서 처리기간은 통상 14일이며, 이 기간에 이직 사유와 가입기간 요건을 심사해 수급자격 인정 여부를 결정합니다.',
      '수급자격이 인정되면 수급자격증을 받고 1차 실업인정일을 지정받습니다. 이후에는 이 지정된 실업인정일(실업 신고일로부터 1~4주 범위)마다 고용센터에 출석하거나 인터넷으로 재취업활동 내역을 보고해야 실제 급여가 지급됩니다. 1차 실업인정일에는 보통 집체교육을 받고, 2~4차는 4주에 1회 이상, 5차부터는 4주에 2회 이상(그중 1회는 반드시 구직활동)의 재취업활동을 해야 합니다. 60세 이상이거나 장애인이면 2차부터 4주 1회로 완화되고, 반복 수급자는 반대로 4차부터 4주 2회가 적용됩니다.',
      '준비 서류를 정리하면, 신분증(주민등록증·운전면허증 등), 도장 또는 서명, 본인 명의 통장 사본(급여가 이 계좌로 입금됩니다), 그리고 회사가 제출하는 이직확인서·고용보험 피보험자격 상실신고서(시스템으로 자동 연동되어 본인이 별도로 지참하지 않아도 되는 경우가 대부분)입니다. 방문 전에 고용24에서 이직확인서 처리 여부와 구직등록·온라인 교육 이수 상태를 먼저 확인해두면 헛걸음을 줄일 수 있습니다.',
      '가장 중요한 마감 기한은 이직일 다음 날부터 12개월입니다. 이 기간이 지나면 소정급여일수가 남아 있어도 더 이상 받을 수 없으므로, 이직확인서 처리를 기다리는 동안에도 구직등록과 온라인 교육 이수 같은 사전 준비는 최대한 빨리 끝내두는 것이 좋습니다. (최종 확인일: 2026-07-30)',
    ],
    formula: {
      title: '실업급여는 이 순서로 신청하세요',
      steps: [
        '① 이직확인서·고용보험 피보험자격 상실신고서 처리 확인 — 고용24(work24.go.kr)에서 조회, 회사는 요청일로부터 10일 이내 제출 의무.',
        '② 고용24에서 구직등록(이력서 작성) — 실업급여 신청의 전제 조건.',
        '③ 수급자격 신청자 온라인 교육 이수 — 약 1시간, 신청 후 7일 이내 미이수 시 신청 자동 무효(재신청 필요).',
        '④ 거주지 관할 고용복지플러스센터 방문(또는 요건 충족 시 고용24 앱 모바일 사전 제출) — 신분증 지참, 수급자격 인정신청서 제출, 처리기간 통상 14일.',
        '⑤ 수급자격 인정 시 수급자격증 수령 및 1차 실업인정일 지정.',
        '⑥ 지정된 실업인정일(1~4주 간격)마다 출석·인터넷 신고로 재취업활동 보고 → 요건 충족분부터 본인 명의 계좌로 구직급여 지급.',
      ],
    },
    glossary: [
      { term: '이직확인서', definition: '마지막 회사가 고용센터에 제출하는 서류로, 이직 사유와 이직 전 평균임금을 확인해줍니다. 회사는 발급 요청일로부터 10일 이내에 제출해야 하며, 처리 여부는 고용24에서 본인이 직접 조회할 수 있습니다.' },
      { term: '수급자격 인정', definition: '고용복지플러스센터가 이직 사유(비자발적 여부)와 고용보험 가입기간 요건을 심사해 실업급여를 받을 자격이 있는지 확정하는 절차입니다. 신청서 처리기간은 통상 14일이며, 인정되어야 실업인정·지급 단계로 넘어갑니다.' },
      { term: '실업인정일', definition: '실업 신고일로부터 1~4주 범위 안에서 고용센터가 지정하는 날로, 이날 재취업활동 내역을 보고해야 그 직전 실업인정일 다음 날부터 해당일까지의 실업이 인정되어 급여가 지급됩니다.' },
      { term: '재취업활동', definition: '구인업체 지원(방문·우편·인터넷), 채용박람회 참석·면접, 인정된 직업훈련 수강, 고용센터 직업지도 프로그램 참여, 자영업 준비활동 등을 말합니다. 동일 사업장에만 반복 지원하거나 전화·인터넷 탐문만 하는 것은 인정되지 않습니다.' },
      { term: '고용24', definition: '2024년 9월 워크넷·고용보험·HRD-Net 등 9개 고용 관련 시스템을 하나로 통합한 정부 포털(work24.go.kr)입니다. 구직등록, 온라인 교육, 실업급여 신청·조회를 이 한 곳에서 처리합니다.' },
    ],
    faqs: [
      { q: '퇴사 후 언제까지 신청해야 하나요?', a: '이직일 다음 날부터 12개월 이내에 소정급여일수를 모두 받아야 합니다. 이 기간이 지나면 남은 일수가 있어도 지급받을 수 없으므로, 이직확인서 처리를 기다리는 동안에도 구직등록·온라인 교육 같은 사전 준비는 미리 끝내고, 되도록 빨리 신청하는 것이 안전합니다.' },
      { q: '회사가 이직확인서를 발급해주지 않으면 어떻게 하나요?', a: '회사는 발급 요청일로부터 10일 이내에 제출할 의무가 있고, 어기면 과태료(1차 10만원, 2차 20만원, 3차 30만원)가 부과됩니다. 요청 기록(문자·메일·내용증명 등)을 남긴 뒤 기한이 지나도 처리되지 않으면 고용센터에 미제출 사실을 알려 이직확인서 없이도 신청 절차를 진행할 수 있습니다.' },
      { q: '구직활동은 뭘로 인정되나요?', a: '입사 지원(방문·우편·인터넷), 채용박람회 참석·면접, 고용센터가 인정한 직업훈련 수강, 고용센터 직업지도 프로그램 참여, 자영업 준비활동 등이 인정됩니다. 반대로 같은 회사에만 반복 지원하거나 전화·인터넷으로 문의만 하는 것, 현실성 없는 근로조건을 고집하는 것은 인정되지 않습니다.' },
      { q: '온라인 교육은 꼭 들어야 하나요?', a: '네, 필수입니다. 수급자격 신청자 온라인 교육(약 1시간)을 이수해야 고용센터 방문(또는 모바일 사전 제출) 단계로 넘어갈 수 있습니다. 수강 신청 후 7일 안에 끝까지 보지 않으면 신청이 무효화되어 처음부터 다시 신청해야 합니다.' },
      { q: '고용센터에 꼭 방문해야 하나요?', a: '최초 신청은 원칙적으로 방문이 필요합니다. 다만 이직확인서·상실신고서가 이미 처리되었고 비자발적 이직이 확인된 경우에는 고용24 앱에서 신청서를 먼저 제출한 뒤, 방문 시 신분증 확인 등 최소한의 절차만 거치는 방식도 가능합니다. 사업자등록증이 있거나 취업이 불가능한 상태라면 이 간소화 절차가 제한될 수 있습니다.' },
      { q: '수급자격 인정까지 얼마나 걸리나요?', a: '수급자격 인정신청서의 법정 처리기간은 통상 14일입니다. 심사 결과 인정되면 수급자격증을 받고 1차 실업인정일을 지정받으며, 이후 실업인정일마다 재취업활동을 보고해야 실제 급여가 나옵니다.' },
      { q: '실업인정일에 출석하지 못하면 어떻게 되나요?', a: '정당한 사유 없이 지정된 실업인정일에 출석(또는 인터넷 신고)하지 않으면 그 기간의 실업이 인정되지 않아 해당 회차 급여를 받을 수 없습니다. 부득이한 사정이 있다면 미리 고용센터에 연락해 실업인정일 변경이 가능한지 확인하세요.' },
      { q: '신청할 때 준비할 서류는 무엇인가요?', a: '신분증(주민등록증·운전면허증 등), 도장 또는 서명, 본인 명의 통장 사본이 기본입니다. 이직확인서와 고용보험 피보험자격 상실신고서는 회사가 제출하면 시스템으로 연동되어 대부분 별도로 지참하지 않아도 되지만, 방문 전 고용24에서 처리 여부를 먼저 확인해두는 것이 안전합니다.' },
    ],
    sources: [
      { label: '고용24(고용보험·실업급여)', url: 'https://www.work24.go.kr' },
      { label: '찾기쉬운 생활법령정보 — 구직급여 수급신청', url: 'https://easylaw.go.kr/CSP/CnpClsMain.laf?popMenu=ov&csmSeq=722&ccfNo=2&cciNo=2&cnpClsNo=1' },
      { label: '고용노동부', url: 'https://www.moel.go.kr' },
    ],
  },
```

- [ ] **Step 2: `src/pages/guides/UnemploymentApplicationGuide.tsx` 생성**

```tsx
import GuideArticlePage from '../../components/GuideArticlePage'

export default function UnemploymentApplicationGuide() {
  return (
    <GuideArticlePage
      pageId="unemploymentApplicationGuide"
      relatedCalculators={[{ label: '실업급여 계산기', path: '/unemployment' }]}
    />
  )
}
```

- [ ] **Step 3: `src/App.tsx`의 `components` 맵에 추가**

```tsx
  unemploymentApplicationGuide: lazy(() => import('./pages/guides/UnemploymentApplicationGuide')),
```

- [ ] **Step 4: 검증**

Run: `npx tsc -b --noEmit && npm run build`

```bash
grep -c "이직확인서" dist/guides/unemployment-application/index.html
```
Expected: 1 이상.

- [ ] **Step 5: 커밋**

```bash
git add src/lib/pageContent.js src/pages/guides/UnemploymentApplicationGuide.tsx src/App.tsx
git commit -m "content: 가이드 - 실업급여 신청 절차·준비서류 추가"
```

---

## Task 9: 가이드 — 2026년 청년월세 지원 총정리 (`youthRentSubsidyGuide`)

라우트는 Task 3에서 이미 추가됨(`/guides/youth-rent-subsidy`). 담당 서브에이전트가 복지로 공식 블로그·정부24를 검색해 작성했다(최종 확인일 2026-07-30). **중요:** 2026년 1차 신청 기간(3/30~5/29)은 이 글 작성 시점 기준 이미 마감되었고, 선정자 발표는 9/14 예정이다 — 이 사실 그대로 verbatim 반영한다(다음 접수 일정을 추측해서 채우지 않음). 이 가이드는 계산기와 무관한 트랙2(정부지원금·청년정책)이므로 `relatedCalculators`는 사용하지 않는다.

**Files:**
- Modify: `src/lib/pageContent.js`
- Create: `src/pages/guides/YouthRentSubsidyGuide.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: Task 1의 `GuideArticlePage`
- Produces: 없음

- [ ] **Step 1: `src/lib/pageContent.js`에 추가**

```js

  youthRentSubsidyGuide: {
    intro: [
      '청년월세 지원사업은 부모님과 따로 살면서 월세를 내는 무주택 청년에게 매달 최대 20만원씩, 최대 24개월(생애 1회) 동안 월세를 지원하는 국토교통부 사업입니다. 2022년부터 "청년월세 한시 특별지원" 1차·2차로 운영되다가, 2026년부터는 매년 신규 대상자를 뽑는 계속 사업으로 전환되었습니다.',
      '신청 대상은 만 19~34세로 부모와 별도 거주하는 무주택 청년입니다. 소득 요건은 두 단계로 봅니다. 청년 본인(청년가구) 소득이 기준 중위소득 60% 이하이면서, 부모님을 포함한 원가구 소득이 기준 중위소득 100% 이하여야 합니다. 여기에 임차보증금 5천만원 이하, 월세 60만원 이하(보증금을 월세로 환산해 합산했을 때 70만원 이하면 예외 인정)라는 주거 요건도 함께 충족해야 합니다.',
      '지원 금액은 실제 납부하는 월세 기준으로 월 최대 20만원이며, 관리비·보증금은 지원 대상이 아닙니다. 최대 24개월(회)까지 지원되고, 생애 단 한 번만 받을 수 있습니다. 2026년부터는 이전 한시 특별지원 때 있던 청약통장 가입 필수 요건이 폐지되었습니다.',
      '2026년 1차 신청 기간은 2026년 3월 30일(월) 09시부터 5월 29일(금) 16시까지였습니다. 이 글을 작성한 2026년 7월 30일 기준으로 이 신청 기간은 이미 마감되었고, 선정자는 2026년 9월 14일(월) 발표될 예정이며 선정되면 5월분 월세부터 소급 지원됩니다. 즉 지금 이 글을 보고 있다면 2026년 1차 신청에는 새로 접수할 수 없고, 결과 발표를 기다리거나 다음 접수 시기(통상 매년 상반기)를 확인해야 합니다.',
      '신청은 복지로(bokjiro.go.kr) 온라인 또는 주소지 관할 주민센터 방문으로 할 수 있으며, 전국 6만명 규모로 모집되고 지역별 선정 인원이 다르게 배정됩니다. 서울시 등 일부 지자체는 자체 청년월세지원 사업을 별도로 운영하며 접수 기간이 다를 수 있으므로, 거주 지역 청년정책 포털도 함께 확인하는 것이 좋습니다.',
      '이 글의 금액·기준·일정은 2026년 7월 30일 기준으로 정부24·복지로 공식 페이지에서 확인한 내용입니다. 다만 소득·재산 기준의 세부 산정 방식(재산가액 환산 등)이나 다음 접수 회차 일정은 공고마다 바뀔 수 있으므로, 실제 신청 전 반드시 복지로(bokjiro.go.kr) 또는 정부24(gov.kr)에서 최신 공고문과 본인의 정확한 소득인정액을 확인하세요.',
    ],
    formula: {
      title: '청년월세 지원은 이렇게 신청하세요',
      steps: [
        '자격 확인 — 만 19~34세, 부모와 별도 거주, 무주택, 임차보증금 5천만원 이하·월세 60만원 이하(환산 합산 70만원 이하까지 예외 인정) 주택 거주 여부를 확인합니다.',
        '소득 기준 확인 — 청년 본인(청년가구) 소득이 기준 중위소득 60% 이하인지, 부모님을 포함한 원가구 소득이 기준 중위소득 100% 이하인지 두 가지를 모두 확인합니다. 정확한 소득인정액 계산은 복지로 자가진단 서비스를 이용하세요.',
        '신청 기간 확인 — 회차별 신청 기간(2026년 1차는 3월 30일~5월 29일이었음)이 공고되면 그 기간 안에만 접수할 수 있습니다. 복지로·정부24 공지사항 또는 거주 지역 시·군·구 홈페이지에서 다음 접수 일정을 확인하세요.',
        '서류 준비 — 월세지원 신청(변경)서, 청년월세지원 확인서, 소득·재산 신고서, 임대차계약 증빙 서류, 월세 이체 서류, 통장사본, 가족관계증명서, 주민등록등본 등을 준비합니다.',
        '신청 — 복지로(bokjiro.go.kr)에서 청년 본인이 본인인증 후 온라인으로 신청하거나, 주소지 관할 주민센터에 방문해 신청합니다.',
        '심사 및 결과 발표 — 서류·자격 심사 후 선정자가 발표됩니다(2026년 1차는 9월 14일 발표 예정). 선정되면 신청 월분부터 소급해 매월 계좌로 지원금이 입금됩니다.',
      ],
    },
    glossary: [
      { term: '청년월세 지원사업', definition: '무주택 청년의 월세 부담을 덜어주기 위해 국토교통부가 운영하는 사업으로, 월 최대 20만원을 최대 24개월(생애 1회) 지원합니다. 2022~2025년 "한시 특별지원"으로 운영되다가 2026년부터 매년 대상자를 뽑는 계속 사업으로 바뀌었습니다.' },
      { term: '기준 중위소득', definition: '정부가 매년 발표하는 가구원 수별 소득 중간값으로, 각종 복지사업의 소득 기준선으로 쓰입니다. 청년월세 지원은 청년가구는 60% 이하, 부모를 포함한 원가구는 100% 이하를 기준으로 삼습니다.' },
      { term: '원가구', definition: '신청 청년의 부모(가족관계등록부상 부모)로 구성된 가구를 말합니다. 청년 본인의 소득과 별개로 원가구의 소득도 기준 중위소득 100% 이하여야 지원 대상이 됩니다.' },
      { term: '청년가구(독립가구)', definition: '부모와 따로 거주하며 월세를 내는 청년 본인의 가구를 말합니다. 이 가구의 소득이 기준 중위소득 60% 이하여야 합니다.' },
      { term: '소급 지원', definition: '선정자 발표가 신청 마감 이후 늦게 나오는 대신, 선정되면 실제 신청했던 월(2026년 1차는 5월분)부터 그동안의 월세를 한꺼번에 계산해 지원해주는 방식입니다.' },
    ],
    faqs: [
      { q: '2026년 청년월세 지원 신청 기간은 언제인가요?', a: '2026년 1차 신청 기간은 2026년 3월 30일(월) 09시부터 5월 29일(금) 16시까지였습니다. 이 글 작성 시점(2026년 7월 30일)에는 이미 마감되었고, 선정자는 9월 14일(월) 발표될 예정입니다. 다음 접수 일정은 복지로(bokjiro.go.kr)와 정부24(gov.kr) 공지사항에서 확인하세요.' },
      { q: '올해 신청 기간을 놓쳤는데 다시 신청할 수 있나요?', a: '2026년부터 이 사업이 매년 대상자를 새로 뽑는 계속 사업으로 바뀌었으므로, 다음 연도(또는 지자체별 추가 접수)를 기다려야 합니다. 정확한 다음 접수 시기는 아직 공식적으로 확정 발표되지 않았으므로, 복지로·정부24를 주기적으로 확인하는 것을 권장합니다.' },
      { q: '지원 금액과 기간은 얼마인가요?', a: '실제 납부하는 월세 기준으로 월 최대 20만원씩, 최대 24개월(회)까지 지원됩니다. 생애 한 번만 받을 수 있고, 관리비와 보증금은 지원 대상에서 제외됩니다.' },
      { q: '나이 조건은 어떻게 되나요?', a: '만 19세부터 34세까지(1991년~2007년생, 접수 회차에 따라 해당 연도 기준으로 재산정)입니다. 정확한 출생연도 기준은 매 회차 공고문에 따라 조금씩 다를 수 있으므로 신청 시점의 공고문을 확인하세요.' },
      { q: '소득 기준은 어떻게 확인하나요?', a: '청년 본인(청년가구) 소득이 기준 중위소득 60% 이하이면서, 부모님을 포함한 원가구 소득도 기준 중위소득 100% 이하여야 합니다. 두 조건을 모두 충족해야 하며, 정확한 소득인정액은 복지로의 자가진단 서비스나 주민센터 상담을 통해 확인하는 것이 가장 정확합니다.' },
      { q: '전세로 살아도 지원받을 수 있나요?', a: '이 사업은 월세 지원이 기본이므로 순수 전세 거주자는 대상이 아닙니다. 보증부월세(반전세)의 경우 임차보증금 5천만원 이하, 월세 60만원 이하(또는 환산 합산 70만원 이하)라는 주거 요건을 충족해야 합니다.' },
      { q: '부모님과 함께 살면 신청할 수 없나요?', a: '네, 이 사업은 부모님과 별도로 거주하며 월세를 내는 무주택 청년을 대상으로 하므로, 부모님과 동거 중이라면 대상이 아닙니다.' },
      { q: '서울 등 지자체에도 별도의 청년월세 지원이 있나요?', a: '네, 서울시를 비롯한 일부 지자체는 국토교통부 사업과 별개로 자체 청년월세지원 사업을 운영하며 접수 기간과 세부 요건이 다를 수 있습니다. 거주 지역의 청년정책 포털이나 시·군·구 홈페이지를 함께 확인하는 것이 좋습니다.' },
    ],
    sources: [
      { label: '복지로 — 청년월세 지원사업 신청', url: 'https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=WLF00004661' },
      { label: '정부24 — 청년월세 지원 서비스 상세', url: 'https://www.gov.kr/portal/rcvfvrSvc/dtlEx/161300000099' },
      { label: '복지로 공식 블로그 — 2026년 청년월세 지원 신청 안내', url: 'https://blog.bokjiro.go.kr/1828' },
    ],
  },
```

- [ ] **Step 2: `src/pages/guides/YouthRentSubsidyGuide.tsx` 생성**

```tsx
import GuideArticlePage from '../../components/GuideArticlePage'

export default function YouthRentSubsidyGuide() {
  return <GuideArticlePage pageId="youthRentSubsidyGuide" />
}
```

- [ ] **Step 3: `src/App.tsx`의 `components` 맵에 추가**

```tsx
  youthRentSubsidyGuide: lazy(() => import('./pages/guides/YouthRentSubsidyGuide')),
```

- [ ] **Step 4: 검증**

Run: `npx tsc -b --noEmit && npm run build`

```bash
grep -c "청년월세" dist/guides/youth-rent-subsidy/index.html
```
Expected: 1 이상.

- [ ] **Step 5: 커밋**

```bash
git add src/lib/pageContent.js src/pages/guides/YouthRentSubsidyGuide.tsx src/App.tsx
git commit -m "content: 가이드 - 2026년 청년월세 지원 총정리 추가"
```

---

## Task 10: 가이드 — 청년도약계좌 총정리 (`youthLeapAccountGuide`)

라우트는 Task 3에서 이미 추가됨(`/guides/youth-leap-account`). 담당 서브에이전트가 금융위원회 공식 보도자료 2건 + 정책브리핑을 검색해 확인했다(최종 확인일 2026-07-30). **가장 중요한 발견:** 청년도약계좌 신규가입은 2025년 12월 5일 접수를 끝으로 마감되었고 계좌 개설도 2025년 12월 중 종료되었으며, 후속 상품 "청년미래적금"이 2026년 6월 출시되었다 — 이 사실을 글의 리드 문단으로 배치해, "지금도 가입할 수 있는 상품"처럼 오인되지 않도록 한다. 이 verbatim 내용을 그대로 사용한다.

**Files:**
- Modify: `src/lib/pageContent.js`
- Create: `src/pages/guides/YouthLeapAccountGuide.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: Task 1의 `GuideArticlePage`
- Produces: 없음

- [ ] **Step 1: `src/lib/pageContent.js`에 추가**

```js

  youthLeapAccountGuide: {
    intro: [
      '청년도약계좌는 만 19~34세 청년이 매달 최대 70만원까지 자유롭게 납입하면, 정부가 납입액의 일부를 "정부기여금"으로 추가 지급하고 만기 시 이자소득에 세금을 매기지 않는(비과세) 5년(60개월) 만기 정책형 적금 상품입니다.',
      '먼저 가장 중요한 사실부터 안내합니다. 청년도약계좌는 신규가입 접수가 2025년 12월 5일자로 마감되었고, 계좌 개설도 2025년 12월 중 모두 종료되었습니다. 이자소득 비과세의 근거 법령(조세특례제한법 제91조의22)이 2025년 12월 31일자로 일몰되었기 때문입니다. 따라서 2026년 7월 현재는 청년도약계좌에 새로 가입할 수 없습니다.',
      '대신 후속 상품인 "청년미래적금"이 2026년 6월 출시되었습니다. 만 19~34세, 월 최대 50만원 납입, 3년 만기 구조이며 연 2회(6월·12월) 가입자를 모집합니다. 신규로 목돈 마련 상품을 찾는다면 청년도약계좌가 아니라 이 청년미래적금의 최신 모집 일정을 확인해야 합니다.',
      '이미 청년도약계좌에 가입해 유지 중이라면 걱정할 필요는 없습니다. 가입일로부터 5년 만기까지 계좌를 그대로 유지하면 정부기여금과 이자소득 비과세 혜택을 만기까지 변함없이 받습니다. 신규가입 종료는 "새로 가입하는 길"이 막힌 것이지, 기존 가입자의 혜택이 사라지는 것이 아닙니다.',
      '가입 당시 적용되던 조건은 계좌개설일 기준 만 19~34세, 개인소득(총급여) 7,500만원 이하(또는 종합소득금액 6,300만원 이하), 가구소득은 기준 중위소득 이하(2024년 3월 기준이 180%에서 250%로 완화)였습니다. 다만 소득 구간별 정부기여금 매칭 비율의 세부 표는 자료마다 수치가 조금씩 달라 이 문서에서 확정하지 않습니다 — 정확한 구간별 비율은 서민금융진흥원 공식 페이지에서 확인하세요.',
      '2025년 1월부터는 모든 소득 구간에서 정부기여금 매칭 한도가 월 70만원까지 확대되고, 늘어난 구간에는 매칭비율 3.0%가 추가로 적용되어 최저소득 구간의 월 최대 기여금이 2만 4천원에서 3만 3천원으로 늘었습니다. 이는 금융위원회 공식 보도자료로 확인된 내용입니다.',
      '중도해지는 원칙적으로 정부기여금을 받지 못하고 그동안 면제받은 이자소득세도 추징되는 손해가 큰 선택입니다. 다만 2025년 조특법 개정으로 가입 후 3년 이상만 유지했다면 특별한 사유 없이 중도해지해도 비과세 혜택은 유지되고 정부기여금의 60%를 받을 수 있게 완화되었습니다. 생애최초 주택구입, 퇴직, 사업장 폐업, 천재지변, 3개월 이상 치료가 필요한 질병, 해외이주, 사망 등 법에서 정한 특별중도해지 사유에 해당하면 3년을 채우지 않아도 기여금과 비과세를 전액 유지할 수 있습니다. (최종 확인일: 2026-07-30)',
    ],
    formula: {
      title: '청년도약계좌 가입 조건은 이렇습니다',
      steps: [
        '신규가입 여부부터 확인하세요: 청년도약계좌 신규가입은 2025년 12월 5일 접수를 끝으로 마감되었고 계좌 개설도 2025년 12월 중 종료되었습니다. 2026년 현재는 새로 가입할 수 없습니다.',
        '이미 가입해 유지 중이라면: 가입일로부터 5년(60개월) 만기까지 계좌를 유지하면 정부기여금과 이자소득 비과세 혜택을 계속 받습니다. 별도로 할 일은 없습니다.',
        '(참고, 가입 당시 조건) 계좌개설일 기준 만 19~34세, 개인소득(직전 과세기간 총급여) 7,500만원 이하 또는 종합소득금액 6,300만원 이하, 가구소득 기준 중위소득 이하(2024년 3월부터 250% 이하로 완화)가 기본 가입 요건이었습니다.',
        '신규로 목돈 마련 상품에 가입하고 싶다면: 2026년 6월 출시된 후속 상품 "청년미래적금"을 확인하세요. 만 19~34세, 월 최대 50만원, 3년 만기이며 연 2회(6월·12월) 가입자를 모집합니다.',
        '청년도약계좌 가입자가 청년미래적금으로 전환하려면: 2026년 6월 최초 가입 기간에 한해 특별중도해지 방식으로 갈아탈 수 있고, 이 경우 그동안 쌓인 정부기여금과 비과세 혜택이 손실 없이 그대로 유지됩니다.',
        '정확한 최신 조건(재가입 여부, 소득 구간별 매칭비율표, 전환 세부 절차)은 반드시 서민금융진흥원·금융위원회 공식 발표로 다시 확인하세요. 정책은 계속 바뀌고 있습니다.',
      ],
    },
    glossary: [
      { term: '정부기여금', definition: '청년이 청년도약계좌에 납입한 금액의 일부를 정부가 매칭해 추가로 얹어주는 지원금입니다. 소득이 낮을수록 매칭 비율이 높게 설계되어 있으며, 2025년 1월부터 모든 소득 구간에서 매칭 한도가 월 70만원까지 확대되었습니다. 정확한 소득 구간별 매칭 비율은 서민금융진흥원 공식 페이지에서 확인이 필요합니다.' },
      { term: '비과세 혜택', definition: '만기까지 유지하면 계좌에서 발생한 이자소득에 대해 15.4%의 이자소득세를 매기지 않는 혜택입니다. 원칙적으로 중도해지 시 이 혜택은 사라지고 그동안 면제받은 세금이 추징되지만, 3년 이상 유지 후 해지하거나 특별중도해지 사유에 해당하면 유지됩니다.' },
      { term: '특별중도해지', definition: '생애최초 주택구입, 퇴직, 사업장 폐업, 천재지변, 3개월 이상 치료가 필요한 질병, 해외이주, 사망 등 법에서 정한 사유로 만기 전에 해지하는 경우입니다. 3년 유지 요건과 무관하게 정부기여금과 비과세 혜택을 전액 유지한 채 해지할 수 있습니다.' },
      { term: '청년미래적금', definition: '청년도약계좌 신규가입 종료 이후 2026년 6월 출시된 후속 정책형 적금입니다. 월 최대 50만원, 3년 만기이며 연 2회(6월·12월) 신규 가입자를 모집합니다. 청년도약계좌 가입자는 2026년 6월 최초 가입 기간에 한해 특별중도해지 방식으로 손실 없이 갈아탈 수 있습니다.' },
      { term: '기준 중위소득', definition: '가구소득 요건을 판단하는 기준선입니다. 청년도약계좌는 가입 당시 기준 중위소득의 일정 비율 이하인 가구만 가입할 수 있었고, 그 비율이 2024년 3월 180%에서 250%로 완화되었습니다.' },
    ],
    faqs: [
      { q: '2026년에도 청년도약계좌에 신규로 가입할 수 있나요?', a: '아니요. 청년도약계좌 신규가입은 2025년 12월 5일 접수를 끝으로 마감되었고 계좌 개설도 2025년 12월 중 모두 종료되었습니다. 2026년 현재는 새로 가입할 수 없으며, 후속 상품인 청년미래적금을 확인해야 합니다.' },
      { q: '이미 가입한 사람은 어떻게 되나요?', a: '기존 가입자는 아무런 영향을 받지 않습니다. 가입일로부터 5년(60개월) 만기까지 계좌를 유지하면 정부기여금과 이자소득 비과세 혜택을 그대로 받습니다.' },
      { q: '정부기여금은 정확히 얼마나 받나요?', a: '소득이 낮을수록 매칭 비율이 높고, 2025년 1월부터 모든 소득 구간에서 매칭 한도가 월 70만원까지 확대되어 최저소득 구간은 월 최대 기여금이 2만 4천원에서 3만 3천원으로 늘었습니다. 다만 소득 구간별 전체 매칭비율표는 자료마다 수치가 달라 이 글에서 확정하지 않습니다 — 서민금융진흥원 공식 페이지에서 본인 소득 구간 기준으로 확인하세요.' },
      { q: '중도해지하면 불이익이 있나요?', a: '원칙적으로 정부기여금을 받지 못하고 그동안 면제받은 이자소득세도 추징됩니다. 다만 3년 이상 유지 후 해지하면 비과세 혜택은 유지되고 정부기여금의 60%를 받을 수 있으며, 생애최초 주택구입·퇴직·사업장 폐업·천재지변·3개월 이상 치료가 필요한 질병·해외이주·사망 등 특별중도해지 사유에 해당하면 3년을 채우지 않아도 전액 유지됩니다.' },
      { q: '청년미래적금이 뭔가요?', a: '청년도약계좌 신규가입 종료 이후 2026년 6월 출시된 후속 정책형 적금입니다. 월 최대 50만원 납입, 3년 만기이며 연 2회(6월·12월) 가입자를 모집합니다. 구체적인 가입 대상·정부기여금 매칭 비율은 별도 확인이 필요합니다.' },
      { q: '청년도약계좌에서 청년미래적금으로 갈아탈 수 있나요?', a: '네. 2026년 6월 최초 가입 기간에 한해 청년미래적금 가입 후 청년도약계좌를 특별중도해지하는 방식으로 전환할 수 있고, 이 경우 그동안 쌓인 정부기여금과 비과세 혜택이 손실 없이 유지됩니다.' },
      { q: '가입 조건(나이·소득)은 정확히 어떻게 되나요?', a: '가입 당시 기준으로 계좌개설일 만 19~34세, 개인소득 총급여 7,500만원 이하(또는 종합소득금액 6,300만원 이하), 가구소득 기준 중위소득 이하(2024년 3월부터 250% 이하)였습니다. 다만 신규가입이 이미 종료되었으므로 이 조건은 참고용이며, 향후 재가입이 열린다면 조건이 달라질 수 있습니다.' },
      { q: '가장 정확한 최신 정보는 어디서 확인하나요?', a: '서민금융진흥원(kinfa.or.kr)과 금융위원회(fsc.go.kr) 공식 홈페이지, 그리고 청년미래적금 관련 공지가 가장 정확합니다. 이 글의 수치는 2026년 7월 30일 기준으로 확인한 내용이며, 정책은 이후에도 바뀔 수 있습니다.' },
    ],
    sources: [
      { label: '금융위원회 — 청년미래적금 가입절차·심사일정 안내', url: 'https://www.fsc.go.kr/no010101/87106' },
      { label: '금융위원회 — 청년도약계좌 기여금 확대 보도자료', url: 'https://www.fsc.go.kr/no010101/83729' },
      { label: '대한민국 정책브리핑 — 청년미래적금 6월 출시', url: 'https://www.korea.kr/news/policyNewsView.do?newsId=148963384' },
    ],
  },
```

- [ ] **Step 2: `src/pages/guides/YouthLeapAccountGuide.tsx` 생성**

```tsx
import GuideArticlePage from '../../components/GuideArticlePage'

export default function YouthLeapAccountGuide() {
  return <GuideArticlePage pageId="youthLeapAccountGuide" />
}
```

- [ ] **Step 3: `src/App.tsx`의 `components` 맵에 추가**

```tsx
  youthLeapAccountGuide: lazy(() => import('./pages/guides/YouthLeapAccountGuide')),
```

- [ ] **Step 4: 검증**

Run: `npx tsc -b --noEmit && npm run build`

```bash
grep -c "청년미래적금" dist/guides/youth-leap-account/index.html
```
Expected: 1 이상(신규가입 종료 사실이 실제로 포함됐는지 확인).

- [ ] **Step 5: 커밋**

```bash
git add src/lib/pageContent.js src/pages/guides/YouthLeapAccountGuide.tsx src/App.tsx
git commit -m "content: 가이드 - 청년도약계좌 총정리 추가 (신규가입 종료·후속상품 반영)"
```

---

## Task 11: 가이드 — 청년 전세자금대출(버팀목) 총정리 (`youthJeonseLoanGuide`)

라우트는 Task 3에서 이미 추가됨(`/guides/youth-jeonse-loan`). 담당 서브에이전트가 주택도시기금(nhuf.molit.go.kr) 공식 상품안내·이용절차 페이지 2개를 직접 확인해 작성했다(최종 확인일 2026-07-30). 2차 출처 간 대출한도 수치가 엇갈려(공식 1.5억 vs 일부 블로그 2억) 공식 페이지 수치를 채택했다.

**Files:**
- Modify: `src/lib/pageContent.js`
- Create: `src/pages/guides/YouthJeonseLoanGuide.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: Task 1의 `GuideArticlePage`
- Produces: 없음

- [ ] **Step 1: `src/lib/pageContent.js`에 추가**

```js

  youthJeonseLoanGuide: {
    intro: [
      '청년전용 버팀목전세자금대출은 주택도시기금이 무주택 청년의 전세보증금 마련을 돕기 위해 시중은행을 통해 취급하는 정책 서민금융 상품입니다. 일반 은행 전세자금대출보다 금리가 낮고, 소득이 적을수록 더 낮은 금리가 적용되는 구조입니다.',
      '자격요건은 대출신청일 기준 만 19세 이상 ~ 만 34세 이하이면서 무주택 세대주(예비 세대주 포함)여야 합니다. 부부합산 연소득은 5,000만원 이하가 기본이며, 신혼가구(혼인기간 등 요건 충족 시)는 7,500만원 이하, 2자녀 이상 가구는 6,000만원 이하까지 완화됩니다. 이와 별도로 순자산가액 3.45억원 이하 요건도 충족해야 하는데, 이 금액 기준은 매년 조정될 수 있으므로 신청 시점의 공고를 다시 확인하는 것이 안전합니다.',
      '대출한도는 최대 1억 5,000만원 이내이며, 만 25세 미만 단독세대주는 1억 2,000만원 이내로 더 낮게 적용됩니다. 두 경우 모두 임차보증금의 80% 이내 범위에서만 대출이 나옵니다. 대상 주택은 전용면적 85㎡ 이하(만 25세 미만은 60㎡ 이하), 임차보증금 3억원 이하의 주택이며 주거용 오피스텔도 포함됩니다.',
      '금리는 변동금리이며, 부부합산 연소득 구간에 따라 연 2.2%(2천만원 이하)부터 연 3.3%(6천만~7,500만원)까지 차등 적용됩니다. 지방 소재 주택은 0.2%p가 추가로 인하되고, 기초생활수급권자·한부모가구(최대 1.0%p), 다자녀가구(0.7%p) 등 요건을 충족하면 우대금리가 추가로 붙습니다. 중도상환수수료는 없습니다.',
      '대출기간은 2년 단위이며 최장 10년까지 연장할 수 있고, 다만 임차차임 종료일을 넘겨 대출을 유지할 수는 없습니다. 신청은 잔금지급일과 주민등록등본상 전입일 중 더 빠른 날로부터 3개월 이내에 해야 하며, 계약을 갱신하는 경우에는 갱신일로부터 3개월 이내에 신청해야 합니다.',
      '신청은 온라인으로 기금e든든(enhuf.molit.go.kr)에서 하거나, 우리·KB국민·신한·NH농협·하나은행 등 기금 수탁은행 영업점을 방문해 접수할 수 있습니다. 신청 후 주택도시보증공사(HUG)의 자산심사를 거쳐 결과가 SMS로 통보되고, 은행 영업점에서 소득·담보물 심사를 마치면 대출이 실행됩니다.',
      '군복무 이행 기간만큼 연령 상한이 늘어나는지, 순자산가액을 구체적으로 어떻게 산정하는지, 그리고 실제 취급은행 전체 목록 등 일부 세부 사항은 이번 조사에서 정부 1차 공식 페이지로 명확히 확인하지 못했습니다. 이런 부분은 아래 FAQ에서 "확인 필요"로 표시했으며, 정확한 내용은 주택도시기금 공식 사이트(nhuf.molit.go.kr)나 주택도시보증공사 콜센터(1566-9009)에서 다시 확인하시기 바랍니다. (최종 확인일: 2026-07-30)',
    ],
    formula: {
      title: '버팀목전세대출은 이렇게 신청하세요',
      steps: [
        '기금포털이나 취급은행 상담을 통해 나이·소득·순자산·무주택 여부 등 기본 자격요건을 먼저 확인합니다.',
        '온라인은 기금e든든(enhuf.molit.go.kr), 오프라인은 우리·KB국민·신한·NH농협·하나은행 등 기금 수탁은행 영업점에서 대출을 신청합니다.',
        '주택도시보증공사(HUG)가 신청인의 자산 정보를 수집해 자산심사를 진행합니다.',
        '심사 결과는 신청 시 입력한 휴대폰 번호로 SMS 통보됩니다.',
        '은행 영업점에 신분증, 주민등록등본, 소득확인서류, 확정일자부 임대차계약서, 건물 등기사항전부증명서 등을 제출하면 소득심사와 담보물(주택) 심사가 진행됩니다.',
        '심사를 통과하면 대출 가능 여부와 한도가 확정되고 대출이 실행됩니다. 잔금지급일과 전입일 중 빠른 날로부터 3개월 이내에 신청을 마쳐야 합니다.',
      ],
    },
    glossary: [
      { term: '무주택 세대주(예비 세대주 포함)', definition: '신청인 본인뿐 아니라 주민등록등본상 세대원 전체가 대출 신청일 기준 주택을 소유하고 있지 않아야 하는 요건입니다. 아직 세대를 분리하지 않았지만 대출 실행 전 분리 예정인 예비 세대주도 신청할 수 있습니다.' },
      { term: '기금e든든', definition: '주택도시기금 대출을 온라인으로 신청·조회할 수 있는 공식 사이트(enhuf.molit.go.kr)입니다. 은행 방문 없이 자격요건 확인과 신청 접수가 가능합니다.' },
      { term: '순자산가액', definition: '신청인(부부합산)의 자산 총액에서 부채를 뺀 금액입니다. 청년전용 버팀목전세자금대출은 이 금액이 일정 기준(2026년 기준 3.45억원) 이하여야 신청할 수 있으며, 기준 금액은 매년 조정될 수 있습니다.' },
      { term: '기금 수탁은행', definition: '주택도시기금 대출 상담·접수·실행 업무를 국토교통부로부터 위탁받아 처리하는 시중은행입니다. 우리·KB국민·신한·NH농협·하나은행 등이 해당하며, 신청인은 이 은행 영업점을 방문해 서류를 제출하고 심사를 받습니다.' },
      { term: '우대금리', definition: '기본금리에서 추가로 깎아주는 금리 감면 항목입니다. 기초생활수급권자·한부모가구, 다자녀가구, 지방 소재 주택 등 요건을 충족하면 중복 적용될 수 있어 실제 적용 금리는 기본금리표보다 낮아질 수 있습니다.' },
    ],
    faqs: [
      { q: '몇 살까지 신청할 수 있나요?', a: '대출신청일 기준 만 19세 이상 만 34세 이하여야 합니다. 군복무 이행 기간만큼 상한 연령이 늘어난다는 안내가 여러 곳에 있지만, 이번 조사의 정부 1차 공식 페이지에서는 이 부분을 명확히 확인하지 못했습니다. 병역 이행 경력이 있다면 신청 전 은행이나 HUG 콜센터(1566-9009)에 나이 요건을 다시 확인하세요.' },
      { q: '소득 기준은 어떻게 되나요?', a: '부부합산 연소득 5,000만원 이하가 기본이고, 신혼가구는 7,500만원 이하, 2자녀 이상 가구는 6,000만원 이하까지 완화된 기준이 적용됩니다. 순자산가액(2026년 기준 3.45억원 이하) 요건도 별도로 충족해야 합니다.' },
      { q: '대출한도는 얼마인가요?', a: '최대 1억 5,000만원 이내이며, 만 25세 미만 단독세대주는 1억 2,000만원 이내로 더 낮게 적용됩니다. 두 경우 모두 임차보증금의 80% 이내 범위에서만 대출됩니다.' },
      { q: '금리는 정확히 얼마인가요?', a: '변동금리이며 부부합산 연소득 구간에 따라 연 2.2%(2천만원 이하)~연 3.3%(6천만~7,500만원)입니다. 지방 소재 주택은 0.2%p 추가 인하되고, 기초생활수급권자·한부모가구(최대 1.0%p)·다자녀가구(0.7%p) 등 우대금리가 중복 적용될 수 있습니다.' },
      { q: '오피스텔에 살아도 대출받을 수 있나요?', a: '네. 전용면적 85㎡ 이하(만 25세 미만은 60㎡ 이하), 보증금 3억원 이하 조건을 충족하면 주거용 오피스텔도 대상 주택에 포함됩니다.' },
      { q: '신청은 언제까지 해야 하나요?', a: '잔금지급일과 주민등록등본상 전입일 중 더 빠른 날로부터 3개월 이내에 신청해야 합니다. 계약을 갱신하는 경우에는 갱신일로부터 3개월 이내입니다. 이 기한을 넘기면 신청 자체가 불가능해질 수 있으니 이사 후 바로 은행 상담을 받는 것이 안전합니다.' },
      { q: '온라인으로만 신청할 수 있나요?', a: '기금e든든(enhuf.molit.go.kr)에서 온라인 신청이 가능하고, 우리·KB국민·신한·NH농협·하나은행 등 기금 수탁은행 영업점을 방문해 접수할 수도 있습니다. 취급은행의 정확한 전체 목록과 지점별 취급 여부는 방문 전 해당 은행 고객센터에 확인하는 것이 좋습니다.' },
      { q: '순자산가액은 어떻게 계산하나요?', a: '부동산·금융자산 등에서 부채를 뺀 금액을 기준으로 주택도시보증공사(HUG)가 자산심사 과정에서 산정합니다. 구체적인 산정 방식과 매년 바뀌는 기준 금액은 이 글에서 다루지 않으니, 정확한 계산 방법은 신청 시 HUG 자산심사센터(1551-3119)나 공식 사이트에서 확인하세요.' },
    ],
    sources: [
      { label: '주택도시기금 - 청년전용 버팀목전세자금 상품안내', url: 'https://nhuf.molit.go.kr/FP/FP05/FP0502/FP05020301.jsp' },
      { label: '주택도시기금 - 이용절차 및 제출서류', url: 'https://nhuf.molit.go.kr/FP/FP05/FP0502/FP05020302.jsp' },
      { label: '기금e든든(온라인 신청)', url: 'https://enhuf.molit.go.kr' },
    ],
  },
```

- [ ] **Step 2: `src/pages/guides/YouthJeonseLoanGuide.tsx` 생성**

```tsx
import GuideArticlePage from '../../components/GuideArticlePage'

export default function YouthJeonseLoanGuide() {
  return <GuideArticlePage pageId="youthJeonseLoanGuide" />
}
```

- [ ] **Step 3: `src/App.tsx`의 `components` 맵에 추가**

```tsx
  youthJeonseLoanGuide: lazy(() => import('./pages/guides/YouthJeonseLoanGuide')),
```

- [ ] **Step 4: 검증**

Run: `npx tsc -b --noEmit && npm run build`

```bash
grep -c "버팀목" dist/guides/youth-jeonse-loan/index.html
```
Expected: 1 이상.

- [ ] **Step 5: 커밋**

```bash
git add src/lib/pageContent.js src/pages/guides/YouthJeonseLoanGuide.tsx src/App.tsx
git commit -m "content: 가이드 - 청년 전세자금대출(버팀목) 총정리 추가"
```

---

## Task 12: 가이드 — 국민취업지원제도 신청 조건 (`nationalEmploymentSupportGuide`)

라우트는 Task 3에서 이미 추가됨(`/guides/national-employment-support`). 담당 서브에이전트가 고용24(work24.go.kr)·정부24 공식 페이지 및 2026년 고용노동부 보도자료(추경 청년 3만명 한시 지원)를 확인해 작성했다(최종 확인일 2026-07-30). 구직촉진수당 정확한 금액은 시점별로 인상 이력이 있어 본문에 "재확인 필요" 헤지가 포함되어 있다.

**Files:**
- Modify: `src/lib/pageContent.js`
- Create: `src/pages/guides/NationalEmploymentSupportGuide.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: Task 1의 `GuideArticlePage`
- Produces: 없음

- [ ] **Step 1: `src/lib/pageContent.js`에 추가**

```js

  nationalEmploymentSupportGuide: {
    intro: [
      '국민취업지원제도는 고용노동부가 운영하는 한국형 실업부조로, 저소득 구직자에게 1:1 취업상담·직업훈련 같은 취업지원서비스와 함께 현금성 지원(구직촉진수당 또는 취업활동비용)을 제공합니다. 신청은 고용24(work24.go.kr) 온라인 또는 거주지 관할 고용센터 방문으로 접수합니다.',
      '제도는 크게 I유형과 II유형으로 나뉩니다. I유형은 구직촉진수당과 취업지원서비스를 함께 받는 유형으로, 다시 소득·재산·취업경험을 모두 충족해야 하는 "요건심사형"과 취업경험이 부족해도 소득·재산 요건만 맞으면 선발될 수 있는 "선발형"(청년특례 등)으로 나뉩니다. II유형은 구직촉진수당 없이 취업활동비용과 취업지원서비스만 받는 유형으로, 특정계층·청년(만 15~34세, 소득 무관)·중장년(만 35~69세, 중위소득 100% 이하)이 대상입니다.',
      'I유형 요건심사형의 자격 요건은 만 15~69세 구직자로, 가구단위 중위소득 60% 이하이면서 가구원 합산 재산 4억원 이하(만 15~34세 청년은 5억원 이하)여야 하고, 최근 2년 이내 100일 또는 800시간 이상의 취업 경험이 있어야 합니다. I유형 선발형(청년특례)은 만 15~34세(병역의무 이행기간만큼 연령 상한이 가산)면서 가구단위 중위소득 120% 이하, 재산 5억원 이하이면 취업 경험과 무관하게 신청할 수 있습니다. 2026년에는 추가경정예산으로 취업 경험이 없는 저소득 청년을 대상으로 한 I유형(선발형) 한시 지원이 4월 27일부터 시행 중이며, 선착순 3만 명 도달 시 조기 마감될 수 있다고 고용노동부가 밝혔습니다.',
      'I유형 구직촉진수당은 월 60만원씩 6개월간(총 360만원) 지급되며, 미성년 자녀·고령자·중증장애인 등 부양가족이 있으면 1인당 월 10만원이 가산됩니다. 다만 이 금액은 과거(2022년 전후) 자료에는 월 50만원으로도 나오는 등 시점에 따라 인상이 있었던 항목이라, 실제 신청 시점의 정확한 금액은 고용24 공지사항에서 다시 확인하는 것이 안전합니다. II유형의 취업활동비용(훈련참여지원수당 등) 금액과 지급 방식은 최근 개편 논의가 있어 이 글에서는 구체적 금액을 단정하지 않으니, 반드시 고용24 또는 관할 고용센터에서 최신 기준을 확인하세요.',
      '수당은 신청 즉시 지급되지 않습니다. 신청 후 소득·재산 심사를 거쳐 수급자격이 인정되면, 상담사와 함께 "취업활동계획(IAP)"을 수립해야 1회차 구직촉진수당이 지급되고, 이후 회차는 계획에 정해진 구직활동(입사지원, 직업훈련 참여 등)을 실제로 이행해야 지급됩니다. 정당한 사유 없이 구직활동 의무를 이행하지 않으면 해당 회차 수당 지급이 중단될 수 있고, 지급 중단이 3회 누적되면 남은 수당을 받을 권리 자체가 없어질 수 있습니다. 반대로 취업활동계획 수립 후 3개월 이내에 조기 취업하면, 남은 수당의 50%를 조기취업성공수당으로 받을 수 있습니다.',
      '신청은 고용24 회원가입 후 워크넷 구직등록을 먼저 마치고, 국민취업지원제도 참여신청서와 개인정보 수집·이용 동의서를 온라인으로 제출하거나 관할 고용센터에 방문해 제출하는 방식입니다. 소득·재산 증빙, 취업경험 증빙 등 첨부서류는 유형과 개인 상황(재직 여부, 부양가족 유무 등)에 따라 달라지므로, 정확한 서류 목록은 신청 전 고용24 안내나 고용센터 상담을 통해 확인하는 것이 좋습니다.',
      '이 글은 2026년 7월 30일 기준으로 고용24·정부24·고용노동부 공식 자료를 확인해 작성했지만, 소득·재산 기준과 지급액은 예산·정책 상황에 따라 수시로 바뀔 수 있는 항목입니다. 신청 전에는 반드시 고용24(work24.go.kr) 공지사항이나 관할 고용센터, 고용노동부 고객상담센터(국번없이 1350)를 통해 최신 기준을 다시 확인하세요.',
    ],
    formula: {
      title: '국민취업지원제도는 이렇게 신청하세요',
      steps: [
        '고용24(work24.go.kr)에 회원가입하고, 국민취업지원제도 안내 동영상 교육을 수강합니다.',
        '워크넷에서 구직등록을 완료합니다 (온라인 신청의 필수 선행 절차).',
        '국민취업지원제도 참여신청서와 개인정보 수집·이용·제공 동의서를 온라인 제출하거나, 거주지 관할 고용센터에 방문해 제출합니다.',
        '고용센터가 소득·재산·취업경험 요건을 심사해 수급자격 인정 여부를 통보합니다 (통상 약 1개월 소요).',
        '수급자격이 인정되면 담당 상담사와 함께 구직활동 계획(취업활동계획, IAP)을 수립합니다 — 이 계획 수립이 끝나야 1회차 구직촉진수당(I유형)이 지급됩니다.',
        '이후 회차는 계획에 정해진 구직활동(입사지원, 훈련 참여 등)을 실제로 이행한 것이 확인되어야 지급되며, 정해진 주기마다 이행 여부를 보고해야 합니다.',
      ],
    },
    glossary: [
      { term: 'I유형', definition: '구직촉진수당(현금)과 취업지원서비스를 함께 받는 유형입니다. 소득·재산·취업경험을 모두 충족하는 "요건심사형"과, 취업경험이 부족해도 소득·재산 요건만 맞으면 선발되는 "선발형"(청년특례 등)으로 나뉩니다.' },
      { term: 'II유형', definition: '구직촉진수당 없이 취업활동비용과 취업지원서비스만 받는 유형입니다. 특정계층, 청년(만 15~34세, 소득 무관), 중장년(만 35~69세, 중위소득 100% 이하)이 대상입니다.' },
      { term: '구직촉진수당', definition: 'I유형 대상자에게 매월 지급되는 현금 지원입니다. 취업활동계획을 수립해야 1회차가 지급되고, 이후에는 구직활동 의무를 이행해야 다음 회차가 지급됩니다. 정확한 월 지급액은 신청 시점에 고용24에서 다시 확인해야 합니다.' },
      { term: '취업활동계획(IAP)', definition: '수급자격이 인정된 사람이 담당 상담사와 함께 세우는 개인별 구직활동 계획서입니다. 입사지원, 직업훈련 참여 등 구체적인 의무가 명시되며, 이를 이행해야 수당이 계속 지급됩니다.' },
      { term: '청년특례(선발형)', definition: 'I유형 선발형 중 만 15~34세(병역의무 이행기간만큼 연령 상한 가산) 청년에게 적용되는 완화된 요건입니다. 중위소득 120% 이하·재산 5억원 이하이면 취업 경험이 없어도 신청할 수 있습니다.' },
    ],
    faqs: [
      { q: 'I유형과 II유형 중 저는 어디에 해당하나요?', a: '최근 2년 이내 100일 또는 800시간 이상의 취업 경험이 있고 중위소득 60% 이하·재산 4억원(청년 5억원) 이하라면 I유형 요건심사형 대상입니다. 취업 경험이 부족해도 청년(만 15~34세)이면서 중위소득 120% 이하·재산 5억원 이하면 I유형 선발형(청년특례) 대상이 될 수 있습니다. 두 조건 모두 해당하지 않으면 소득 기준이 더 완화된 II유형 대상인지 고용24에서 확인해보세요.' },
      { q: '취업 경험이 전혀 없어도 신청할 수 있나요?', a: '네. I유형 선발형(청년특례)은 소득·재산 요건만 충족하면 취업 경험 없이도 신청할 수 있습니다. 2026년에는 추가경정예산으로 취업 경험이 없는 저소득 청년 3만 명을 한시적으로 지원하는 프로그램이 4월 27일부터 시행 중이었는데, 선착순 마감 인원이 이미 찼을 수 있으니 고용24에서 접수 현황을 확인하세요.' },
      { q: '구직촉진수당은 정확히 얼마를 받나요?', a: '확인 시점 기준으로 I유형은 월 60만원씩 6개월(총 360만원)이 지급되고, 미성년 자녀 등 부양가족 1인당 월 10만원이 추가됩니다. 다만 이 금액은 과거 인상 이력이 있는 항목이라 신청 시점에 달라졌을 수 있으므로, 정확한 금액은 반드시 고용24 공지사항에서 재확인하세요.' },
      { q: '재산 기준(4억원/5억원)에는 어떤 재산이 포함되나요?', a: '부동산, 금융재산, 자동차 등 가구원 합산 재산을 기준으로 하며, 부채 공제나 재산 산정 방식 등 세부 기준은 고용24 안내 자료나 고용센터 상담을 통해 확인해야 정확합니다. 이 글에서 세부 산정식까지 단정하지 않으니 실제 신청 전 관할 고용센터에 문의하세요.' },
      { q: '신청 후 얼마나 있어야 수당을 받을 수 있나요?', a: '신청서 접수 후 소득·재산·취업경험 요건 심사를 거쳐 수급자격 인정 여부가 통보되기까지 통상 약 1개월이 걸립니다. 수급자격이 인정된 뒤 취업활동계획을 수립해야 1회차 수당이 지급되므로, 실제 첫 지급까지는 신청일로부터 더 시간이 걸릴 수 있습니다.' },
      { q: '구직활동을 제대로 못 하면 수당을 못 받나요?', a: '정당한 사유 없이 취업활동계획에 정해진 구직활동을 이행하지 않으면 해당 회차 수당 지급이 중단될 수 있습니다. 지급 중단이 3회 누적되면 남은 수당을 받을 권리 자체가 소멸될 수 있으니, 계획을 이행하기 어려운 사정이 생기면 미리 담당 상담사와 상의하는 것이 중요합니다.' },
      { q: 'II유형은 얼마를 지원받나요?', a: 'II유형은 구직촉진수당 대신 취업활동비용(훈련 관련 수당 등)과 취업지원서비스를 받는데, 최근 지원 항목·금액 개편 논의가 있어 이 글에서 구체적 금액을 단정하지 않습니다. 정확한 현재 지원 내용은 고용24 홈페이지나 관할 고용센터에서 확인하세요.' },
      { q: '신청은 어디서, 어떻게 하나요?', a: '고용24(work24.go.kr)에서 온라인으로 신청하거나, 거주지 관할 고용센터에 직접 방문해 신청할 수 있습니다. 온라인 신청 전에는 워크넷 구직등록과 제도 안내 동영상 교육 수강이 선행되어야 합니다. 궁금한 점은 고용노동부 고객상담센터(국번없이 1350)로 문의할 수 있습니다.' },
    ],
    sources: [
      { label: '고용24 - 국민취업지원제도 취업지원신청 소개', url: 'https://www.work24.go.kr/ua/z/z/1300/selectEmssRqutIntro.do' },
      { label: '정부24 - 국민취업지원제도 취업지원신청', url: 'https://www.gov.kr/portal/rcvfvrSvc/dtlEx/149200005007' },
      { label: '고용노동부 - 청년 3만 명, 취업 경험 없어도 국민취업지원제도 지원', url: 'https://www.moel.go.kr/news/enews/report/enewsView.do?news_seq=19309' },
    ],
  },
```

- [ ] **Step 2: `src/pages/guides/NationalEmploymentSupportGuide.tsx` 생성**

```tsx
import GuideArticlePage from '../../components/GuideArticlePage'

export default function NationalEmploymentSupportGuide() {
  return <GuideArticlePage pageId="nationalEmploymentSupportGuide" />
}
```

- [ ] **Step 3: `src/App.tsx`의 `components` 맵에 추가**

```tsx
  nationalEmploymentSupportGuide: lazy(() => import('./pages/guides/NationalEmploymentSupportGuide')),
```

- [ ] **Step 4: 검증**

Run: `npx tsc -b --noEmit && npm run build`

```bash
grep -c "구직촉진수당" dist/guides/national-employment-support/index.html
```
Expected: 1 이상.

- [ ] **Step 5: 커밋**

```bash
git add src/lib/pageContent.js src/pages/guides/NationalEmploymentSupportGuide.tsx src/App.tsx
git commit -m "content: 가이드 - 국민취업지원제도 신청 조건 추가"
```

---

## Task 13: 최종 검증

**Files:**
- 없음 (검증 전용 태스크, 코드 변경 없음)

**Interfaces:**
- 없음

- [ ] **Step 1: 타입 체크 + 빌드 + 린트**

Run: `npx tsc -b --noEmit && npm run build && npm run lint`
Expected: 모두 성공.

- [ ] **Step 2: 라우트/콘텐츠 정합성 일괄 확인**

```bash
node --input-type=module -e "
import { pageContent } from './src/lib/pageContent.js'
import { readFileSync } from 'node:fs'
const routes = JSON.parse(readFileSync('./src/routes.json', 'utf8'))
const guideRoutes = routes.filter(r => r.group === '가이드')
console.log('가이드 라우트 개수:', guideRoutes.length, '(기대: 9 = 목록 1 + 글 8)')
const missing = guideRoutes.filter(r => r.id !== 'guidesIndex' && !pageContent[r.id])
console.log('pageContent 누락:', missing.map(r => r.id))
"
```
Expected: `가이드 라우트 개수: 9`, `pageContent 누락: []`.

- [ ] **Step 3: 사이드바 아코디언에 "가이드" 그룹이 노출되지 않는지 확인**

```bash
node --input-type=module -e "
import groups from './src/groups.json' with { type: 'json' }
console.log('groups.json에 가이드 포함 여부:', groups.includes('가이드'))
"
```
Expected: `false`. (Node 버전에 따라 import assertion 구문 오류가 나면 `readFileSync`+`JSON.parse`로 대체해 확인.)

- [ ] **Step 4: 8개 가이드 페이지가 실제로 프리렌더되고 각자의 formula/faqs가 정적 HTML에 포함되는지 표본 확인**

```bash
for p in yearend-tax-procedure jeonse-deposit-recovery severance-interim-settlement unemployment-application youth-rent-subsidy youth-leap-account youth-jeonse-loan national-employment-support; do
  echo "--- $p ---"
  grep -c "자주 묻는 질문" "dist/guides/$p/index.html"
done
```
Expected: 8개 전부 `1` 이상 출력.

- [ ] **Step 5: 가이드 목록 페이지 확인**

```bash
grep -c "전체 가이드" dist/guides/index.html
```
Expected: 1 이상.

- [ ] **Step 6: 관련 계산기 링크(트랙1 4편)가 실제 계산기 경로를 가리키는지 확인**

```bash
grep -o '관련 계산기.*' dist/guides/yearend-tax-procedure/index.html || true
grep "/year-end-tax/" src/pages/guides/YearEndTaxProcedureGuide.tsx
grep "/jeonse-conversion/" src/pages/guides/JeonseDepositRecoveryGuide.tsx
grep "/severance/" src/pages/guides/SeveranceInterimGuide.tsx
grep "/unemployment/" src/pages/guides/UnemploymentApplicationGuide.tsx
```
Expected: 4개 파일 모두 해당 경로 문자열 포함.

- [ ] **Step 7: 수동 스팟체크 (가능하면 브라우저, 불가능하면 `npm run dev` + curl로 대체)**

`npm run dev` 후 `/guides`를 열어: (a) 트랙1/트랙2로 나뉘어 8개 카드가 보이는지, (b) 카드 클릭 시 해당 가이드로 이동하는지(새로고침 발생은 정상), (c) 데스크톱 좌측 사이드바 상단과 모바일 메뉴에 "📖 가이드" 링크가 보이고 클릭 시 새로고침 없이 `/guides`로 이동하는지, (d) 가이드 글 하단에 관련 계산기 링크(트랙1) 또는 아무것도 없음(트랙2)이 올바른지, (e) 좌측 사이드바 아코디언 목록에 "가이드"라는 그룹이 전혀 나타나지 않는지.

Expected: 모두 정상.

- [ ] **Step 8: 최종 커밋**

```bash
git add -A
git commit -m "docs: 가이드 섹션 최종 검증 완료" --allow-empty
```

