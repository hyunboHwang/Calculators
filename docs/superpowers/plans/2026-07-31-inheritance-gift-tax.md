# 상속세·증여세 계산기 + 가이드 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 상속세 계산기, 증여세 계산기와 각각의 짝이 되는 신고 절차 가이드(상속세 신고 절차, 증여세 신고 절차) 총 4개 페이지를 추가한다.

**Architecture:** 기존 세금 계산기 패턴(`ComprehensiveRealEstateTaxCalculator.tsx` + `comprehensiveRealEstateTax.ts`)을 그대로 따르는 순수 계산 함수 + 얇은 페이지 컴포넌트 구조. 가이드는 기존 `GuideArticlePage`/`InfoSection` 스키마를 재사용하고 `relatedCalculators`로 짝이 되는 계산기를 연결한다.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS v4. 프로젝트에 테스트 프레임워크가 없으므로(`package.json` 확인 완료) 계산 로직 검증은 Node의 네이티브 TypeScript 실행(`node file.ts`, Node 24+에서 타입이 자동으로 제거됨)으로 작성한 스크래치 스크립트를 실행해 확인한다.

## Global Constraints

- 상속세·증여세 모두 동일한 5단계 누진세율 사용: 1억원 이하 10%(누진공제 0), 5억원 이하 20%(누진공제 1,000만원), 10억원 이하 30%(누진공제 6,000만원), 30억원 이하 40%(누진공제 1억6,000만원), 30억원 초과 50%(누진공제 4억6,000만원)
- **2024년 발의된 상속세 개편안(자녀공제 5,000만→5억원 확대, 최고세율 50%→40% 인하)은 국회에서 부결되어 시행되지 않았다 — 이 수치를 절대 사용하지 않는다.** 현행법(자녀공제 5,000만원, 최고세율 50%) 기준으로 구현한다.
- 상속세 신고기한: 상속개시일이 속한 달의 말일부터 6개월(국외 거주 시 9개월). 증여세 신고기한: 증여일이 속한 달의 말일부터 3개월. 둘 다 기한 내 신고 시 신고세액공제 3%.
- 새 계산기 2개는 `routes.json`에 `group: "부동산"`으로 추가한다 (기존 그룹 재사용, `groups.json` 수정 없음).
- 새 가이드 2개는 `routes.json`에 `group: "가이드"`로 추가한다 (기존과 동일, `groups.json`에는 추가하지 않음 — 가이드는 사이드바에 노출되지 않는다).
- 계산기 페이지는 `src/components/ui.tsx`의 `Field`/`Row`/`fmt` 헬퍼와 기존 tax 계산기의 disclaimer 박스 스타일(`rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800`)을 그대로 사용한다.
- 계산기 pageContent 엔트리에는 `highlights`/`stepChips` 필드를 채우지 않는다 (기존 37개 계산기와 동일한 컨벤션 — 이 필드는 가이드 전용).
- 가이드 pageContent 엔트리는 `highlights` 정확히 4개, `stepChips`는 `formula.steps`와 개수·순서 1:1 대응해야 한다 (기존 8개 가이드와 동일한 컨벤션).
- 가이드는 `GuideArticlePage`를 통해 렌더링되며 `relatedCalculators` prop으로 짝이 되는 계산기 링크를 포함한다 (기존 Track1 가이드 4편과 동일한 패턴).
- `GuidesIndexPage.tsx`에 새 트랙 `TRACK3_IDS`(제목: "세금·부동산 절차")를 추가한다.
- `scripts/postbuild.mjs`의 `guidesIndex` 분기는 `group === '가이드'`인 모든 라우트를 자동으로 나열하므로 수정 불필요.
- 각 태스크 완료 시 `npx tsc -b --noEmit`와 `npm run lint`를 통과해야 하고, 라우팅이 걸린 태스크는 `npm run build`도 통과해야 한다.

---

### Task 1: 상속세 계산 로직

**Files:**
- Create: `src/lib/inheritanceTax.ts`

**Interfaces:**
- Produces: `InheritanceTaxInput` 인터페이스, `calcInheritanceTax(input: InheritanceTaxInput): { taxableValue: number; totalDeduction: number; taxBase: number; calculatedTax: number; finalTax: number }` — Task 2가 그대로 import해서 사용한다.

- [ ] **Step 1: 계산 로직 작성**

`src/lib/inheritanceTax.ts`:

```ts
/**
 * 상속세 추정 — 2026년 현재 법 기준(2024년 발의된 자녀공제 확대·최고세율 인하 개정안은
 * 국회에서 부결되어 미시행. 현행 자녀공제 5,000만원, 최고세율 50% 기준으로 계산합니다.)
 * - 배우자 법정상속분 정밀 계산, 사전증여재산 합산, 재산평가 특례, 유류분은 반영하지 않습니다.
 */

interface Bracket {
  limit: number
  rate: number
  deduction: number
}

const BRACKETS: Bracket[] = [
  { limit: 100_000_000, rate: 0.1, deduction: 0 },
  { limit: 500_000_000, rate: 0.2, deduction: 10_000_000 },
  { limit: 1_000_000_000, rate: 0.3, deduction: 60_000_000 },
  { limit: 3_000_000_000, rate: 0.4, deduction: 160_000_000 },
  { limit: Infinity, rate: 0.5, deduction: 460_000_000 },
]

function calcTax(taxBase: number): number {
  if (taxBase <= 0) return 0
  const bracket = BRACKETS.find((b) => taxBase <= b.limit) ?? BRACKETS[BRACKETS.length - 1]
  return Math.max(taxBase * bracket.rate - bracket.deduction, 0)
}

export interface InheritanceTaxInput {
  estateValue: number // 상속재산가액
  debtAndFuneralCost: number // 채무·공과금·장례비용 합산
  hasSpouse: boolean
  spouseActualShare: number // 배우자 실제 상속액 (0이면 미입력)
  childrenCount: number
  minorHeirsCount: number
  minorRemainingYears: number // 미성년 상속인 평균 잔여연수(19세까지)
  elderlyHeirsCount: number // 65세 이상
  disabledHeirsCount: number
  disabledRemainingYears: number // 장애인 평균 기대여명 연수
  netFinancialAssets: number // 순금융재산가액
}

export function calcInheritanceTax(i: InheritanceTaxInput) {
  const taxableValue = Math.max(i.estateValue - i.debtAndFuneralCost, 0)

  const personalDeduction =
    i.childrenCount * 50_000_000 +
    i.minorHeirsCount * 10_000_000 * i.minorRemainingYears +
    i.elderlyHeirsCount * 50_000_000 +
    i.disabledHeirsCount * 10_000_000 * i.disabledRemainingYears

  const isSpouseSoleHeir =
    i.hasSpouse &&
    i.childrenCount === 0 &&
    i.minorHeirsCount === 0 &&
    i.elderlyHeirsCount === 0 &&
    i.disabledHeirsCount === 0

  const basicOrLumpSumDeduction = isSpouseSoleHeir
    ? 200_000_000 + personalDeduction
    : Math.max(200_000_000 + personalDeduction, 500_000_000)

  const spouseDeduction = !i.hasSpouse
    ? 0
    : i.spouseActualShare < 500_000_000
      ? 500_000_000
      : Math.min(i.spouseActualShare, 3_000_000_000)

  const financialDeduction =
    i.netFinancialAssets <= 20_000_000
      ? i.netFinancialAssets
      : Math.min(Math.max(i.netFinancialAssets * 0.2, 20_000_000), 200_000_000)

  const totalDeduction = basicOrLumpSumDeduction + spouseDeduction + financialDeduction
  const taxBase = Math.max(taxableValue - totalDeduction, 0)
  const calculatedTax = calcTax(taxBase)
  const finalTax = calculatedTax * 0.97 // 신고세액공제 3%

  return {
    taxableValue: Math.round(taxableValue),
    totalDeduction: Math.round(totalDeduction),
    taxBase: Math.round(taxBase),
    calculatedTax: Math.round(calculatedTax),
    finalTax: Math.round(finalTax),
  }
}
```

- [ ] **Step 2: 스크래치 스크립트로 수동 검증**

`.superpowers/tmp-verify-inheritance.ts` (임시 파일, 커밋하지 않음):

```ts
import { calcInheritanceTax } from '../src/lib/inheritanceTax.ts'

// Case A: 상속재산 10억, 배우자 있음(실제상속액 미입력), 자녀 2명
console.log('Case A', calcInheritanceTax({
  estateValue: 1_000_000_000, debtAndFuneralCost: 0, hasSpouse: true, spouseActualShare: 0,
  childrenCount: 2, minorHeirsCount: 0, minorRemainingYears: 10, elderlyHeirsCount: 0,
  disabledHeirsCount: 0, disabledRemainingYears: 20, netFinancialAssets: 0,
}))
// 기대값: taxBase: 0, calculatedTax: 0, finalTax: 0

// Case B: 상속재산 20억, 배우자 있음(실제상속액 미입력), 자녀 1명
console.log('Case B', calcInheritanceTax({
  estateValue: 2_000_000_000, debtAndFuneralCost: 0, hasSpouse: true, spouseActualShare: 0,
  childrenCount: 1, minorHeirsCount: 0, minorRemainingYears: 10, elderlyHeirsCount: 0,
  disabledHeirsCount: 0, disabledRemainingYears: 20, netFinancialAssets: 0,
}))
// 기대값: taxBase: 1_000_000_000, calculatedTax: 240_000_000, finalTax: 232_800_000

// Case C: 상속재산 5억, 배우자 없음, 자녀 1명
console.log('Case C', calcInheritanceTax({
  estateValue: 500_000_000, debtAndFuneralCost: 0, hasSpouse: false, spouseActualShare: 0,
  childrenCount: 1, minorHeirsCount: 0, minorRemainingYears: 10, elderlyHeirsCount: 0,
  disabledHeirsCount: 0, disabledRemainingYears: 20, netFinancialAssets: 0,
}))
// 기대값: taxBase: 0, calculatedTax: 0, finalTax: 0
```

Run: `node .superpowers/tmp-verify-inheritance.ts`

Expected: 세 케이스 모두 위에 명시된 기대값과 정확히 일치. 일치하지 않으면 Step 1의 로직을 다시 확인한다. 검증 후 `.superpowers/tmp-verify-inheritance.ts`는 삭제한다(커밋 대상 아님).

- [ ] **Step 3: 타입 체크**

Run: `npx tsc -b --noEmit`
Expected: 에러 없음 (아직 어디서도 import하지 않으므로 미사용 경고만 없으면 통과)

- [ ] **Step 4: 커밋**

```bash
git add src/lib/inheritanceTax.ts
git commit -m "feat: 상속세 계산 로직 추가"
```

---

### Task 2: 상속세 계산기 페이지

**Files:**
- Create: `src/pages/InheritanceTaxCalculator.tsx`
- Modify: `src/routes.json` (새 라우트 추가)
- Modify: `src/App.tsx` (lazy import 추가)
- Modify: `src/lib/pageContent.js` (새 엔트리 추가)

**Interfaces:**
- Consumes: `calcInheritanceTax`, `InheritanceTaxInput` from `../lib/inheritanceTax` (Task 1); `Field`, `Row`, `fmt` from `../components/ui`
- Produces: 라우트 id `inheritanceTax`, path `/inheritance-tax` — Task 5(가이드)가 `relatedCalculators`에서 이 path를 참조한다.

- [ ] **Step 1: 계산기 페이지 작성**

`src/pages/InheritanceTaxCalculator.tsx`:

```tsx
import { useMemo, useState } from 'react'
import { calcInheritanceTax } from '../lib/inheritanceTax'
import { Field, Row, fmt } from '../components/ui'

export default function InheritanceTaxCalculator() {
  const [estateValue, setEstateValue] = useState(1_000_000_000)
  const [debtAndFuneralCost, setDebtAndFuneralCost] = useState(0)
  const [hasSpouse, setHasSpouse] = useState(true)
  const [spouseActualShare, setSpouseActualShare] = useState(0)
  const [childrenCount, setChildrenCount] = useState(2)
  const [minorHeirsCount, setMinorHeirsCount] = useState(0)
  const [minorRemainingYears, setMinorRemainingYears] = useState(10)
  const [elderlyHeirsCount, setElderlyHeirsCount] = useState(0)
  const [disabledHeirsCount, setDisabledHeirsCount] = useState(0)
  const [disabledRemainingYears, setDisabledRemainingYears] = useState(20)
  const [netFinancialAssets, setNetFinancialAssets] = useState(0)

  const r = useMemo(
    () =>
      calcInheritanceTax({
        estateValue,
        debtAndFuneralCost,
        hasSpouse,
        spouseActualShare,
        childrenCount,
        minorHeirsCount,
        minorRemainingYears,
        elderlyHeirsCount,
        disabledHeirsCount,
        disabledRemainingYears,
        netFinancialAssets,
      }),
    [
      estateValue,
      debtAndFuneralCost,
      hasSpouse,
      spouseActualShare,
      childrenCount,
      minorHeirsCount,
      minorRemainingYears,
      elderlyHeirsCount,
      disabledHeirsCount,
      disabledRemainingYears,
      netFinancialAssets,
    ],
  )

  return (
    <div>
      <h1 className="text-2xl font-bold">상속세 계산기</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        상속재산가액과 상속인 구성으로 상속세를 추정합니다. 배우자 법정상속분 정밀 계산,
        사전증여재산 합산, 재산평가 특례는 반영하지 않은 간이 계산입니다.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">상속재산 · 상속인 정보</h2>
          <div className="space-y-4">
            <Field
              label="상속재산가액"
              value={estateValue}
              onChange={setEstateValue}
              step={10_000_000}
              hint="부동산·예금·주식 등 상속재산 총액"
            />
            <Field
              label="채무·공과금·장례비용"
              value={debtAndFuneralCost}
              onChange={setDebtAndFuneralCost}
              step={1_000_000}
              hint="상속재산가액에서 먼저 차감되는 금액"
            />
            <div className="rounded-xl bg-slate-50 p-3">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={hasSpouse}
                  onChange={(e) => setHasSpouse(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
                />
                배우자 생존
              </label>
            </div>
            {hasSpouse && (
              <Field
                label="배우자 실제 상속액"
                value={spouseActualShare}
                onChange={setSpouseActualShare}
                step={10_000_000}
                hint="미입력(0)이면 최소 배우자공제 5억원 적용"
              />
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="자녀 수"
                value={childrenCount}
                onChange={(v) => setChildrenCount(Math.max(0, Math.round(v)))}
                suffix="명"
                step={1}
              />
              <Field
                label="65세 이상 상속인"
                value={elderlyHeirsCount}
                onChange={(v) => setElderlyHeirsCount(Math.max(0, Math.round(v)))}
                suffix="명"
                step={1}
              />
              <Field
                label="미성년 상속인"
                value={minorHeirsCount}
                onChange={(v) => setMinorHeirsCount(Math.max(0, Math.round(v)))}
                suffix="명"
                step={1}
              />
              <Field
                label="미성년 평균 잔여연수"
                value={minorRemainingYears}
                onChange={(v) => setMinorRemainingYears(Math.max(0, Math.round(v)))}
                suffix="년"
                step={1}
                hint="19세까지 남은 연수"
              />
              <Field
                label="장애인 상속인"
                value={disabledHeirsCount}
                onChange={(v) => setDisabledHeirsCount(Math.max(0, Math.round(v)))}
                suffix="명"
                step={1}
              />
              <Field
                label="장애인 평균 기대여명"
                value={disabledRemainingYears}
                onChange={(v) => setDisabledRemainingYears(Math.max(0, Math.round(v)))}
                suffix="년"
                step={1}
              />
            </div>
            <Field
              label="순금융재산가액"
              value={netFinancialAssets}
              onChange={setNetFinancialAssets}
              step={1_000_000}
              hint="예금·주식 등 금융재산 - 금융채무. 금융재산공제 계산에 사용"
            />
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-sm text-slate-500">예상 납부세액</p>
            <p className="text-3xl font-extrabold tabular-nums text-emerald-700">{fmt(r.finalTax)}원</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-base font-semibold">상세 내역</h2>
            <div className="divide-y divide-slate-100">
              <Row label="과세가액" value={`${fmt(r.taxableValue)}원`} />
              <Row label="공제 합계" value={`${fmt(r.totalDeduction)}원`} />
              <Row label="과세표준" value={`${fmt(r.taxBase)}원`} />
              <Row label="산출세액" value={`${fmt(r.calculatedTax)}원`} strong />
              <Row label="납부세액 (신고세액공제 3% 반영)" value={`${fmt(r.finalTax)}원`} strong />
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800">
            <b>이 계산은 예상치입니다.</b> 배우자 법정상속분 정밀 계산, 상속개시 전 10년 이내
            사전증여재산 합산, 재산평가 특례(감정평가 등), 유류분은 반영하지 않았습니다. 정확한
            세액은 세무사 상담 또는 국세청 홈택스에서 확인하세요.
          </div>
        </section>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: `routes.json`에 라우트 추가**

`src/routes.json`의 `jeonseConversion` 항목({"id": "jeonseConversion", ...})과 `guidesIndex` 항목 사이에 삽입:

```json
  {
    "id": "inheritanceTax",
    "path": "/inheritance-tax",
    "label": "상속세",
    "group": "부동산",
    "title": "상속세 계산기 — 배우자공제·일괄공제·금융재산공제 반영 | 계산기",
    "description": "상속재산가액과 상속인 구성으로 상속세를 추정합니다. 배우자공제, 일괄공제 5억원, 금융재산공제를 반영한 간이 계산기입니다."
  },
```

(콤마 위치에 유의 — `jeonseConversion` 항목의 닫는 `}` 뒤에 콤마를 추가하고 위 블록을 삽입한다.)

- [ ] **Step 3: `App.tsx`에 lazy import 추가**

`src/App.tsx`의 `jeonseConversion: lazy(...)` 줄 바로 아래에 추가:

```ts
  inheritanceTax: lazy(() => import('./pages/InheritanceTaxCalculator')),
```

- [ ] **Step 4: `pageContent.js`에 엔트리 추가**

`src/lib/pageContent.js`의 `jeonseConversion` 엔트리 뒤, `guidesIndex`가 정의되기 전(가이드 관련 엔트리는 별도 구역에 있으므로 아무 계산기 엔트리 뒤여도 무방 — `comprehensiveRealEstateTax` 엔트리 뒤에 추가하는 것을 권장)에 추가:

```js
  inheritanceTax: {
    intro: [
      '상속세는 사망으로 재산이 무상으로 이전될 때 그 재산가액에 대해 부과되는 세금입니다. 상속재산가액에서 채무·장례비용을 먼저 차감한 뒤, 기초공제·배우자공제 등 각종 공제를 적용해 과세표준을 구하고, 5단계 누진세율(10~50%)을 적용해 세액을 계산합니다.',
      '이 계산기는 배우자공제·일괄공제·금융재산공제 등 주요 공제 항목을 반영한 간이 추정치입니다. 배우자의 법정상속분 정밀 계산, 상속개시 전 10년 이내 사전증여재산 합산, 부동산 감정평가 등 재산평가 특례는 반영하지 않으므로 실제 신고세액과 차이가 있을 수 있습니다.',
    ],
    formula: {
      title: '상속세는 이렇게 계산됩니다',
      steps: [
        '상속재산가액에서 채무·공과금·장례비용을 차감해 과세가액을 구합니다.',
        '자녀공제(1인당 5,000만원), 미성년자공제(1,000만원×잔여연수), 연로자공제(65세 이상 1인당 5,000만원), 장애인공제(1,000만원×기대여명연수)를 더해 인적공제를 계산합니다.',
        '기초공제 2억원과 인적공제 합계, 일괄공제 5억원 중 더 큰 금액을 적용합니다(배우자 단독상속 시 일괄공제는 선택할 수 없습니다).',
        '배우자가 생존해 있으면 실제 상속받은 금액(5억원 미만이면 5억원, 30억원 한도)을 배우자공제로 추가 적용합니다.',
        '순금융재산가액의 20% 또는 2,000만원 중 큰 금액(한도 2억원, 2,000만원 이하면 전액)을 금융재산상속공제로 적용합니다.',
        '과세가액에서 공제 합계를 뺀 과세표준에 5단계 누진세율(10~50%)을 적용해 산출세액을 계산하고, 신고기한 내 신고 시 3% 신고세액공제를 적용합니다.',
      ],
    },
    glossary: [
      { term: '기초공제', definition: '모든 상속에 공통으로 적용되는 2억원의 기본 공제입니다.' },
      { term: '일괄공제', definition: '기초공제와 인적공제 합계 대신 선택할 수 있는 5억원의 정액 공제입니다. 배우자 단독상속인 경우에는 선택할 수 없습니다.' },
      { term: '배우자공제', definition: '배우자가 실제 상속받은 금액을 기준으로 적용되는 공제로, 5억원 미만이면 일률 5억원, 5억원 이상이면 실제 상속액(최대 30억원)이 공제됩니다.' },
      { term: '금융재산상속공제', definition: '예금·주식 등 순금융재산의 20%(또는 2,000만원) 중 큰 금액을 한도 2억원까지 공제합니다.' },
      { term: '신고세액공제', definition: '신고기한(6개월) 내 자진신고하면 산출세액의 3%를 깎아주는 제도입니다.' },
    ],
    examples: [
      { title: '상속재산 10억원 · 배우자+자녀 2명(배우자 실제상속액 미입력)', result: '과세표준 0원, 납부세액 0원' },
      { title: '상속재산 20억원 · 배우자+자녀 1명(배우자 실제상속액 미입력)', result: '과세표준 1,000,000,000원, 산출세액 240,000,000원, 납부세액 232,800,000원' },
      { title: '상속재산 5억원 · 배우자 없음+자녀 1명', result: '과세표준 0원, 납부세액 0원' },
    ],
    sources: [
      { label: '국세청 상속세 항목별설명', url: 'https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?mi=6528&cntntsId=7956' },
      { label: '국세청 세액계산흐름도', url: 'https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?mi=2326&cntntsId=7720' },
    ],
    faqs: [
      { q: '배우자가 없으면 상속세가 더 많이 나오나요?', a: '네, 배우자공제(최소 5억원)를 받을 수 없으므로 같은 조건이면 배우자가 있는 경우보다 과세표준이 커져 세액이 늘어날 수 있습니다.' },
      { q: '일괄공제와 기초공제+인적공제 중 뭐가 유리한가요?', a: '이 계산기는 두 금액 중 더 큰 쪽을 자동으로 적용합니다. 자녀·미성년·장애인 공제 합계가 5억원(일괄공제)을 넘는 경우가 아니라면 대부분 일괄공제 5억원이 적용됩니다.' },
      { q: '미성년자·장애인 공제의 잔여연수는 어떻게 정하나요?', a: '법령상 미성년자공제는 19세까지 남은 연수, 장애인공제는 통계청 기대여명연수를 기준으로 계산합니다. 이 계산기는 평균 잔여연수를 직접 입력하는 간이 방식을 사용하므로, 정확한 연수는 국세청 홈택스에서 확인하세요.' },
      { q: '신고를 늦게 하면 어떻게 되나요?', a: '3% 신고세액공제를 받을 수 없고, 무신고가산세(최대 20%) 등 추가 불이익이 발생할 수 있습니다.' },
      { q: '이 계산기가 반영하지 않는 부분은 무엇인가요?', a: '상속개시 전 10년(상속인) 또는 5년(상속인 외) 이내 사전증여재산 합산, 부동산 감정평가 등 재산평가 특례, 배우자 법정상속분 정밀 계산, 유류분은 반영하지 않습니다.' },
    ],
  },
```

- [ ] **Step 5: 빌드·타입·린트 검증**

Run: `npx tsc -b --noEmit && npm run build && npm run lint`
Expected: 모두 통과, 빌드 출력에 `/inheritance-tax/index.html` 포함

- [ ] **Step 6: 커밋**

```bash
git add src/pages/InheritanceTaxCalculator.tsx src/routes.json src/App.tsx src/lib/pageContent.js
git commit -m "feat: 상속세 계산기 페이지 추가"
```

---

### Task 3: 증여세 계산 로직

**Files:**
- Create: `src/lib/giftTax.ts`

**Interfaces:**
- Produces: `GiftRelation` 유니온 타입, `GiftTaxInput` 인터페이스, `calcGiftTax(input: GiftTaxInput): { taxableValue: number; deduction: number; taxBase: number; calculatedTax: number; finalTax: number }` — Task 4가 그대로 import해서 사용한다.

- [ ] **Step 1: 계산 로직 작성**

`src/lib/giftTax.ts`:

```ts
/**
 * 증여세 추정 — 상속세와 동일한 5단계 누진세율 사용.
 * - 10년 이내 동일인 증여 합산과세를 반영하되, 사용자가 합산액을 직접 입력합니다.
 * - 혼인·출산 증여재산공제(추가 1억원)는 직계존속→직계비속 증여에만 적용됩니다(2024-01-01 이후 증여분부터).
 * - 재산평가 특례(감정평가 등)는 반영하지 않습니다.
 */

interface Bracket {
  limit: number
  rate: number
  deduction: number
}

const BRACKETS: Bracket[] = [
  { limit: 100_000_000, rate: 0.1, deduction: 0 },
  { limit: 500_000_000, rate: 0.2, deduction: 10_000_000 },
  { limit: 1_000_000_000, rate: 0.3, deduction: 60_000_000 },
  { limit: 3_000_000_000, rate: 0.4, deduction: 160_000_000 },
  { limit: Infinity, rate: 0.5, deduction: 460_000_000 },
]

function calcTax(taxBase: number): number {
  if (taxBase <= 0) return 0
  const bracket = BRACKETS.find((b) => taxBase <= b.limit) ?? BRACKETS[BRACKETS.length - 1]
  return Math.max(taxBase * bracket.rate - bracket.deduction, 0)
}

export type GiftRelation =
  | 'spouse'
  | 'ancestorToDescendant'
  | 'descendantToAncestor'
  | 'otherRelative'
  | 'stranger'

export interface GiftTaxInput {
  giftValue: number // 증여재산가액
  relation: GiftRelation
  isMinor: boolean // 수증자 미성년 여부 (ancestorToDescendant일 때만 의미 있음)
  isGenerationSkip: boolean // 세대생략 증여 여부
  priorGiftSum: number // 최근 10년 내 동일인 증여 합산액
  marriageOrBirthDeduction: boolean // 혼인·출산 증여재산공제 해당 여부
}

function relationDeduction(i: GiftTaxInput): number {
  switch (i.relation) {
    case 'spouse':
      return 600_000_000
    case 'ancestorToDescendant': {
      const base = i.isMinor ? 20_000_000 : 50_000_000
      const marriageOrBirth = i.marriageOrBirthDeduction ? 100_000_000 : 0
      return base + marriageOrBirth
    }
    case 'descendantToAncestor':
      return 50_000_000
    case 'otherRelative':
      return 10_000_000
    case 'stranger':
      return 0
  }
}

export function calcGiftTax(i: GiftTaxInput) {
  const taxableValue = i.giftValue + i.priorGiftSum
  const deduction = relationDeduction(i)
  const taxBase = Math.max(taxableValue - deduction, 0)
  const calculatedTax = calcTax(taxBase)

  const surchargeRate = i.isGenerationSkip ? (i.isMinor && i.giftValue > 2_000_000_000 ? 0.4 : 0.3) : 0
  const taxWithSurcharge = calculatedTax * (1 + surchargeRate)
  const finalTax = taxWithSurcharge * 0.97 // 신고세액공제 3%

  return {
    taxableValue: Math.round(taxableValue),
    deduction: Math.round(deduction),
    taxBase: Math.round(taxBase),
    calculatedTax: Math.round(calculatedTax),
    finalTax: Math.round(finalTax),
  }
}
```

- [ ] **Step 2: 스크래치 스크립트로 수동 검증**

`.superpowers/tmp-verify-gift.ts` (임시 파일, 커밋하지 않음):

```ts
import { calcGiftTax } from '../src/lib/giftTax.ts'

// Case A: 직계존속→직계비속(성년), 증여재산 6,000만원
console.log('Case A', calcGiftTax({
  giftValue: 60_000_000, relation: 'ancestorToDescendant', isMinor: false,
  isGenerationSkip: false, priorGiftSum: 0, marriageOrBirthDeduction: false,
}))
// 기대값: taxBase: 10_000_000, calculatedTax: 1_000_000, finalTax: 970_000

// Case B: 배우자, 증여재산 7억원
console.log('Case B', calcGiftTax({
  giftValue: 700_000_000, relation: 'spouse', isMinor: false,
  isGenerationSkip: false, priorGiftSum: 0, marriageOrBirthDeduction: false,
}))
// 기대값: taxBase: 100_000_000, calculatedTax: 10_000_000, finalTax: 9_700_000

// Case C: 조부모→미성년 손자(세대생략), 증여재산 25억원
console.log('Case C', calcGiftTax({
  giftValue: 2_500_000_000, relation: 'ancestorToDescendant', isMinor: true,
  isGenerationSkip: true, priorGiftSum: 0, marriageOrBirthDeduction: false,
}))
// 기대값: taxBase: 2_480_000_000, calculatedTax: 832_000_000, finalTax: 1_129_856_000
```

Run: `node .superpowers/tmp-verify-gift.ts`

Expected: 세 케이스 모두 위에 명시된 기대값과 정확히 일치. 검증 후 `.superpowers/tmp-verify-gift.ts`는 삭제한다(커밋 대상 아님).

- [ ] **Step 3: 타입 체크**

Run: `npx tsc -b --noEmit`
Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add src/lib/giftTax.ts
git commit -m "feat: 증여세 계산 로직 추가"
```

---

### Task 4: 증여세 계산기 페이지

**Files:**
- Create: `src/pages/GiftTaxCalculator.tsx`
- Modify: `src/routes.json`
- Modify: `src/App.tsx`
- Modify: `src/lib/pageContent.js`

**Interfaces:**
- Consumes: `calcGiftTax`, `GiftTaxInput`, `GiftRelation` from `../lib/giftTax` (Task 3); `Field`, `Row`, `fmt` from `../components/ui`
- Produces: 라우트 id `giftTax`, path `/gift-tax` — Task 6(가이드)이 `relatedCalculators`에서 이 path를 참조한다.

- [ ] **Step 1: 계산기 페이지 작성**

`src/pages/GiftTaxCalculator.tsx`:

```tsx
import { useMemo, useState } from 'react'
import { calcGiftTax, type GiftRelation } from '../lib/giftTax'
import { Field, Row, fmt } from '../components/ui'

const RELATION_LABELS: Record<GiftRelation, string> = {
  spouse: '배우자',
  ancestorToDescendant: '직계존속 → 직계비속 (부모·조부모가 자녀·손자녀에게)',
  descendantToAncestor: '직계비속 → 직계존속 (자녀가 부모에게)',
  otherRelative: '기타친족',
  stranger: '타인',
}

export default function GiftTaxCalculator() {
  const [giftValue, setGiftValue] = useState(100_000_000)
  const [relation, setRelation] = useState<GiftRelation>('ancestorToDescendant')
  const [isMinor, setIsMinor] = useState(false)
  const [isGenerationSkip, setIsGenerationSkip] = useState(false)
  const [priorGiftSum, setPriorGiftSum] = useState(0)
  const [marriageOrBirthDeduction, setMarriageOrBirthDeduction] = useState(false)

  const r = useMemo(
    () =>
      calcGiftTax({
        giftValue,
        relation,
        isMinor,
        isGenerationSkip,
        priorGiftSum,
        marriageOrBirthDeduction,
      }),
    [giftValue, relation, isMinor, isGenerationSkip, priorGiftSum, marriageOrBirthDeduction],
  )

  return (
    <div>
      <h1 className="text-2xl font-bold">증여세 계산기</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        증여재산가액과 증여자·수증자 관계로 증여세를 추정합니다. 최근 10년 내 동일인 증여
        합산과세를 반영합니다.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">증여 정보</h2>
          <div className="space-y-4">
            <Field label="증여재산가액" value={giftValue} onChange={setGiftValue} step={10_000_000} />
            <div>
              <span className="mb-1.5 block text-sm font-medium text-slate-700">증여자와의 관계</span>
              <select
                value={relation}
                onChange={(e) => setRelation(e.target.value as GiftRelation)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
              >
                {(Object.keys(RELATION_LABELS) as GiftRelation[]).map((key) => (
                  <option key={key} value={key}>
                    {RELATION_LABELS[key]}
                  </option>
                ))}
              </select>
            </div>
            {relation === 'ancestorToDescendant' && (
              <div className="space-y-3 rounded-xl bg-slate-50 p-3">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={isMinor}
                    onChange={(e) => setIsMinor(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
                  />
                  수증자 미성년 (공제 5,000만원 → 2,000만원)
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={marriageOrBirthDeduction}
                    onChange={(e) => setMarriageOrBirthDeduction(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
                  />
                  혼인·출산 증여재산공제 해당 (추가 1억원, 2024-01-01 이후 증여분부터)
                </label>
              </div>
            )}
            <div className="rounded-xl bg-slate-50 p-3">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={isGenerationSkip}
                  onChange={(e) => setIsGenerationSkip(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
                />
                세대생략 증여 (조부모 → 손자녀 등, 30~40% 할증)
              </label>
            </div>
            <Field
              label="최근 10년 내 동일인 증여 합산액"
              value={priorGiftSum}
              onChange={setPriorGiftSum}
              step={1_000_000}
              hint="같은 사람에게 10년 이내 받은 다른 증여재산가액"
            />
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-sm text-slate-500">예상 납부세액</p>
            <p className="text-3xl font-extrabold tabular-nums text-emerald-700">{fmt(r.finalTax)}원</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-base font-semibold">상세 내역</h2>
            <div className="divide-y divide-slate-100">
              <Row label="과세가액 (10년 합산 포함)" value={`${fmt(r.taxableValue)}원`} />
              <Row label="증여재산공제" value={`${fmt(r.deduction)}원`} />
              <Row label="과세표준" value={`${fmt(r.taxBase)}원`} />
              <Row label="산출세액" value={`${fmt(r.calculatedTax)}원`} strong />
              <Row label="납부세액 (할증·신고세액공제 반영)" value={`${fmt(r.finalTax)}원`} strong />
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800">
            <b>이 계산은 예상치입니다.</b> 재산평가 특례(감정평가 등)는 반영하지 않았습니다. 정확한
            세액은 세무사 상담 또는 국세청 홈택스에서 확인하세요.
          </div>
        </section>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: `routes.json`에 라우트 추가**

Task 2에서 추가한 `inheritanceTax` 항목 바로 뒤에 삽입:

```json
  {
    "id": "giftTax",
    "path": "/gift-tax",
    "label": "증여세",
    "group": "부동산",
    "title": "증여세 계산기 — 증여재산공제·혼인출산공제·세대생략 할증 반영 | 계산기",
    "description": "증여자와의 관계별 증여재산공제와 10년 합산과세, 혼인·출산 증여재산공제, 세대생략 할증을 반영해 증여세를 추정합니다."
  },
```

- [ ] **Step 3: `App.tsx`에 lazy import 추가**

`inheritanceTax: lazy(...)` 줄 바로 아래에 추가:

```ts
  giftTax: lazy(() => import('./pages/GiftTaxCalculator')),
```

- [ ] **Step 4: `pageContent.js`에 엔트리 추가**

`inheritanceTax` 엔트리 바로 뒤에 추가:

```js
  giftTax: {
    intro: [
      '증여세는 살아있는 사람으로부터 재산을 무상으로 받았을 때 그 재산가액에 대해 부과되는 세금입니다. 증여자와 수증자의 관계에 따라 증여재산공제 한도가 다르며, 최근 10년 이내 같은 사람에게 받은 증여재산은 합산해서 과세합니다.',
      '이 계산기는 관계별 증여재산공제, 혼인·출산 증여재산공제, 세대생략 할증과세를 반영한 간이 추정치입니다. 재산평가 특례(감정평가 등)는 반영하지 않으므로 실제 신고세액과 차이가 있을 수 있습니다.',
    ],
    formula: {
      title: '증여세는 이렇게 계산됩니다',
      steps: [
        '증여재산가액에 최근 10년 이내 동일인으로부터 받은 증여재산 합산액을 더해 과세가액을 구합니다.',
        '증여자와 수증자의 관계에 따라 증여재산공제를 적용합니다 — 배우자 6억원, 직계존속→직계비속(성년 5,000만원·미성년 2,000만원), 직계비속→직계존속 5,000만원, 기타친족 1,000만원, 타인 0원.',
        '직계존속→직계비속 증여이면서 혼인·출산 증여재산공제 요건(2024년 1월 1일 이후 증여, 혼인신고 전후 2년 또는 출산 후 2년 이내)을 충족하면 1억원을 추가로 공제합니다.',
        '과세가액에서 공제 합계를 뺀 과세표준에 상속세와 동일한 5단계 누진세율(10~50%)을 적용해 산출세액을 계산합니다.',
        '세대생략 증여(조부모→손자녀 등)이면 산출세액에 30%를 할증하고, 미성년자가 20억원을 초과해 증여받으면 40%를 할증합니다.',
        '신고기한(3개월) 내 자진신고하면 3% 신고세액공제를 적용해 최종 납부세액을 계산합니다.',
      ],
    },
    glossary: [
      { term: '증여재산공제', definition: '증여자와 수증자의 관계에 따라 10년 합산 기준으로 적용되는 공제 한도입니다.' },
      { term: '혼인·출산 증여재산공제', definition: '2024년 신설된 공제로, 직계존속→직계비속 증여에 한해 혼인·출산 요건 충족 시 추가로 최대 1억원까지 공제됩니다.' },
      { term: '세대생략증여', definition: '조부모가 손자녀에게 증여하는 등 한 세대를 건너뛰는 증여로, 산출세액에 30~40%가 할증됩니다.' },
      { term: '10년 합산과세', definition: '같은 사람에게 10년 이내 받은 증여재산을 모두 더해 과세표준을 계산하는 원칙입니다.' },
      { term: '신고세액공제', definition: '신고기한(3개월) 내 자진신고하면 산출세액의 3%를 깎아주는 제도입니다.' },
    ],
    examples: [
      { title: '직계존속→직계비속(성년) · 증여재산 6,000만원', result: '과세표준 10,000,000원, 납부세액 970,000원' },
      { title: '배우자 · 증여재산 7억원', result: '과세표준 100,000,000원, 납부세액 9,700,000원' },
      { title: '조부모→미성년 손자(세대생략) · 증여재산 25억원', result: '과세표준 2,480,000,000원, 40% 할증 반영, 납부세액 1,129,856,000원' },
    ],
    sources: [
      { label: '국세상담센터 혼인·출산 증여재산공제', url: 'https://call.nts.go.kr/call/qna/selectQnaInfo.do?mi=2787&ctgId=CTG12222' },
      { label: '국세청 세액계산흐름도', url: 'https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?mi=2326&cntntsId=7720' },
    ],
    faqs: [
      { q: '10년 합산액은 어떻게 확인하나요?', a: '홈택스에서 본인의 증여세 신고 이력을 조회하거나, 증여자 기준으로 최근 10년 이내 받은 증여재산가액을 직접 합산해 입력하면 됩니다.' },
      { q: '혼인·출산 공제는 각각 1억원씩 받을 수 있나요?', a: '아니요, 혼인공제와 출산공제는 합산 한도가 1억원입니다. 두 요건을 모두 충족해도 최대 1억원까지만 공제됩니다.' },
      { q: '세대생략 할증은 왜 있나요?', a: '부모 세대를 건너뛰고 조부모가 손자녀에게 직접 증여하면 상속·증여 단계를 한 번 줄여 세금을 회피할 수 있기 때문에, 이를 막기 위해 산출세액에 30~40%를 할증합니다.' },
      { q: '며느리·사위에게 증여하면 공제가 얼마인가요?', a: '기타친족으로 분류되어 1,000만원이 공제됩니다.' },
      { q: '이 계산기가 반영하지 않는 부분은 무엇인가요?', a: '부동산 감정평가 등 재산평가 특례는 반영하지 않았습니다. 정확한 평가액은 국세청 홈택스 또는 세무사 상담으로 확인하세요.' },
    ],
  },
```

- [ ] **Step 5: 빌드·타입·린트 검증**

Run: `npx tsc -b --noEmit && npm run build && npm run lint`
Expected: 모두 통과, 빌드 출력에 `/gift-tax/index.html` 포함

- [ ] **Step 6: 커밋**

```bash
git add src/pages/GiftTaxCalculator.tsx src/routes.json src/App.tsx src/lib/pageContent.js
git commit -m "feat: 증여세 계산기 페이지 추가"
```

---

### Task 5: 상속세 신고 절차 가이드

**Files:**
- Create: `src/pages/guides/InheritanceTaxProcedureGuide.tsx`
- Modify: `src/routes.json`
- Modify: `src/App.tsx`
- Modify: `src/lib/pageContent.js`

**Interfaces:**
- Consumes: `GuideArticlePage` from `../../components/GuideArticlePage` (기존 컴포넌트, 변경 없음); Task 2가 만든 `/inheritance-tax` path
- Produces: 라우트 id `inheritanceTaxProcedureGuide`, path `/guides/inheritance-tax-procedure` — Task 7이 `GuidesIndexPage.tsx`의 `TRACK3_IDS`에서 참조한다.

- [ ] **Step 1: 가이드 래퍼 페이지 작성**

`src/pages/guides/InheritanceTaxProcedureGuide.tsx`:

```tsx
import GuideArticlePage from '../../components/GuideArticlePage'

export default function InheritanceTaxProcedureGuide() {
  return (
    <GuideArticlePage
      pageId="inheritanceTaxProcedureGuide"
      relatedCalculators={[{ label: '상속세 계산기', path: '/inheritance-tax' }]}
    />
  )
}
```

- [ ] **Step 2: `routes.json`에 라우트 추가**

`routes.json`의 마지막 가이드 항목(`nationalEmploymentSupportGuide`) 뒤, `about` 항목 앞에 삽입:

```json
  {
    "id": "inheritanceTaxProcedureGuide",
    "path": "/guides/inheritance-tax-procedure",
    "label": "상속세 신고 절차 총정리",
    "group": "가이드",
    "title": "상속세 신고 절차 총정리 — 신고기한 6개월, 재산평가부터 공제 적용까지 | 계산기",
    "description": "상속개시일이 속한 달 말일로부터 6개월 이내 상속세 신고 절차를 재산 파악, 평가, 공제 적용, 신고서 제출 순서로 정리했습니다."
  },
```

- [ ] **Step 3: `App.tsx`에 lazy import 추가**

`nationalEmploymentSupportGuide: lazy(...)` 줄 바로 아래에 추가:

```ts
  inheritanceTaxProcedureGuide: lazy(() => import('./pages/guides/InheritanceTaxProcedureGuide')),
```

- [ ] **Step 4: `pageContent.js`에 엔트리 추가**

`nationalEmploymentSupportGuide` 엔트리 뒤(가이드 콘텐츠 구역의 마지막)에 추가:

```js
  inheritanceTaxProcedureGuide: {
    intro: [
      '상속세는 상속이 개시된 것(사망일)을 안 날이 속하는 달의 말일부터 6개월 이내에 신고·납부해야 합니다. 피상속인이나 상속인 전원이 외국에 주소를 둔 경우에는 9개월로 연장됩니다. 이 기한 내에 자진신고하면 산출세액의 3%를 신고세액공제로 돌려받을 수 있어, 기한을 지키는 것 자체가 절세로 이어집니다.',
      '신고 절차는 크게 네 단계로 진행됩니다. ① 상속재산 목록을 파악하고 평가하는 단계(부동산 시가·공시가격, 예금·주식 잔액, 보험금 등), ② 채무·공과금·장례비용과 각종 공제(기초공제, 배우자공제, 인적공제 또는 일괄공제, 금융재산공제 등)를 확인하는 단계, ③ 국세청 홈택스 또는 세무서 방문으로 상속세 과세표준신고 및 자진납부계산서를 제출하는 단계, ④ 신고 후 국세청의 세무조사(결정) 절차를 거쳐 최종 세액이 확정되는 단계입니다.',
      '상속재산 평가에는 원칙적으로 시가(매매사례가액 등)를 우선 적용하고, 시가를 산정하기 어려운 부동산 등은 보충적 평가방법(공시가격 등)을 사용합니다. 상속개시 전 10년(상속인) 또는 5년(상속인 외의 자) 이내에 피상속인이 증여한 재산이 있다면 상속재산에 합산해 신고해야 하므로, 사전증여 이력을 미리 확인해두는 것이 중요합니다.',
      '현재 상속세는 유산 전체를 기준으로 세액을 계산하는 유산세 방식이지만, 정부는 상속인이 실제로 받는 몫을 기준으로 과세하는 "유산취득세" 방식으로 전환하는 방안을 추진 중입니다(2025년 3월 발표, 2028년 시행 목표로 논의 중이며 아직 법제화되지 않았습니다). 또한 2024년 세법개정안에 포함됐던 자녀공제 확대(5,000만원→5억원)와 최고세율 인하(50%→40%) 방안은 국회에서 부결되어 시행되지 않았으므로, 현재도 자녀공제 5,000만원·최고세율 50% 기준이 그대로 적용됩니다.',
    ],
    formula: {
      title: '상속세 신고는 이렇게 진행됩니다',
      steps: [
        '사망일(상속개시일)이 속한 달의 말일부터 6개월 이내가 신고기한임을 확인합니다(국외 거주 시 9개월).',
        '부동산·예금·주식·보험금 등 상속재산 목록을 파악하고 시가 또는 보충적 평가방법으로 평가합니다.',
        '상속개시 전 10년(상속인) 또는 5년(상속인 외) 이내 사전증여재산이 있는지 확인해 합산합니다.',
        '채무·공과금·장례비용과 기초공제·배우자공제·인적공제(또는 일괄공제)·금융재산공제 등 적용 가능한 공제를 확인합니다.',
        '국세청 홈택스 또는 관할 세무서에서 상속세 과세표준신고 및 자진납부계산서를 제출합니다.',
        '신고 후 국세청의 세무조사(결정) 절차를 거쳐 최종 세액이 확정되며, 기한 내 신고분에는 3% 신고세액공제가 적용됩니다.',
      ],
    },
    glossary: [
      { term: '유산세 방식', definition: '상속재산 전체를 기준으로 세액을 계산하는 현행 상속세 과세 방식입니다.' },
      { term: '유산취득세', definition: '상속인이 실제로 받는 몫을 기준으로 과세하는 방식으로, 정부가 2028년 시행을 목표로 전환을 추진 중이나 아직 법제화되지 않았습니다.' },
      { term: '사전증여재산 합산', definition: '상속개시 전 10년(상속인) 또는 5년(상속인 외) 이내 피상속인이 증여한 재산을 상속재산에 합산해 과세하는 원칙입니다.' },
      { term: '보충적 평가방법', definition: '시가를 산정하기 어려운 재산(주로 부동산)에 공시가격 등을 적용해 평가하는 방법입니다.' },
      { term: '신고세액공제', definition: '신고기한 내 자진신고하면 산출세액의 3%를 깎아주는 제도입니다.' },
    ],
    faqs: [
      { q: '상속세 신고를 꼭 해야 하나요? 상속재산이 적으면 안 해도 되나요?', a: '배우자와 자녀가 상속받는 경우 일괄공제 5억원과 배우자공제 5억원만으로도 최대 10억원까지 과세표준이 0원이 될 수 있지만, 과세미달이어도 신고를 해두면 추후 재산 처분 시 취득가액 입증 등에 유리하므로 신고를 권장합니다.' },
      { q: '2024년 상속세 개편안은 어떻게 됐나요?', a: '자녀공제를 5,000만원에서 5억원으로 확대하고 최고세율을 50%에서 40%로 낮추는 개정안이 발의됐지만, 2024년 12월 국회 본회의에서 부결되어 시행되지 않았습니다. 현재도 개정 전 기준(자녀공제 5,000만원, 최고세율 50%)이 그대로 적용됩니다.' },
      { q: '유산취득세로 바뀌면 뭐가 달라지나요?', a: '유산 전체가 아니라 각 상속인이 실제로 받는 몫을 기준으로 세액을 계산하는 방식으로 바뀝니다. 2025년 3월 정부가 2028년 시행을 목표로 추진 방안을 발표했지만, 아직 국회에서 법제화되지 않은 논의 단계입니다.' },
      { q: '신고기한을 넘기면 어떻게 되나요?', a: '3% 신고세액공제를 받을 수 없고, 무신고가산세(원칙 20%) 등 추가 불이익이 발생할 수 있습니다.' },
    ],
    sources: [
      { label: '국세청 상속세 항목별설명', url: 'https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?mi=6528&cntntsId=7956' },
      { label: '뉴스1 — 상속세법 개정안 국회 부결 (2024-12-10)', url: 'https://www.news1.kr/politics/assembly/5627380' },
      { label: '한국일보 — 유산취득세 전환 추진 (2025-03-11)', url: 'https://www.hankookilbo.com/News/Read/A2025031113130002381' },
    ],
    highlights: [
      { icon: '⏰', label: '신고기한', text: '사망일 속한 달 말일부터 6개월 이내(국외는 9개월)' },
      { icon: '💺', label: '배우자공제', text: '실제 상속액 5억원 미만이면 일률 5억원, 최대 30억원까지' },
      { icon: '🚫', label: '개정안 부결', text: '자녀공제 5억 확대·최고세율 40% 인하안은 국회에서 부결, 미시행' },
      { icon: '🔄', label: '제도 개편 논의', text: '유산취득세 전환을 2028년 목표로 추진 중(미확정)' },
    ],
    stepChips: [
      { icon: '⏰', label: '신고기한 확인' },
      { icon: '🏠', label: '재산 평가' },
      { icon: '🎁', label: '사전증여 합산' },
      { icon: '📋', label: '공제 확인' },
      { icon: '🖥️', label: '신고서 제출' },
      { icon: '✅', label: '세액 확정' },
    ],
  },
```

- [ ] **Step 5: 빌드·타입·린트 검증**

Run: `npx tsc -b --noEmit && npm run build && npm run lint`
Expected: 모두 통과, 빌드 출력에 `/guides/inheritance-tax-procedure/index.html` 포함

- [ ] **Step 6: highlights/stepChips 개수 확인**

Run:
```bash
node -e "
const { pageContent } = require('./src/lib/pageContent.js');
" 2>/dev/null || node --input-type=module -e "
import { pageContent } from './src/lib/pageContent.js'
const g = pageContent.inheritanceTaxProcedureGuide
console.log('highlights:', g.highlights.length, '/ stepChips:', g.stepChips.length, '/ steps:', g.formula.steps.length)
"
```

Expected: `highlights: 4 / stepChips: 6 / steps: 6`

- [ ] **Step 7: 커밋**

```bash
git add src/pages/guides/InheritanceTaxProcedureGuide.tsx src/routes.json src/App.tsx src/lib/pageContent.js
git commit -m "content: 상속세 신고 절차 가이드 추가"
```

---

### Task 6: 증여세 신고 절차 가이드

**Files:**
- Create: `src/pages/guides/GiftTaxProcedureGuide.tsx`
- Modify: `src/routes.json`
- Modify: `src/App.tsx`
- Modify: `src/lib/pageContent.js`

**Interfaces:**
- Consumes: `GuideArticlePage` from `../../components/GuideArticlePage`; Task 4가 만든 `/gift-tax` path
- Produces: 라우트 id `giftTaxProcedureGuide`, path `/guides/gift-tax-procedure` — Task 7이 `GuidesIndexPage.tsx`의 `TRACK3_IDS`에서 참조한다.

- [ ] **Step 1: 가이드 래퍼 페이지 작성**

`src/pages/guides/GiftTaxProcedureGuide.tsx`:

```tsx
import GuideArticlePage from '../../components/GuideArticlePage'

export default function GiftTaxProcedureGuide() {
  return (
    <GuideArticlePage
      pageId="giftTaxProcedureGuide"
      relatedCalculators={[{ label: '증여세 계산기', path: '/gift-tax' }]}
    />
  )
}
```

- [ ] **Step 2: `routes.json`에 라우트 추가**

Task 5에서 추가한 `inheritanceTaxProcedureGuide` 항목 바로 뒤에 삽입:

```json
  {
    "id": "giftTaxProcedureGuide",
    "path": "/guides/gift-tax-procedure",
    "label": "증여세 신고 절차 총정리",
    "group": "가이드",
    "title": "증여세 신고 절차 총정리 — 신고기한 3개월, 10년 합산과세·혼인출산공제까지 | 계산기",
    "description": "증여일이 속한 달 말일로부터 3개월 이내 증여세 신고 절차와 10년 합산과세, 혼인·출산 증여재산공제 요건을 정리했습니다."
  },
```

- [ ] **Step 3: `App.tsx`에 lazy import 추가**

`inheritanceTaxProcedureGuide: lazy(...)` 줄 바로 아래에 추가:

```ts
  giftTaxProcedureGuide: lazy(() => import('./pages/guides/GiftTaxProcedureGuide')),
```

- [ ] **Step 4: `pageContent.js`에 엔트리 추가**

`inheritanceTaxProcedureGuide` 엔트리 뒤에 추가:

```js
  giftTaxProcedureGuide: {
    intro: [
      '증여세는 증여일이 속하는 달의 말일부터 3개월 이내에 신고·납부해야 합니다. 상속세(6개월)보다 신고기한이 짧으므로 증여를 계획할 때부터 기한을 미리 확인해두는 것이 중요합니다. 기한 내 자진신고하면 산출세액의 3%를 신고세액공제로 돌려받습니다.',
      '신고 절차는 ① 증여재산을 평가하는 단계, ② 증여자와의 관계에 따른 증여재산공제와 혼인·출산 증여재산공제 등 적용 가능한 공제를 확인하는 단계, ③ 최근 10년 이내 동일인으로부터 받은 증여재산이 있는지 합산과세 대상을 확인하는 단계, ④ 국세청 홈택스 또는 세무서에 증여세 과세표준신고 및 자진납부계산서를 제출하는 단계로 진행됩니다.',
      '2024년 1월 1일 이후 증여분부터는 직계존속(부모·조부모)이 직계비속(자녀·손자녀)에게 증여할 때 혼인·출산 증여재산공제가 추가로 적용됩니다. 혼인공제는 혼인신고일 전후 2년 이내(총 4년), 출산공제는 자녀의 출생일·입양일로부터 2년 이내에 받은 증여에 적용되며, 두 공제를 합쳐 최대 1억원까지 공제받을 수 있습니다(혼인공제와 출산공제 각각이 아니라 합산 한도입니다).',
      '조부모가 손자녀에게 증여하는 등 한 세대를 건너뛰는 세대생략증여는 상속 단계를 하나 건너뛰어 세금을 줄이는 것을 막기 위해 산출세액에 30%를 할증합니다. 특히 미성년자가 20억원을 초과하는 재산을 세대생략으로 증여받으면 할증률이 40%로 올라갑니다.',
    ],
    formula: {
      title: '증여세 신고는 이렇게 진행됩니다',
      steps: [
        '증여일이 속한 달의 말일부터 3개월 이내가 신고기한임을 확인합니다.',
        '증여받은 재산(부동산·예금·주식 등)을 시가 또는 보충적 평가방법으로 평가합니다.',
        '최근 10년 이내 동일인으로부터 받은 다른 증여재산이 있는지 확인해 합산합니다.',
        '증여자와의 관계에 따른 증여재산공제(배우자 6억, 직계존속→직계비속 5,000만·미성년 2,000만 등)를 확인합니다.',
        '직계존속→직계비속 증여이고 혼인·출산 요건을 충족하면 혼인·출산 증여재산공제(최대 1억원)를 추가로 확인합니다.',
        '국세청 홈택스 또는 관할 세무서에 증여세 과세표준신고 및 자진납부계산서를 제출하고, 기한 내 신고 시 3% 신고세액공제를 적용받습니다.',
      ],
    },
    glossary: [
      { term: '10년 합산과세', definition: '동일인으로부터 10년 이내 받은 증여재산을 모두 더해 과세표준을 계산하는 원칙입니다.' },
      { term: '혼인·출산 증여재산공제', definition: '2024년 신설된 공제로, 직계존속→직계비속 증여에 한해 혼인·출산 요건 충족 시 추가로 최대 1억원까지 공제됩니다.' },
      { term: '세대생략증여', definition: '조부모→손자녀 등 한 세대를 건너뛰는 증여로 산출세액에 30~40%가 할증됩니다.' },
      { term: '증여재산공제', definition: '증여자와 수증자의 관계에 따라 10년 합산 기준으로 적용되는 공제 한도입니다.' },
      { term: '신고세액공제', definition: '신고기한(3개월) 내 자진신고하면 산출세액의 3%를 깎아주는 제도입니다.' },
    ],
    faqs: [
      { q: '혼인·출산 공제는 신랑·신부 양가에서 각각 받을 수 있나요?', a: '수증자 본인 기준으로 부모(또는 조부모)로부터 받는 증여에 적용되는 공제이므로, 신랑측·신부측 부모로부터 각각 증여받는다면 각자 별도로 적용받을 수 있습니다. 정확한 적용 여부는 국세청 홈택스나 세무사 상담으로 확인하는 것이 안전합니다.' },
      { q: '10년 합산 대상에 배우자로부터 받은 증여도 포함되나요?', a: '세법상 동일인에는 증여자의 배우자도 포함되는 것으로 해석되는 경우가 있어 합산 범위가 넓어질 수 있습니다. 이 계산기는 합산액을 직접 입력하는 방식이므로, 정확한 합산 대상은 국세청 확인이 필요합니다.' },
      { q: '세대생략증여 할증은 항상 적용되나요?', a: '아버지가 먼저 사망해 손자녀가 대습상속인이 되는 경우 등 일부 예외에는 할증이 적용되지 않습니다. 이 계산기는 일반적인 세대생략증여만 반영한 간이 계산입니다.' },
      { q: '신고기한을 넘기면 어떻게 되나요?', a: '3% 신고세액공제를 받을 수 없고, 무신고가산세 등 추가 불이익이 발생할 수 있습니다.' },
    ],
    sources: [
      { label: '국세상담센터 혼인·출산 증여재산공제', url: 'https://call.nts.go.kr/call/qna/selectQnaInfo.do?mi=2787&ctgId=CTG12222' },
      { label: '국세청 세액계산흐름도', url: 'https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?mi=2326&cntntsId=7720' },
    ],
    highlights: [
      { icon: '⏰', label: '신고기한', text: '증여일 속한 달 말일부터 3개월 이내' },
      { icon: '💐', label: '혼인·출산공제', text: '2024년 이후 증여분부터 최대 1억원 추가 공제(합산 한도)' },
      { icon: '⚠️', label: '세대생략 할증', text: '조부모→손자녀 등은 30%, 미성년+20억 초과면 40% 할증' },
      { icon: '📊', label: '10년 합산과세', text: '동일인에게 10년 이내 받은 증여재산은 모두 합산해 과세' },
    ],
    stepChips: [
      { icon: '⏰', label: '신고기한 확인' },
      { icon: '🏠', label: '재산 평가' },
      { icon: '🔁', label: '10년 합산 확인' },
      { icon: '📋', label: '공제 확인' },
      { icon: '💐', label: '혼인출산공제 확인' },
      { icon: '🖥️', label: '신고서 제출' },
    ],
  },
```

- [ ] **Step 5: 빌드·타입·린트 검증**

Run: `npx tsc -b --noEmit && npm run build && npm run lint`
Expected: 모두 통과, 빌드 출력에 `/guides/gift-tax-procedure/index.html` 포함

- [ ] **Step 6: highlights/stepChips 개수 확인**

Run:
```bash
node --input-type=module -e "
import { pageContent } from './src/lib/pageContent.js'
const g = pageContent.giftTaxProcedureGuide
console.log('highlights:', g.highlights.length, '/ stepChips:', g.stepChips.length, '/ steps:', g.formula.steps.length)
"
```

Expected: `highlights: 4 / stepChips: 6 / steps: 6`

- [ ] **Step 7: 커밋**

```bash
git add src/pages/guides/GiftTaxProcedureGuide.tsx src/routes.json src/App.tsx src/lib/pageContent.js
git commit -m "content: 증여세 신고 절차 가이드 추가"
```

---

### Task 7: 가이드 목록 페이지 통합 + 최종 검증

**Files:**
- Modify: `src/pages/GuidesIndexPage.tsx`

**Interfaces:**
- Consumes: `inheritanceTaxProcedureGuide`, `giftTaxProcedureGuide` route ids (Tasks 5, 6에서 생성)

- [ ] **Step 1: `GuidesIndexPage.tsx`에 새 트랙 추가**

`src/pages/GuidesIndexPage.tsx`의 `TRACK2_IDS` 선언 뒤에 추가:

```tsx
const TRACK3_IDS = ['inheritanceTaxProcedureGuide', 'giftTaxProcedureGuide']
```

`<GuideList ids={TRACK2_IDS} title="정부지원금·청년정책" />` 줄 바로 아래에 추가:

```tsx
      <GuideList ids={TRACK3_IDS} title="세금·부동산 절차" />
```

- [ ] **Step 2: 전체 빌드·타입·린트 검증**

Run: `npx tsc -b --noEmit && npm run build && npm run lint`
Expected: 모두 통과. 빌드 출력에 아래 6개 신규 페이지가 모두 포함되어야 함:
- `/inheritance-tax/index.html`
- `/gift-tax/index.html`
- `/guides/inheritance-tax-procedure/index.html`
- `/guides/gift-tax-procedure/index.html`
- (`/guides/index.html`, `/about/index.html`는 기존 페이지가 정상 재생성되는지만 확인)

- [ ] **Step 3: `routes.json` 전체 정합성 확인**

Run: `node -e "const r = JSON.parse(require('fs').readFileSync('src/routes.json')); console.log(r.length, r.filter(x => x.group === '부동산').length, r.filter(x => x.group === '가이드').length)"`

Expected: 전체 라우트 수 = 52 (기존 48 + 이번에 추가한 4개), `부동산` 그룹 = 6개(기존 4개 + 상속세·증여세), `가이드` 그룹 = 11개(기존 9개 + 2개)

- [ ] **Step 4: 계산기 페이지 회귀 확인**

Run: `grep -c "grid-cols-2 gap-3" dist/inheritance-tax/index.html dist/gift-tax/index.html`

Expected: 두 파일 모두 `0` (계산기 페이지는 `highlights`/`stepChips`를 채우지 않았으므로 카드뉴스 레이아웃 마크업이 나타나지 않아야 함 — 정적 프리렌더 HTML은 SPA 셸이라 이 grep은 참고용이며, `pageContent.js`에 `inheritanceTax`/`giftTax` 엔트리에 `highlights`/`stepChips` 키가 없음을 코드로도 확인한다)

- [ ] **Step 5: `AboutPage.tsx`/README 자동 반영 확인**

Run: `git diff --stat README.md`

Expected: PostToolUse 훅이 자동으로 README를 갱신했다면 `부동산` 그룹 표에 상속세·증여세 항목이 추가되어 있어야 함(계산기 목록 개수가 37개→39개로 증가). 훅이 실행되지 않았다면 `node scripts/update-readme.mjs`를 수동 실행한다.

- [ ] **Step 6: 커밋**

```bash
git add src/pages/GuidesIndexPage.tsx README.md
git commit -m "feat: 가이드 목록에 세금·부동산 절차 트랙 추가, 상속세·증여세 서브프로젝트 마무리"
```

---

## Self-Review 완료 사항

- **스펙 커버리지**: 설계 문서의 아키텍처(계산기 2개+가이드 2개, `부동산`/`가이드` 그룹, `relatedCalculators` 연결, `GuidesIndexPage` 신규 트랙), 상속세/증여세 계산 로직(입력 필드·공식 전체), 검증 계획(계산 케이스, tsc/build/lint) 모두 Task 1~7에 매핑됨.
- **플레이스홀더 스캔**: TBD/TODO 없음, 모든 코드 블록이 실제 실행 가능한 완전한 코드임.
- **타입 일관성**: `InheritanceTaxInput`/`GiftTaxInput`/`GiftRelation` 필드명이 계산 로직(Task 1, 3)과 페이지 컴포넌트(Task 2, 4)에서 동일하게 사용됨. `calcInheritanceTax`/`calcGiftTax`의 반환 필드명(`taxableValue`/`totalDeduction`/`taxBase`/`calculatedTax`/`finalTax`, `taxableValue`/`deduction`/`taxBase`/`calculatedTax`/`finalTax`)이 각 페이지의 `Row` 렌더링과 일치함.

## 다음 서브프로젝트

이 계획이 완료되면, 두 번째 서브프로젝트(청약가점 계산기 + 청약순위 계산기 + 각각의 가이드 2편, 총 4개 계산기/가이드)를 별도 브레인스토밍 사이클로 이어서 진행한다.
