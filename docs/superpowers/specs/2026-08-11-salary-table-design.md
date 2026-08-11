# 연봉 실수령액표 (Salary Table) 설계

## 배경

Google AdSense가 사이트를 "가치가 낮은 콘텐츠"로 반복 반려하고 있다. 기존 대응(정확도 수정, About 페이지 보강, 얇은 계산기 콘텐츠 보강)은 모두 기존 "계산기 + intro/formula/glossary/examples/faqs" 템플릿 안에서의 개선이었다. 59개 페이지가 전부 이 템플릿을 쓰고 있어, 콘텐츠가 실제로는 각기 다르게 조사·검증된 것이라도 자동 심사 입장에서는 "같은 틀을 찍어낸 것"으로 보일 위험이 있다는 진단을 사용자와 공유했다.

이번 작업은 그 템플릿을 벗어난, 구조적으로 다른 형태의 콘텐츠를 하나 추가해 이 패턴을 깨는 것이 목표다. 후보로 lookup-table 레퍼런스 페이지·비교/의사결정 가이드·시의성 블로그를 검토했고, 사용자는 "연봉 실수령액표" lookup-table 방식을 1순위로 선택했다.

## 목표

연봉 구간별 실수령액을 미리 계산해 표로 제공하는 새 페이지 `/salary-table`을 추가한다. "연봉 4000 실수령액"처럼 특정 숫자를 검색하는 수요에 바로 답을 주는 레퍼런스 콘텐츠이며, 기존 계산기 템플릿과 시각적·구조적으로 다른 형태다.

## 데이터 생성

새 함수 `buildSalaryTable()`을 `src/lib/salary.ts`에 추가한다. 기존에 검증된 `calcSalary()`를 그대로 재사용해 표의 각 셀을 계산하므로, 새로운 계산 로직을 만들지 않고 인터랙티브 계산기(`/salary`)와 100% 동일한 엔진으로 표를 생성한다.

- 연봉 구간: 2,000만원~1억원은 100만원 단위(81행), 1억500만원~2억원은 500만원 단위(20행) — 총 101행.
- 각 행은 4개 가구원 수(1인·2인·3인·4인) 기준 월 실수령액을 나란히 계산한다.
- 계산 가정: 비과세 월액 0원, 8~20세 자녀 0명, 원천징수비율 100%. 이 가정은 페이지 상단에 명시한다.

```ts
export interface SalaryTableRow {
  annualSalary: number
  monthlyGross: number
  net: [number, number, number, number] // 1인·2인·3인·4인 가구 월 실수령액
}

export function buildSalaryTable(): SalaryTableRow[]
```

## 페이지 구성 (`src/pages/SalaryTableCalculator.tsx`)

- 인터랙티브 입력이 없는 정적 레퍼런스 페이지. `useMemo(() => buildSalaryTable(), [])`로 한 번만 계산.
- 상단: 표 읽는 법과 계산 가정(비과세 0원·자녀 0명 기준, 실제 급여명세서와 차이 날 수 있음)을 설명하는 짧은 안내문.
- 표: 연봉 | 월급(세전) | 실수령액(1인) | 실수령액(2인) | 실수령액(3인) | 실수령액(4인+) 6개 컬럼, 101행. `overflow-x-auto` 컨테이너로 감싸 모바일에서도 가로 스크롤 가능하게 한다. 사용자의 현재 화면(모바일 좁은 화면)을 고려해 숫자는 `fmt()`로 천단위 콤마만 적용하고 "원" 단위 생략(헤더에 "단위: 원"으로 표기)해 폭을 줄인다.
- 하단: `InfoSection pageId="salaryTable"`을 재사용해 기존 패턴대로 FAQ(4~5개)를 붙인다. `formula`/`glossary`는 이미 `/salary` 계산기 페이지에 있으므로 중복을 피해 넣지 않고, `intro`와 `faqs`만 채운다.
- `/salary` 계산기 페이지 결과 카드 근처에 이 표로 가는 링크를 추가하고, 이 페이지에도 `/salary`로 가는 링크(정확한 내 상황에 맞는 계산은 계산기로)를 넣어 상호 링크한다.

## 라우팅

- `src/routes.json`에 새 항목 추가: `{ id: "salaryTable", path: "/salary-table", label: "연봉 실수령액표", group: "직장인", title: "...", description: "..." }`. "직장인" 그룹에서 `salary` 바로 다음 위치.
- `src/App.tsx`의 lazy import 레지스트리에 `salaryTable: lazy(() => import('./pages/SalaryTableCalculator'))` 추가.
- `groups.json`은 이미 "직장인"을 포함하므로 수정 불필요 — 사이드바에 자동으로 노출된다.

## 콘텐츠 (`src/lib/pageContent.js`)

새 `salaryTable` 엔트리 추가:
- `intro`: 표의 용도, 계산 가정(비과세 0원·자녀 0명·원천징수 100%), "정확한 개인별 금액은 `/salary` 계산기에서 확인" 안내.
- `faqs` 4~5개: "왜 내 실수령액과 표가 다른가요?"(비과세·자녀공제 등 개인 조건 차이), "가구원 수는 어떻게 세나요?"(본인 포함 부양가족 수), "1억 넘는 연봉은 왜 500만원 단위인가요?", "이 표의 기준연도는 언제인가요?" 등.
- `sources`는 넣지 않는다 (계산 근거는 `/salary` 계산기 페이지의 sources를 그대로 따름 — 순수 수치 재배열이라 별도 출처가 필요하지 않음).

## 크롤러 대응 (`scripts/postbuild.mjs`)

이 사이트의 기존 관례대로, 모든 페이지는 JS 없이도 정적 HTML에서 실제 콘텐츠가 보이도록 프리렌더링된다(`prerenderBody()`가 `pageContent.js`의 intro/formula/glossary/examples/faqs를 정적 HTML로 렌더링). 표 자체가 이 페이지의 핵심 가치이므로, `route.id === 'guidesIndex'`를 특별 처리하는 것과 같은 방식으로 `route.id === 'salaryTable'`일 때도 101행 표를 정적 HTML `<table>`로 렌더링하도록 `prerenderBody()`를 확장한다.

- `postbuild.mjs` 상단에 `import { buildSalaryTable } from '../src/lib/salary.ts'` 추가 (Node 24 네이티브 TypeScript 실행으로 별도 빌드 없이 동작 확인됨).
- `prerenderBody()` 안에서 `pageContent[route.id]` 블록 처리 이후, `route.id === 'salaryTable'`이면 `buildSalaryTable()` 결과를 표로 렌더링.

## 검증 계획

- `buildSalaryTable()`의 몇몇 행을 실제 `/salary` 계산기 입력(같은 연봉·가구원 수·비과세 0원·자녀 0명 조건)과 대조해 완전히 같은 값이 나오는지 수동 검증한다(같은 함수를 호출하므로 로직상 당연히 같아야 하지만, 배열 구성·반올림 과정에서 실수가 없는지 확인).
- 101행 경계값(2,000만원, 1억원, 1억500만원, 2억원)이 정확한 개수·단위로 생성되는지 확인한다.
- `npx tsc -b --noEmit`, `npm run build`, `npm run lint` 통과 확인.
- 빌드 후 `dist/salary-table/index.html`에 실제 표 데이터(101행)가 정적 HTML로 포함돼 있는지 확인(텍스트 길이·행 개수 체크).
- 기존 `/salary` 페이지·사이드바·About 페이지의 "제공하는 계산기" 목록에 새 라우트가 자동으로 반영되는지 확인(routes.json 기반 자동 생성이므로 별도 수정 불필요하지만 확인은 필요).

## 범위 제외

- 가구원 수 선택 토글이나 비과세액 입력 등 인터랙티브 기능은 넣지 않는다(YAGNI) — 필요성이 확인되면 후속 작업으로 고려.
- 연봉 2억원 초과 구간은 다루지 않는다(고소득 구간은 개인차가 커 레퍼런스 표의 효용이 낮음).
- Vitest 등 테스트 프레임워크는 도입하지 않는다(세션 전반의 기존 방침 유지) — 수동 스크립트 검증으로 대체한다.
