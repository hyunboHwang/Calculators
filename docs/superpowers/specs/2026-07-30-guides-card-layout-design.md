# 가이드 글 카드뉴스 레이아웃 — 설계 문서

## Context

`/guides` 가이드 8편이 텍스트 위주라 읽기 힘들다는 피드백을 받았다. 브라우저 목업으로 3가지 방향(타임라인 스텝카드/매거진 카드 그리드/하이라이트 콜아웃)을 비교한 뒤 "매거진 카드 그리드"(B) 방식으로, 그중에서도 가이드마다 핵심 요약을 직접 뽑아 넣는 "B-2. 가이드별 맞춤 작성" 버전으로 확정했다.

계산기 37개 + 소개/개인정보처리방침 2개 페이지는 이번 변경의 영향을 받지 않는다 — 새 필드가 없으면 새 섹션도 렌더링되지 않는 기존 컨벤션(`sources`, `examples` 등과 동일)을 그대로 따른다.

## 데이터 구조

`src/components/InfoSection.tsx`의 `PageInfo`에 선택 필드 2개를 추가한다:

```ts
interface PageInfo {
  // ...기존 필드 그대로...
  highlights?: { icon: string; label: string; text: string }[]  // 정확히 4개(2×2 카드)
  stepChips?: { icon: string; label: string }[]                  // formula.steps와 개수·순서 1:1 대응
}
```

- `highlights`는 가이드마다 정확히 4개로 통일한다(2×2 그리드 고정).
- `stepChips`는 `formula.steps` 배열과 길이가 같아야 하며, `steps[i]`를 짧은 아이콘+라벨로 요약한 것이다. `formula`가 없는 항목(이번 8개 가이드는 전부 `formula`가 있으므로 해당 없음)에는 `stepChips`도 없어야 한다.
- 두 필드 모두 계산기 콘텐츠에는 채우지 않는다 — 값이 없으면 섹션 자체가 렌더링되지 않으므로 기존 37개 계산기 + 2개 정보 페이지는 시각적으로 전혀 바뀌지 않는다.

## 렌더링

`InfoSection.tsx`의 최상위 wrapper(`<div className="mt-14 border-t border-slate-200 pt-8">`) 안, 기존 "알아두면 좋은 것" 섹션보다 앞에 `highlights` 2×2 카드 그리드를 추가한다(`mb-8`로 아래 인트로와 간격을 주되, 인트로 섹션 자체의 클래스는 건드리지 않는다 — `highlights`가 없는 페이지는 지금처럼 인트로가 그대로 첫 섹션이 된다).

`formula` 섹션 안, 제목(`<h2>`)과 기존 번호 리스트(`<ol>`) 사이에 `stepChips`를 가로 스크롤 칩 스트립으로 추가한다. 칩은 요약 전용이며 기존 번호 리스트(전체 설명 문장)는 그대로 아래에 유지한다 — 요약이 상세 설명을 대체하지 않는다.

두 섹션 모두 필드가 없거나 빈 배열이면 렌더링하지 않는 기존 컨벤션(`c.examples && c.examples.length > 0` 등)을 그대로 따른다.

## 스타일

브레인스토밍 목업의 인라인 CSS를 사이트 기존 Tailwind 톤으로 옮긴다:
- 하이라이트 카드: `rounded-xl border border-slate-200 bg-white p-3` (기존 `examples`/`sources` 카드와 동일 톤)
- 스텝 칩: `rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white`, `overflow-x-auto`로 가로 스크롤
- 새 색상 팔레트나 애니메이션 라이브러리 도입 없음

## 콘텐츠 작업

가이드 8편 전부에 `highlights`(4개) + `stepChips`(각 가이드의 `formula.steps` 개수만큼)를 새로 작성한다. **이미 검증된 기존 콘텐츠(intro/formula/faqs)를 요약하는 작업이라 웹 검색 재검증은 필요 없다** — 각 가이드의 실제 서브에이전트가 이미 작성한 본문에서 핵심만 뽑아내면 된다.

## 범위 밖 (Out of scope)

- 계산기 37개·정보 페이지 2개의 레이아웃 변경 (이번 필드는 이 페이지들에 채우지 않음)
- `intro` 본문 축약/재작성 (하이라이트는 요약 레이어일 뿐, 기존 상세 설명은 그대로 유지)
- 하이라이트 카드 개수를 가이드마다 다르게 하는 것 (전부 4개로 통일)
- 신규 가이드 추가 시 하이라이트/칩 작성 자동화 (8편 규모에서는 수동 작성으로 충분)

## 검증

- `npx tsc -b --noEmit`, `npm run build`, `npm run lint` 통과
- 계산기 페이지(예: `/salary`) 프리렌더 HTML/런타임 렌더링이 이번 변경 전후로 동일한지 확인(회귀 없음)
- 가이드 8편 전부 하이라이트 카드 4개 + 스텝 칩(각 가이드 실제 단계 수만큼)이 렌더링되는지 확인
- `stepChips` 개수가 `formula.steps` 개수와 정확히 일치하는지 8편 전부 확인
