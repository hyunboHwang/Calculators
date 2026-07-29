# 사이드바 검색 + 아코디언 — 설계 문서

## Context

계산기가 37개(10개 그룹)로 늘어나면서 데스크톱 좌측 사이드바(`src/App.tsx`)가 모든 그룹/계산기를 한 번에 펼쳐서 보여줘, 스크롤이 길어지고 원하는 계산기를 찾기 어려워졌다는 피드백을 받았다. 사이드바에 검색과 아코디언(그룹 접기/펼치기)을 추가해 두 문제를 함께 해결한다.

스코프는 데스크톱 사이드바(`<aside>`)로 한정한다. 모바일 상단 드롭다운 메뉴(`menuOpen` 상태로 열리는 `<nav>`)는 이번 변경 대상이 아니다 — 별도 요청 시 후속 작업으로 다룬다.

## 동작 방식

**아코디언 (검색어가 비어 있을 때 기본 동작)**
- 그룹은 헤더만 기본 표시되고, 헤더를 클릭하면 그 그룹의 계산기 목록이 펼쳐지거나 접힌다.
- 최초 진입 시 현재 보고 있는 계산기가 속한 그룹은 자동으로 펼쳐져 있다.
- 다른 계산기로 이동하면 그 계산기가 속한 그룹도 자동으로 펼쳐진다. 단, 이미 사용자가 펼쳐둔 다른 그룹은 접히지 않는다(순수 추가 동작, 강제로 접지 않음).

**검색**
- 사이드바 최상단, 그룹 목록 위에 검색 입력창을 둔다 (placeholder: "계산기 검색").
- 입력값이 있으면 계산기 `label`에 대해 대소문자 구분 없는 부분 문자열 매칭을 수행한다. (그룹명 매칭은 하지 않음 — label만으로 충분히 빠르고 단순함.)
- 매칭되는 계산기가 하나 이상 있는 그룹만 표시되고, 검색 중에는 아코디언 펼침 상태와 무관하게 강제로 펼쳐진다.
- 매칭되지 않는 계산기는 해당 그룹 안에서도 숨겨진다 (그룹은 보이되 그 안의 항목만 필터링).
- 매칭 결과가 하나도 없으면 "검색 결과가 없습니다" 안내 문구를 표시한다.
- 입력창에는 X 지우기 버튼을 둬서 검색어를 빠르게 초기화할 수 있게 한다.
- 검색어를 지우면 원래의 아코디언 펼침 상태(직전에 사용자가 펼쳐둔 그룹들)로 그대로 복귀한다 — 검색은 펼침 상태를 파괴하지 않는다.

**펼침 상태 지속성**
- 펼침 상태는 컴포넌트 상태(React state)로만 관리하고 localStorage 등에 저장하지 않는다. 새로고침하면 초기화되지만, 진입 시 현재 그룹이 자동으로 펼쳐지므로 실질적 불편은 없다. (YAGNI: 지속성 요구가 없는 상태에서 추가 복잡도를 들이지 않는다.)

## 컴포넌트 구조

새 컴포넌트 `src/components/Sidebar.tsx`를 만들어 `src/App.tsx`의 데스크톱 `<aside>` 내부 로직(그룹 목록 렌더링 + 검색 + 아코디언 상태)을 이곳으로 옮긴다. `App.tsx`가 이미 314줄로 여러 훅/컴포넌트를 담고 있고, 검색·아코디언 상태와 핸들러가 추가되면 그 블록만으로도 하나의 독립된 책임 단위가 되므로 분리한다.

`Sidebar.tsx`는 `routes.json`/`groups.json`을 `App.tsx`와 마찬가지로 직접 import한다(이미 `src/pages/AboutPage.tsx`가 `routes.json`을 직접 import하는 선례가 있어 기존 컨벤션과 일치). `groups` 배열(= `GROUP_ORDER`를 라우트 존재 여부로 필터링한 것)도 `Sidebar` 내부에서 동일하게 계산한다 — `App.tsx`와 한 줄이 중복되지만, routes/groups 전체를 props로 넘기는 것보다 데이터 소유가 명확해진다.

**Props:**
```ts
interface SidebarProps {
  activeRouteId: string
  activeGroup: string      // 현재 라우트의 group 필드
  onNavigate: (path: string) => void
}
```

`App.tsx`는 `<aside>` 내부의 기존 `<nav>` 블록(약 243~267번째 줄)을 `<Sidebar activeRouteId={route.id} activeGroup={route.group} onNavigate={navigate} />` 호출로 교체한다. `<aside>` 자체(로고, AdSlot, 하단 안내 문구)는 `App.tsx`에 그대로 둔다 — `Sidebar`는 검색창+그룹 목록 부분만 담당한다.

**내부 상태 (Sidebar.tsx 안에서 관리):**
- `query: string` — 검색어
- `expandedGroups: Set<string>` — 펼쳐진 그룹 이름의 집합. 초기값 `new Set([activeGroup])`.
- `activeGroup`이 바뀌면(사용자가 다른 계산기로 이동하면) `useEffect`로 `expandedGroups`에 새 `activeGroup`을 추가한다(교체가 아니라 추가).
- `toggleGroup(group: string)` — `query`가 비어 있을 때만 호출 가능(검색 중에는 그룹이 강제로 펼쳐져 있으므로 토글 무의미). `expandedGroups`에서 있으면 제거, 없으면 추가.

**렌더링 로직:**
```ts
const isSearching = query.trim().length > 0
const matches = (label: string) => label.toLowerCase().includes(query.trim().toLowerCase())

const visibleGroups = isSearching
  ? groups.filter((g) => routes.some((r) => r.group === g && matches(r.label)))
  : groups

// 그룹별로 렌더링할 라우트 목록
const routesForGroup = (g: string) =>
  routes.filter((r) => r.group === g && (!isSearching || matches(r.label)))

// 그룹이 펼쳐져 있는지
const isExpanded = (g: string) => isSearching || expandedGroups.has(g)
```

검색 결과가 없는 경우(`isSearching && visibleGroups.length === 0`)는 그룹 목록 대신 안내 문구를 렌더링한다.

## 접근성

- 그룹 헤더는 `<button>`으로 렌더링하고 `aria-expanded={isExpanded(g)}`, `aria-controls`로 해당 그룹의 목록 요소를 가리킨다.
- 검색 입력창은 `<label>` 또는 `aria-label="계산기 검색"`을 갖는다.
- 펼침/접힘 시 시각적 chevron 아이콘 방향을 회전시켜(기존 모바일 메뉴 토글 버튼의 회전 아이콘과 동일한 패턴, `App.tsx:180` 참고) 상태를 표시한다.

## 스타일

기존 사이드바 스타일(그룹명 `text-xs font-semibold tracking-wide text-slate-400`, 링크 항목 `MenuLink` 컴포넌트)을 그대로 재사용한다. 검색 입력창은 기존 `Field`류 인풋과 유사한 톤(`rounded-lg border border-slate-300 ... focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200`)으로 맞춘다. 새 색상 팔레트나 애니메이션 라이브러리를 도입하지 않는다 — 펼침/접힘은 조건부 렌더링으로 처리하고 별도 높이 트랜지션 애니메이션은 넣지 않는다(YAGNI, 필요성 낮음).

## 범위 밖 (Out of scope)

- 모바일 상단 드롭다운 메뉴 개선 — 별도 요청 시 후속 작업
- 펼침 상태의 localStorage 지속성
- 검색어 하이라이팅(매칭된 부분 강조 표시)
- 그룹명/설명(description) 대상 검색 — label만으로 충분

## 검증

- `npm run build` (tsc + vite + postbuild) 성공
- `npm run lint` 통과
- 수동 확인: 데스크톱 뷰에서 (1) 진입 시 현재 그룹만 펼쳐져 있는지, (2) 그룹 헤더 클릭으로 펼침/접힘이 토글되는지, (3) 다른 계산기로 이동 시 그 그룹이 자동으로 펼쳐지고 기존에 펼친 그룹은 유지되는지, (4) 검색어 입력 시 매칭 그룹만 남고 강제 펼쳐지는지, (5) 검색어를 지우면 원래 펼침 상태로 복귀하는지, (6) 결과 없음 문구가 뜨는지, (7) 기존 계산기 라우팅에 회귀가 없는지
