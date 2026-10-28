# 가이드 중심 구조 개편 + 에디토리얼 리디자인 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 홈·허브 5개를 가이드 중심으로 재구성하고, 사이드바를 상단 내비게이션 + "도구" 패널로 바꾸며 사이트 전체를 에디토리얼(종이·잉크·적갈색, 세리프 제목) 디자인으로 바꾼다.

**Architecture:** 주제 데이터(`topics.json`)가 허브·홈·내비게이션·프리렌더를 모두 구동한다. 디자인은 Tailwind v4 `@theme` 토큰으로 정의하고, 공용 컴포넌트(`ui.tsx`, `InfoSection`, `GuideArticlePage`, 새 `Masthead`)를 먼저 바꿔 개별 페이지의 `slate/emerald` 클래스를 쓸어 담는다. 계산 로직(`src/lib/*.ts`)과 기존 URL은 건드리지 않는다.

**Tech Stack:** Vite + React 19 + TypeScript + Tailwind CSS v4, Node 24 type stripping(`scripts/*.mjs`가 `.ts`를 직접 import), Playwright(검증용, 설치 위치는 Task 9).

**Spec:** `docs/superpowers/specs/2026-10-28-guide-led-restructure-design.md` (§3.7 리디자인, §3.4 메뉴, §2.1 매핑이 기준)

## Global Constraints

- 허브는 정확히 5개: `work`(월급·직장), `tax`(세금), `property`(부동산), `support`(정부지원·청년), `finance`(대출·금융). 생활 허브 없음. 매핑은 spec §2.1 표 그대로.
- 생활 계산기 10개(`age celebration insuranceAge pensionAge dday dateCalc discharge dueDate bmi generalCalculator`)는 주제에 속하지 않고 도구 패널에만 둔다.
- 사이트 이름 "계산기" 유지, 부제 정확히 **"생활·금융 가이드와 계산기"**.
- 색 토큰: paper `#f4efe6`, ink `#1b1a17`, body `#3b382f`, muted `#6a655b`, accent `#9b2c1c`, tint `#ece5d7`, rule `#cfc7b6`. 글자에 `#8a8478` 사용 금지(대비 3.2).
- 글꼴: 제목 Noto Serif KR(600·700), 본문 IBM Plex Sans KR(400·500·600), 숫자·메타 IBM Plex Mono. `display=swap`.
- 금지: 이모지 아이콘, 그라데이션, 그림자 카드(`shadow-*`), 둥근 카드(`rounded-2xl`), 중앙 정렬 히어로.
- 기존 URL·`routes.json`의 기존 id/path 불변. 라우트 `path`는 끝 슬래시 없이, 실제 URL은 끝 슬래시 포함.
- `scripts/postbuild.mjs`가 import하는 `src/lib/*.ts`에는 브라우저 전용 API·Vite 전용 import 금지. `pageContent.js`는 `.js` 유지.
- 가이드 본문을 수정하면 해당 항목의 `updatedAt` 갱신 + `changelog` 맨 앞에 한 줄 추가. (이 계획은 가이드 본문을 수정하지 않는다. 허브 항목에는 `updatedAt`을 둔다.)
- 허브 개요 글에 새 법령 수치를 쓰지 않는다. 문장 안에 작은따옴표 사용 금지(`pageContent.js` 파싱 오류 방지).
- 커밋 메시지 끝에 `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. **푸시·배포는 사용자 승인 후에만.** `README.md`의 기존 수정분은 커밋하지 않는다.
- 작업은 브랜치 `feat/guide-led-redesign`에서 한다(이미 main이면 먼저 생성).

## Review Focus

1. 새 계산기·가이드가 `topics.json`에 없을 때 — `check-topics.mjs`가 실패해야 한다(Task 1 테스트).
2. 360px 폭 모바일에서 마스트헤드 내비·도구 패널이 가로 스크롤 없이 쓰인다(Task 4·9).
3. 윷놀이(`group: 게임`)는 전체 폭·무메뉴 유지, 토큰만 적용(Task 7).
4. JS 미실행(프리렌더 HTML)에서도 허브·홈에 가이드·계산기 링크가 전부 있다(Task 8 링크 검사).
5. 숫자 입력 필드의 동작(0 지우고 타이핑, 음수 허용 옵션)이 밑줄 스타일 변경 뒤에도 그대로다(Task 2).

---

## File Structure

| 파일 | 책임 |
|---|---|
| `src/index.css` | `@theme` 토큰, 글꼴 변수, 전역 타이포·선택색·포커스 링 (사이드바 스크롤바 CSS 제거) |
| `index.html` | 글꼴 preconnect/link, 기본 title·og 문구, theme-color |
| `src/topics.json` | 주제 5개 데이터 (id, slug, label, path, summary, members) |
| `scripts/check-topics.mjs` | 전수 배정 검사(Node, assert) |
| `src/lib/topics.ts` | `topics` 타입과 헬퍼 `topicOf(id)`, `topicRoutes(topic)` — 컴포넌트와 postbuild 공용(순수 TS) |
| `src/pages/TopicPage.tsx` | `/topics/<slug>` 허브 페이지 |
| `src/components/Masthead.tsx` | 마스트헤드(로고·부제·내비·도구 패널·모바일 메뉴) |
| `src/components/ToolsPanel.tsx` | 도구 패널(5열 + 검색). 기존 `Sidebar.tsx`의 검색·그룹 로직을 이식하고 `Sidebar.tsx`는 삭제 |
| `src/components/ui.tsx` | `Field`(밑줄), `Row`(장부), `Card`(평면), 신규 `Result`(큰 숫자) |
| `src/components/GuideArticlePage.tsx`, `InfoSection.tsx` | 가이드 글 레이아웃(차례·메타·"이 글의 기준") |
| `src/pages/HomePage.tsx` | 새 홈 |
| `scripts/postbuild.mjs` | 허브·홈 프리렌더, 사이트맵, JSON-LD |

---

### Task 1: 주제 데이터와 검증 스크립트

**Files:**
- Create: `src/topics.json`, `src/lib/topics.ts`, `scripts/check-topics.mjs`
- Modify: `CLAUDE.md`(계산기 추가 절차에 6번 "topics.json 배정 + `node scripts/check-topics.mjs`" 한 줄)

**Interfaces:**
- Produces: `topics.json` = `{id,slug,label,path,summary,members:string[]}[]` (path는 `/topics/<slug>`). `src/lib/topics.ts`: `export type Topic`, `export const topics: Topic[]`, `export function topicOf(routeId: string): Topic | undefined`.

- [ ] **Step 1: `scripts/check-topics.mjs` 작성(먼저 실패 확인용)** — `routes.json`, `topics.json`을 읽어 assert: (a) 그룹이 `가이드`(guidesIndex 제외)인 라우트와 spec §2.1의 계산기 36개(생활 계산기 10개 제외한 계산기 라우트, 즉 `group`이 `groups.json`에 있고 `용어사전`·`생활`이 아닌 라우트)가 정확히 한 주제에 속함, (b) `members`의 모든 id가 routes에 존재, (c) 중복 없음, (d) 주제 id가 정확히 `work tax property support finance`. 생활 그룹은 `routes.json`에서 `group === '생활'`인 라우트로 판정해 제외. 실패 시 누락·중복 id를 출력하고 exit 1.
- [ ] **Step 2: 실행해 실패 확인** — Run: `node scripts/check-topics.mjs` → Expected: FAIL(`topics.json` 없음).
- [ ] **Step 3: `src/topics.json` 작성** — spec §2.1 표의 매핑 그대로. `members` 순서는 표 순서(가이드 먼저, 계산기 다음). `summary`는 한 줄(40자 내외, 수치 없음). id 대응: 연봉 실수령액 `salary`, 실수령액표 `salaryTable`, 인상 비교 `raise`, 알바 `partTime`, 연차수당 `annualLeave`, 육아휴직급여 `parentalLeave`, 실업급여 `unemployment`, 퇴직금 `severance`; 나머지는 summary 상단 서술에 나열된 id를 사용. 가이드 id는 spec 표의 괄호 값(`yearEndTaxProcedureGuide` 등; "세액공제 한도·공제율"은 `pensionTaxCreditGuide`, "보유세"는 `holdingTaxGuide`).
- [ ] **Step 4: `src/lib/topics.ts` 구현** — `import topicsJson from '../topics.json' with { type: 'json' }`는 Vite/Node 양쪽에서 문제될 수 있으므로 **postbuild는 `topics.json`을 `fs`로 읽고**, `topics.ts`는 `import topicsJson from '../topics.json'`(Vite용)만 두며 postbuild에서 import하지 않는다. `topicOf`는 `members.includes` 검색.
- [ ] **Step 5: 통과 확인** — Run: `node scripts/check-topics.mjs` → Expected: `OK — 주제 5개, 가이드 16, 계산기 36` 형태 출력, exit 0. 그 다음 `topics.json`에서 `members` 하나를 임시로 지워 FAIL 되는지 확인 후 복구.
- [ ] **Step 6: Commit** — `git add src/topics.json src/lib/topics.ts scripts/check-topics.mjs CLAUDE.md && git commit -m "feat: 주제 5개 데이터와 전수 배정 검증 스크립트"`

### Task 2: 디자인 토큰·글꼴·공용 UI 프리미티브

**Files:**
- Modify: `src/index.css`, `index.html`, `src/components/ui.tsx`, `src/components/VerdictBanner.tsx`, `src/components/AdSlot.tsx`(스타일만)
- Create: `scripts/check-ui.mjs`(렌더 스모크, 아래)

**Interfaces:**
- Produces(Tailwind 유틸리티로 사용 가능): 색 `paper ink body muted accent tint rule`(예: `bg-paper text-ink border-rule`), 글꼴 `font-serif`(Noto Serif KR), `font-sans`(IBM Plex Sans KR), `font-mono`(IBM Plex Mono). `ui.tsx` 공개 API **불변**: `Field`, `Row`, `DateField`, `Card`, `fmt`, `fmtPct` — props 동일. 신규 `export function Result({ label, value, unit }: { label: string; value: string; unit?: string })`(큰 세리프 숫자 + 위 이중선).

- [ ] **Step 1: 스모크 스크립트 `scripts/check-ui.mjs`** — `react-dom/server`로 `Field`/`Row`/`Card`/`Result`를 렌더(esbuild 불필요: Node type stripping은 `.tsx`를 지원하지 않으므로 `npx vite-node`가 없으면 `npx tsx`로 실행. 둘 다 없으면 이 스크립트 대신 Step 5의 브라우저 확인으로 대체하고 스크립트를 만들지 않는다). assert: `Field` 출력에 `border-b-2`가 있고 `rounded`·`shadow` 없음, `Row`에 `tabular-nums`, `Card`에 `shadow` 없음.
- [ ] **Step 2: `src/index.css`** — `@import 'tailwindcss';` 아래 `@theme { --color-paper:#f4efe6; --color-ink:#1b1a17; --color-body:#3b382f; --color-muted:#6a655b; --color-accent:#9b2c1c; --color-tint:#ece5d7; --color-rule:#cfc7b6; --font-serif:'Noto Serif KR',serif; --font-sans:'IBM Plex Sans KR','Pretendard Variable',Pretendard,'Apple SD Gothic Neo','Malgun Gothic',system-ui,sans-serif; --font-mono:'IBM Plex Mono',ui-monospace,monospace; }`. `body`에 `background:var(--color-paper); color:var(--color-body)`. `::selection`은 accent 30%. `:focus-visible { outline:2px solid var(--color-accent); outline-offset:2px }`. `.sidebar-scroll` 규칙은 도구 패널이 자체 스크롤을 쓰면 이름만 `.tools-scroll`로 바꿔 유지. `@media (prefers-reduced-motion: reduce)`에서 `animate-menu-in` 비활성.
- [ ] **Step 3: `index.html`** — `<link rel="preconnect" href="https://fonts.googleapis.com">`, `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`, 스펙 §3.7 글꼴 3종 `display=swap` stylesheet. `<meta name="theme-color" content="#f4efe6">`. 기본 og:description을 "생활·금융 가이드와 계산기"로 시작하는 문장으로(Task 8에서 최종 문구).
- [ ] **Step 4: `ui.tsx`** — `Field`: 박스 입력 → 라벨(작게, muted) + 밑줄(`border-b-2 border-ink`) 입력(숫자 `font-mono text-xl`) + 단위 `suffix`를 우측 작은 글자. **상태·핸들러 로직(`useState` text, 0 지우기, `allowNegative`)은 한 줄도 바꾸지 않는다.** `Row`: 항목 아래 `border-b border-rule`, 값은 `font-mono`, `strong`이면 위 `border-t border-ink`, `negative`는 accent 색(빨강 대신). `Card`: `rounded-2xl shadow` 제거 → `border-t border-ink pt-4`, 제목은 `font-serif` 좌측 막대 제거. 새 `Result` 추가. `VerdictBanner`/`AdSlot`: 색·모서리만 토큰에 맞춤(광고 높이 `min-h`는 유지).
- [ ] **Step 5: 검증** — Run: `npx tsc -b` → 통과. `npm run dev` 후 `/salary`에서 연봉칸의 0을 지우고 `5000` 타이핑 가능, `/stock-return`에서 음수 입력 가능을 확인(Review Focus 5). Step 1 스크립트를 만들었다면 `npx tsx scripts/check-ui.mjs` → PASS.
- [ ] **Step 6: Commit** — `feat: 에디토리얼 디자인 토큰·글꼴·공용 입력/결과 컴포넌트`

### Task 3: 허브 페이지와 라우트

**Files:**
- Create: `src/pages/TopicPage.tsx`
- Modify: `src/routes.json`(허브 5개 추가), `src/App.tsx`(`components`에 `topicWork` 등 5개를 `lazy(() => import('./pages/TopicPage'))`가 아니라 **id→slug 매핑으로 한 컴포넌트 사용**), `src/lib/pageContent.js`(허브 5개 항목), `scripts/check-topics.mjs`(허브 라우트 id가 topics와 1:1인지 추가 assert)

**Interfaces:**
- Consumes: `topics`, `topicOf`(Task 1), `Card`·`Row`(Task 2).
- Produces: routes id `topicWork topicTax topicProperty topicSupport topicFinance`, `group: "주제"`, path `/topics/<slug>`. `TopicPage` default export `({ pageId }: { pageId: string })` — 기존 `GuideArticlePage`가 `pageId`를 받는 방식과 동일하게 `App.tsx`가 `<Current />` 대신 전달할 수 있도록, `App.tsx`의 컴포넌트 선택부에서 `route.group === '주제'`이면 `<TopicPage pageId={route.id} />`를 렌더한다(기존 가이드 래퍼 패턴을 따라 확인 후 동일 방식 사용).
- `pageContent.js` 허브 항목 형태: `{ intro: string[] (문단 배열, 합계 600~900자), faqs: {q,a}[] (2~3개), updatedAt: '2026-10-29', changelog: [{date,text}] }`.

- [ ] **Step 1: 실패 테스트 추가** — `check-topics.mjs`에 assert 추가: `routes`에 `group==='주제'` 5개가 있고 각 `path === '/topics/' + slug`, `pageContent[id]`에 `intro`(문자열 배열 길이 ≥2)와 `faqs.length ≥ 2`. Run: `node scripts/check-topics.mjs` → FAIL.
- [ ] **Step 2: `routes.json`에 허브 5개 추가** — 필드는 기존 항목과 동일(`id,path,label,group,title,description`). title은 60자 이내로 "<주제명> 가이드 — … | 계산기" 형식, description 120자 내외. **`groups.json`에는 추가하지 않는다.** (PostToolUse 훅이 README를 재생성하므로 `git status`로 README 변경이 생기면 `git checkout README.md`가 아니라 기존 수정분과 구분해 커밋 대상에서 제외.)
- [ ] **Step 3: `pageContent.js` 허브 5개 작성** — spec §3.2 작성 원칙 준수(새 수치 금지, 가이드 링크로 안내, 미확정 개편안 언급 금지, 작은따옴표 금지). 각 intro는 "상황 → 이 사이트가 다루는 범위 → 읽는 순서" 3문단. `finance`는 가이드가 없음을 숨기지 말고 "도구 중심, 설명 글은 순차 추가" 취지로 정직하게 쓰되 광고성 표현 금지.
- [ ] **Step 4: `TopicPage.tsx`** — 구성(위→아래): 빵부스러기("홈 › 주제명"), H1(serif), intro 문단, "이 주제의 가이드"(제목·`description`·`updatedAt` 한 줄 목록, 구분선 `border-rule`), "이 주제의 계산기"(이름 — 한 줄 설명), FAQ 2~3개, "다른 주제" 링크 행, 운영자·검증 방식 링크. 내부 링크는 기존 패턴(`<a href onClick preventDefault navigate>`)이 아니라 App이 전달하는 `navigate`가 없으므로 `window.history.pushState` + `popstate` 디스패치를 쓰는 기존 방식을 `App.tsx`에서 확인해 동일하게 구현.
- [ ] **Step 5: 통과 확인** — Run: `node scripts/check-topics.mjs` → OK, `npx tsc -b` 통과, 브라우저에서 `/topics/tax/` 렌더(가이드 5·계산기 11 노출).
- [ ] **Step 6: Commit** — `feat: 주제 허브 5개 페이지와 개요 글`

### Task 4: 마스트헤드·도구 패널로 레이아웃 교체

**Files:**
- Create: `src/components/Masthead.tsx`, `src/components/ToolsPanel.tsx`
- Modify: `src/App.tsx`(사이드바·모바일 헤더 블록 제거, 푸터를 에디토리얼 스타일로)
- Delete: `src/components/Sidebar.tsx`(로직 이식 후; `MenuLink`를 쓰는 곳이 `App.tsx` 외에 없는지 `grep -rn "MenuLink" src`로 확인)

**Interfaces:**
- Consumes: `topics`, `routes`, `groups.json`.
- Produces: `Masthead({ activeRouteId, onNavigate }: { activeRouteId: string; onNavigate: (to: string) => void })` — 로고 "계산기"(font-serif 700) + 부제 "생활·금융 가이드와 계산기"(sm 이상에서 표시), 하단 3px 이중선(`border-b-[3px] border-double border-ink`), 내비 `홈 · 5개 주제 · 도구 ▾`. 활성 항목은 `border-b-2 border-accent font-semibold`. 활성 판정: 현재 라우트가 허브이거나 `topicOf(activeRouteId)`가 그 주제일 때. `ToolsPanel({ activeRouteId, onNavigate, onClose }: {...; onClose: () => void})` — 상단 검색 입력(밑줄 스타일) + 5열(`work tax property finance` 계산기, 그리고 `생활` 열; `support`는 계산기가 없으므로 열 없음 → 총 5열은 월급·직장 / 세금 / 부동산 / 대출·금융 / 생활). 검색어가 있으면 이름·description 매칭 결과를 한 열 목록으로 표시(기존 `Sidebar`의 필터 로직 이식). `Esc`로 닫기, 바깥 클릭으로 닫기, 열릴 때 검색칸에 포커스, `aria-expanded`·`aria-controls`. 일반 계산기는 생활 열 맨 위에 `text-accent font-semibold`.
- 모바일(<`lg`): 햄버거 버튼 → 전체 폭 메뉴(홈, 주제 5개, "도구" 접이식 5그룹 + 검색). 터치 영역 `min-h-11`.

- [ ] **Step 1: 상호작용 점검 스크립트 계획(Task 9에서 실행)** — Playwright 시나리오를 `scripts/e2e-nav.mjs`로 작성: 1280px에서 "도구" 클릭 → 패널에 `연봉 실수령액` 링크 보임 → `Esc`로 닫힘 → 검색칸에 "퇴직" 입력 시 `퇴직금` 노출 → 360px에서 `document.documentElement.scrollWidth <= 360`. 이 스크립트는 지금 작성만 하고 실행은 Task 9에서 한다.
- [ ] **Step 2: `ToolsPanel.tsx` 구현** — `Sidebar.tsx`의 검색(`query` 상태, 필터)을 이식. 아코디언은 쓰지 않는다(패널은 펼친 상태).
- [ ] **Step 3: `Masthead.tsx` 구현** — 데스크톱/모바일 한 컴포넌트, `hidden lg:flex` 분기. `hideChrome`(게임) 페이지에서는 `App.tsx`가 마스트헤드를 그리지 않는다.
- [ ] **Step 4: `App.tsx` 교체** — 최상위 `<div className="min-h-screen bg-paper">` 아래 `<Masthead>` + `<main className="mx-auto max-w-5xl px-4 py-8">`. `AdSlot` 배치(`belowResult`, `bottomOfPage`)와 `InfoSection` 조건(`route.group !== '가이드'`)은 그대로 유지. **사이드바 광고 슬롯(`SLOTS.sidebar`)은 사라지므로 `lib/ads.ts`에서 해당 슬롯이 다른 곳에 쓰이는지 확인하고, 쓰이지 않으면 호출만 제거(슬롯 정의는 삭제하지 않는다 — 애드센스 설정 변경 금지).** 푸터: 인기 계산기·인기 가이드 링크 유지, 이모지 없음, 상단 `border-t border-ink`. 헤더 한 줄 설명 문구를 부제로 교체(spec §3.5).
- [ ] **Step 5: 빌드 확인** — Run: `npx tsc -b && npm run lint` → 오류 0(기존 `only-export-components` 경고 9건 외 증가 없음).
- [ ] **Step 6: Commit** — `feat: 사이드바를 상단 내비게이션과 도구 패널로 교체`

### Task 5: 새 홈

**Files:**
- Modify: `src/pages/HomePage.tsx`, `src/popularLinks.json`(계산기 6~8개로 축소 — 기존 10개 중 연봉 실수령액·퇴직금·연말정산 환급액·취득세·대출 상환·실업급여·종합부동산세 우선, 바꾸는 항목은 파일 현재 값을 읽고 결정), `src/routes.json`(home의 title/description/label 불변이 아니라 title·description만 spec §3.3 문구로)

**Interfaces:**
- Consumes: `topics`, `pageContent[*].changelog`.
- Produces: 홈 구성 — (1) H1 "생활·금융 가이드와 계산기" + 한 단락 소개(공식 자료로 검증·수정 이력 공개·참고용 추정치), (2) 번호 목록 `01`~`05`(font-mono 번호, 주제명 serif, summary, "가이드 N · 계산기 N"), 항목 사이 `border-b border-rule`, (3) "최근 업데이트된 가이드" 5건(기존 `recentUpdates` 로직 재사용), (4) "많이 쓰는 계산기"(`popularLinks.calculators`), (5) 운영자·검증 방식 문단(기존 문구 유지). 카테고리별 46개 목록 제거.

- [ ] **Step 1: 구현** — 위 구성대로. 모든 `카드 그리드`·이모지 금지. 가이드·계산기 개수는 `topics.members`와 `routes.group`으로 계산(하드코딩 금지).
- [ ] **Step 2: 확인** — Run: `npx tsc -b`; 브라우저 `/`에서 개수가 `가이드 16 / 계산기 36`의 합과 일치(허브 합계 = 52), `NaN`·`undefined` 없음.
- [ ] **Step 3: Commit** — `feat: 주제 중심 홈`

### Task 6: 가이드 글·정보 섹션 레이아웃

**Files:**
- Modify: `src/components/GuideArticlePage.tsx`, `src/components/InfoSection.tsx`

**Interfaces:**
- Consumes: `pageContent[pageId].verification`(`{basis,lastVerified,scope,excludes}`), `updatedAt`, `changelog`.
- Produces: 가이드 페이지 = 2열(`lg:grid-cols-[170px_1fr]`): 좌측 "이 글의 차례"(본문 `h2` 목록을 마운트 후 DOM에서 수집해 앵커 링크로 렌더, `lg`에서 `sticky top-6`, 모바일에서는 숨김), 우측 본문 `max-w-[640px]`, `leading-[1.95]`. 상단: 빵부스러기("<주제명> › 가이드"), H1 serif, 메타 줄(최종 업데이트 · 작성·운영 · 변경 이력 N건 — `border-t border-ink border-b border-rule`). "이 글의 기준" 상자 = 기존 `verification.basis`와 `excludes`를 요약해 좌측 3px accent 선 + `bg-tint`로 표시. 변경 이력은 접힌 `<details>`가 아니라 문서 하단 목록 유지(기존 정보 손실 금지).
- 계산기 페이지의 `InfoSection`(설명·공식·FAQ·용어·표)은 같은 타이포 토큰으로 맞추되 내용·순서·`id`/앵커는 불변.

- [ ] **Step 1: 차례 수집 구현 주의** — 프리렌더 HTML에는 JS가 없으므로 차례는 클라이언트 전용이어도 된다. 차례 앵커용 `id`는 `h2` 텍스트로 만들되 한글 slug가 중복되면 `-2`를 붙인다.
- [ ] **Step 2: 확인** — 브라우저에서 가이드 3종(`yearEndTax2026Guide`, `holdingTaxGuide`, `youthRentSubsidyGuide`)의 차례·메타·기준 상자가 보이고 기존 문단·표·FAQ·변경 이력이 모두 남아 있음. `npx tsc -b` 통과.
- [ ] **Step 3: Commit** — `feat: 가이드 글 에디토리얼 레이아웃(차례·메타·글의 기준)`

### Task 7: 전 페이지 잔여 클래스 정리 (slate·emerald·카드)

**Files:**
- Modify: `src/pages/*.tsx`, `src/pages/guides/*.tsx`, `src/components/{currency,YutnoriBoard}.tsx` 중 `slate-`/`emerald-`/`rounded-2xl`/`shadow-`/이모지를 쓰는 파일

**Interfaces:**
- Consumes: Task 2 토큰. 매핑 규칙: `text-slate-900/800/700`→`text-ink`, `text-slate-600/500`→`text-body`/`text-muted`, `text-slate-400/300`→`text-muted`(글자 대비 5.1 확보), `border-slate-*`→`border-rule`, `bg-white`→`bg-paper`, `bg-slate-50/100`→`bg-tint`, `emerald-*`→`accent`/`tint`, `rounded-2xl`·`shadow-*` 제거, 버튼류는 `border border-ink` + 선택 시 `bg-ink text-paper`(칩).

- [ ] **Step 1: 대상 목록 생성** — Run: `grep -rlE "slate-|emerald-|rounded-2xl|shadow-" src | sort > $CLAUDE_JOB_DIR/tmp/restyle.txt && wc -l $CLAUDE_JOB_DIR/tmp/restyle.txt` (예상 약 60개).
- [ ] **Step 2: 일괄 치환 후 수동 점검** — 위 매핑으로 `sed`가 아니라 python 스크립트로 치환(macOS `sed -i` 주의). 계산 결과 숫자를 보여 주는 큰 값은 `Result` 컴포넌트로 바꾸는 것이 이상적이나, **페이지당 구조 변경은 하지 않고** 클래스만 바꾼다(범위 통제). 큰 결과 숫자 영역이 눈에 띄게 어색한 페이지만 `Result`로 교체(`SalaryCalculator`, `LoanCalculator`, `SeveranceCalculator`, `YearEndTaxCalculator`, `AcquisitionTaxCalculator` 5종은 필수).
- [ ] **Step 3: 윷놀이** — `group: 게임` 레이아웃은 건드리지 않고 색 토큰만. `node scripts/yutnori-check.mjs`는 기존에 실패 중이므로(35행 `'a3' !== 15`) 결과가 같은 실패인지만 확인하고 이 작업 범위에서 고치지 않는다.
- [ ] **Step 4: 잔여 검사** — Run: `grep -rnE "emerald-|rounded-2xl|shadow-(sm|md|lg)" src | wc -l` → Expected: `0`(예외 허용 시 목록과 사유를 커밋 메시지에). `grep -rnP "[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}]" src --include=*.tsx | grep -v YutnoriBoard`로 이모지 잔여 확인(윷놀이 말 아이콘은 예외).
- [ ] **Step 5: 빌드** — Run: `npx tsc -b && npm run lint` → 통과.
- [ ] **Step 6: Commit** — `refactor: 전 페이지를 에디토리얼 토큰으로 정리`

### Task 8: 프리렌더·SEO·문구

**Files:**
- Modify: `scripts/postbuild.mjs`, `public/llms.txt`, `index.html`, `src/lib/pageContent.js`(`about.intro`), `CLAUDE.md`

**Interfaces:**
- Consumes: `topics.json`(postbuild에서 `fs.readFileSync`로 읽음), `routes`, `pageContent`.
- Produces: `dist/topics/<slug>/index.html`(허브 본문: intro·가이드 링크·계산기 링크·FAQ·breadcrumb, JSON-LD `CollectionPage` + `BreadcrumbList`), 홈 프리렌더가 새 구성(H1·주제 5개·최근 가이드·인기 계산기·운영자 블록)과 일치, 사이트맵에 허브 5개(`lastmod` = 해당 `pageContent[id].updatedAt`).

- [ ] **Step 1: 링크 검사 스크립트 먼저** — `scripts/check-links.mjs`: `dist/**/index.html`의 내부 `href`가 `dist`에 대응 파일이 있는지 검사(쿼리·해시 제거, 끝 슬래시 정규화), 실패 목록 출력·exit 1. 빌드 전이라 실행하면 `dist` 없음 → 현 상태 FAIL 확인.
- [ ] **Step 2: `postbuild.mjs` 수정** — `route.group === '주제'` 분기를 `prerenderBody`에 추가(홈 블록과 같은 `link`/`esc` 헬퍼 사용), 홈 블록(188행 부근)을 새 구성으로 교체(카테고리별 46개 목록 제거), `jsonLdFor`에 허브용 `CollectionPage`(`hasPart`는 가이드 URL 목록) 추가, 사이트맵 lastmod 규칙에 허브 포함. 프리렌더 HTML 안의 Tailwind 클래스는 토큰 클래스(`text-ink` 등)로 바꿔 JS 로드 전에도 일관되게(CSS는 번들이 로드하므로 별도 인라인 스타일 불필요).
- [ ] **Step 3: 문구 반영** — 홈 `title`/`description`(spec §3.3: "생활·금융 가이드 — 월급·세금·부동산·대출 정리와 계산기 | 계산기", 60자 이내인지 길이 확인), `index.html` 기본 og, `about.intro`, `llms.txt` 서두를 "생활·금융 가이드와 계산기" 성격으로. 계산기 페이지의 title/description은 변경 금지. `about.intro` 수정 시 해당 항목에 `updatedAt`이 있으면 규칙대로 갱신.
- [ ] **Step 4: 빌드·검사** — Run: `npm run build && node scripts/check-links.mjs && node scripts/check-topics.mjs` → 모두 exit 0. `ls dist/topics` → `finance property support tax work`. 기존 URL 전부 유지 확인: 빌드 전 `git stash`가 아니라 `git show main:src/routes.json`의 path 목록이 모두 `dist/<path>/index.html`로 존재하는지 확인 루프. `grep -c "<loc>" dist/sitemap.xml` = 기존 + 5. `grep -rl "NaN\|undefined" dist --include=index.html`는 결과 없음.
- [ ] **Step 5: Commit** — `feat: 허브·홈 프리렌더와 사이트 성격 문구, 링크 검사`

### Task 9: 시각·상호작용·성능 검증과 마감

**Files:**
- Create: `scripts/e2e-nav.mjs`(Task 4에서 작성한 것 완성), `.superpowers`가 아닌 `$CLAUDE_JOB_DIR/tmp/shots/`(스크린샷, 커밋 안 함)

- [ ] **Step 1: Playwright 준비** — 이전 세션에서 쓴 방식 재사용: `~/.cache/codex-runtimes` node_modules의 playwright + `executablePath`는 `ms-playwright/chromium_headless_shell-*` 실제 경로를 `ls`로 확인해 사용. `npm run preview`를 백그라운드로 띄움.
- [ ] **Step 2: 스크린샷** — 360·768·1280px × [`/`, `/topics/tax/`, `/guides/yearend-tax-2026-changes/`(실제 path는 `routes.json`으로 확인), `/salary/`, `/loan/`, `/calculator/`, `/yutnori/`, `/glossary/`] 전/후는 `git stash`가 아니라 후 상태만 촬영하고 눈으로 점검: 가로 스크롤 없음, 텍스트 잘림 없음, 광고 슬롯 자리 확보, 이모지·그림자 카드 잔재 없음. 문제 있으면 해당 Task 파일을 고치고 재촬영.
- [ ] **Step 3: 상호작용** — Run: `node scripts/e2e-nav.mjs` → 도구 패널 열기·검색·`Esc`·360px 가로 스크롤 없음·허브 링크 이동·주제 활성 표시 전부 PASS. 키보드 Tab으로 도구 버튼 도달·Enter로 열림 확인.
- [ ] **Step 4: 성능** — 홈·`/salary/`에서 모바일 에뮬레이션(375×812, 4x CPU throttle 불필요) `PerformanceObserver`로 CLS·LCP 측정. 기준: CLS < 0.1, LCP가 변경 전(`main` 빌드 같은 방식으로 1회 측정) 대비 악화 0.5s 이내. 초과 시 글꼴을 `public/fonts`로 자체 호스팅(서브셋 woff2, `@font-face` + `font-display:swap`)으로 전환하는 별도 커밋을 만든다. 결과 수치를 PR/최종 보고에 기록.
- [ ] **Step 5: 전체 확인** — Run: `npm run build && npm run lint && node scripts/check-mathExpr.mjs && node scripts/check-topics.mjs && node scripts/check-links.mjs` → 전부 통과(`yutnori-check`는 기존 실패 유지 확인만).
- [ ] **Step 6: 마무리** — 이 계획과 spec 문서를 커밋(`docs: 가이드 중심 구조 개편 설계·계획`). 푸시·배포는 하지 않고 사용자에게 스크린샷 경로, 측정 수치, 변경 요약, 푸시 승인 요청을 보고. 승인 후 배포 시 Search Console 사이트맵 재제출·홈/허브 색인 요청 안내를 덧붙인다.

---

## Self-Review

- **Spec coverage:** §2.1 매핑→Task 1·3, §3.1→1, §3.2→3, §3.3→5, §3.4→4, §3.5→8, §3.6→8, §3.7 디자인→2·4·5·6·7, §3.7 글꼴→2·9(자체 호스팅 전환 조건 포함), 접근성(Esc·포커스·reduced-motion·360px·44px)→2·4·9, 검증 §4→8·9, 롤아웃→9 Step 6. 갭 없음.
- **미결 사항(실행 중 확인):** (1) `App.tsx`의 현재 페이지 컴포넌트 렌더 패턴과 가이드 래퍼 방식(Task 3 Step 4), (2) `SLOTS.sidebar` 사용처(Task 4), (3) `tsx` 실행 가능 여부(Task 2 Step 1, 없으면 브라우저 확인으로 대체) — 모두 "확인 후 기존 패턴을 따른다"로 결정 규칙을 적어 두었다.
- **타입 일관성:** `Topic`/`topicOf`(Task 1) → Task 3·4·5 사용, `Result`(Task 2) → Task 7, `Masthead`/`ToolsPanel` props(Task 4) → `App.tsx`에서만 사용.
- **범위 통제:** 계산 로직·기존 URL·기존 가이드 본문 무변경, 2·3단계(신규 글, 계산기 정리) 제외.
