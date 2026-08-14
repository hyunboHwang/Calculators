# 용어사전(Glossary Hub) 설계

## 배경

AdSense가 "낮은 가치 콘텐츠"로 사이트를 반복 반려하는 상황에서, 계산기(59개)·가이드(15개)가 전부 같은 5개 섹션 템플릿(intro/formula/glossary/examples/faqs)을 쓰고 있어 자동 심사 입장에서 "찍어낸 콘텐츠"로 보일 위험이 있다는 진단을 계속 공유해왔다. `/salary-table`로 한 번 형식을 깼고(lookup-table), 이번에는 계산기·가이드 어느 쪽도 아닌 완전히 다른 콘텐츠 유형을 추가한다.

`pageContent.js`를 조사한 결과, 52개 페이지에 걸쳐 총 257개의 `glossary` 항목(용어 설명)이 흩어져 있고, 고유 용어 수는 226개다. 이 중 25개 용어가 2곳 이상에서 등장하며, 그중 18개는 실제로 정의가 다르다(문맥에 따라 같은 용어가 다른 의미로 쓰임 — 예: "과세표준"은 연봉/프리랜서/재산세 계산기에서 각각 다른 산식을 가리킴).

## 목표

이미 검증된 226개 용어 설명을 가나다순으로 재구성한 통합 용어사전 페이지 `/glossary`를 추가한다. 새로운 사실을 조사하지 않고 기존 검증된 텍스트를 재구성하는 것이므로 오류 리스크가 거의 없고, 형식이 "사전"이라 계산기·가이드 템플릿과 완전히 다르며, 226개 용어 각각이 원출처 계산기·가이드로 링크돼 사이트 전체를 엮는 내부 링크 허브 역할을 한다.

## 중복 처리 원칙

- 같은 용어가 여러 페이지에서 **동일한 정의**로 등장하면 하나로 합치고, 등장한 모든 페이지를 "관련 계산기/가이드" 링크로 나열한다.
- 같은 용어가 여러 페이지에서 **서로 다른 정의**로 등장하면(조사 결과 18개 해당) 정의를 억지로 하나로 합치지 않고, 각 정의를 별도로 보여주며 어느 페이지의 정의인지 함께 표시한다. 부정확하게 뭉뚱그리는 것보다 정직한 방식을 택한다.

## 데이터 생성 (`src/lib/glossaryIndex.ts`)

```ts
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
  definitions: GlossaryDefinition[] // 보통 1개, 문맥별로 정의가 다르면 여러 개
}

export function buildGlossaryIndex(): GlossaryEntry[]
```

`pageContent.js`의 모든 최상위 항목을 순회하며 `.glossary` 배열이 있으면 `(term, definition)` 쌍으로 묶는다. 같은 `term` 아래에서 `definition` 텍스트가 다르면 별도 `GlossaryDefinition`으로 분리하고, 각 `GlossaryDefinition`은 해당 텍스트가 등장한 모든 페이지를 `sources`로 모은다. `routes.json`에서 각 페이지의 `label`/`path`를 조회해 링크 정보를 채운다. 최종적으로 `term` 기준 가나다순(`localeCompare(..., 'ko')`)으로 정렬한다.

이 함수는 `/salary-table`의 `buildSalaryTable()`과 같은 패턴으로, React 페이지와 `postbuild.mjs`(크롤러용 정적 프리렌더링)가 동일하게 가져다 쓴다 — 데이터가 두 곳에서 어긋나지 않도록 로직을 한 곳에만 둔다.

## 페이지 구성 (`src/pages/GlossaryPage.tsx`)

- 상단: 짧은 소개(이 페이지가 뭔지, 226개 용어가 각 계산기·가이드에서 이미 검증된 설명을 모은 것이라는 안내).
- 검색창: `useState`로 필터 텍스트를 관리하고, 용어 또는 정의 텍스트에 대소문자 구분 없이 부분일치하는 항목만 클라이언트 사이드에서 실시간 필터링한다. 226개 규모에서는 서버 검색 없이 매 입력마다 배열을 필터링해도 충분히 빠르다.
- 용어 목록: `<dl>`/`<dt>`/`<dd>` 시맨틱 구조(기존 `InfoSection.tsx`의 용어 설명 섹션과 동일한 태그 사용). 각 `dt`는 용어, 각 `dd`는 정의 + "관련: OO 계산기, OO 가이드" 링크 목록. 정의가 여러 개인 용어는 `dd`를 여러 개 나열한다.
- 필터링 결과가 0건일 때 "일치하는 용어가 없습니다" 안내 문구를 표시한다.

## 네비게이션 배치

`groups.json`에 새 그룹 `"용어사전"`을 추가하고, `routes.json`에 `{ id: "glossaryHub", path: "/glossary", label: "용어사전", group: "용어사전", ... }`을 등록한다. "가이드" 그룹으로 넣지 않는 이유: `App.tsx`는 `route.group !== '가이드'`인 라우트에만 `<InfoSection pageId={route.id} />`를 자동으로 렌더링하는데, "가이드" 그룹 페이지는 각자 `GuideArticlePage` 안에서 수동으로 InfoSection을 호출하는 구조라 이 페이지의 커스텀 사전 위젯을 끼워 넣을 자리가 마땅치 않다. 새 그룹으로 두면 계산기 페이지들과 동일하게 자동으로 하단에 소개문·FAQ가 붙어 별도 배선이 필요 없다.

`pageContent.js`에 `glossaryHub: { intro: [...], faqs: [...] }` 항목을 추가해 이 자동 InfoSection이 보여줄 소개문·FAQ를 채운다(예: "이 용어사전은 어떻게 만들어졌나요?", "정의가 여러 개인 용어가 있는 이유는 무엇인가요?").

## 크롤러 대응 (`scripts/postbuild.mjs`)

`route.id === 'glossaryHub'`일 때 `buildGlossaryIndex()` 결과를 `<dl>` 정적 HTML로 렌더링한다(`guidesIndex`, `salaryTable`을 특별 처리하는 것과 같은 방식). 검색창은 JS 없이는 의미가 없으므로 정적 버전에서는 생략하고 전체 목록만 렌더링한다.

## 검증 계획

- `buildGlossaryIndex()`의 총 항목 수·고유 용어 수가 조사 결과(257개 raw, 226개 고유)와 일치하는지 확인한다.
- 정의가 다른 18개 용어가 실제로 여러 `GlossaryDefinition`으로 분리되는지, 정의가 같은 나머지 중복 용어는 하나로 합쳐지는지 수동 스크립트로 확인한다.
- 몇 개 용어를 골라 `sources` 링크의 `label`/`path`가 `routes.json`과 정확히 일치하는지 확인한다.
- `npx tsc -b --noEmit`, `npm run build`, `npm run lint` 통과 확인.
- 빌드 후 `dist/glossary/index.html`에 226개 용어가 정적 HTML로 포함돼 있는지 확인(텍스트 길이·항목 개수 체크).

## 범위 제외

- 초성(ㄱㄴㄷ) 점프 네비게이션은 넣지 않는다(YAGNI) — 검색창으로 충분히 대체 가능, 필요성이 확인되면 후속 작업.
- 카테고리(세금/대출/나이 등)별 분류는 넣지 않는다 — 각 용어의 "관련 계산기/가이드" 링크가 사실상 카테고리 역할을 한다.
- Vitest 등 테스트 프레임워크는 도입하지 않는다 — 수동 스크립트 검증으로 대체한다.
