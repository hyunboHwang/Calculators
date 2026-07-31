# 관리비·이사비용·연금저축(IRP) 세액공제 계산기 — 설계 문서

## Context

세 번째 콘텐츠 확장으로, 성격이 다른 계산기 3개를 함께 추가한다: 관리비 계산기, 이사비용 계산기(둘 다 법정 공식이 없는 순수 입력합산 도구), 연금저축·IRP 세액공제 계산기(세법 기반 계산 로직 + 가이드 1편). 관리비·이사비용은 이번 세션 다른 계산기들과 달리 규정 기반 공식이 없어 가이드를 페어링하지 않는다.

연금저축·IRP 세액공제 관련 수치(납입한도, 공제율, 중도해지 불이익 등)는 국세청 및 복수 금융사 공식 자료로 교차검증을 마쳤다 — 특히 "50세 이상 200만원 추가한도"는 2022년 일몰 종료되어 현재 미적용이라는 점을 확인했으며, 이 낡은 정보가 콘텐츠에 섞이지 않도록 명시한다.

## 아키텍처

관리비·이사비용 계산기는 순수 UI 합산 도구로, 계산 로직 모듈(`src/lib/`) 없이 페이지 컴포넌트 안에서 직접 합산한다(법정 공식이 없어 별도 lib 분리의 이점이 없음 — 기존 계산기들의 "계산 로직 분리" 컨벤션은 계산 로직 자체가 있을 때만 적용). 연금저축·IRP 계산기는 기존 세금 계산기 패턴(순수 계산 함수 + 얇은 페이지)을 따른다.

- **관리비 계산기**: `src/pages/ManagementFeeCalculator.tsx`, `routes.json`에 `group: "생활"`
- **이사비용 계산기**: `src/pages/MovingCostCalculator.tsx`, `routes.json`에 `group: "생활"`
- **연금저축·IRP 세액공제 계산기**: `src/lib/pensionTaxCredit.ts` + `src/pages/PensionTaxCreditCalculator.tsx`, `routes.json`에 `group: "주식"` (이미 예적금 이자 등 재테크성 계산기가 있는 그룹)
- **가이드**: `src/pages/guides/PensionTaxCreditGuide.tsx` — 기존 `GuideArticlePage`/`InfoSection` 스키마 재사용, `relatedCalculators`로 연금저축·IRP 계산기 연결, `group: "가이드"`, `GuidesIndexPage.tsx`의 기존 `TRACK1_IDS`("계산기 활용 가이드" — 연말정산 신고 절차 등과 같은 트랙, 부동산 성격이 아니므로 TRACK3보다 적합)에 추가

## 관리비 계산기 (`/management-fee`)

### 입력 필드

| 필드 | 설명 |
|---|---|
| `exclusiveArea` | 전용면적 (㎡) |
| `commonManagementFee` | 공용관리비 (일반관리비+청소비+경비비+소독비+승강기유지비 합산 직접입력) |
| `longTermRepairReserve` | 장기수선충당금 |
| `electricity` | 전기료 |
| `water` | 수도료 |
| `gas` | 가스료 |
| `heating` | 난방·급탕비 |
| `misc` | 기타(TV수신료, 정화조 등) |

### 로직

`totalFee = commonManagementFee + longTermRepairReserve + electricity + water + gas + heating + misc`
`feePerArea = exclusiveArea > 0 ? totalFee / exclusiveArea : 0` (원/㎡)

법정 공식이 아닌 단순 합산·나눗셈이므로 정확성 리스크 없음. disclaimer: 실제 고지서의 항목 구성은 단지마다 다를 수 있으니 고지서 항목을 위 카테고리에 맞춰 합산해 입력하라는 안내.

## 이사비용 계산기 (`/moving-cost`)

### 입력 필드

| 필드 | 설명 |
|---|---|
| `ladderTruckCost` | 사다리차 비용 |
| `movingServiceCost` | 포장이사·일반이사 용역비 |
| `cleaningCost` | 청소비 |
| `applianceInstallCost` | 에어컨 등 가전 이전설치비 |
| `wasteDisposalCost` | 폐기물 처리비 |
| `miscCost` | 기타 비용 |

### 로직

`totalCost = ladderTruckCost + movingServiceCost + cleaningCost + applianceInstallCost + wasteDisposalCost + miscCost`

사용자가 이미 알고 있거나 견적받은 금액을 입력하는 순수 합산 도구 — 시세 데이터나 지역별 참고 범위는 반영하지 않는다(확정된 방향). disclaimer: 이 계산기는 입력한 항목의 합계만 계산하며 실제 이사비용 시세를 제공하지 않는다는 점을 명시.

## 연금저축·IRP 세액공제 계산기 (`/pension-tax-credit`)

### 입력 필드

| 필드 | 설명 |
|---|---|
| `totalSalary` | 총급여 (원) — 근로소득자 기준 |
| `pensionSavingsContribution` | 연금저축 납입액 |
| `irpContribution` | IRP 납입액 |

### 계산 로직

1. **연금저축 인정액** = `min(pensionSavingsContribution, 6,000,000)` (연금저축 단독 한도 600만원)
2. **합산 인정액** = `min(연금저축 인정액 + irpContribution, 9,000,000)` (연금저축+IRP 합산 한도 900만원 — 2023년 세법개정으로 기존 400만+300만 별도 구조에서 통합됨)
3. **공제율** = `totalSalary ≤ 55,000,000 ? 0.165 : 0.132` (지방소득세 포함 실효세율. 국세청 공식 표기는 지방세 별도 15%/12%지만, 계산기·가이드 모두 "지방소득세 포함 16.5%/13.2%"로 통일해 사용자가 실제 환급액을 바로 알 수 있게 한다)
4. **세액공제액** = `합산 인정액 × 공제율`

### 검증된 사실 (Global Constraint)

- **50세 이상 추가한도(200만원)는 2022년 일몰 종료되어 현재 적용되지 않는다** — 계산기·가이드 어디에도 이 낡은 한도를 반영하지 않는다.
- 연금저축 자체 상한(600만원)이 있어, 연금저축에만 900만원을 넣어도 600만원까지만 인정된다(초과분은 세액공제 대상만 아닐 뿐 별도 불이익은 없음).
- IRP는 자체 상한이 없어 단독으로 900만원 전액 납입 시 전액 인정 가능.

### disclaimer

종합소득자(사업소득 등)는 총급여가 아닌 종합소득금액 기준으로 공제율 구간이 달라질 수 있으며, 이 계산기는 근로소득자의 총급여 기준으로 계산한 예상 세액공제액이라는 점을 명시.

## 가이드: 세액공제 한도·공제율 완벽정리 (`/guides/pension-tax-credit`)

`relatedCalculators`로 연금저축·IRP 세액공제 계산기 연결. 다음 내용을 다룬다:
- 납입한도 구조(연금저축 600만 단독 / 합산 900만)와 2023년 개편 이력
- 공제율 구간(총급여 5,500만원 기준 16.5%/13.2%)
- 50세 이상 추가한도 폐지(2022년 일몰) — 오래된 정보를 현재 유효한 것으로 오인하지 않도록 명시
- 중도해지 시 기타소득세 16.5% 부과, 부득이한 사유(천재지변·사망·해외이주·개인회생·파산·3개월 이상 요양 등) 인출 시 저율 연금소득세(3.3~5.5%) 분리과세
- 연금 수령 시 과세: 연령별 연금소득세율(3.3~5.5%), 종합과세 기준 연 1,500만원(2024년부터 1,200만원에서 상향)

기존 8개 가이드와 동일한 스키마(intro/formula/glossary/faqs/sources/highlights 4개/stepChips)로 작성한다.

## 범위 밖 (Out of scope)

- 관리비·이사비용 계산기의 가이드 페이지 (규정성 콘텐츠가 거의 없어 계산기만으로 충분하다고 판단, 확정된 방향)
- 이사비용의 지역별·업체별 시세 데이터 반영 (사용자 직접입력 합산만, 확정된 방향)
- 종합소득자(사업소득 등)를 위한 별도 공제율 구간 계산 (근로소득자의 총급여 기준만 지원)
- 연금 수령 단계의 실제 세액 계산기 (이번 계산기는 납입 단계의 세액공제만 다루며, 수령 단계 세금은 가이드에서 설명만 함)

## 검증 계획

- 연금저축·IRP 관련 모든 수치(한도, 공제율, 50세 추가한도 폐지, 중도해지 불이익, 연금소득세율, 종합과세 기준)는 이번 설계 단계에서 국세청·복수 금융사 공식 자료로 교차검증 완료(가이드 `sources`에 인용).
- `npx tsc -b --noEmit`, `npm run build`, `npm run lint` 통과.
- 연금저축·IRP 계산 로직에 대해 최소 2~3개 케이스 수동 검증(연금저축 단독 초과입력 케이스 포함).
- 관리비·이사비용은 단순 합산이므로 산술 정확성만 확인(공식 검증 불필요).
