# 상속세·증여세 계산기 + 가이드 — 설계 문서

## Context

기존 37개 계산기 + 8개 가이드에 이어, "상속세·증여세" 세금 도메인을 추가한다. 이번 서브프로젝트는 두 개의 독립 서브프로젝트(세금 → 청약) 중 첫 번째로, 상속세 계산기, 증여세 계산기, 그리고 각각의 짝이 되는 신고 절차 가이드(상속세 신고 절차, 증여세 신고 절차) 총 4개 페이지를 추가한다. 청약가점·청약순위 계산기/가이드는 별도 서브프로젝트로 이어서 진행한다.

계산 로직에 쓰이는 모든 세율·공제 한도·신고기한은 사전 리서치(WebSearch, 국세청 공식 출처)로 확인을 마쳤다 — 특히 2024년 발의되었다가 국회에서 부결된 "자녀공제 5천만→5억원 확대, 최고세율 50%→40%" 개정안은 시행되지 않았으므로 이 수치를 사용하지 않는다. 현행법(자녀공제 5천만원, 최고세율 50%) 기준으로 구현한다.

## 아키텍처

기존 세금 계산기 패턴(`src/pages/ComprehensiveRealEstateTaxCalculator.tsx` + `src/lib/comprehensiveRealEstateTax.ts`)을 그대로 따른다:

- **계산기 페이지** (`src/pages/InheritanceTaxCalculator.tsx`, `src/pages/GiftTaxCalculator.tsx`): `Field`/`Row`/`fmt` 기존 UI 헬퍼(`src/components/ui.tsx`) 사용, 입력 섹션 + 결과 카드 + 상세 내역 + 주황색 disclaimer 박스(`rounded-2xl border border-amber-200 bg-amber-50`) 레이아웃.
- **계산 로직 모듈** (`src/lib/inheritanceTax.ts`, `src/lib/giftTax.ts`): 입력 인터페이스 + 순수 함수(`calcInheritanceTax`, `calcGiftTax`), JSDoc 주석으로 단순화한 부분 명시.
- **라우팅**: `routes.json`에 `group: "부동산"`으로 2개 계산기 라우트 추가 (기존 그룹 재사용, `groups.json` 변경 없음 — 취득세·재산세·종부세와 같은 그룹).
- **가이드**: 기존 `GuideArticlePage.tsx`/`InfoSection.tsx` 스키마 그대로 재사용 (intro/formula/glossary/faqs/sources + highlights 4개/stepChips). `routes.json`에 `group: "가이드"`로 2개 가이드 라우트 추가, 각각 `relatedCalculators`로 짝이 되는 계산기를 연결.
- **가이드 목록 페이지** (`src/pages/GuidesIndexPage.tsx`): 새 `TRACK3_IDS = ['inheritanceTaxProcedureGuide', 'giftTaxProcedureGuide']` 배열 추가, `<GuideList ids={TRACK3_IDS} title="세금·부동산 절차" />` 섹션 추가. 청약 서브프로젝트에서 같은 트랙에 2개를 더 추가할 예정.
- **postbuild.mjs**: 기존 `guidesIndex` 분기가 `group === '가이드'`인 모든 라우트를 자동으로 나열하므로 수정 불필요.

## 상속세 계산기

### 입력 필드

| 필드 | 설명 |
|---|---|
| `estateValue` | 상속재산가액 (원) |
| `debtAndFuneralCost` | 채무·공과금·장례비용 합산 공제액 (직접입력, 원) |
| `hasSpouse` | 배우자 생존 여부 (checkbox) |
| `spouseActualShare` | 배우자 실제 상속액 (원, 0이면 미입력으로 간주) |
| `childrenCount` | 자녀 수 |
| `minorHeirsCount` / `minorRemainingYears` | 미성년 상속인 수 / 평균 잔여연수(19세까지, 기본값 10) |
| `elderlyHeirsCount` | 65세 이상 상속인 수 |
| `disabledHeirsCount` / `disabledRemainingYears` | 장애인 상속인 수 / 평균 기대여명 연수(직접입력, 기본값 20) |
| `netFinancialAssets` | 순금융재산가액 (원, 금융재산공제용) |

### 계산 로직

1. **과세가액** = `estateValue - debtAndFuneralCost`
2. **인적공제** = `childrenCount × 5,000만 + minorHeirsCount × 1,000만 × minorRemainingYears + elderlyHeirsCount × 5,000만 + disabledHeirsCount × 1,000만 × disabledRemainingYears`
3. **기초·일괄공제**: 배우자 단독상속(판정 기준: `childrenCount + minorHeirsCount + elderlyHeirsCount + disabledHeirsCount === 0` 이고 `hasSpouse === true`)이 아니면 `max(2억 + 인적공제, 5억)`; 배우자 단독상속이면 `2억 + 인적공제`만 (일괄공제 선택 불가)
4. **배우자공제**: 배우자 없으면 0. 있으면 `spouseActualShare`가 0(미입력)이거나 5억 미만이면 5억; 5억 이상이면 `min(spouseActualShare, 30억)`
5. **금융재산공제**: `netFinancialAssets ≤ 2,000만원`이면 `netFinancialAssets` 전액 공제; 초과하면 `min(max(netFinancialAssets × 0.2, 2,000만), 2억)`
6. **과세표준** = `max(과세가액 - (기초·일괄공제 + 배우자공제 + 금융재산공제), 0)`
7. **산출세액** = 아래 공통 세율표 적용
8. **납부세액** = `산출세액 × 0.97` (신고세액공제 3%, 기한 내 신고 가정)

### 공통 세율표 (상속세·증여세 동일, 5단계 누진)

| 과세표준 | 세율 | 누진공제 |
|---|---|---|
| 1억원 이하 | 10% | 0 |
| 5억원 이하 | 20% | 1,000만원 |
| 10억원 이하 | 30% | 6,000만원 |
| 30억원 이하 | 40% | 1억6,000만원 |
| 30억원 초과 | 50% | 4억6,000만원 |

## 증여세 계산기

### 입력 필드

| 필드 | 설명 |
|---|---|
| `giftValue` | 증여재산가액 (원) |
| `relation` | 증여자-수증자 관계: `spouse` / `ancestorToDescendant`(직계존속→직계비속) / `descendantToAncestor`(직계비속→직계존속) / `otherRelative`(기타친족) / `stranger`(타인) |
| `isMinor` | 수증자 미성년 여부 (relation이 `ancestorToDescendant`일 때 공제 한도에 영향) |
| `isGenerationSkip` | 세대생략 증여 여부 (조부모→손자 등) |
| `priorGiftSum` | 최근 10년 내 동일인 증여 합산액 (직접입력, 원) |
| `marriageOrBirthDeduction` | 혼인·출산 증여재산공제 해당 여부 (relation이 `ancestorToDescendant`일 때만 유효) |

### 계산 로직

1. **과세가액** = `giftValue + priorGiftSum`
2. **증여재산공제**:
   - `spouse`: 6억
   - `ancestorToDescendant`: 미성년이면 2,000만, 성년이면 5,000만 (+ `marriageOrBirthDeduction` 체크 시 1억 추가)
   - `descendantToAncestor`: 5,000만
   - `otherRelative`: 1,000만
   - `stranger`: 0
3. **과세표준** = `max(과세가액 - 증여재산공제, 0)`
4. **산출세액** = 공통 세율표 적용
5. **세대생략 할증**: `isGenerationSkip`이면 산출세액에 30% 할증, 단 미성년자이면서 `giftValue > 20억`이면 40% 할증
6. **납부세액** = `산출세액 × (1 + 할증율) × 0.97` (신고세액공제 3%)

## 가이드 콘텐츠

두 가이드 모두 기존 8개 가이드와 동일한 스키마(intro/formula/glossary/faqs/sources/highlights 4개/stepChips)로 작성하며, `relatedCalculators`로 각자의 계산기를 연결한다.

- **상속세 신고 절차** (`inheritanceTaxProcedureGuide`, `/guides/inheritance-tax-procedure`): 신고기한(사망일 속한 달 말일로부터 6개월, 국외 9개월), 상속재산 파악·평가, 공제 항목 확인, 신고서 제출(홈택스/세무서), 신고세액공제 3%, 상속세 개편 논의(2028년 유산취득세 전환 추진 중, 아직 미확정) 언급.
- **증여세 신고 절차** (`giftTaxProcedureGuide`, `/guides/gift-tax-procedure`): 신고기한(증여일 속한 달 말일로부터 3개월), 증여재산 평가, 10년 합산과세 원칙, 혼인·출산 공제(2024-01-01 이후 증여분부터, 최대 1억) 요건, 세대생략 할증, 신고서 제출.

두 가이드 모두 "상속세 개편안(자녀공제 5억 확대, 최고세율 40%)은 국회에서 부결되어 시행되지 않았다"는 사실을 intro 또는 FAQ에서 명시적으로 언급해 최신 정보를 오인하지 않도록 한다.

## 범위 밖 (Out of scope)

- 배우자 법정상속분 정밀 계산 (사용자가 실제 상속액을 직접 입력하는 간이 방식)
- 사전증여재산 상속재산 합산 (상속개시 전 10년/5년 내 증여분 자동 합산)
- 재산평가 특례 (시가 vs 보충적 평가방법, 감정평가)
- 유류분 계산
- 유산취득세 전환 관련 세부 시뮬레이션 (아직 법제화되지 않은 로드맵 사안이므로 가이드에서 언급만 하고 계산기 로직에는 반영하지 않음)
- 청약가점·청약순위 계산기/가이드 (다음 서브프로젝트에서 진행)

두 계산기 모두 기존 종부세 계산기와 동일하게 "이 계산은 예상치이며 정확한 세액은 세무사 상담·홈택스에서 확인하세요" 성격의 disclaimer를 결과 영역에 표시한다.

## 검증 계획

- 세율표·공제 한도·신고기한 수치는 이번 브레인스토밍 단계에서 국세청(NTS) 공식 페이지 및 국세상담센터 답변을 근거로 이미 확인 완료 (출처는 가이드의 `sources` 필드에 인용).
- 콘텐츠 작성 서브에이전트에게 "2024년 개정안 부결" 사실을 명시적으로 전달해 오래된 블로그 정보를 근거로 삼지 않도록 한다.
- `npx tsc -b --noEmit`, `npm run build`, `npm run lint` 통과.
- 계산 로직에 대해 알려진 수치 예시로 수동 검증(예: 배우자 있고 자녀 2명, 상속재산 10억인 경우 등)을 최소 2~3개 케이스씩 두 계산기 모두에 대해 수행.
