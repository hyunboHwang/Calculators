# 청약가점·청약순위 계산기 + 가이드 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 청약가점 계산기(민영주택 일반공급 가점제), 청약순위 계산기(국민주택 1순위·2순위·순차제)와 각각의 짝이 되는 가이드(청약 가점제 완벽정리, 청약순위·저축액 기준 완벽정리) 총 4개 페이지를 추가한다.

**Architecture:** 상속세·증여세 서브프로젝트와 동일한 패턴 — 순수 계산 함수 모듈(`src/lib/`) + 얇은 페이지 컴포넌트(`src/components/ui.tsx`의 `Field`/`DateField`/`Row`/`fmt` 재사용). 가이드는 기존 `GuideArticlePage`/`InfoSection` 스키마를 재사용하고 `relatedCalculators`로 짝이 되는 계산기를 연결한다. 계산 함수는 모두 `(input, asOf: Date)` 형태로 기준일을 명시적으로 받아 결정론적으로 검증 가능하게 만든다(`src/lib/age.ts`의 `ageParts(birth, ref)`와 동일한 관례).

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS v4. 테스트 프레임워크 없음 — 계산 로직 검증은 Node의 네이티브 TypeScript 실행(`node file.ts`)으로 작성한 스크래치 스크립트로 확인한다.

## Global Constraints

- **청약가점제(84점 만점)**: 무주택기간 최대 32점(1년 미만 2점, 1년마다 +2점, 15년 이상 32점) + 부양가족수 최대 35점(`(부양가족수+1)×5`, 6명 이상 35점) + 청약통장 가입기간 최대 17점(6개월 미만 1점, 6개월~1년 미만 2점, 1년 이상부터 `2+⌊개월/12⌋`, 15년 이상 17점)
- **배우자 통장 가입기간 합산제(2024년 신설)**: "배우자 점수의 50%"가 아니라 "배우자 가입기간(개월)을 6개월 단위로 환산한 별도 점수, 최대 3점" — 공식: `min(⌊배우자가입개월/6⌋, 3)`. 본인 점수에 더하되 합계는 17점을 넘지 않는다. **이 공식을 절대 "배우자 점수 × 0.5"로 구현하지 않는다.**
- **국민주택 1순위 요건(지역별 가입기간+납입횟수)**: 투기과열지구·조정대상지역 24개월+24회, 수도권(그 외 지역) 12개월+12회, 비수도권 6개월+6회, 위축지역 즉시(0개월+0회)
- **2순위 강등 조건**: 투기과열지구·조정대상지역에서만 적용 — 1순위 요건을 충족해도 세대주가 아니거나 최근 5년 이내 세대구성원 당첨 이력이 있으면 2순위로 강등. **재당첨제한(주택공급에 관한 규칙 제54조, 지역별 5~10년 별도 제도)은 이와 다른 별개 제도이며 이 계산기가 반영하지 않는다 — 절대 혼동해서 서술하지 않는다.**
- **순차제**: 전용 40㎡ 초과는 저축총액 기준, 40㎡ 이하는 납입 횟수 기준으로 같은 순위 내 순서를 비교
- **2025-10-15 규제지역 확대**: 기존 강남3구+용산에서 서울 전역+경기 12개 지역(과천·광명·성남 분당/수정/중원·수원 영통/장안/팔달·안양 동안·용인 수지·의왕·하남)으로 확대됨 — 계산기는 지역을 도시명으로 하드코딩하지 않고 사용자가 직접 지역 유형을 선택하게 한다(향후 지정 범위가 또 바뀌어도 계산기 로직 변경 불필요)
- **월 납입 인정액 25만원(2024.11.1 시행, 기존 10만원)**: 계산기는 사용자가 이미 인정 한도를 반영한 실제 저축총액/납입횟수를 직접 입력한다고 가정하며, 상세 납입 이력별 인정액 계산은 하지 않는다
- 새 계산기 2개는 `routes.json`에 `group: "부동산"`으로 추가 (기존 그룹 재사용, `groups.json` 수정 없음)
- 새 가이드 2개는 `routes.json`에 `group: "가이드"`로 추가, `GuidesIndexPage.tsx`의 기존 `TRACK3_IDS`(세금·부동산 절차)에 이어서 추가 — 새 트랙을 만들지 않는다
- 계산기 pageContent 엔트리에는 `highlights`/`stepChips` 필드를 채우지 않는다 (계산기 컨벤션). 가이드 pageContent 엔트리는 `highlights` 정확히 4개, `stepChips`는 `formula.steps`와 개수·순서 1:1 대응해야 한다 (가이드 컨벤션)
- 각 태스크 완료 시 `npx tsc -b --noEmit`와 `npm run lint`를 통과해야 하고, 라우팅이 걸린 태스크는 `npm run build`도 통과해야 한다

---

### Task 1: 청약가점 계산 로직

**Files:**
- Create: `src/lib/subscriptionScore.ts`

**Interfaces:**
- Produces: `SubscriptionScoreInput` 인터페이스, `calcSubscriptionScore(input: SubscriptionScoreInput, asOf: Date): { noHouseScore: number; dependentsScore: number; subscriptionScore: number; totalScore: number }` — Task 2가 그대로 import해서 사용한다.

- [ ] **Step 1: 계산 로직 작성**

`src/lib/subscriptionScore.ts`:

```ts
/**
 * 청약가점 추정 — 민영주택 일반공급 가점제(84점 만점)
 * 무주택기간 32점 + 부양가족수 35점 + 청약통장 가입기간 17점
 * - 배우자 통장 가입기간 합산제(2024.3.25 시행): 배우자 가입개월수를 6개월 단위로 환산한
 *   점수(최대 3점)를 본인 점수에 더하되, 합계는 17점을 넘지 않음 — "배우자 점수의 50%"가 아님
 * - 무주택세대구성원 자격 자체(세대 전원 무주택 여부 등)는 검증하지 않음
 */

export interface SubscriptionScoreInput {
  noHouseSinceDate: string // YYYY-MM-DD, 무주택 인정 시작일
  dependentsCount: number // 부양가족 수 (본인 제외)
  subscriptionJoinDate: string // YYYY-MM-DD, 청약통장 가입일
  spouseSubscriptionJoinDate?: string // YYYY-MM-DD, 배우자 청약통장 가입일 (선택)
}

const DAY = 86_400_000

function daysBetween(from: string, to: Date): number {
  const f = new Date(`${from}T00:00:00`)
  return Math.max(0, (to.getTime() - f.getTime()) / DAY)
}

export function calcSubscriptionScore(i: SubscriptionScoreInput, asOf: Date) {
  const noHouseYears = daysBetween(i.noHouseSinceDate, asOf) / 365
  const noHouseScore = Math.min(2 + 2 * Math.floor(noHouseYears), 32)

  const dependentsScore = Math.min((i.dependentsCount + 1) * 5, 35)

  const ownMonths = daysBetween(i.subscriptionJoinDate, asOf) / 30
  let ownScore: number
  if (ownMonths < 6) ownScore = 1
  else if (ownMonths < 12) ownScore = 2
  else ownScore = Math.min(2 + Math.floor(ownMonths / 12), 17)

  let spouseBonus = 0
  if (i.spouseSubscriptionJoinDate) {
    const spouseMonths = daysBetween(i.spouseSubscriptionJoinDate, asOf) / 30
    spouseBonus = Math.min(Math.floor(spouseMonths / 6), 3)
  }

  const subscriptionScore = Math.min(ownScore + spouseBonus, 17)
  const totalScore = noHouseScore + dependentsScore + subscriptionScore

  return { noHouseScore, dependentsScore, subscriptionScore, totalScore }
}
```

- [ ] **Step 2: 스크래치 스크립트로 수동 검증**

`.superpowers/tmp-verify-score.ts` (임시 파일, 커밋하지 않음):

```ts
import { calcSubscriptionScore } from '../src/lib/subscriptionScore.ts'

const asOf = new Date('2026-07-31T00:00:00')

// Case A: 무주택 16년, 부양가족 3명, 통장 6년, 배우자 없음
console.log('Case A', calcSubscriptionScore({
  noHouseSinceDate: '2010-07-31', dependentsCount: 3, subscriptionJoinDate: '2020-07-31',
}, asOf))
// 기대값: noHouseScore: 32, dependentsScore: 20, subscriptionScore: 8, totalScore: 60

// Case B: 무주택 0년(오늘), 부양가족 0명, 통장 3개월
console.log('Case B', calcSubscriptionScore({
  noHouseSinceDate: '2026-07-31', dependentsCount: 0, subscriptionJoinDate: '2026-04-30',
}, asOf))
// 기대값: noHouseScore: 2, dependentsScore: 5, subscriptionScore: 1, totalScore: 8

// Case C: 무주택 5년, 부양가족 6명, 통장 10년 + 배우자 1년
console.log('Case C', calcSubscriptionScore({
  noHouseSinceDate: '2021-07-31', dependentsCount: 6, subscriptionJoinDate: '2016-07-31',
  spouseSubscriptionJoinDate: '2025-07-31',
}, asOf))
// 기대값: noHouseScore: 12, dependentsScore: 35, subscriptionScore: 14, totalScore: 61
```

Run: `node .superpowers/tmp-verify-score.ts`

Expected: 세 케이스 모두 위에 명시된 기대값과 정확히 일치. 검증 후 `.superpowers/tmp-verify-score.ts`는 삭제한다(커밋 대상 아님).

- [ ] **Step 3: 타입 체크**

Run: `npx tsc -b --noEmit`
Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add src/lib/subscriptionScore.ts
git commit -m "feat: 청약가점 계산 로직 추가"
```

---

### Task 2: 청약가점 계산기 페이지

**Files:**
- Create: `src/pages/SubscriptionScoreCalculator.tsx`
- Modify: `src/routes.json`
- Modify: `src/App.tsx`
- Modify: `src/lib/pageContent.js`

**Interfaces:**
- Consumes: `calcSubscriptionScore`, `SubscriptionScoreInput` from `../lib/subscriptionScore` (Task 1); `Field`, `DateField`, `Row` from `../components/ui`
- Produces: 라우트 id `subscriptionScore`, path `/subscription-score` — Task 5(가이드)가 `relatedCalculators`에서 이 path를 참조한다.

- [ ] **Step 1: 계산기 페이지 작성**

`src/pages/SubscriptionScoreCalculator.tsx`:

```tsx
import { useMemo, useState } from 'react'
import { calcSubscriptionScore } from '../lib/subscriptionScore'
import { Field, DateField, Row } from '../components/ui'

export default function SubscriptionScoreCalculator() {
  const [noHouseSinceDate, setNoHouseSinceDate] = useState('2015-01-01')
  const [dependentsCount, setDependentsCount] = useState(2)
  const [subscriptionJoinDate, setSubscriptionJoinDate] = useState('2018-01-01')
  const [hasSpouseSubscription, setHasSpouseSubscription] = useState(false)
  const [spouseSubscriptionJoinDate, setSpouseSubscriptionJoinDate] = useState('2020-01-01')

  const r = useMemo(
    () =>
      calcSubscriptionScore(
        {
          noHouseSinceDate,
          dependentsCount,
          subscriptionJoinDate,
          spouseSubscriptionJoinDate: hasSpouseSubscription ? spouseSubscriptionJoinDate : undefined,
        },
        new Date(),
      ),
    [noHouseSinceDate, dependentsCount, subscriptionJoinDate, hasSpouseSubscription, spouseSubscriptionJoinDate],
  )

  return (
    <div>
      <h1 className="text-2xl font-bold">청약가점 계산기</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        민영주택 일반공급 청약가점(84점 만점)을 무주택기간·부양가족수·청약통장 가입기간으로
        계산합니다.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">가점 항목 입력</h2>
          <div className="space-y-4">
            <DateField
              label="무주택 인정 시작일"
              value={noHouseSinceDate}
              onChange={setNoHouseSinceDate}
              hint="만 30세 도달일과 혼인신고일 중 빠른 날. 이후 주택을 소유한 적이 있다면 마지막으로 무주택자가 된 날"
            />
            <Field
              label="부양가족 수"
              value={dependentsCount}
              onChange={(v) => setDependentsCount(Math.max(0, Math.round(v)))}
              suffix="명"
              step={1}
              hint="본인 제외"
            />
            <DateField
              label="청약통장 가입일"
              value={subscriptionJoinDate}
              onChange={setSubscriptionJoinDate}
            />
            <div className="rounded-xl bg-slate-50 p-3">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={hasSpouseSubscription}
                  onChange={(e) => setHasSpouseSubscription(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
                />
                배우자 명의 청약통장 있음 (최대 3점 합산)
              </label>
            </div>
            {hasSpouseSubscription && (
              <DateField
                label="배우자 청약통장 가입일"
                value={spouseSubscriptionJoinDate}
                onChange={setSpouseSubscriptionJoinDate}
              />
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-sm text-slate-500">청약가점 총점 (84점 만점)</p>
            <p className="text-3xl font-extrabold tabular-nums text-emerald-700">{r.totalScore}점</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-base font-semibold">항목별 점수</h2>
            <div className="divide-y divide-slate-100">
              <Row label="무주택기간 (32점 만점)" value={`${r.noHouseScore}점`} />
              <Row label="부양가족수 (35점 만점)" value={`${r.dependentsScore}점`} />
              <Row label="청약통장 가입기간 (17점 만점)" value={`${r.subscriptionScore}점`} strong />
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800">
            <b>이 계산은 예상치입니다.</b> 무주택세대구성원 자격 자체(배우자를 포함한 세대 전원의
            무주택 여부 등)는 검증하지 않았습니다. 정확한 자격과 가점은 청약홈에서 확인하세요.
          </div>
        </section>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: `routes.json`에 라우트 추가**

`src/routes.json`의 `giftTax` 항목({"id": "giftTax", ...}) 바로 뒤, `guidesIndex` 항목 앞에 삽입:

```json
  {
    "id": "subscriptionScore",
    "path": "/subscription-score",
    "label": "청약가점",
    "group": "부동산",
    "title": "청약가점 계산기 — 무주택기간·부양가족·통장가입기간 84점 만점 | 계산기",
    "description": "민영주택 일반공급 청약가점(84점 만점)을 무주택기간, 부양가족수, 청약통장 가입기간으로 계산합니다. 배우자 통장 가입기간 합산제도 반영합니다."
  },
```

- [ ] **Step 3: `App.tsx`에 lazy import 추가**

`src/App.tsx`의 `giftTax: lazy(...)` 줄 바로 아래에 추가:

```ts
  subscriptionScore: lazy(() => import('./pages/SubscriptionScoreCalculator')),
```

- [ ] **Step 4: `pageContent.js`에 엔트리 추가**

`src/lib/pageContent.js`의 `giftTax` 엔트리 뒤에 추가:

```js
  subscriptionScore: {
    intro: [
      '청약가점제는 민영주택 일반공급 당첨자를 가리는 기준으로, 무주택기간(최대 32점) · 부양가족수(최대 35점) · 청약통장 가입기간(최대 17점)을 더한 84점 만점으로 계산합니다. 점수가 높을수록 당첨 확률이 높아지며, 같은 주택형에 가점제 지원자가 많으면 가점이 높은 순으로 당첨자를 선정합니다.',
      '이 계산기는 무주택 인정 시작일과 청약통장 가입일을 직접 입력받아 계산하는 간이 추정치입니다. 무주택세대구성원 자격 자체(배우자를 포함한 세대 전원의 무주택 여부 등)는 검증하지 않으므로, 실제 청약 신청 전 청약홈에서 자격을 최종 확인해야 합니다.',
    ],
    formula: {
      title: '청약가점은 이렇게 계산됩니다',
      steps: [
        '무주택 인정 시작일(만 30세 도달일과 혼인신고일 중 빠른 날, 이후 주택을 소유했다면 마지막으로 무주택자가 된 날)부터 오늘까지의 기간을 계산해 1년 미만 2점에서 시작해 1년마다 2점씩 더하고, 15년 이상이면 32점 만점을 적용합니다.',
        '부양가족 수(본인 제외)에 1을 더한 값에 5점을 곱해 부양가족 점수를 계산하며, 6명 이상이면 35점 만점을 적용합니다.',
        '청약통장 가입일부터 오늘까지의 가입기간을 계산해 6개월 미만 1점, 6개월~1년 미만 2점, 1년 이상부터는 1년마다 1점씩 더해 15년 이상이면 17점 만점을 적용합니다.',
        '배우자의 청약통장 가입일을 입력하면 배우자 가입기간을 6개월 단위로 환산한 점수(최대 3점)를 본인의 청약통장 가입기간 점수에 더하되, 합산 후에도 17점을 넘지 않습니다.',
        '무주택기간 점수, 부양가족 점수, 청약통장 가입기간 점수(배우자 합산 포함)를 모두 더해 84점 만점의 청약가점 총점을 계산합니다.',
      ],
    },
    glossary: [
      { term: '청약가점제', definition: '무주택기간·부양가족수·청약통장 가입기간을 합산한 점수로 민영주택 일반공급 당첨자를 가리는 제도입니다.' },
      { term: '무주택기간', definition: '신청자(만 30세 이상 기준)가 무주택자로 인정되는 기간으로, 만 30세 도달일 또는 그 전 혼인신고일부터 기산합니다.' },
      { term: '배우자 통장 가입기간 합산제', definition: '2024년 신설된 제도로, 배우자 명의 청약통장 가입기간을 6개월 단위로 환산해 최대 3점까지 본인 점수에 더할 수 있습니다.' },
      { term: '부양가족', definition: '배우자, 3년 이상 동일 등본에 등재된 직계존속, 등재 요건을 충족한 미혼 직계비속 등 세대별 주민등록표에 함께 등재된 가족을 말합니다.' },
      { term: '일반공급', definition: '특별공급(신혼부부·다자녀 등)을 제외한 나머지 물량을 가점제·추첨제로 배분하는 청약 방식입니다.' },
    ],
    examples: [
      { title: '무주택기간 16년 · 부양가족 3명 · 청약통장 6년', result: '청약가점 총점 60점 (32+20+8)' },
      { title: '무주택기간 0년(신청 시점 기준) · 부양가족 0명 · 청약통장 3개월', result: '청약가점 총점 8점 (2+5+1)' },
      { title: '무주택기간 5년 · 부양가족 6명 · 청약통장 10년+배우자 1년', result: '청약가점 총점 61점 (12+35+14)' },
    ],
    sources: [
      { label: 'HUG 주택청약도우미', url: 'https://www.khug.or.kr/khmb/m/hg/lg/hglg000019.jsp' },
      { label: '청약홈', url: 'https://www.applyhome.co.kr' },
    ],
    faqs: [
      { q: '무주택기간은 정확히 언제부터 계산하나요?', a: '신청자가 만 30세가 되는 날부터 기산하되, 그 전에 혼인했다면 혼인신고일부터 기산합니다. 이후 주택을 소유했다가 처분한 이력이 있다면 마지막으로 무주택자가 된 시점부터 다시 계산합니다.' },
      { q: '미혼이면 무주택기간 점수를 못 받나요?', a: '만 30세 이전 미혼이면 무주택기간 점수는 0점(30세부터 기산)이지만, 30세 이후에는 미혼이어도 30세 도달일부터 정상적으로 점수가 쌓입니다.' },
      { q: '부양가족 수에 본인도 포함하나요?', a: '아니요, 본인은 제외한 가족 수를 기준으로 계산합니다. 공식은 (부양가족수+1)×5점입니다.' },
      { q: '배우자 통장 가입기간 합산제는 모든 신청자에게 적용되나요?', a: '배우자가 있고 배우자 명의 청약통장이 유효한 경우에만 적용되며, 배우자 가입기간을 6개월 단위로 환산한 점수(최대 3점)를 더합니다. 본인+배우자 합계는 17점을 넘지 않습니다.' },
      { q: '이 계산기가 반영하지 않는 부분은 무엇인가요?', a: '무주택세대구성원 자격 정밀 판정(세대 분리, 배우자 무주택 여부 등)과 특별공급(신혼부부·다자녀 등) 유형은 반영하지 않습니다.' },
    ],
  },
```

- [ ] **Step 5: 빌드·타입·린트 검증**

Run: `npx tsc -b --noEmit && npm run build && npm run lint`
Expected: 모두 통과, 빌드 출력에 `/subscription-score/index.html` 포함

- [ ] **Step 6: 커밋**

```bash
git add src/pages/SubscriptionScoreCalculator.tsx src/routes.json src/App.tsx src/lib/pageContent.js
git commit -m "feat: 청약가점 계산기 페이지 추가"
```

---

### Task 3: 청약순위 계산 로직

**Files:**
- Create: `src/lib/subscriptionRank.ts`

**Interfaces:**
- Produces: `RegionType` 유니온 타입, `SubscriptionRankInput` 인터페이스, `calcSubscriptionRank(input: SubscriptionRankInput, asOf: Date): { eligible: false; reason: string } | { eligible: true; rank: '1순위' | '2순위'; sequencingBasis: string; sequencingValue: number }` — Task 4가 그대로 import해서 사용한다.

- [ ] **Step 1: 계산 로직 작성**

`src/lib/subscriptionRank.ts`:

```ts
/**
 * 청약순위 판정 — 국민주택(공공분양) 1순위·2순위 + 순차제
 * - 2순위 강등 조건(투기과열지구·조정대상지역 한정: 세대주 아님/최근5년 당첨이력)은
 *   재당첨제한(주택공급에 관한 규칙 제54조, 지역별 5~10년)과는 별개 제도이며 반영하지 않음
 * - 지역 지정 현황은 수시로 바뀌므로 사용자가 지역 유형을 직접 선택하게 함(도시명 하드코딩 없음)
 * - 저축총액/납입횟수는 사용자가 이미 월 25만원 인정한도를 반영해 파악한 값을 그대로 입력받음
 */

export type RegionType = 'speculation' | 'metro' | 'nonMetro' | 'shrinking'

export interface SubscriptionRankInput {
  allHouseholdNoHouse: boolean // 세대 전원 무주택 여부
  isHouseholdHead: boolean // 세대주 여부
  wonInLast5Years: boolean // 최근 5년 이내 세대구성원 당첨 이력
  regionType: RegionType
  subscriptionJoinDate: string // YYYY-MM-DD
  paymentCount: number // 납입 횟수
  totalSavings: number // 저축총액 (원)
  unitSizeOver40: boolean // 희망 평형 40㎡ 초과 여부
}

const DAY = 86_400_000
const REGION_REQUIREMENTS: Record<RegionType, { months: number; payments: number }> = {
  speculation: { months: 24, payments: 24 },
  metro: { months: 12, payments: 12 },
  nonMetro: { months: 6, payments: 6 },
  shrinking: { months: 0, payments: 0 },
}

export function calcSubscriptionRank(i: SubscriptionRankInput, asOf: Date) {
  if (!i.allHouseholdNoHouse) {
    return { eligible: false as const, reason: '무주택 요건 미충족' }
  }

  const joined = new Date(`${i.subscriptionJoinDate}T00:00:00`)
  const months = Math.max(0, (asOf.getTime() - joined.getTime()) / DAY) / 30
  const req = REGION_REQUIREMENTS[i.regionType]
  const meetsJoinPeriod = months >= req.months
  const meetsPaymentCount = i.paymentCount >= req.payments
  const meetsFirstPriorityRequirement = meetsJoinPeriod && meetsPaymentCount

  let rank: '1순위' | '2순위'
  if (!meetsFirstPriorityRequirement) {
    rank = '2순위'
  } else if (i.regionType === 'speculation' && (!i.isHouseholdHead || i.wonInLast5Years)) {
    rank = '2순위'
  } else {
    rank = '1순위'
  }

  const sequencingBasis = i.unitSizeOver40 ? '저축총액' : '납입횟수'
  const sequencingValue = i.unitSizeOver40 ? i.totalSavings : i.paymentCount

  return { eligible: true as const, rank, sequencingBasis, sequencingValue }
}
```

- [ ] **Step 2: 스크래치 스크립트로 수동 검증**

`.superpowers/tmp-verify-rank.ts` (임시 파일, 커밋하지 않음):

```ts
import { calcSubscriptionRank } from '../src/lib/subscriptionRank.ts'

const asOf = new Date('2026-07-31T00:00:00')

// Case A: 무주택 세대·세대주·수도권·가입 2년·납입 15회·40㎡ 이하
console.log('Case A', calcSubscriptionRank({
  allHouseholdNoHouse: true, isHouseholdHead: true, wonInLast5Years: false,
  regionType: 'metro', subscriptionJoinDate: '2024-07-31', paymentCount: 15,
  totalSavings: 5_000_000, unitSizeOver40: false,
}, asOf))
// 기대값: eligible: true, rank: '1순위', sequencingBasis: '납입횟수', sequencingValue: 15

// Case B: 무주택 세대·세대주 아님·투기과열지구·가입 3년·납입 30회·40㎡ 초과
console.log('Case B', calcSubscriptionRank({
  allHouseholdNoHouse: true, isHouseholdHead: false, wonInLast5Years: false,
  regionType: 'speculation', subscriptionJoinDate: '2023-07-31', paymentCount: 30,
  totalSavings: 20_000_000, unitSizeOver40: true,
}, asOf))
// 기대값: eligible: true, rank: '2순위' (세대주 아님으로 강등), sequencingBasis: '저축총액', sequencingValue: 20000000

// Case C: 무주택 요건 미충족
console.log('Case C', calcSubscriptionRank({
  allHouseholdNoHouse: false, isHouseholdHead: true, wonInLast5Years: false,
  regionType: 'metro', subscriptionJoinDate: '2024-07-31', paymentCount: 15,
  totalSavings: 5_000_000, unitSizeOver40: false,
}, asOf))
// 기대값: eligible: false, reason: '무주택 요건 미충족'

// Case D: 가입기간·납입횟수 요건 미충족
console.log('Case D', calcSubscriptionRank({
  allHouseholdNoHouse: true, isHouseholdHead: true, wonInLast5Years: false,
  regionType: 'nonMetro', subscriptionJoinDate: '2026-04-30', paymentCount: 3,
  totalSavings: 500_000, unitSizeOver40: false,
}, asOf))
// 기대값: eligible: true, rank: '2순위' (요건 미충족), sequencingBasis: '납입횟수', sequencingValue: 3
```

Run: `node .superpowers/tmp-verify-rank.ts`

Expected: 네 케이스 모두 위에 명시된 기대값과 정확히 일치. 검증 후 `.superpowers/tmp-verify-rank.ts`는 삭제한다(커밋 대상 아님).

- [ ] **Step 3: 타입 체크**

Run: `npx tsc -b --noEmit`
Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add src/lib/subscriptionRank.ts
git commit -m "feat: 청약순위 계산 로직 추가"
```

---

### Task 4: 청약순위 계산기 페이지

**Files:**
- Create: `src/pages/SubscriptionRankCalculator.tsx`
- Modify: `src/routes.json`
- Modify: `src/App.tsx`
- Modify: `src/lib/pageContent.js`

**Interfaces:**
- Consumes: `calcSubscriptionRank`, `RegionType` from `../lib/subscriptionRank` (Task 3); `Field`, `DateField`, `Row`, `fmt` from `../components/ui`
- Produces: 라우트 id `subscriptionRank`, path `/subscription-rank` — Task 6(가이드)이 `relatedCalculators`에서 이 path를 참조한다.

- [ ] **Step 1: 계산기 페이지 작성**

`src/pages/SubscriptionRankCalculator.tsx`:

```tsx
import { useMemo, useState } from 'react'
import { calcSubscriptionRank, type RegionType } from '../lib/subscriptionRank'
import { Field, DateField, Row, fmt } from '../components/ui'

const REGION_LABELS: Record<RegionType, string> = {
  speculation: '투기과열지구·조정대상지역',
  metro: '수도권 (그 외 지역)',
  nonMetro: '비수도권',
  shrinking: '위축지역',
}

export default function SubscriptionRankCalculator() {
  const [allHouseholdNoHouse, setAllHouseholdNoHouse] = useState(true)
  const [isHouseholdHead, setIsHouseholdHead] = useState(true)
  const [wonInLast5Years, setWonInLast5Years] = useState(false)
  const [regionType, setRegionType] = useState<RegionType>('metro')
  const [subscriptionJoinDate, setSubscriptionJoinDate] = useState('2020-01-01')
  const [paymentCount, setPaymentCount] = useState(24)
  const [totalSavings, setTotalSavings] = useState(10_000_000)
  const [unitSizeOver40, setUnitSizeOver40] = useState(false)

  const r = useMemo(
    () =>
      calcSubscriptionRank(
        {
          allHouseholdNoHouse,
          isHouseholdHead,
          wonInLast5Years,
          regionType,
          subscriptionJoinDate,
          paymentCount,
          totalSavings,
          unitSizeOver40,
        },
        new Date(),
      ),
    [
      allHouseholdNoHouse,
      isHouseholdHead,
      wonInLast5Years,
      regionType,
      subscriptionJoinDate,
      paymentCount,
      totalSavings,
      unitSizeOver40,
    ],
  )

  return (
    <div>
      <h1 className="text-2xl font-bold">청약순위 계산기</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        국민주택(공공분양) 1순위·2순위 요건과 순차제(저축총액·납입횟수) 비교 기준을
        확인합니다.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">청약 조건 입력</h2>
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-3">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={allHouseholdNoHouse}
                  onChange={(e) => setAllHouseholdNoHouse(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
                />
                세대 전원 무주택
              </label>
            </div>
            <div>
              <span className="mb-1.5 block text-sm font-medium text-slate-700">청약 지역 유형</span>
              <select
                value={regionType}
                onChange={(e) => setRegionType(e.target.value as RegionType)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
              >
                {(Object.keys(REGION_LABELS) as RegionType[]).map((key) => (
                  <option key={key} value={key}>
                    {REGION_LABELS[key]}
                  </option>
                ))}
              </select>
            </div>
            {regionType === 'speculation' && (
              <div className="space-y-3 rounded-xl bg-slate-50 p-3">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={isHouseholdHead}
                    onChange={(e) => setIsHouseholdHead(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
                  />
                  세대주임
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={wonInLast5Years}
                    onChange={(e) => setWonInLast5Years(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
                  />
                  최근 5년 이내 세대구성원 당첨 이력 있음
                </label>
              </div>
            )}
            <DateField
              label="청약통장 가입일"
              value={subscriptionJoinDate}
              onChange={setSubscriptionJoinDate}
            />
            <Field
              label="납입 횟수"
              value={paymentCount}
              onChange={(v) => setPaymentCount(Math.max(0, Math.round(v)))}
              suffix="회"
              step={1}
            />
            <Field
              label="저축총액"
              value={totalSavings}
              onChange={setTotalSavings}
              step={100_000}
              hint="청약홈 나의 청약통장 정보 기준 실제 저축총액"
            />
            <div className="rounded-xl bg-slate-50 p-3">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={unitSizeOver40}
                  onChange={(e) => setUnitSizeOver40(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
                />
                희망 평형 전용 40㎡ 초과
              </label>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          {r.eligible ? (
            <>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                <p className="text-sm text-slate-500">청약 순위</p>
                <p className="text-3xl font-extrabold tabular-nums text-emerald-700">{r.rank}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-2 text-base font-semibold">순차제 비교 기준</h2>
                <div className="divide-y divide-slate-100">
                  <Row label="비교 기준" value={r.sequencingBasis} />
                  <Row
                    label={r.sequencingBasis === '저축총액' ? '저축총액' : '납입 횟수'}
                    value={r.sequencingBasis === '저축총액' ? `${fmt(r.sequencingValue)}원` : `${r.sequencingValue}회`}
                    strong
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
              <p className="text-sm text-slate-500">판정 결과</p>
              <p className="text-xl font-bold text-red-700">{r.reason}</p>
            </div>
          )}

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800">
            <b>이 계산은 예상치입니다.</b> 재당첨제한(지역별 5~10년 별도 제도)은 반영하지
            않았습니다. 투기과열지구·조정대상지역 지정 현황은 수시로 바뀌므로 청약홈에서 최종
            확인하세요.
          </div>
        </section>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: `routes.json`에 라우트 추가**

Task 2에서 추가한 `subscriptionScore` 항목 바로 뒤에 삽입:

```json
  {
    "id": "subscriptionRank",
    "path": "/subscription-rank",
    "label": "청약순위",
    "group": "부동산",
    "title": "청약순위 계산기 — 국민주택 1순위·2순위, 순차제 저축총액·납입횟수 | 계산기",
    "description": "국민주택(공공분양) 청약 1순위·2순위 요건과 지역별 가입기간·납입횟수 기준, 순차제(저축총액·납입횟수) 비교 기준을 계산합니다."
  },
```

- [ ] **Step 3: `App.tsx`에 lazy import 추가**

`subscriptionScore: lazy(...)` 줄 바로 아래에 추가:

```ts
  subscriptionRank: lazy(() => import('./pages/SubscriptionRankCalculator')),
```

- [ ] **Step 4: `pageContent.js`에 엔트리 추가**

`subscriptionScore` 엔트리 바로 뒤에 추가:

```js
  subscriptionRank: {
    intro: [
      '국민주택(공공분양)은 청약통장 가입기간과 납입 횟수로 1순위·2순위를 가리고, 같은 순위 안에서도 전용면적 40㎡ 초과 주택은 저축총액이 많은 순, 40㎡ 이하 주택은 납입 횟수가 많은 순으로 당첨자를 선정합니다(순차제). 민영주택 가점제와는 완전히 다른 방식입니다.',
      '이 계산기는 지역 유형(투기과열·조정대상지역/수도권/비수도권/위축지역)을 직접 선택해 요건을 판정하는 간이 추정치입니다. 재당첨제한(별도 제도, 지역별 5~10년)은 반영하지 않으며, 지정 지역 현황은 수시로 바뀌므로 청약홈에서 최종 확인이 필요합니다.',
    ],
    formula: {
      title: '청약순위는 이렇게 판정됩니다',
      steps: [
        '세대 전원이 무주택인지 확인합니다 — 무주택 요건을 충족하지 못하면 신청 자체가 불가능합니다.',
        '청약 지역 유형(투기과열·조정대상지역/수도권/비수도권/위축지역)에 따라 필요한 청약통장 가입기간과 납입 횟수 요건(각각 24개월+24회, 12개월+12회, 6개월+6회, 즉시)을 확인합니다.',
        '가입기간과 납입 횟수가 모두 요건을 충족하면 1순위 후보가 되고, 그렇지 않으면 2순위가 됩니다.',
        '투기과열지구·조정대상지역에서는 1순위 요건을 충족해도 세대주가 아니거나 최근 5년 이내 세대구성원 당첨 이력이 있으면 2순위로 내려갑니다.',
        '희망 평형이 40㎡ 초과이면 저축총액, 40㎡ 이하이면 납입 횟수를 기준으로 같은 순위 안에서의 순서를 비교합니다.',
      ],
    },
    glossary: [
      { term: '순차제', definition: '국민주택 청약에서 같은 순위 안에 경쟁자가 많을 때 전용면적 40㎡ 초과는 저축총액, 40㎡ 이하는 납입 횟수로 순서를 정하는 방식입니다.' },
      { term: '재당첨제한', definition: '청약가점제와는 별개로 이전 당첨 이력에 따라 일정 기간(지역별 5~10년) 재당첨을 제한하는 제도로, 이 계산기가 반영하는 "최근 5년 이내 당첨 이력" 조건과는 다른 제도입니다.' },
      { term: '투기과열지구·조정대상지역', definition: '정부가 지정하는 규제지역으로, 지정 시 청약 1순위 요건이 더 까다로워집니다(2025년 10월 기준 서울 전역과 경기 일부 지역이 지정됨).' },
      { term: '위축지역', definition: '청약 경쟁이 낮은 지역으로 지정돼 청약통장 가입 즉시 1순위 요건을 충족하는 지역입니다.' },
      { term: '세대주', definition: '주민등록표상 세대의 대표자로 등재된 사람으로, 투기과열지구·조정대상지역에서는 세대주가 아니면 1순위 자격이 제한됩니다.' },
    ],
    examples: [
      { title: '무주택 세대 · 세대주 · 수도권 · 가입 2년 · 납입 15회 · 40㎡ 이하', result: '1순위, 납입횟수 15회 기준' },
      { title: '무주택 세대 · 세대주 아님 · 투기과열지구 · 가입 3년 · 납입 30회 · 40㎡ 초과', result: '2순위(세대주 아님으로 강등), 저축총액 20,000,000원 기준' },
      { title: '무주택 세대 · 세대주 · 비수도권 · 가입 3개월 · 납입 3회', result: '2순위(가입기간·납입횟수 요건 미충족)' },
    ],
    sources: [
      { label: '청약홈', url: 'https://www.applyhome.co.kr' },
      { label: 'KB생각 — 청약 1순위 조건', url: 'https://kbthink.com/subscription/first-priority.html' },
    ],
    faqs: [
      { q: '1순위인데도 왜 2순위로 바뀌나요?', a: '투기과열지구·조정대상지역에서는 1순위 요건(가입기간·납입횟수)을 충족해도 세대주가 아니거나 세대구성원 중 최근 5년 이내 당첨 이력이 있으면 2순위로 내려갑니다.' },
      { q: '저축총액과 납입횟수 중 뭐가 더 중요한가요?', a: '희망하는 주택의 전용면적에 따라 다릅니다. 40㎡ 초과 주택은 저축총액, 40㎡ 이하 주택은 납입 횟수가 순서를 정하는 기준입니다.' },
      { q: '월 25만원 넘게 납입하면 그만큼 다 인정되나요?', a: '아니요, 2024년 11월 1일부터 월 납입 인정 최대액이 10만원에서 25만원으로 상향됐고, 그 초과분은 저축총액 산정에 인정되지 않습니다.' },
      { q: '재당첨제한과 최근 5년 당첨이력 조건은 같은 건가요?', a: '다른 제도입니다. 재당첨제한은 지역별로 5~10년간 재당첨 자체를 제한하는 별도 제도이며, 이 계산기가 반영하는 조건은 투기과열지구·조정대상지역에서 1순위를 2순위로 내리는 조건입니다.' },
      { q: '이 계산기가 반영하지 않는 부분은 무엇인가요?', a: '재당첨제한, 특별공급 유형, 정확한 투기과열지구·조정대상지역 지정 현황은 반영하지 않습니다. 신청 전 청약홈에서 최신 공고 기준으로 확인하세요.' },
    ],
  },
```

- [ ] **Step 5: 빌드·타입·린트 검증**

Run: `npx tsc -b --noEmit && npm run build && npm run lint`
Expected: 모두 통과, 빌드 출력에 `/subscription-rank/index.html` 포함

- [ ] **Step 6: 커밋**

```bash
git add src/pages/SubscriptionRankCalculator.tsx src/routes.json src/App.tsx src/lib/pageContent.js
git commit -m "feat: 청약순위 계산기 페이지 추가"
```

---

### Task 5: 청약 가점제 완벽정리 가이드

**Files:**
- Create: `src/pages/guides/SubscriptionScoreGuide.tsx`
- Modify: `src/routes.json`
- Modify: `src/App.tsx`
- Modify: `src/lib/pageContent.js`

**Interfaces:**
- Consumes: `GuideArticlePage` from `../../components/GuideArticlePage`; Task 2가 만든 `/subscription-score` path
- Produces: 라우트 id `subscriptionScoreGuide`, path `/guides/subscription-score` — Task 7이 `GuidesIndexPage.tsx`의 `TRACK3_IDS`에서 참조한다.

- [ ] **Step 1: 가이드 래퍼 페이지 작성**

`src/pages/guides/SubscriptionScoreGuide.tsx`:

```tsx
import GuideArticlePage from '../../components/GuideArticlePage'

export default function SubscriptionScoreGuide() {
  return (
    <GuideArticlePage
      pageId="subscriptionScoreGuide"
      relatedCalculators={[{ label: '청약가점 계산기', path: '/subscription-score' }]}
    />
  )
}
```

- [ ] **Step 2: `routes.json`에 라우트 추가**

`routes.json`의 마지막 가이드 항목(`giftTaxProcedureGuide`) 뒤, `about` 항목 앞에 삽입:

```json
  {
    "id": "subscriptionScoreGuide",
    "path": "/guides/subscription-score",
    "label": "청약 가점제 완벽정리",
    "group": "가이드",
    "title": "청약 가점제 완벽정리 — 84점 만점 배점표, 무주택기간 기산일, 배우자 합산제 | 계산기",
    "description": "민영주택 일반공급 청약가점제(84점 만점)의 무주택기간·부양가족·청약통장 가입기간 배점표와 2024년 배우자 통장 합산제, 미성년 가입기간 인정 확대까지 정리했습니다."
  },
```

- [ ] **Step 3: `App.tsx`에 lazy import 추가**

`giftTaxProcedureGuide: lazy(...)` 줄 바로 아래에 추가:

```ts
  subscriptionScoreGuide: lazy(() => import('./pages/guides/SubscriptionScoreGuide')),
```

- [ ] **Step 4: `pageContent.js`에 엔트리 추가**

`giftTaxProcedureGuide` 엔트리 뒤(가이드 콘텐츠 구역의 마지막)에 추가:

```js
  subscriptionScoreGuide: {
    intro: [
      '청약가점제는 민영주택(전용 85㎡ 이하) 일반공급 물량의 상당 부분을 배정하는 방식으로, 무주택기간(최대 32점) · 부양가족수(최대 35점) · 청약통장 가입기간(최대 17점)을 더한 84점 만점으로 신청자의 순위를 가립니다. 같은 주택형에 가점제 지원자가 몰리면 점수가 높은 사람부터 당첨자로 선정됩니다.',
      '무주택기간은 신청자가 만 30세가 되는 날(그 전에 혼인했다면 혼인신고일)부터 기산하며, 배우자를 포함한 세대 전원이 무주택이어야 인정됩니다. 이후 주택을 소유했다가 처분한 이력이 있다면 마지막으로 무주택자가 된 시점부터 다시 계산합니다.',
      '부양가족 점수는 배우자, 3년 이상 동일 등본에 등재된 직계존속, 등재 요건을 충족한 미혼 직계비속 등 세대별 주민등록표에 함께 등재된 가족 수를 기준으로 계산하며, 본인을 제외한 가족 수에 1을 더한 값에 5점을 곱합니다.',
      '2024년에는 두 가지 개편이 있었습니다. 미성년자의 청약통장 가입기간 인정 상한이 2년에서 5년으로 확대(2024년 1월 1일 소급, 2024년 7월 1일 시행)됐고, 배우자 명의 청약통장 가입기간의 일부(6개월 단위 환산, 최대 3점)를 본인 점수에 합산할 수 있는 제도가 신설(2024년 3월 25일 시행)됐습니다.',
    ],
    formula: {
      title: '청약가점 계산은 이렇게 진행됩니다',
      steps: [
        '무주택 인정 시작일(만 30세 도달일 또는 그 전 혼인신고일, 이후 주택 소유 이력이 있다면 마지막으로 무주택자가 된 날)을 확인합니다.',
        '무주택기간에 따라 1년 미만 2점부터 1년마다 2점씩 늘어 15년 이상이면 32점 만점을 적용합니다.',
        '본인 제외 부양가족 수를 확인하고, (부양가족수+1)×5점으로 계산해 6명 이상이면 35점 만점을 적용합니다.',
        '청약통장 가입기간에 따라 6개월 미만 1점부터 1년마다 1점씩 늘어 15년 이상이면 17점 만점을 적용합니다.',
        '배우자 명의 청약통장이 있다면 가입기간을 6개월 단위로 환산한 점수(최대 3점)를 더하되, 본인+배우자 합계는 17점을 넘지 않습니다.',
        '세 항목의 점수를 모두 더해 84점 만점의 청약가점 총점을 계산하고, 청약홈 입주자모집공고에 안내된 가점 커트라인과 비교합니다.',
      ],
    },
    glossary: [
      { term: '청약가점제', definition: '무주택기간·부양가족수·청약통장 가입기간을 합산한 84점 만점 점수로 민영주택 일반공급 당첨자를 가리는 제도입니다.' },
      { term: '무주택기간 기산일', definition: '신청자가 만 30세가 되는 날, 또는 그 전에 혼인했다면 혼인신고일부터 무주택기간을 계산하기 시작하는 날입니다.' },
      { term: '배우자 통장 가입기간 합산제', definition: '2024년 3월 25일 시행된 제도로, 배우자 명의 청약통장 가입기간을 6개월 단위로 환산해 최대 3점까지 본인 점수에 더할 수 있습니다.' },
      { term: '부양가족', definition: '배우자, 3년 이상 동일 등본에 등재된 직계존속, 등재 요건을 충족한 미혼 직계비속 등 세대별 주민등록표에 함께 등재된 가족을 말합니다.' },
      { term: '가점제·추첨제 병행', definition: '민영주택 일반공급은 전용면적과 규제지역 여부에 따라 물량 일부는 가점제로, 나머지는 추첨제로 배정하는 방식을 함께 씁니다.' },
    ],
    faqs: [
      { q: '무주택기간은 정확히 언제부터 계산하나요?', a: '신청자가 만 30세가 되는 날부터 기산하되, 그 전에 혼인했다면 혼인신고일부터 기산합니다. 이후 주택을 소유했다가 처분한 이력이 있다면 마지막으로 무주택자가 된 시점부터 다시 계산합니다.' },
      { q: '미성년자 청약통장 가입기간 인정 확대는 정확히 어떻게 바뀌었나요?', a: '기존에는 미성년자 시절 가입기간을 최대 2년까지만 인정했지만, 2024년 1월 1일 소급 기준으로 최대 5년(60개월)까지 인정하도록 확대됐고, 2024년 7월 1일부터 청약 신청에 적용되고 있습니다.' },
      { q: '부양가족으로 인정되는 범위는 정확히 어디까지인가요?', a: '배우자, 3년 이상 계속해서 동일한 등본에 등재된 직계존속(부모·조부모), 만 30세 미만이면 등재만으로, 만 30세 이상이면 최근 1년 이상 계속 등재된 미혼 직계비속(자녀·손자녀)이 부양가족으로 인정됩니다.' },
      { q: '배우자 통장 가입기간 합산제의 정확한 계산 방법은 무엇인가요?', a: '배우자 명의 청약통장 가입기간(개월)을 6개월 단위로 나눈 값을 점수로 환산하며 최대 3점까지만 인정됩니다(예: 배우자 6개월 가입이면 1점, 1년이면 2점, 2년 이상이면 3점 상한). 본인의 청약통장 가입기간 점수에 이 점수를 더하되, 합계는 여전히 17점을 넘지 않습니다.' },
      { q: '가점 커트라인은 어디서 확인하나요?', a: '청약홈(applyhome.co.kr)의 청약경쟁률 및 가점 정보 메뉴에서 과거 단지별 당첨 최저가점을 확인할 수 있으며, 입주자모집공고문에도 이전 회차 커트라인이 안내되는 경우가 많습니다.' },
      { q: '가점제와 추첨제 비율은 어떻게 정해지나요?', a: '전용면적 85㎡ 이하는 투기과열지구·조정대상지역 여부에 따라 가점제 비율이 40~100%로 다르게 적용되고, 85㎡ 초과는 가점제 비율이 더 낮거나 추첨제 비중이 높습니다. 정확한 비율은 단지별 공고문에서 확인해야 합니다.' },
      { q: '가점이 동점이면 어떻게 당첨자를 정하나요?', a: '가점이 같은 신청자가 여러 명이면 추첨으로 순위를 정합니다.' },
      { q: '이 가이드와 계산기가 반영하지 않는 부분은 무엇인가요?', a: '신혼부부·다자녀·생애최초 등 특별공급 유형의 별도 자격·배점 기준과, 무주택세대구성원 자격의 정밀 판정(세대 분리 요건 등)은 다루지 않습니다.' },
    ],
    sources: [
      { label: 'HUG 주택청약도우미', url: 'https://www.khug.or.kr/khmb/m/hg/lg/hglg000019.jsp' },
      { label: '청약홈', url: 'https://www.applyhome.co.kr' },
      { label: '대한민국 정책브리핑', url: 'https://www.korea.kr' },
    ],
    highlights: [
      { icon: '🏆', label: '만점기준', text: '무주택기간32+부양가족35+통장가입17=84점 만점' },
      { icon: '📅', label: '무주택기간 기산일', text: '만 30세 도달일과 혼인신고일 중 빠른 날부터 계산' },
      { icon: '💍', label: '배우자 합산제', text: '배우자 통장 가입기간 6개월당 1점(최대 3점) 추가(2024년 신설)' },
      { icon: '👶', label: '미성년 가입기간', text: '인정 상한이 2년에서 5년으로 확대(2024.7.1 시행)' },
    ],
    stepChips: [
      { icon: '📅', label: '기산일 확인' },
      { icon: '🏠', label: '무주택기간 점수' },
      { icon: '👨‍👩‍👧', label: '부양가족 점수' },
      { icon: '📮', label: '통장가입 점수' },
      { icon: '💍', label: '배우자 합산' },
      { icon: '🏆', label: '총점 비교' },
    ],
  },
```

- [ ] **Step 5: 빌드·타입·린트 검증**

Run: `npx tsc -b --noEmit && npm run build && npm run lint`
Expected: 모두 통과, 빌드 출력에 `/guides/subscription-score/index.html` 포함

- [ ] **Step 6: highlights/stepChips 개수 확인**

Run:
```bash
node --input-type=module -e "
import { pageContent } from './src/lib/pageContent.js'
const g = pageContent.subscriptionScoreGuide
console.log('highlights:', g.highlights.length, '/ stepChips:', g.stepChips.length, '/ steps:', g.formula.steps.length)
"
```

Expected: `highlights: 4 / stepChips: 6 / steps: 6`

- [ ] **Step 7: 커밋**

```bash
git add src/pages/guides/SubscriptionScoreGuide.tsx src/routes.json src/App.tsx src/lib/pageContent.js
git commit -m "content: 청약 가점제 완벽정리 가이드 추가"
```

---

### Task 6: 청약순위·저축액 기준 완벽정리 가이드

**Files:**
- Create: `src/pages/guides/SubscriptionRankGuide.tsx`
- Modify: `src/routes.json`
- Modify: `src/App.tsx`
- Modify: `src/lib/pageContent.js`

**Interfaces:**
- Consumes: `GuideArticlePage` from `../../components/GuideArticlePage`; Task 4가 만든 `/subscription-rank` path
- Produces: 라우트 id `subscriptionRankGuide`, path `/guides/subscription-rank` — Task 7이 `GuidesIndexPage.tsx`의 `TRACK3_IDS`에서 참조한다.

- [ ] **Step 1: 가이드 래퍼 페이지 작성**

`src/pages/guides/SubscriptionRankGuide.tsx`:

```tsx
import GuideArticlePage from '../../components/GuideArticlePage'

export default function SubscriptionRankGuide() {
  return (
    <GuideArticlePage
      pageId="subscriptionRankGuide"
      relatedCalculators={[{ label: '청약순위 계산기', path: '/subscription-rank' }]}
    />
  )
}
```

- [ ] **Step 2: `routes.json`에 라우트 추가**

Task 5에서 추가한 `subscriptionScoreGuide` 항목 바로 뒤에 삽입:

```json
  {
    "id": "subscriptionRankGuide",
    "path": "/guides/subscription-rank",
    "label": "청약순위·저축액 기준 완벽정리",
    "group": "가이드",
    "title": "청약순위·저축액 기준 완벽정리 — 1순위·2순위 요건, 순차제, 규제지역 확대 | 계산기",
    "description": "국민주택(공공분양) 1순위·2순위 요건, 지역별 가입기간·납입횟수 기준, 순차제(저축총액·납입횟수), 2025년 규제지역 확대 현황까지 정리했습니다."
  },
```

- [ ] **Step 3: `App.tsx`에 lazy import 추가**

`subscriptionScoreGuide: lazy(...)` 줄 바로 아래에 추가:

```ts
  subscriptionRankGuide: lazy(() => import('./pages/guides/SubscriptionRankGuide')),
```

- [ ] **Step 4: `pageContent.js`에 엔트리 추가**

`subscriptionScoreGuide` 엔트리 뒤에 추가:

```js
  subscriptionRankGuide: {
    intro: [
      '국민주택(공공분양, LH·지방공사 등이 공급하는 전용 85㎡ 이하 공공주택)은 민영주택 가점제와 전혀 다른 방식으로 당첨자를 가립니다. 청약통장 가입기간과 납입 횟수로 1순위·2순위를 나누고, 같은 순위 안에서 경쟁이 있으면 순차제(전용면적 40㎡ 초과는 저축총액, 40㎡ 이하는 납입 횟수)로 순서를 정합니다.',
      '1순위가 되려면 청약 지역 유형에 따라 정해진 가입기간과 납입 횟수를 모두 채워야 합니다 — 투기과열지구·조정대상지역은 24개월+24회, 수도권(그 외 지역)은 12개월+12회, 비수도권은 6개월+6회, 위축지역은 가입 즉시입니다. 2023년 초 규제지역이 대거 해제된 뒤 2025년 10월 15일부터 서울 전역과 경기 일부 지역(과천·광명·성남·수원·안양·용인·의왕·하남 등 12개 지역)이 다시 투기과열지구·조정대상지역으로 확대 지정됐으니, 본인 주소지가 해당하는지 청약홈에서 최신 지정 현황을 확인해야 합니다.',
      '투기과열지구·조정대상지역에서는 위 요건을 충족해도 세대주가 아니거나 세대구성원 중 최근 5년 이내 당첨 이력이 있으면 1순위에서 2순위로 내려갑니다. 이 조건은 이전 당첨 이력에 따라 지역별로 5~10년간 재당첨 자체를 막는 별도 제도인 재당첨제한과는 다르므로 혼동하지 않아야 합니다.',
      '2024년 11월 1일부터 청약저축의 월 납입 인정 최대액이 10만원에서 25만원으로 상향돼, 매달 25만원씩 납입하면 저축총액을 더 빠르게 쌓을 수 있게 됐습니다. 다만 이 계산기는 사용자가 이미 인정 한도를 반영해 파악한 실제 저축총액·납입 횟수를 직접 입력받는 방식이므로, 정확한 수치는 청약홈 나의 청약통장 정보에서 확인하는 것이 가장 정확합니다.',
    ],
    formula: {
      title: '청약순위 판정은 이렇게 진행됩니다',
      steps: [
        '세대 전원이 무주택인지 확인합니다 — 충족하지 못하면 신청 자체가 불가능합니다.',
        '청약 지역 유형(투기과열·조정대상지역/수도권/비수도권/위축지역)에 따른 가입기간·납입 횟수 요건을 확인합니다.',
        '가입기간과 납입 횟수가 모두 요건을 충족하면 1순위 후보, 그렇지 않으면 2순위가 됩니다.',
        '투기과열지구·조정대상지역이라면 세대주 여부와 최근 5년 이내 당첨 이력을 확인해 2순위 강등 여부를 판단합니다.',
        '희망 평형이 40㎡ 초과인지 이하인지에 따라 저축총액 또는 납입 횟수 중 비교 기준을 정합니다.',
        '같은 순위 안에서 정해진 기준(저축총액 또는 납입 횟수)이 많은 순으로 당첨자가 선정되므로, 청약홈 공고문의 예상 커트라인과 비교합니다.',
      ],
    },
    glossary: [
      { term: '순차제', definition: '국민주택 청약에서 같은 순위 안에 경쟁자가 많을 때 전용면적 40㎡ 초과는 저축총액, 40㎡ 이하는 납입 횟수로 순서를 정하는 방식입니다.' },
      { term: '재당첨제한', definition: '청약가점제·순위제와는 별개로 이전 당첨 이력에 따라 일정 기간(지역별 5~10년) 재당첨을 제한하는 제도로, 이 가이드가 다루는 "최근 5년 이내 당첨 이력" 2순위 강등 조건과는 다른 제도입니다.' },
      { term: '투기과열지구·조정대상지역', definition: '정부가 지정하는 규제지역으로, 지정 시 청약 1순위 요건이 더 까다로워집니다. 2025년 10월 15일부터 서울 전역과 경기 12개 지역이 새로 지정됐습니다.' },
      { term: '위축지역', definition: '청약 경쟁이 낮은 지역으로 지정돼 청약통장 가입 즉시 1순위 요건을 충족하는 지역입니다.' },
      { term: '월 납입 인정액', definition: '청약저축 월 납입액 중 저축총액 산정에 인정되는 최대 금액으로, 2024년 11월 1일부터 10만원에서 25만원으로 상향됐습니다.' },
    ],
    faqs: [
      { q: '1순위인데도 왜 2순위로 바뀌나요?', a: '투기과열지구·조정대상지역에서는 1순위 요건(가입기간·납입횟수)을 충족해도 세대주가 아니거나 세대구성원 중 최근 5년 이내 당첨 이력이 있으면 2순위로 내려갑니다.' },
      { q: '저축총액과 납입횟수 중 뭐가 더 중요한가요?', a: '희망하는 주택의 전용면적에 따라 다릅니다. 40㎡ 초과 주택은 저축총액, 40㎡ 이하 주택은 납입 횟수가 순서를 정하는 기준입니다.' },
      { q: '월 25만원 넘게 납입하면 그만큼 다 인정되나요?', a: '아니요, 2024년 11월 1일부터 월 납입 인정 최대액이 10만원에서 25만원으로 상향됐고, 그 초과분은 저축총액 산정에 인정되지 않습니다.' },
      { q: '재당첨제한과 최근 5년 당첨이력 조건은 같은 건가요?', a: '다른 제도입니다. 재당첨제한은 지역별로 5~10년간 재당첨 자체를 제한하는 별도 제도이며, 이 가이드가 다루는 조건은 투기과열지구·조정대상지역에서 1순위를 2순위로 내리는 조건입니다.' },
      { q: '규제지역 지정 현황은 어디서 확인하나요?', a: '청약홈(applyhome.co.kr)에서 청약 신청 시점 기준 최신 투기과열지구·조정대상지역 지정 현황을 확인할 수 있습니다. 2025년 10월 15일부터 서울 전역과 경기 12개 지역이 새로 포함됐습니다.' },
      { q: '수도권과 비수도권은 어떻게 구분하나요?', a: '청약통장 가입기간 요건에서 "수도권"은 투기과열지구·조정대상지역으로 지정되지 않은 서울·경기·인천 지역을 의미하며, 그 외 지역이 비수도권으로 분류됩니다.' },
      { q: '무주택세대구성원인지 어떻게 판단하나요?', a: '세대별 주민등록표에 함께 등재된 세대원 전원이 주택을 소유하지 않은 경우를 말합니다. 정확한 판정은 청약홈 청약자격 사전점검 서비스나 관할 주민센터에서 확인할 수 있습니다.' },
      { q: '이 가이드와 계산기가 반영하지 않는 부분은 무엇인가요?', a: '재당첨제한, 특별공급 유형, 정확한 규제지역 지정 현황(수시로 바뀜)은 반영하지 않습니다. 신청 전 청약홈에서 최신 공고 기준으로 확인하세요.' },
    ],
    sources: [
      { label: '청약홈', url: 'https://www.applyhome.co.kr' },
      { label: 'KB생각 — 청약 1순위 조건', url: 'https://kbthink.com/subscription/first-priority.html' },
      { label: '뱅크샐러드 — 청약 25만원 인정 금액', url: 'https://www.banksalad.com/articles/%EC%A3%BC%ED%83%9D%EC%B2%AD%EC%95%BD-25%EB%A7%8C%EC%9B%90-1%EC%88%9C%EC%9C%84-%EC%A1%B0%EA%B1%B4-%EC%9D%B8%EC%A0%95-%EA%B8%88%EC%95%A1' },
    ],
    highlights: [
      { icon: '📊', label: '순차제 기준', text: '40㎡ 초과는 저축총액, 40㎡ 이하는 납입횟수 순' },
      { icon: '🗺️', label: '규제지역 확대', text: '2025.10.15부터 서울 전역+경기 12개 지역 투기과열·조정대상 지정' },
      { icon: '⚠️', label: '2순위 강등', text: '투기과열·조정대상지역은 세대주 아니거나 최근5년 당첨이력 있으면 2순위' },
      { icon: '💰', label: '월 납입 인정액', text: '2024.11.1부터 월 10만원→25만원으로 상향' },
    ],
    stepChips: [
      { icon: '🏠', label: '무주택 확인' },
      { icon: '🗺️', label: '지역 요건 확인' },
      { icon: '📋', label: '1·2순위 판정' },
      { icon: '⚠️', label: '강등 여부 확인' },
      { icon: '📏', label: '평형 기준 확인' },
      { icon: '📊', label: '순차 비교' },
    ],
  },
```

- [ ] **Step 5: 빌드·타입·린트 검증**

Run: `npx tsc -b --noEmit && npm run build && npm run lint`
Expected: 모두 통과, 빌드 출력에 `/guides/subscription-rank/index.html` 포함

- [ ] **Step 6: highlights/stepChips 개수 확인**

Run:
```bash
node --input-type=module -e "
import { pageContent } from './src/lib/pageContent.js'
const g = pageContent.subscriptionRankGuide
console.log('highlights:', g.highlights.length, '/ stepChips:', g.stepChips.length, '/ steps:', g.formula.steps.length)
"
```

Expected: `highlights: 4 / stepChips: 6 / steps: 6`

- [ ] **Step 7: 커밋**

```bash
git add src/pages/guides/SubscriptionRankGuide.tsx src/routes.json src/App.tsx src/lib/pageContent.js
git commit -m "content: 청약순위·저축액 기준 완벽정리 가이드 추가"
```

---

### Task 7: 가이드 목록 트랙 확장 + 최종 검증

**Files:**
- Modify: `src/pages/GuidesIndexPage.tsx`

**Interfaces:**
- Consumes: `subscriptionScoreGuide`, `subscriptionRankGuide` route ids (Tasks 5, 6에서 생성)

- [ ] **Step 1: `GuidesIndexPage.tsx`의 `TRACK3_IDS`에 이어서 추가**

`src/pages/GuidesIndexPage.tsx`의 기존 줄:

```tsx
const TRACK3_IDS = ['inheritanceTaxProcedureGuide', 'giftTaxProcedureGuide']
```

을 아래로 교체(새 트랙을 만들지 않고 기존 트랙에 이어서 추가):

```tsx
const TRACK3_IDS = [
  'inheritanceTaxProcedureGuide',
  'giftTaxProcedureGuide',
  'subscriptionScoreGuide',
  'subscriptionRankGuide',
]
```

`<GuideList ids={TRACK3_IDS} title="세금·부동산 절차" />` 줄은 그대로 둔다(수정 불필요 — TRACK3_IDS 배열만 늘어남).

- [ ] **Step 2: 전체 빌드·타입·린트 검증**

Run: `npx tsc -b --noEmit && npm run build && npm run lint`
Expected: 모두 통과. 빌드 출력에 아래 4개 신규 페이지가 모두 포함되어야 함:
- `/subscription-score/index.html`
- `/subscription-rank/index.html`
- `/guides/subscription-score/index.html`
- `/guides/subscription-rank/index.html`

- [ ] **Step 3: `routes.json` 전체 정합성 확인**

Run: `node -e "const r = JSON.parse(require('fs').readFileSync('src/routes.json')); console.log(r.length, r.filter(x => x.group === '부동산').length, r.filter(x => x.group === '가이드').length)"`

Expected: 전체 라우트 수 = 56 (기존 52 + 이번에 추가한 4개), `부동산` 그룹 = 8개(기존 6개 + 청약가점·청약순위), `가이드` 그룹 = 13개(기존 11개 + 2개)

- [ ] **Step 4: 계산기 페이지 회귀 확인**

Run: `grep -c "grid-cols-2 gap-3" dist/subscription-score/index.html dist/subscription-rank/index.html`

Expected: 두 파일 모두 `0` (계산기 페이지는 `highlights`/`stepChips`를 채우지 않았으므로 카드뉴스 레이아웃 마크업이 나타나지 않아야 함)

- [ ] **Step 5: README 자동 반영 확인**

Run: `git diff --stat README.md`

Expected: PostToolUse 훅이 자동으로 README를 갱신했다면 `부동산` 그룹 표에 청약가점·청약순위 항목이 추가되어 있어야 함(계산기 목록 개수가 39개→41개로 증가). 훅이 실행되지 않았다면 `node scripts/update-readme.mjs`를 수동 실행한다.

- [ ] **Step 6: 커밋**

```bash
git add src/pages/GuidesIndexPage.tsx README.md
git commit -m "feat: 세금·부동산 절차 트랙에 청약 가이드 추가, 청약가점·청약순위 서브프로젝트 마무리"
```

---

## Self-Review 완료 사항

- **스펙 커버리지**: 설계 문서의 아키텍처(계산기 2개+가이드 2개, `부동산`/`가이드` 그룹, `relatedCalculators` 연결, `GuidesIndexPage`의 기존 TRACK3 확장), 청약가점/청약순위 계산 로직(입력 필드·공식 전체, 수정된 배우자 합산 공식 포함), 검증 계획(계산 케이스, tsc/build/lint) 모두 Task 1~7에 매핑됨.
- **플레이스홀더 스캔**: TBD/TODO 없음, 모든 코드 블록이 실제 실행 가능한 완전한 코드임.
- **타입 일관성**: `SubscriptionScoreInput`/`SubscriptionRankInput`/`RegionType` 필드명이 계산 로직(Task 1, 3)과 페이지 컴포넌트(Task 2, 4)에서 동일하게 사용됨. `calcSubscriptionScore`/`calcSubscriptionRank`의 반환 필드명이 각 페이지의 `Row` 렌더링과 일치함.
- **배우자 합산 공식 재확인**: Task 1의 코드가 스펙에서 수정된 "배우자 가입개월/6, 최대 3점" 공식을 정확히 구현하고 있으며(`min(⌊spouseMonths/6⌋, 3)`), "배우자 점수×50%"가 아님을 재차 확인.
- **2순위 강등 vs 재당첨제한 분리 재확인**: Task 3의 코드가 `regionType === 'speculation'`일 때만 강등 조건을 적용하며, 재당첨제한 관련 로직은 어디에도 구현되지 않음(범위 밖으로 명시)을 재차 확인.
