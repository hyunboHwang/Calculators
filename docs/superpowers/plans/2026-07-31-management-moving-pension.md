# 관리비·이사비용·연금저축(IRP) 세액공제 계산기 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 관리비 계산기, 이사비용 계산기, 연금저축·IRP 세액공제 계산기와 세액공제 완벽정리 가이드 1편, 총 4개 페이지를 추가한다.

**Architecture:** 관리비·이사비용은 법정 공식이 없는 순수 입력합산 도구로 별도 계산 로직 모듈 없이 페이지 컴포넌트 안에서 직접 합산한다. 연금저축·IRP는 기존 세금 계산기 패턴(순수 계산 함수 + 얇은 페이지)을 따르고 가이드 1편과 페어링된다.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS v4. 테스트 프레임워크 없음 — 계산 로직 검증은 Node의 네이티브 TypeScript 실행으로 확인한다.

## Global Constraints

- 관리비·이사비용 계산기는 계산 로직 모듈(`src/lib/`)을 만들지 않는다 — 법정 공식이 없어 단순 합산이며, 페이지 컴포넌트의 `useMemo` 안에서 직접 계산한다.
- 이사비용 계산기는 시세 데이터나 지역별 참고 범위를 절대 반영하지 않는다 — 사용자가 입력한 항목의 합계만 계산한다.
- 연금저축·IRP 세액공제: 연금저축 인정액 = `min(연금저축 납입액, 6,000,000)`, 합산 인정액 = `min(연금저축 인정액 + IRP 납입액, 9,000,000)`, 공제율 = 총급여 5,500만원 이하 16.5%, 초과 13.2%(지방소득세 포함), 세액공제액 = 합산 인정액 × 공제율.
- **50세 이상 추가한도(200만원)는 2022년 일몰 종료되어 현재 적용되지 않는다 — 계산기·가이드 어디에도 이 낡은 한도를 반영하지 않는다.**
- 관리비·이사비용 계산기에는 가이드를 만들지 않는다(확정된 방향 — 규정성 콘텐츠가 거의 없음).
- 관리비·이사비용은 `routes.json`에 `group: "생활"`로 추가. 연금저축·IRP 계산기는 `group: "주식"`으로 추가 (기존 그룹 재사용, `groups.json` 수정 없음).
- 연금저축·IRP 가이드는 `routes.json`에 `group: "가이드"`로 추가하고, `GuidesIndexPage.tsx`의 기존 `TRACK1_IDS`("계산기 활용 가이드")에 이어서 추가한다 — 새 트랙을 만들지 않는다.
- 계산기 pageContent 엔트리에는 `highlights`/`stepChips` 필드를 채우지 않는다(계산기 컨벤션). 가이드 pageContent 엔트리는 `highlights` 정확히 4개, `stepChips`는 `formula.steps`와 개수·순서 1:1 대응해야 한다(가이드 컨벤션).
- 각 태스크 완료 시 `npx tsc -b --noEmit`와 `npm run lint`를 통과해야 하고, 라우팅이 걸린 태스크는 `npm run build`도 통과해야 한다.

---

### Task 1: 관리비 계산기

**Files:**
- Create: `src/pages/ManagementFeeCalculator.tsx`
- Modify: `src/routes.json`
- Modify: `src/App.tsx`
- Modify: `src/lib/pageContent.js`

**Interfaces:**
- Consumes: `Field`, `Row`, `fmt` from `../components/ui`
- Produces: 라우트 id `managementFee`, path `/management-fee`

- [ ] **Step 1: 계산기 페이지 작성**

`src/pages/ManagementFeeCalculator.tsx`:

```tsx
import { useMemo, useState } from 'react'
import { Field, Row, fmt } from '../components/ui'

export default function ManagementFeeCalculator() {
  const [exclusiveArea, setExclusiveArea] = useState(84)
  const [commonManagementFee, setCommonManagementFee] = useState(150_000)
  const [longTermRepairReserve, setLongTermRepairReserve] = useState(20_000)
  const [electricity, setElectricity] = useState(50_000)
  const [water, setWater] = useState(15_000)
  const [gas, setGas] = useState(30_000)
  const [heating, setHeating] = useState(40_000)
  const [misc, setMisc] = useState(10_000)

  const r = useMemo(() => {
    const totalFee =
      commonManagementFee + longTermRepairReserve + electricity + water + gas + heating + misc
    const feePerArea = exclusiveArea > 0 ? totalFee / exclusiveArea : 0
    return { totalFee, feePerArea }
  }, [exclusiveArea, commonManagementFee, longTermRepairReserve, electricity, water, gas, heating, misc])

  return (
    <div>
      <h1 className="text-2xl font-bold">관리비 계산기</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        아파트 관리비 고지서 항목을 입력하면 총 관리비와 전용면적당 관리비를 계산합니다.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">관리비 항목 입력</h2>
          <div className="space-y-4">
            <Field label="전용면적" value={exclusiveArea} onChange={setExclusiveArea} suffix="㎡" step={1} />
            <Field
              label="공용관리비"
              value={commonManagementFee}
              onChange={setCommonManagementFee}
              step={10_000}
              hint="일반관리비·청소비·경비비·소독비·승강기유지비 합산"
            />
            <Field
              label="장기수선충당금"
              value={longTermRepairReserve}
              onChange={setLongTermRepairReserve}
              step={10_000}
            />
            <Field label="전기료" value={electricity} onChange={setElectricity} step={10_000} />
            <Field label="수도료" value={water} onChange={setWater} step={10_000} />
            <Field label="가스료" value={gas} onChange={setGas} step={10_000} />
            <Field label="난방·급탕비" value={heating} onChange={setHeating} step={10_000} />
            <Field label="기타" value={misc} onChange={setMisc} step={10_000} hint="TV수신료, 정화조 등" />
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-sm text-slate-500">총 관리비</p>
            <p className="text-3xl font-extrabold tabular-nums text-emerald-700">{fmt(r.totalFee)}원</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-base font-semibold">전용면적당 관리비</h2>
            <div className="divide-y divide-slate-100">
              <Row label="㎡당 관리비" value={`${fmt(r.feePerArea)}원/㎡`} strong />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-500">
            이 계산기는 입력한 항목의 합계만 계산합니다. 실제 고지서의 항목 구성은 단지마다 다를
            수 있으니, 고지서의 세부 항목을 위 카테고리에 맞춰 합산해 입력하세요.
          </div>
        </section>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: `routes.json`에 라우트 추가**

`src/routes.json`의 `subscriptionRank` 항목({"id": "subscriptionRank", ...}) 바로 뒤, `guidesIndex` 항목 앞에 삽입:

```json
  {
    "id": "managementFee",
    "path": "/management-fee",
    "label": "관리비",
    "group": "생활",
    "title": "관리비 계산기 — 전용면적당 관리비 계산 | 계산기",
    "description": "아파트 관리비 고지서 항목(공용관리비·장기수선충당금·전기·수도·가스·난방 등)을 입력하면 총 관리비와 전용면적당 관리비를 계산합니다."
  },
```

- [ ] **Step 3: `App.tsx`에 lazy import 추가**

`src/App.tsx`의 `subscriptionRank: lazy(...)` 줄 바로 아래에 추가:

```ts
  managementFee: lazy(() => import('./pages/ManagementFeeCalculator')),
```

- [ ] **Step 4: `pageContent.js`에 엔트리 추가**

`src/lib/pageContent.js`의 `subscriptionRank` 엔트리 뒤에 추가:

```js
  managementFee: {
    intro: [
      '관리비는 아파트 관리규약에 따라 공용관리비(일반관리비·청소비·경비비·소독비·승강기유지비 등)와 개별 사용료(전기·수도·가스·난방 등)로 구성됩니다. 단지마다 항목 구성과 금액이 크게 다르므로, 이 계산기는 고지서의 항목을 몇 가지 카테고리로 묶어 합산하는 용도로 사용합니다.',
      '전용면적당 관리비(원/㎡)를 함께 계산해, 다른 단지나 이전 달과 비교할 때 참고할 수 있는 기준을 제공합니다. 공동주택관리정보시스템(K-apt, www.k-apt.go.kr)에서 지역별·규모별 평균 관리비를 조회해 비교해볼 수 있습니다.',
    ],
    formula: {
      title: '관리비는 이렇게 계산됩니다',
      steps: [
        '공용관리비(일반관리비·청소비·경비비·소독비·승강기유지비 합산), 장기수선충당금, 전기료, 수도료, 가스료, 난방·급탕비, 기타 비용을 각각 입력합니다.',
        '입력한 모든 항목을 더해 총 관리비를 계산합니다.',
        '총 관리비를 전용면적으로 나눠 전용면적당 관리비(원/㎡)를 계산합니다.',
      ],
    },
    glossary: [
      { term: '공용관리비', definition: '입주민 전체가 공동으로 부담하는 비용(일반관리비, 청소비, 경비비, 소독비, 승강기유지비 등)입니다.' },
      { term: '장기수선충당금', definition: '아파트의 주요 시설 교체·보수를 위해 매달 적립하는 비용입니다.' },
      { term: '전용면적당 관리비', definition: '총 관리비를 전용면적으로 나눈 값으로, 단지 간 관리비 수준을 비교할 때 참고하는 기준입니다.' },
      { term: 'K-apt(공동주택관리정보시스템)', definition: '국토교통부가 운영하는 공동주택 관리비 공개 시스템으로, 지역별·규모별 평균 관리비를 조회할 수 있습니다.' },
    ],
    examples: [
      { title: '전용면적 84㎡ · 공용관리비 15만원+장기수선충당금 2만원+전기 5만원+수도 1.5만원+가스 3만원+난방 4만원+기타 1만원', result: '총 관리비 315,000원, ㎡당 관리비 약 3,750원' },
    ],
    sources: [
      { label: 'K-apt 공동주택관리정보시스템', url: 'https://www.k-apt.go.kr' },
    ],
    faqs: [
      { q: '관리비 항목이 고지서와 다르면 어떻게 입력하나요?', a: '고지서의 세부 항목을 이 계산기의 카테고리(공용관리비, 장기수선충당금, 전기·수도·가스·난방, 기타)에 맞춰 유사한 항목끼리 묶어 합산해 입력하세요.' },
      { q: '장기수선충당금은 나중에 돌려받을 수 있나요?', a: '세입자는 이사 나갈 때 그동안 낸 장기수선충당금을 집주인에게 정산받을 수 있습니다. 다만 이는 임대차 계약과 관련된 사항으로 이 계산기가 반영하지 않습니다.' },
      { q: '관리비가 평균보다 높은지 어떻게 확인하나요?', a: '국토교통부가 운영하는 K-apt(공동주택관리정보시스템)에서 지역별·규모별 평균 관리비를 조회해 비교할 수 있습니다.' },
      { q: '이 계산기가 반영하지 않는 부분은 무엇인가요?', a: '실제 시세나 단지별 항목 구성 차이는 반영하지 않으며, 입력한 값의 단순 합계와 전용면적당 환산값만 제공합니다.' },
    ],
  },
```

- [ ] **Step 5: 빌드·타입·린트 검증**

Run: `npx tsc -b --noEmit && npm run build && npm run lint`
Expected: 모두 통과, 빌드 출력에 `/management-fee/index.html` 포함

- [ ] **Step 6: 커밋**

```bash
git add src/pages/ManagementFeeCalculator.tsx src/routes.json src/App.tsx src/lib/pageContent.js
git commit -m "feat: 관리비 계산기 추가"
```

---

### Task 2: 이사비용 계산기

**Files:**
- Create: `src/pages/MovingCostCalculator.tsx`
- Modify: `src/routes.json`
- Modify: `src/App.tsx`
- Modify: `src/lib/pageContent.js`

**Interfaces:**
- Consumes: `Field`, `fmt` from `../components/ui`
- Produces: 라우트 id `movingCost`, path `/moving-cost`

- [ ] **Step 1: 계산기 페이지 작성**

`src/pages/MovingCostCalculator.tsx`:

```tsx
import { useMemo, useState } from 'react'
import { Field, fmt } from '../components/ui'

export default function MovingCostCalculator() {
  const [ladderTruckCost, setLadderTruckCost] = useState(150_000)
  const [movingServiceCost, setMovingServiceCost] = useState(800_000)
  const [cleaningCost, setCleaningCost] = useState(100_000)
  const [applianceInstallCost, setApplianceInstallCost] = useState(150_000)
  const [wasteDisposalCost, setWasteDisposalCost] = useState(50_000)
  const [miscCost, setMiscCost] = useState(50_000)

  const r = useMemo(() => {
    const totalCost =
      ladderTruckCost + movingServiceCost + cleaningCost + applianceInstallCost + wasteDisposalCost + miscCost
    return { totalCost }
  }, [ladderTruckCost, movingServiceCost, cleaningCost, applianceInstallCost, wasteDisposalCost, miscCost])

  return (
    <div>
      <h1 className="text-2xl font-bold">이사비용 계산기</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        이사에 드는 비용 항목을 입력하면 총 이사비용을 계산합니다.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">이사비용 항목 입력</h2>
          <div className="space-y-4">
            <Field label="사다리차 비용" value={ladderTruckCost} onChange={setLadderTruckCost} step={10_000} />
            <Field
              label="포장이사·일반이사 용역비"
              value={movingServiceCost}
              onChange={setMovingServiceCost}
              step={10_000}
            />
            <Field label="청소비" value={cleaningCost} onChange={setCleaningCost} step={10_000} />
            <Field
              label="가전 이전설치비"
              value={applianceInstallCost}
              onChange={setApplianceInstallCost}
              step={10_000}
              hint="에어컨, 정수기 등"
            />
            <Field label="폐기물 처리비" value={wasteDisposalCost} onChange={setWasteDisposalCost} step={10_000} />
            <Field label="기타 비용" value={miscCost} onChange={setMiscCost} step={10_000} />
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-sm text-slate-500">총 이사비용</p>
            <p className="text-3xl font-extrabold tabular-nums text-emerald-700">{fmt(r.totalCost)}원</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-500">
            이 계산기는 입력한 항목의 합계만 계산하며, 실제 이사비용 시세를 제공하지 않습니다.
            각 항목은 견적받은 금액이나 예상 비용을 직접 입력하세요.
          </div>
        </section>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: `routes.json`에 라우트 추가**

Task 1에서 추가한 `managementFee` 항목 바로 뒤에 삽입:

```json
  {
    "id": "movingCost",
    "path": "/moving-cost",
    "label": "이사비용",
    "group": "생활",
    "title": "이사비용 계산기 — 항목별 이사비용 합산 | 계산기",
    "description": "사다리차·포장이사·청소·가전 이전설치·폐기물 처리 등 이사비용 항목을 입력하면 총 이사비용을 계산합니다."
  },
```

- [ ] **Step 3: `App.tsx`에 lazy import 추가**

`managementFee: lazy(...)` 줄 바로 아래에 추가:

```ts
  movingCost: lazy(() => import('./pages/MovingCostCalculator')),
```

- [ ] **Step 4: `pageContent.js`에 엔트리 추가**

`managementFee` 엔트리 뒤에 추가:

```js
  movingCost: {
    intro: [
      '이사비용은 이사 거리, 짐의 양, 사다리차 필요 여부, 포장이사 여부 등에 따라 업체별로 견적이 크게 달라집니다. 이 계산기는 정해진 시세를 제공하지 않고, 사용자가 이미 알고 있거나 견적받은 금액을 입력해 항목별 비용의 합계만 계산합니다.',
      '여러 업체의 견적을 이 계산기에 각각 입력해 비교하거나, 예산 계획을 세울 때 항목별로 얼마를 배정했는지 정리하는 용도로 활용할 수 있습니다.',
    ],
    formula: {
      title: '이사비용은 이렇게 계산됩니다',
      steps: [
        '사다리차 비용, 포장이사·일반이사 용역비, 청소비, 가전 이전설치비, 폐기물 처리비, 기타 비용을 각각 입력합니다.',
        '입력한 모든 항목을 더해 총 이사비용을 계산합니다.',
      ],
    },
    glossary: [
      { term: '사다리차', definition: '고층 이사 시 창문이나 베란다로 짐을 옮기기 위해 사용하는 장비 및 서비스입니다.' },
      { term: '포장이사', definition: '짐을 싸고 푸는 것까지 업체가 전담하는 이사 방식으로, 일반이사보다 비용이 높은 대신 수고를 줄일 수 있습니다.' },
      { term: '폐기물 처리비', definition: '이사 시 버릴 대형 가구·가전을 처리하기 위한 지자체 스티커 구입 비용 등입니다.' },
    ],
    examples: [
      { title: '사다리차 15만원+포장이사 80만원+청소 10만원+가전 이전설치 15만원+폐기물 5만원+기타 5만원', result: '총 이사비용 1,300,000원' },
    ],
    faqs: [
      { q: '왜 시세 정보가 없나요?', a: '이사비용은 업체별·지역별 편차가 커서 하나의 정답이 없습니다. 이 계산기는 여러 업체의 견적을 받아 항목별로 입력해 비교하는 용도로 설계됐습니다.' },
      { q: '포장이사와 일반이사 중 뭘 선택해야 하나요?', a: '짐의 양이 많거나 시간 여유가 없다면 포장이사가 편리하지만 비용이 더 높습니다. 짐이 적고 직접 정리할 여유가 있다면 일반이사로 비용을 아낄 수 있습니다.' },
      { q: '이사비용을 아끼는 방법은 무엇인가요?', a: '비수기(평일, 손없는날이 아닌 날)를 이용하거나 여러 업체의 견적을 비교해 선택하면 비용을 아낄 수 있습니다.' },
      { q: '이 계산기가 반영하지 않는 부분은 무엇인가요?', a: '실제 이사비용 시세나 지역별·업체별 평균 가격은 반영하지 않으며, 입력한 값의 단순 합계만 제공합니다.' },
    ],
  },
```

- [ ] **Step 5: 빌드·타입·린트 검증**

Run: `npx tsc -b --noEmit && npm run build && npm run lint`
Expected: 모두 통과, 빌드 출력에 `/moving-cost/index.html` 포함

- [ ] **Step 6: 커밋**

```bash
git add src/pages/MovingCostCalculator.tsx src/routes.json src/App.tsx src/lib/pageContent.js
git commit -m "feat: 이사비용 계산기 추가"
```

---

### Task 3: 연금저축·IRP 세액공제 계산 로직

**Files:**
- Create: `src/lib/pensionTaxCredit.ts`

**Interfaces:**
- Produces: `PensionTaxCreditInput` 인터페이스, `calcPensionTaxCredit(input: PensionTaxCreditInput): { pensionSavingsRecognized: number; totalRecognized: number; rate: number; deductionAmount: number }` — Task 4가 그대로 import해서 사용한다.

- [ ] **Step 1: 계산 로직 작성**

`src/lib/pensionTaxCredit.ts`:

```ts
/**
 * 연금저축·IRP 세액공제 추정
 * - 연금저축 단독 한도 600만원, 연금저축+IRP 합산 한도 900만원(2023년 세법개정으로 통합)
 * - 공제율: 총급여 5,500만원 이하 16.5%, 초과 13.2%(지방소득세 포함)
 * - 50세 이상 추가한도(200만원)는 2022년 일몰 종료되어 반영하지 않음
 */

export interface PensionTaxCreditInput {
  totalSalary: number // 총급여
  pensionSavingsContribution: number // 연금저축 납입액
  irpContribution: number // IRP 납입액
}

export function calcPensionTaxCredit(i: PensionTaxCreditInput) {
  const pensionSavingsRecognized = Math.min(i.pensionSavingsContribution, 6_000_000)
  const totalRecognized = Math.min(pensionSavingsRecognized + i.irpContribution, 9_000_000)
  const rate = i.totalSalary <= 55_000_000 ? 0.165 : 0.132
  const deductionAmount = Math.round(totalRecognized * rate)

  return { pensionSavingsRecognized, totalRecognized, rate, deductionAmount }
}
```

- [ ] **Step 2: 스크래치 스크립트로 수동 검증**

`.superpowers/tmp-verify-pension.ts` (임시 파일, 커밋하지 않음):

```ts
import { calcPensionTaxCredit } from '../src/lib/pensionTaxCredit.ts'

// Case A: 총급여 4,000만원, 연금저축 400만원, IRP 200만원
console.log('Case A', calcPensionTaxCredit({
  totalSalary: 40_000_000, pensionSavingsContribution: 4_000_000, irpContribution: 2_000_000,
}))
// 기대값: pensionSavingsRecognized: 4000000, totalRecognized: 6000000, rate: 0.165, deductionAmount: 990000

// Case B: 총급여 7,000만원, 연금저축 600만원, IRP 300만원
console.log('Case B', calcPensionTaxCredit({
  totalSalary: 70_000_000, pensionSavingsContribution: 6_000_000, irpContribution: 3_000_000,
}))
// 기대값: pensionSavingsRecognized: 6000000, totalRecognized: 9000000, rate: 0.132, deductionAmount: 1188000

// Case C: 총급여 3,000만원, 연금저축 800만원(한도 초과 입력), IRP 0원
console.log('Case C', calcPensionTaxCredit({
  totalSalary: 30_000_000, pensionSavingsContribution: 8_000_000, irpContribution: 0,
}))
// 기대값: pensionSavingsRecognized: 6000000, totalRecognized: 6000000, rate: 0.165, deductionAmount: 990000
```

Run: `node .superpowers/tmp-verify-pension.ts`

Expected: 세 케이스 모두 위에 명시된 기대값과 정확히 일치. 검증 후 `.superpowers/tmp-verify-pension.ts`는 삭제한다(커밋 대상 아님).

- [ ] **Step 3: 타입 체크**

Run: `npx tsc -b --noEmit`
Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add src/lib/pensionTaxCredit.ts
git commit -m "feat: 연금저축·IRP 세액공제 계산 로직 추가"
```

---

### Task 4: 연금저축·IRP 세액공제 계산기 페이지

**Files:**
- Create: `src/pages/PensionTaxCreditCalculator.tsx`
- Modify: `src/routes.json`
- Modify: `src/App.tsx`
- Modify: `src/lib/pageContent.js`

**Interfaces:**
- Consumes: `calcPensionTaxCredit`, `PensionTaxCreditInput` from `../lib/pensionTaxCredit` (Task 3); `Field`, `Row`, `fmt`, `fmtPct` from `../components/ui`
- Produces: 라우트 id `pensionTaxCredit`, path `/pension-tax-credit` — Task 5(가이드)가 `relatedCalculators`에서 이 path를 참조한다.

- [ ] **Step 1: 계산기 페이지 작성**

`src/pages/PensionTaxCreditCalculator.tsx`:

```tsx
import { useMemo, useState } from 'react'
import { calcPensionTaxCredit } from '../lib/pensionTaxCredit'
import { Field, Row, fmt, fmtPct } from '../components/ui'

export default function PensionTaxCreditCalculator() {
  const [totalSalary, setTotalSalary] = useState(50_000_000)
  const [pensionSavingsContribution, setPensionSavingsContribution] = useState(4_000_000)
  const [irpContribution, setIrpContribution] = useState(2_000_000)

  const r = useMemo(
    () => calcPensionTaxCredit({ totalSalary, pensionSavingsContribution, irpContribution }),
    [totalSalary, pensionSavingsContribution, irpContribution],
  )

  return (
    <div>
      <h1 className="text-2xl font-bold">연금저축·IRP 세액공제 계산기</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        연금저축·IRP 납입액과 총급여로 세액공제 인정액과 예상 환급액을 계산합니다.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">납입 정보 입력</h2>
          <div className="space-y-4">
            <Field
              label="총급여"
              value={totalSalary}
              onChange={setTotalSalary}
              step={1_000_000}
              hint="근로소득자 기준. 5,500만원 이하면 16.5%, 초과면 13.2% 공제율 적용"
            />
            <Field
              label="연금저축 납입액"
              value={pensionSavingsContribution}
              onChange={setPensionSavingsContribution}
              step={100_000}
              hint="단독 한도 600만원"
            />
            <Field
              label="IRP 납입액"
              value={irpContribution}
              onChange={setIrpContribution}
              step={100_000}
              hint="연금저축과 합산 한도 900만원"
            />
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-sm text-slate-500">예상 세액공제액</p>
            <p className="text-3xl font-extrabold tabular-nums text-emerald-700">{fmt(r.deductionAmount)}원</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-base font-semibold">계산 내역</h2>
            <div className="divide-y divide-slate-100">
              <Row label="연금저축 인정액 (600만원 한도)" value={`${fmt(r.pensionSavingsRecognized)}원`} />
              <Row label="합산 인정액 (900만원 한도)" value={`${fmt(r.totalRecognized)}원`} />
              <Row label="적용 공제율" value={fmtPct(r.rate * 100)} />
              <Row label="예상 세액공제액" value={`${fmt(r.deductionAmount)}원`} strong />
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800">
            <b>이 계산은 예상치입니다.</b> 종합소득자(사업소득 등)는 총급여가 아닌 종합소득금액
            기준으로 공제율 구간이 달라질 수 있습니다. 50세 이상 추가한도(200만원)는 2022년
            일몰 종료되어 현재 적용되지 않습니다.
          </div>
        </section>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: `routes.json`에 라우트 추가**

Task 2에서 추가한 `movingCost` 항목 바로 뒤, `guidesIndex` 항목 앞에 삽입:

```json
  {
    "id": "pensionTaxCredit",
    "path": "/pension-tax-credit",
    "label": "연금저축·IRP 세액공제",
    "group": "주식",
    "title": "연금저축·IRP 세액공제 계산기 — 600만·900만원 한도, 16.5%·13.2% 공제율 | 계산기",
    "description": "연금저축·IRP 납입액과 총급여로 세액공제 인정액과 예상 세액공제액(환급액)을 계산합니다. 연금저축 단독 600만원, 합산 900만원 한도를 반영합니다."
  },
```

- [ ] **Step 3: `App.tsx`에 lazy import 추가**

`movingCost: lazy(...)` 줄 바로 아래에 추가:

```ts
  pensionTaxCredit: lazy(() => import('./pages/PensionTaxCreditCalculator')),
```

- [ ] **Step 4: `pageContent.js`에 엔트리 추가**

`movingCost` 엔트리 뒤에 추가:

```js
  pensionTaxCredit: {
    intro: [
      '연금저축과 IRP(개인형퇴직연금)에 납입하면 연말정산이나 종합소득세 신고 시 세액공제를 받을 수 있습니다. 연금저축은 단독으로 연 600만원, 연금저축과 IRP를 합쳐서는 연 900만원까지 세액공제 대상으로 인정됩니다.',
      '공제율은 총급여 5,500만원(종합소득금액 4,500만원)을 기준으로 나뉘며, 이하면 16.5%(지방소득세 포함), 초과하면 13.2%가 적용됩니다. 2022년까지 있었던 50세 이상 추가한도(200만원)는 일몰 종료되어 현재는 연령과 무관하게 동일한 한도가 적용됩니다.',
    ],
    formula: {
      title: '세액공제액은 이렇게 계산됩니다',
      steps: [
        '연금저축 납입액과 600만원 중 더 작은 금액을 연금저축 인정액으로 정합니다.',
        '연금저축 인정액과 IRP 납입액을 더한 값과 900만원 중 더 작은 금액을 합산 인정액으로 정합니다.',
        '총급여가 5,500만원 이하면 16.5%, 초과하면 13.2%의 공제율을 적용합니다.',
        '합산 인정액에 공제율을 곱해 예상 세액공제액을 계산합니다.',
      ],
    },
    glossary: [
      { term: '연금저축', definition: '은행·증권사·보험사에서 가입하는 세제혜택 연금상품으로, 단독 세액공제 한도는 연 600만원입니다.' },
      { term: 'IRP(개인형퇴직연금)', definition: '퇴직금이나 개인 자금을 적립해 노후자금을 마련하는 계좌로, 연금저축과 합산해 연 900만원까지 세액공제가 인정됩니다.' },
      { term: '세액공제율', definition: '납입 인정액에 곱해 실제 환급(공제)액을 계산하는 비율로, 총급여 5,500만원을 기준으로 16.5%/13.2%로 나뉩니다.' },
      { term: '총급여', definition: '근로소득자가 1년간 받은 급여에서 비과세소득을 제외한 금액으로, 공제율 구간을 정하는 기준입니다.' },
    ],
    examples: [
      { title: '총급여 4,000만원 · 연금저축 400만원 · IRP 200만원', result: '합산 인정액 6,000,000원, 공제율 16.5%, 예상 세액공제액 990,000원' },
      { title: '총급여 7,000만원 · 연금저축 600만원 · IRP 300만원', result: '합산 인정액 9,000,000원, 공제율 13.2%, 예상 세액공제액 1,188,000원' },
      { title: '총급여 3,000만원 · 연금저축 800만원(한도 초과 입력) · IRP 0원', result: '연금저축 인정액 6,000,000원(200만원은 인정 안 됨), 예상 세액공제액 990,000원' },
    ],
    sources: [
      { label: '국세청 — 연금계좌 세액공제', url: 'https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?cntntsId=7875' },
    ],
    faqs: [
      { q: '연금저축에만 900만원을 넣으면 전액 인정되나요?', a: '아니요, 연금저축 단독 한도는 600만원이라 나머지 300만원은 IRP로 납입해야 900만원 전액이 인정됩니다.' },
      { q: '50세 이상은 한도가 더 크지 않나요?', a: '2022년까지 200만원 추가한도가 있었지만 일몰 종료됐습니다. 현재는 연령과 무관하게 동일한 한도(연금저축 600만원, 합산 900만원)가 적용됩니다.' },
      { q: '총급여가 아니라 종합소득자면 어떻게 되나요?', a: '종합소득금액 4,500만원을 기준으로 동일한 공제율 구간이 적용되며, 이 계산기는 총급여 기준 근로소득자만 지원합니다.' },
      { q: '중도에 해지하면 어떻게 되나요?', a: '세액공제받은 금액과 운용수익에 기타소득세 16.5%가 부과됩니다. 천재지변·사망·해외이주·개인회생·파산 등 부득이한 사유로 인출하면 저율의 연금소득세(3.3~5.5%)가 적용됩니다.' },
      { q: '이 계산기가 반영하지 않는 부분은 무엇인가요?', a: '종합소득자의 공제율 구간 세부 계산, 중도해지·연금수령 시 실제 부과되는 세액 계산은 반영하지 않습니다.' },
    ],
  },
```

- [ ] **Step 5: 빌드·타입·린트 검증**

Run: `npx tsc -b --noEmit && npm run build && npm run lint`
Expected: 모두 통과, 빌드 출력에 `/pension-tax-credit/index.html` 포함

- [ ] **Step 6: 커밋**

```bash
git add src/pages/PensionTaxCreditCalculator.tsx src/routes.json src/App.tsx src/lib/pageContent.js
git commit -m "feat: 연금저축·IRP 세액공제 계산기 페이지 추가"
```

---

### Task 5: 세액공제 한도·공제율 완벽정리 가이드

**Files:**
- Create: `src/pages/guides/PensionTaxCreditGuide.tsx`
- Modify: `src/routes.json`
- Modify: `src/App.tsx`
- Modify: `src/lib/pageContent.js`

**Interfaces:**
- Consumes: `GuideArticlePage` from `../../components/GuideArticlePage`; Task 4가 만든 `/pension-tax-credit` path
- Produces: 라우트 id `pensionTaxCreditGuide`, path `/guides/pension-tax-credit` — Task 6이 `GuidesIndexPage.tsx`의 `TRACK1_IDS`에서 참조한다.

- [ ] **Step 1: 가이드 래퍼 페이지 작성**

`src/pages/guides/PensionTaxCreditGuide.tsx`:

```tsx
import GuideArticlePage from '../../components/GuideArticlePage'

export default function PensionTaxCreditGuide() {
  return (
    <GuideArticlePage
      pageId="pensionTaxCreditGuide"
      relatedCalculators={[{ label: '연금저축·IRP 세액공제 계산기', path: '/pension-tax-credit' }]}
    />
  )
}
```

- [ ] **Step 2: `routes.json`에 라우트 추가**

`routes.json`의 마지막 가이드 항목(`subscriptionRankGuide`) 뒤, `about` 항목 앞에 삽입:

```json
  {
    "id": "pensionTaxCreditGuide",
    "path": "/guides/pension-tax-credit",
    "label": "세액공제 한도·공제율 완벽정리",
    "group": "가이드",
    "title": "연금저축·IRP 세액공제 한도·공제율 완벽정리 — 600만·900만원, 16.5%·13.2% | 계산기",
    "description": "연금저축·IRP 세액공제 한도(600만·900만원)와 공제율(16.5%·13.2%), 중도해지·연금수령 시 세금까지 정리했습니다."
  },
```

- [ ] **Step 3: `App.tsx`에 lazy import 추가**

`subscriptionRankGuide: lazy(...)` 줄 바로 아래에 추가:

```ts
  pensionTaxCreditGuide: lazy(() => import('./pages/guides/PensionTaxCreditGuide')),
```

- [ ] **Step 4: `pageContent.js`에 엔트리 추가**

`subscriptionRankGuide` 엔트리 뒤(가이드 콘텐츠 구역의 마지막)에 추가:

```js
  pensionTaxCreditGuide: {
    intro: [
      '연금저축과 IRP는 노후자금을 마련하면서 매년 세액공제 혜택까지 받을 수 있는 대표적인 절세 상품입니다. 연금저축은 단독으로 연 600만원, 연금저축과 IRP를 합치면 연 900만원까지 세액공제 대상으로 인정되며, 이는 2023년 세법개정으로 기존 연금저축 400만원+IRP 300만원의 별도 한도 구조가 통합된 결과입니다.',
      '공제율은 총급여 5,500만원(종합소득금액 4,500만원)을 기준으로 나뉩니다. 이하면 16.5%(지방소득세 포함), 초과하면 13.2%가 적용되어, 900만원을 꽉 채워 납입하면 각각 148만5천원, 118만8천원까지 세액공제를 받을 수 있습니다.',
      '2022년까지는 만 50세 이상 가입자에게 200만원의 추가 한도(총 700만원)를 주는 한시적 우대 제도가 있었지만 일몰 종료됐습니다. 현재는 연령과 무관하게 동일한 한도(연금저축 600만원, 합산 900만원)가 적용되므로, 오래된 정보를 보고 50세 이상이라 더 많이 넣을 수 있다고 오해하지 않아야 합니다.',
      '중도에 해지하면 그동안 세액공제받은 금액과 운용수익에 대해 기타소득세 16.5%가 부과됩니다. 다만 천재지변, 사망, 해외이주, 개인회생·파산, 3개월 이상 요양 등 부득이한 사유로 인출하는 경우에는 저율의 연금소득세(3.3~5.5%)로 분리과세됩니다. 연금으로 수령할 때는 연령별로 3.3~5.5%의 연금소득세가 적용되며, 연간 수령액이 1,500만원(2025년 세법개정으로 1,200만원에서 상향)을 넘으면 종합과세 또는 16.5% 분리과세 중 선택해야 합니다.',
    ],
    formula: {
      title: '세액공제는 이렇게 계산됩니다',
      steps: [
        '연금저축 납입액과 600만원 중 더 작은 금액을 연금저축 인정액으로 정합니다.',
        '연금저축 인정액과 IRP 납입액을 더한 값과 900만원 중 더 작은 금액을 합산 인정액으로 정합니다.',
        '총급여가 5,500만원 이하면 16.5%, 초과하면 13.2%의 공제율을 확인합니다.',
        '합산 인정액에 공제율을 곱해 예상 세액공제액을 계산합니다.',
        '중도해지 시 기타소득세 16.5%, 부득이한 사유 인출 시 저율 연금소득세(3.3~5.5%)가 적용됨을 확인합니다.',
        '연금으로 수령할 때는 연령별 연금소득세(3.3~5.5%)가 적용되고, 연간 1,500만원을 초과하면 종합과세 또는 16.5% 분리과세 중 선택해야 함을 확인합니다.',
      ],
    },
    glossary: [
      { term: '연금저축', definition: '은행·증권사·보험사에서 가입하는 세제혜택 연금상품으로, 단독 세액공제 한도는 연 600만원입니다.' },
      { term: 'IRP(개인형퇴직연금)', definition: '퇴직금이나 개인 자금을 적립해 노후자금을 마련하는 계좌로, 연금저축과 합산해 연 900만원까지 세액공제가 인정됩니다.' },
      { term: '세액공제율', definition: '납입 인정액에 곱해 실제 환급(공제)액을 계산하는 비율로, 총급여 5,500만원을 기준으로 16.5%/13.2%로 나뉩니다.' },
      { term: '기타소득세(중도해지)', definition: '연금저축·IRP를 중도해지할 때 그동안 세액공제받은 금액과 운용수익에 부과되는 세금으로, 세율은 16.5%입니다.' },
      { term: '연금소득세(연금수령)', definition: '연금으로 수령할 때 적용되는 세금으로, 연령별로 3.3~5.5%가 적용되며 연간 수령액이 1,500만원을 넘으면 종합과세 또는 16.5% 분리과세 중 선택해야 합니다.' },
    ],
    faqs: [
      { q: '연금저축에만 900만원을 넣으면 전액 인정되나요?', a: '아니요, 연금저축 단독 한도는 600만원이라 나머지 300만원은 IRP로 납입해야 900만원 전액이 인정됩니다.' },
      { q: '50세 이상은 한도가 더 크지 않나요?', a: '2022년까지 200만원 추가한도가 있었지만 일몰 종료됐습니다. 현재는 연령과 무관하게 동일한 한도(연금저축 600만원, 합산 900만원)가 적용됩니다.' },
      { q: '총급여가 아니라 종합소득자면 어떻게 되나요?', a: '종합소득금액 4,500만원을 기준으로 동일한 공제율 구간이 적용되며, 근로소득자의 총급여 기준과는 소득 산정 방식이 다릅니다.' },
      { q: '중도에 해지하면 어떻게 되나요?', a: '그동안 세액공제받은 금액과 운용수익에 기타소득세 16.5%가 부과됩니다.' },
      { q: '부득이한 사유로 인출하면 어떻게 되나요?', a: '천재지변, 사망, 해외이주, 개인회생·파산, 3개월 이상 요양 등의 사유로 인출하면 기타소득세 대신 저율의 연금소득세(3.3~5.5%)가 분리과세됩니다.' },
      { q: '연금으로 수령할 때는 세금이 어떻게 되나요?', a: '수령 연령에 따라 3.3~5.5%의 연금소득세가 적용됩니다(확정기간형 기준 55~69세 5.5%, 70~79세 4.4%, 80세 이상 3.3%).' },
      { q: '연간 1,500만원을 초과해서 받으면 어떻게 되나요?', a: '연간 연금수령액이 1,500만원(2025년 세법개정으로 1,200만원에서 상향)을 넘으면 다른 소득과 합산하는 종합과세와 16.5% 분리과세 중 유리한 쪽을 선택할 수 있습니다.' },
      { q: '연금저축과 IRP 중 어디에 먼저 채워야 유리한가요?', a: '세액공제 관점에서는 둘 중 어디에 납입하든 동일하게 계산됩니다. 다만 연금저축은 중도인출이 비교적 자유롭고 IRP는 인출 제한이 있어, 자금 유동성을 고려한다면 연금저축을 먼저 채우는 경우가 많습니다.' },
    ],
    sources: [
      { label: '국세청 — 연금계좌 세액공제', url: 'https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?cntntsId=7875' },
      { label: 'KB — 연금저축펀드, IRP 차이', url: 'https://kbthink.com/year-end-tax/pension-savings-vs-irp.html' },
      { label: '뱅크샐러드 — 연금저축·IRP 세액공제 총정리', url: 'https://www.banksalad.com/articles/%EC%86%8C%EB%93%9D%EA%B3%B5%EC%A0%9C-%EC%84%B8%EC%95%A1%EA%B3%B5%EC%A0%9C-%EA%B0%9C%EC%9D%B8%EC%97%B0%EA%B8%88-%EC%97%B0%EB%B4%89%EB%B3%84-%EB%B9%84%EA%B5%90' },
    ],
    highlights: [
      { icon: '💰', label: '세액공제 한도', text: '연금저축 단독 600만원, 합산(IRP포함) 900만원' },
      { icon: '📊', label: '공제율', text: '총급여 5,500만원 이하 16.5%, 초과 13.2%' },
      { icon: '🚫', label: '50세 추가한도 폐지', text: '2022년 일몰 종료, 현재 연령 무관 동일 한도' },
      { icon: '⚠️', label: '중도해지 불이익', text: '기타소득세 16.5%(부득이한 사유는 저율 3.3~5.5%)' },
    ],
    stepChips: [
      { icon: '💵', label: '연금저축 인정액' },
      { icon: '➕', label: '합산 인정액' },
      { icon: '📊', label: '공제율 확인' },
      { icon: '🧮', label: '공제액 계산' },
      { icon: '⚠️', label: '중도해지 확인' },
      { icon: '👴', label: '수령시 세금 확인' },
    ],
  },
```

- [ ] **Step 5: 빌드·타입·린트 검증**

Run: `npx tsc -b --noEmit && npm run build && npm run lint`
Expected: 모두 통과, 빌드 출력에 `/guides/pension-tax-credit/index.html` 포함

- [ ] **Step 6: highlights/stepChips 개수 확인**

Run:
```bash
node --input-type=module -e "
import { pageContent } from './src/lib/pageContent.js'
const g = pageContent.pensionTaxCreditGuide
console.log('highlights:', g.highlights.length, '/ stepChips:', g.stepChips.length, '/ steps:', g.formula.steps.length)
"
```

Expected: `highlights: 4 / stepChips: 6 / steps: 6`

- [ ] **Step 7: 커밋**

```bash
git add src/pages/guides/PensionTaxCreditGuide.tsx src/routes.json src/App.tsx src/lib/pageContent.js
git commit -m "content: 세액공제 한도·공제율 완벽정리 가이드 추가"
```

---

### Task 6: 가이드 목록 트랙 확장 + 최종 검증

**Files:**
- Modify: `src/pages/GuidesIndexPage.tsx`

**Interfaces:**
- Consumes: `pensionTaxCreditGuide` route id (Task 5에서 생성)

- [ ] **Step 1: `GuidesIndexPage.tsx`의 `TRACK1_IDS`에 이어서 추가**

`src/pages/GuidesIndexPage.tsx`의 기존 `TRACK1_IDS` 배열:

```tsx
const TRACK1_IDS = [
  'yearEndTaxProcedureGuide',
  'jeonseDepositRecoveryGuide',
  'severanceInterimGuide',
  'unemploymentApplicationGuide',
]
```

을 아래로 교체(이어서 추가):

```tsx
const TRACK1_IDS = [
  'yearEndTaxProcedureGuide',
  'jeonseDepositRecoveryGuide',
  'severanceInterimGuide',
  'unemploymentApplicationGuide',
  'pensionTaxCreditGuide',
]
```

`<GuideList ids={TRACK1_IDS} title="계산기 활용 가이드" />` 줄은 그대로 둔다(수정 불필요).

- [ ] **Step 2: 전체 빌드·타입·린트 검증**

Run: `npx tsc -b --noEmit && npm run build && npm run lint`
Expected: 모두 통과. 빌드 출력에 아래 4개 신규 페이지가 모두 포함되어야 함:
- `/management-fee/index.html`
- `/moving-cost/index.html`
- `/pension-tax-credit/index.html`
- `/guides/pension-tax-credit/index.html`

- [ ] **Step 3: `routes.json` 전체 정합성 확인**

Run: `node -e "const r = JSON.parse(require('fs').readFileSync('src/routes.json')); console.log(r.length, r.filter(x => x.group === '생활').length, r.filter(x => x.group === '주식').length, r.filter(x => x.group === '가이드').length)"`

Expected: 전체 라우트 수 = 60 (기존 56 + 이번에 추가한 4개), `생활` 그룹 = 3개(기존 1개 + 관리비·이사비용), `주식` 그룹 = 7개(기존 6개 + 연금저축·IRP), `가이드` 그룹 = 14개(기존 13개 + 1개)

- [ ] **Step 4: 계산기 페이지 회귀 확인**

Run: `grep -c "grid-cols-2 gap-3" dist/management-fee/index.html dist/moving-cost/index.html dist/pension-tax-credit/index.html`

Expected: 세 파일 모두 `0` (계산기 페이지는 `highlights`/`stepChips`를 채우지 않았으므로 카드뉴스 레이아웃 마크업이 나타나지 않아야 함)

- [ ] **Step 5: README 자동 반영 확인**

Run: `git diff --stat README.md`

Expected: PostToolUse 훅이 자동으로 README를 갱신했다면 계산기 목록 개수가 41개→44개로 증가하고 관리비·이사비용·연금저축·IRP 항목이 각 그룹 표에 추가되어 있어야 함. 훅이 실행되지 않았다면 `node scripts/update-readme.mjs`를 수동 실행한다.

- [ ] **Step 6: 커밋**

```bash
git add src/pages/GuidesIndexPage.tsx README.md
git commit -m "feat: 계산기 활용 가이드 트랙에 세액공제 가이드 추가, 관리비·이사비용·연금저축 서브프로젝트 마무리"
```

---

## Self-Review 완료 사항

- **스펙 커버리지**: 설계 문서의 아키텍처(계산기 3개+가이드 1개, `생활`/`주식`/`가이드` 그룹, 관리비·이사비용의 가이드 없음/lib 모듈 없음 결정, `relatedCalculators` 연결, `GuidesIndexPage`의 기존 TRACK1 확장), 연금저축·IRP 계산 로직(입력 필드·공식 전체, 50세 추가한도 폐지 사실), 검증 계획(계산 케이스, tsc/build/lint) 모두 Task 1~6에 매핑됨.
- **플레이스홀더 스캔**: TBD/TODO 없음, 모든 코드 블록이 실제 실행 가능한 완전한 코드임.
- **타입 일관성**: `PensionTaxCreditInput` 필드명이 계산 로직(Task 3)과 페이지 컴포넌트(Task 4)에서 동일하게 사용됨. `calcPensionTaxCredit`의 반환 필드명(`pensionSavingsRecognized`/`totalRecognized`/`rate`/`deductionAmount`)이 페이지의 `Row` 렌더링과 일치함.
- **관리비·이사비용 lib 모듈 없음 재확인**: Task 1, 2 모두 계산 로직을 페이지 컴포넌트의 `useMemo` 안에 직접 작성하며 `src/lib/`에 별도 파일을 만들지 않음(설계 결정과 일치).
