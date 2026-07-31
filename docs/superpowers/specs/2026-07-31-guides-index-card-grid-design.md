# 가이드 목록 카드 그리드 — 설계 문서

## Context

`/guides` 목록 페이지에서 각 가이드가 타이틀+설명을 세로로 나열하는 리스트 형태라 타이틀이 한눈에 들어오지 않는다는 피드백을 받았다. 설명을 제거하고 이모지 아이콘+타이틀만 보이는 카드 그리드로 바꿔 스캔하기 쉽게 만든다.

## 변경 범위

`src/pages/GuidesIndexPage.tsx` 한 파일만 수정한다. `routes.json`의 `description` 필드는 그대로 두고(SEO 메타태그·postbuild 등 다른 곳에서 계속 사용됨) 이 페이지의 렌더링에서만 빼는 것이라, 다른 파일에 영향이 없다.

## 변경 내용

- `GuideList` 내부의 아이템 목록 컨테이너를 `mt-3 space-y-2`(세로 리스트)에서 `mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3`(카드 그리드, 모바일 2열/태블릿 이상 3열)로 변경한다.
- 각 카드(`<a>`)의 내부를 `<p className="font-semibold">{label}</p>` + `<p className="text-sm text-slate-500">{description}</p>` 가로형 텍스트 나열에서, 이모지 아이콘(큰 사이즈, `text-4xl` 정도) + 타이틀만 세로 중앙정렬하는 레이아웃으로 바꾼다. `description`은 렌더링하지 않는다.
- 카드의 테두리·호버 스타일(`rounded-xl border border-slate-200 ... hover:border-emerald-300 hover:bg-emerald-50/30`)은 기존 톤을 유지한다.
- 13개 가이드 각각의 대표 이모지를 `GuidesIndexPage.tsx` 파일 안에 로컬 상수 `GUIDE_ICONS: Record<string, string>` (route id → 이모지)로 정의한다. 이 페이지에서만 쓰는 값이라 routes.json 스키마나 다른 파일을 건드리지 않는다.

  | route id | 이모지 |
  |---|---|
  | yearEndTaxProcedureGuide | 🧾 |
  | jeonseDepositRecoveryGuide | 🔑 |
  | severanceInterimGuide | 💼 |
  | unemploymentApplicationGuide | 📋 |
  | pensionTaxCreditGuide | 💰 |
  | youthRentSubsidyGuide | 🏠 |
  | youthLeapAccountGuide | 📈 |
  | youthJeonseLoanGuide | 🏦 |
  | nationalEmploymentSupportGuide | 🧑‍💼 |
  | inheritanceTaxProcedureGuide | ⚖️ |
  | giftTaxProcedureGuide | 🎁 |
  | subscriptionScoreGuide | 🏆 |
  | subscriptionRankGuide | 📊 |

## 범위 밖

- 실제 이미지/일러스트 파일 도입 (이모지 아이콘으로 대체, 확정된 방향)
- `routes.json` 스키마 변경 (아이콘은 이 페이지 로컬 상수로만 관리)
- 가이드 상세 페이지(`GuideArticlePage`)나 다른 목록(사이드바 등)의 레이아웃 변경 — `/guides` 인덱스 페이지의 카드 그리드만 대상

## 검증

- `npx tsc -b --noEmit`, `npm run build`, `npm run lint` 통과
- 13개 가이드 전부 카드에 이모지+타이틀만 표시되고 설명 텍스트가 사라졌는지 확인
- 모바일 너비에서 2열, 태블릿 이상에서 3열 그리드가 적용되는지 확인
