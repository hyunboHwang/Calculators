# 청약가점·청약순위 계산기 + 가이드 — 설계 문서

## Context

상속세·증여세 서브프로젝트에 이어, 두 번째 서브프로젝트로 "청약" 도메인을 추가한다. 민영주택 청약가점제(가점 계산)와 국민주택(공공분양) 청약순위·저축액 기준은 배점/판정 체계가 완전히 달라 계산기를 분리한다: 청약가점 계산기, 청약순위 계산기, 그리고 각각의 짝이 되는 가이드(청약 가점제 완벽정리, 청약순위·저축액 기준 완벽정리) 총 4개 페이지를 추가한다.

계산 로직에 쓰이는 모든 배점표·요건·최근 개편사항은 2차 리서치(WebSearch/WebFetch)로 확인했다. 1차 리서치에서 청약홈 공식 계산기 페이지를 WebFetch로 가져온 결과가 총점 78점으로 나와 공식 84점 만점과 불일치했으므로(JS 렌더링 페이지라 정상 파싱 실패로 판단) 해당 데이터는 폐기하고, HUG 주택청약도우미 자료와 다수 독립 2차 소스가 일치하는 84점 배점표를 채택했다. 이후 2차 심층 검증에서 다음 세 가지를 바로잡았다:
- **배우자 청약통장 가입기간 합산 공식**: "배우자 점수의 50%"가 아니라 "배우자 가입기간(개월)을 6개월 단위로 환산한 별도 점수, 최대 3점" (정책브리핑 2023.12.19 공식 발표의 실제 계산 예시로 확인: 배우자 6개월→+1점, 1년→+2점, 2년 이상→+3점 상한).
- **투기과열지구·조정대상지역 지정 범위**: 2025-10-15부로 기존 강남3구+용산에서 서울 전역+경기 12개 지역으로 대폭 확대됨 — 지역을 도시명으로 하드코딩하지 않고 사용자가 직접 지역 유형을 선택하는 방식을 유지한다.
- **국민주택 2순위 강등 조건과 재당첨제한(제54조)은 서로 다른 제도**이며 2차 소스들이 종종 혼동해서 설명한다는 점을 확인 — 계산기는 확인된 "세대주 아님/2주택 이상/최근 5년 이내 당첨이력→2순위 강등" 규칙만 반영하고, 재당첨제한(지역별 5~10년 별도 제도)은 범위 밖으로 명시한다.

## 아키텍처

기존 세금 계산기 서브프로젝트와 동일한 패턴(순수 계산 함수 모듈 + 얇은 페이지 컴포넌트, 기존 `Field`/`Row`/`fmt` UI 헬퍼 재사용)을 따른다.

- **계산 로직 모듈**: `src/lib/subscriptionScore.ts`(청약가점), `src/lib/subscriptionRank.ts`(청약순위)
- **계산기 페이지**: `src/pages/SubscriptionScoreCalculator.tsx`, `src/pages/SubscriptionRankCalculator.tsx` — `routes.json`에 `group: "부동산"`으로 추가(기존 그룹 재사용, `groups.json` 변경 없음)
- **가이드**: `src/pages/guides/SubscriptionScoreGuide.tsx`, `src/pages/guides/SubscriptionRankGuide.tsx` — 기존 `GuideArticlePage`/`InfoSection` 스키마 재사용, `group: "가이드"`, 각각 `relatedCalculators`로 짝이 되는 계산기 연결
- **가이드 목록 페이지**: `GuidesIndexPage.tsx`의 기존 `TRACK3_IDS`(세금·부동산 절차, 상속세·증여세 가이드로 이미 신설됨)에 이어서 이번 2개 가이드를 추가한다 — 새 트랙을 만들지 않는다(청약도 "부동산 관련 절차·제도 이해"라는 성격이 상속세·증여세와 같은 트랙에 자연스럽게 속함)

## 청약가점 계산기 (`/subscription-score`, 민영주택 일반공급 가점제, 84점 만점)

### 입력 필드

| 필드 | 설명 |
|---|---|
| `noHouseSinceDate` | 무주택 인정 시작일 (직접입력) — 힌트: "만 30세 도달일과 혼인신고일 중 빠른 날. 단 그 이후 주택을 소유한 적이 있다면 마지막으로 무주택자가 된 날" |
| `dependentsCount` | 부양가족 수 (본인 제외) |
| `subscriptionJoinDate` | 청약통장 가입일 |
| `spouseSubscriptionJoinDate` | 배우자 청약통장 가입일 (선택, 0/미입력이면 배우자 합산 미적용) |

### 계산 로직

1. **무주택기간 점수(32점)**: `years = max(0, (오늘 - noHouseSinceDate) / 365일)`; `score = min(2 + 2 × ⌊years⌋, 32)`
2. **부양가족 점수(35점)**: `score = min((dependentsCount + 1) × 5, 35)`
3. **청약통장 가입기간 본인 점수(17점 상한 적용 전)**: `months = (오늘 - subscriptionJoinDate) / 30일`(월 단위 환산); `months < 6` → 1점; `6 ≤ months < 12` → 2점; `months ≥ 12` → `min(2 + ⌊months/12⌋, 17)`
4. **배우자 합산 보너스**: `spouseSubscriptionJoinDate`가 있으면 `spouseMonths = (오늘 - spouseSubscriptionJoinDate) / 30일`; `bonus = min(⌊spouseMonths / 6⌋, 3)`; 없으면 0
5. **청약통장 가입기간 최종 점수**: `min(3번 점수 + 4번 보너스, 17)`
6. **총점** = 1 + 2 + 5, 최대 84점

### 간이 계산 disclaimer

무주택세대구성원 자격 자체(배우자를 포함한 세대 전원의 무주택 여부, 세대 분리 요건 등)는 이 계산기가 검증하지 않으며, 무주택 인정 시작일 판단이 애매한 경우(과거 주택 소유 이력 등) 청약홈에서 최종 확인이 필요하다는 문구를 disclaimer에 명시한다.

## 청약순위 계산기 (`/subscription-rank`, 국민주택/공공분양)

### 입력 필드

| 필드 | 설명 |
|---|---|
| `allHouseholdNoHouse` | 세대 전원 무주택 여부 (checkbox) |
| `isHouseholdHead` | 세대주 여부 (checkbox) |
| `wonInLast5Years` | 최근 5년 이내 세대구성원 당첨 이력 (checkbox) |
| `regionType` | 청약 지역 유형: `speculation`(투기과열지구·조정대상지역) / `metro`(수도권, 그 외) / `nonMetro`(비수도권) / `shrinking`(위축지역) |
| `subscriptionJoinDate` | 청약통장 가입일 |
| `paymentCount` | 납입 횟수 |
| `totalSavings` | 저축총액 (원, 직접입력) |
| `unitSizeOver40` | 희망 평형: 40㎡ 초과 여부 (checkbox) |

### 계산 로직

1. **무주택 게이트**: `allHouseholdNoHouse`가 false면 결과는 "청약 신청 불가(무주택 요건 미충족)"로 조기 반환.
2. **지역별 1순위 요건**: `speculation` → 24개월+24회, `metro` → 12개월+12회, `nonMetro` → 6개월+6회, `shrinking` → 0개월+0회(즉시)
3. **가입기간 충족 여부**: `months = (오늘 - subscriptionJoinDate) / 30일`; `meetsJoinPeriod = months ≥ 요건개월`; `meetsPaymentCount = paymentCount ≥ 요건회차`; `meetsFirstPriorityRequirement = meetsJoinPeriod && meetsPaymentCount`
4. **순위 판정**:
   - `!meetsFirstPriorityRequirement` → 2순위
   - `meetsFirstPriorityRequirement && regionType === 'speculation' && (!isHouseholdHead || wonInLast5Years)` → 2순위(강등)
   - 그 외 → 1순위
5. **순차제 표시**: `unitSizeOver40`이 true면 기준 = "저축총액"(`totalSavings` 그대로 표시), false면 기준 = "납입횟수"(`paymentCount` 그대로 표시)

### 간이 계산 disclaimer

- 재당첨제한(주택공급에 관한 규칙 제54조, 지역별 5~10년 별도 제도)은 이 계산기가 반영하지 않는 별도의 결격 사유이며, 위 "최근 5년 이내 당첨 이력" 조건과는 다른 제도임을 명시한다.
- `totalSavings`는 사용자가 이미 월 25만원 인정한도 등을 반영해 파악한 실제 저축총액을 입력한다고 가정하며, 상세 납입 이력별 인정액 계산은 이 계산기가 수행하지 않는다.
- 투기과열지구·조정대상지역의 정확한 지정 현황은 수시로 바뀌므로(2025-10-15 기준 서울 전역+경기 12개 지역으로 확대됨) 본인 주소지가 해당하는지 청약홈에서 최종 확인해야 한다는 문구를 disclaimer와 가이드 모두에 넣는다.

## 가이드 콘텐츠

두 가이드 모두 기존 스키마(intro/formula/glossary/faqs/sources/highlights 4개/stepChips)로 작성하며 `relatedCalculators`로 각자의 계산기를 연결한다.

- **청약 가점제 완벽정리** (`subscriptionScoreGuide`, `/guides/subscription-score`): 84점 배점 구조(무주택기간 32·부양가족 35·통장가입기간 17), 무주택기간 기산일 판단법, 부양가족 인정 범위, 2024년 개편사항(미성년자 가입기간 인정 2→5년 확대, 배우자 합산제) 정리.
- **청약순위·저축액 기준 완벽정리** (`subscriptionRankGuide`, `/guides/subscription-rank`): 1순위/2순위 요건, 지역별 가입기간·납입횟수 표, 순차제(40㎡ 기준 저축총액 vs 납입횟수), 2025-10-15 규제지역 확대 현황, 재당첨제한과의 구분, 월 납입 인정액 25만원 상향(2024.11.1) 정리.

두 가이드 모두 "배점표·지정 지역·인정 한도는 정부 정책에 따라 수시로 개정되니 청약 신청 직전 청약홈(applyhome.co.kr)에서 최신 공고 기준으로 재확인하라"는 문구를 명시적으로 포함한다(정보 자체가 시의성이 강하다는 점을 상속세·증여세 가이드보다도 더 강조).

## 범위 밖 (Out of scope)

- 특별공급(신혼부부·다자녀·생애최초·노부모부양 등) 전형 — 일반공급만 다룬다
- 무주택세대구성원 자격 정밀 판정(세대 분리, 주택 소유 이력 정밀 조회 등)
- 지역별 예치금 기준표(민영주택 청약자격용, 순차제의 "저축총액"과는 다른 개념 — 가이드에서 개념 구분만 설명하고 계산기에는 반영하지 않음)
- 재당첨제한(제54조, 지역별 5~10년)
- 미성년자 가입기간 60개월(5년) 인정 상한의 세부 경과조치 계산(2023.12.31 이전/이후 기간 합산 로직) — 계산기는 가입일로부터 단순 경과기간만 계산하며, 미성년 기간이 포함된 경우 정확한 인정기간은 청약홈에서 확인하도록 안내

## 검증 계획

- 84점 배점 구조, 미성년자 가입기간 인정 확대, 배우자 합산 공식(수정된 버전), 1순위 요건표, 2025-10-15 규제지역 확대는 이번 설계 단계에서 독립 소스 교차검증으로 확인 완료(가이드의 `sources`에 인용).
- 콘텐츠 작성 서브에이전트에게 배우자 합산 공식이 "배우자 점수의 50%"가 아니라 "배우자 가입기간을 6개월 단위로 환산한 별도 점수(최대 3점)"임을, 그리고 2순위 강등 조건과 재당첨제한이 별개 제도임을 명시적으로 전달해 혼동하지 않도록 한다.
- `npx tsc -b --noEmit`, `npm run build`, `npm run lint` 통과.
- 계산 로직에 대해 알려진 수치 예시로 수동 검증(각 계산기 최소 2~3개 케이스)을 수행한다.
