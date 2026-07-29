# 사이드바 검색 + 아코디언 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 데스크톱 좌측 사이드바에 검색창과 그룹 아코디언(접기/펼치기)을 추가해, 37개 계산기가 나열되면서 생긴 "스크롤이 김"·"찾기 어려움" 문제를 해결한다.

**Architecture:** `src/App.tsx`의 데스크톱 사이드바 내부 로직(그룹 렌더링 + `MenuLink`)을 새 컴포넌트 `src/components/Sidebar.tsx`로 옮기고, 그 안에 검색어 상태와 그룹별 펼침 상태(Set)를 추가한다. 모바일 상단 드롭다운 메뉴는 변경하지 않는다.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4. 새 의존성 없음.

## Global Constraints

- 스코프는 데스크톱 사이드바(`<aside>` 내부)로 한정한다. 모바일 상단 드롭다운(`menuOpen`으로 열리는 `<nav>`, `src/App.tsx:191-223`)은 건드리지 않는다.
- 검색 매칭은 계산기 `label`에 대한 대소문자 무관 부분 문자열 매칭만 한다. 그룹명이나 `description` 매칭은 하지 않는다.
- 펼침 상태(`expandedGroups`)는 React state로만 관리한다 — localStorage 등 영속화하지 않는다.
- 검색 중(`query`가 비어있지 않을 때)에는 매칭되는 계산기가 있는 그룹만 표시되고 강제로 펼쳐진다. 그룹 헤더 클릭(토글)은 검색 중에는 비활성화한다.
- `MenuLink` 컴포넌트는 그대로(스타일/동작 변경 없이) `Sidebar.tsx`로 옮기고 export해서, 모바일 메뉴(`App.tsx`)에서도 계속 재사용한다 — 중복 정의하지 않는다.
- 이 프로젝트에는 단위 테스트 프레임워크가 없다 — 검증은 수동 브라우저 확인 + `npx tsc -b --noEmit`으로 한다.
- 새 npm 의존성을 추가하지 않는다 (검색 아이콘 등은 기존처럼 인라인 SVG 또는 텍스트로 처리).

---

### Task 1: Sidebar 컴포넌트 분리 + 검색/아코디언 구현

**Files:**
- Create: `src/components/Sidebar.tsx`
- Modify: `src/App.tsx` (MenuLink 제거, import 추가, 데스크톱 `<nav>` 블록을 `<Sidebar>` 호출로 교체)

**Interfaces:**
- Produces: `export default function Sidebar({ activeRouteId, activeGroup, onNavigate }: { activeRouteId: string; activeGroup: string; onNavigate: (to: string) => void }): JSX.Element`, `export function MenuLink(props: { to: string; label: string; active: boolean; onNavigate: (to: string) => void; compact?: boolean }): JSX.Element` (기존 `App.tsx`의 `MenuLink`와 동일한 시그니처 — 그대로 이동)
- Consumes: `App.tsx`가 `route.id`/`route.group`/`navigate`를 그대로 넘겨줌

- [ ] **Step 1: `src/components/Sidebar.tsx` 작성**

```tsx
import { useEffect, useState } from 'react'
import routes from '../routes.json'
import GROUP_ORDER from '../groups.json'

const groups = GROUP_ORDER.filter((g) => routes.some((r) => r.group === g))

export function MenuLink({
  to,
  label,
  active,
  onNavigate,
  compact,
}: {
  to: string
  label: string
  active: boolean
  onNavigate: (to: string) => void
  compact?: boolean
}) {
  return (
    <a
      href={to === '/' ? '/' : `${to}/`}
      onClick={(e) => {
        e.preventDefault()
        onNavigate(to)
      }}
      aria-current={active ? 'page' : undefined}
      className={
        compact
          ? `shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`
          : `block rounded-lg border-l-2 py-2 pr-3 pl-2.5 text-sm font-medium transition-colors ${
              active
                ? 'border-emerald-500 bg-emerald-50 font-semibold text-emerald-700'
                : 'border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`
      }
    >
      {label}
    </a>
  )
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.148l3.71-3.918a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  )
}

export default function Sidebar({
  activeRouteId,
  activeGroup,
  onNavigate,
}: {
  activeRouteId: string
  activeGroup: string
  onNavigate: (to: string) => void
}) {
  const [query, setQuery] = useState('')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set([activeGroup]))

  // 다른 계산기로 이동하면 그 그룹을 펼침 목록에 추가한다 (기존에 펼친 그룹은 접지 않음)
  useEffect(() => {
    setExpandedGroups((prev) => {
      if (prev.has(activeGroup)) return prev
      const next = new Set(prev)
      next.add(activeGroup)
      return next
    })
  }, [activeGroup])

  const toggleGroup = (g: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(g)) next.delete(g)
      else next.add(g)
      return next
    })
  }

  const isSearching = query.trim().length > 0
  const matches = (label: string) => label.toLowerCase().includes(query.trim().toLowerCase())
  const routesForGroup = (g: string) =>
    routes.filter((r) => r.group === g && (!isSearching || matches(r.label)))
  const visibleGroups = groups.filter((g) => routesForGroup(g).length > 0)
  const isExpanded = (g: string) => isSearching || expandedGroups.has(g)

  return (
    <nav
      className="sidebar-scroll min-h-0 flex-1 space-y-6 overflow-y-auto px-3 pb-4"
      aria-label="계산기 메뉴"
    >
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="계산기 검색"
          aria-label="계산기 검색"
          className="w-full rounded-lg border border-slate-300 bg-white py-2 pr-8 pl-3 text-sm transition-colors hover:border-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="검색어 지우기"
            className="absolute inset-y-0 right-2 flex items-center text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        )}
      </div>

      {isSearching && visibleGroups.length === 0 && (
        <p className="px-3 text-sm text-slate-400">검색 결과가 없습니다.</p>
      )}

      {visibleGroups.map((g) => {
        const expanded = isExpanded(g)
        return (
          <div key={g}>
            <button
              type="button"
              onClick={() => toggleGroup(g)}
              disabled={isSearching}
              aria-expanded={expanded}
              aria-controls={`sidebar-group-${g}`}
              className="flex w-full items-center justify-between px-3 py-1 text-xs font-semibold tracking-wide text-slate-400 disabled:cursor-default"
            >
              {g}
              {!isSearching && <ChevronIcon expanded={expanded} />}
            </button>
            {expanded && (
              <div id={`sidebar-group-${g}`} className="mt-1 space-y-0.5">
                {routesForGroup(g).map((r) => (
                  <MenuLink
                    key={r.id}
                    to={r.path}
                    label={r.label}
                    active={activeRouteId === r.id}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )
}
```

- [ ] **Step 2: `src/App.tsx`에서 `MenuLink` 함수 정의 제거**

`src/App.tsx:101-137`의 `function MenuLink({ ... }) { ... }` 전체 블록(101번째 줄 `function MenuLink({`부터 137번째 줄 닫는 `}`까지)을 삭제한다.

- [ ] **Step 3: `src/App.tsx` import 추가**

`src/App.tsx:5`의 `import InfoSection from './components/InfoSection'` 바로 다음 줄에 추가:

```ts
import Sidebar, { MenuLink } from './components/Sidebar'
```

- [ ] **Step 4: `src/App.tsx`의 데스크톱 사이드바 `<nav>` 블록을 `<Sidebar>` 호출로 교체**

Before (`src/App.tsx:243-267`):
```tsx
          <nav
            className="sidebar-scroll min-h-0 flex-1 space-y-6 overflow-y-auto px-3 pb-4"
            aria-label="계산기 메뉴"
          >
            {groups.map((g) => (
              <div key={g}>
                <p className="mb-1 px-3 text-xs font-semibold tracking-wide text-slate-400">
                  {g}
                </p>
                <div className="space-y-0.5">
                  {routes
                    .filter((r) => r.group === g)
                    .map((r) => (
                      <MenuLink
                        key={r.id}
                        to={r.path}
                        label={r.label}
                        active={route.id === r.id}
                        onNavigate={navigate}
                      />
                    ))}
                </div>
              </div>
            ))}
          </nav>
```

After:
```tsx
          <Sidebar activeRouteId={route.id} activeGroup={route.group} onNavigate={navigate} />
```

**참고:** `groups`(`src/App.tsx:54`)와 `routes`(`src/App.tsx:2` import)는 모바일 상단 드롭다운(`App.tsx:202-220`)에서 여전히 사용하므로 그대로 둔다. 삭제하지 않는다.

- [ ] **Step 5: 타입체크**

Run: `npx tsc -b --noEmit`
Expected: 에러 없음 (특히 `MenuLink`를 더 이상 쓰지 않는 곳에서 미사용 import 에러가 나지 않는지 확인 — 모바일 메뉴가 여전히 `MenuLink`를 사용하므로 정상이어야 함)

- [ ] **Step 6: 브라우저 수동 확인**

Run: `npm run dev`

데스크톱 너비(≥1024px, lg 브레이크포인트)에서 확인:
1. 첫 진입(`/`, 주식 그룹) 시 "주식" 그룹만 펼쳐져 있고 나머지 9개 그룹은 헤더만 보이는지
2. "부동산" 그룹 헤더 클릭 → 펼쳐지는지, 다시 클릭 → 접히는지
3. "부동산" 그룹을 펼친 채로 다른 그룹(예: "저축")의 계산기로 이동 → 저축 그룹도 자동으로 펼쳐지고, 부동산 그룹은 계속 펼쳐진 상태로 남아있는지
4. 검색창에 "취득세" 입력 → 부동산(취득세)과 자동차(자동차 취득세) 그룹만 남고, 그 안에서도 매칭되는 계산기만 보이는지, 그룹이 강제로 펼쳐지는지
5. 검색창에 "zzz" 같이 매칭 없는 값 입력 → "검색 결과가 없습니다" 문구가 뜨는지
6. 검색어를 지우면(✕ 버튼) 검색 전 펼침 상태로 복귀하는지
7. 모바일 너비(<1024px)에서 상단 드롭다운 메뉴가 기존과 동일하게 동작하는지 (이번 변경의 영향을 받지 않아야 함)
8. 기존 계산기(예: `/salary/`, `/loan/`) 클릭 이동이 정상 동작하는지 (회귀 없음)

- [ ] **Step 7: Commit**

```bash
git add src/components/Sidebar.tsx src/App.tsx
git commit -m "feat: 사이드바에 검색 + 그룹 아코디언 추가"
```

---

### Task 2: 전체 검증

**Files:** 없음 (검증 전용, 커밋 없음)

- [ ] **Step 1: 빌드**

Run: `npm run build`
Expected: `tsc -b`, `vite build`, `scripts/postbuild.mjs` 모두 에러 없이 종료

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: 새로 추가/수정한 파일(`src/components/Sidebar.tsx`, `src/App.tsx`)에서 새로운 경고가 없는지 확인 (기존 `src/components/ui.tsx` 등의 pre-existing 경고는 무관)

- [ ] **Step 3: 최종 회귀 확인**

Run: `npm run dev`

Task 1 Step 6의 8개 시나리오를 다시 한번 빠르게 확인하고, 추가로 사이드바 하단의 광고 슬롯(`AdSlot`)과 안내 문구("모든 결과는 참고용 추정치입니다")가 `Sidebar` 컴포넌트 밖(`App.tsx`의 `<aside>`)에 그대로 남아 정상 노출되는지 확인한다.

## Self-Review 결과

- **스펙 커버리지:** 설계 문서의 검색(label 부분일치), 아코디언(현재 그룹 자동 펼침, 수동 토글, 이동 시 추가 펼침), 검색 중 강제 펼침+필터링, 결과 없음 안내, 펼침 상태 비영속, 모바일 메뉴 미변경, `MenuLink` 재사용 — 모두 Task 1에 반영됨.
- **플레이스홀더 스캔:** 모든 스텝에 실제 코드/명령어 포함, "TODO" 없음.
- **타입 일관성:** `Sidebar`의 props 타입(`activeRouteId: string`, `activeGroup: string`, `onNavigate: (to: string) => void`)이 `App.tsx`에서 넘기는 `route.id`/`route.group`/`navigate`의 실제 타입과 일치함. `MenuLink`는 기존 시그니처를 그대로 유지해 모바일 메뉴 호출부(`App.tsx:209-216`, 변경 없음)와 호환됨.
