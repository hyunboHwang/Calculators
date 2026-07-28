# 부동산/자동차/생활 계산기 7종 추가 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 부동산(취득세/재산세/종합부동산세), 자동차(자동차세/자동차 취득세), 생활(BMI/전월세 전환율) 3개 그룹, 총 7개 계산기를 기존 코드 컨벤션 그대로 추가한다.

**Architecture:** 기존 패턴 그대로 — 계산 로직은 `src/lib/<name>.ts` 순수 함수, 화면은 `src/pages/<Name>Calculator.tsx`, 라우트는 `src/routes.json`, SEO용 설명/FAQ는 `src/lib/pageContent.js`. 새 아키텍처 없음.

**Tech Stack:** React 19, TypeScript, Vite 8, Tailwind CSS v4. 기존 `Field`/`Row`/`fmt`/`fmtPct` 공용 컴포넌트(`src/components/ui.tsx`) 재사용.

## Global Constraints

- 이 프로젝트에는 단위 테스트 프레임워크가 없다 (package.json에 vitest/jest 없음, `*.test.*` 파일 없음). 이번에도 새로 추가하지 않는다 — 각 태스크의 "검증" 단계는 손으로 계산한 예시값과 브라우저 수동 확인으로 대체한다.
- 모든 계산기는 세율·공제 등을 단순화한 추정 모델이다. 페이지 하단에 반드시 amber 색상 디스클레이머 박스를 넣는다 (기존 `FreelanceTaxCalculator.tsx`, `DsrCalculator.tsx` 패턴과 동일).
- `src/routes.json`을 수정하면 이미 구성된 PostToolUse 훅이 `scripts/update-readme.mjs`를 자동 실행해 README.md의 계산기 목록을 갱신한다 — README를 손으로 고치지 않는다.
- 새 그룹 3개(`부동산`, `자동차`, `생활`)는 Task 1에서 한 번에 `GROUP_ORDER`(`src/App.tsx:46`)에 추가한다. 그룹은 해당 그룹에 속한 라우트가 하나도 없으면 자동으로 사이드바에서 필터링되므로(`src/App.tsx:47`), 미리 추가해도 Task 2~7 완료 전까지 UI에 부작용이 없다.
- 커밋은 태스크 단위로 한다 (1 태스크 = 1 커밋, 단 Task 8은 검증만 하고 커밋 없음).

---

### Task 1: 부동산 그룹 세팅 + 취득세 계산기

**Files:**
- Modify: `src/App.tsx:46` (GROUP_ORDER), `src/App.tsx` 의 `components` 맵(약 40번째 줄, `deposit` 항목 바로 아래)
- Modify: `src/routes.json` (deposit 항목 바로 뒤, about 항목 앞에 추가)
- Modify: `src/lib/pageContent.js` (deposit 항목 바로 뒤에 추가, 약 668번째 줄)
- Create: `src/lib/acquisitionTax.ts`
- Create: `src/pages/AcquisitionTaxCalculator.tsx`

**Interfaces:**
- Produces: `calcAcquisitionTax(input: AcquisitionTaxInput): { rate, acquisitionTax, localEduTax, ruralSpecialTax, total }`, type `HouseCount = 'first' | 'second' | 'thirdPlus'`
- 이후 태스크가 참조: 없음 (각 계산기는 독립적)

- [ ] **Step 1: `src/lib/acquisitionTax.ts` 작성**

```ts
/**
 * 주택 유상취득 시 취득세 추정 (개인 기준)
 * - 1주택(또는 일시적 2주택 포함) 표준세율: 6억 이하 1%, 6~9억 구간 선형 보간, 9억 초과 3%
 * - 2주택 조정대상지역 8%, 3주택 이상 비조정 8% / 조정 12%
 * - 지방교육세는 취득세액의 10%로 근사, 농특세는 전용 85㎡ 초과 시 0.2%
 * - 위택스 고시 기준 단순화 모델이며 실제 신고 세액과 다를 수 있음
 */

export type HouseCount = 'first' | 'second' | 'thirdPlus'

export interface AcquisitionTaxInput {
  price: number // 취득가액
  houseCount: HouseCount
  isAdjusted: boolean // 조정대상지역 여부
  areaOver85: boolean // 전용면적 85㎡ 초과 여부
}

function baseRate(price: number): number {
  if (price <= 600_000_000) return 1
  if (price <= 900_000_000) return (price / 100_000_000) * (2 / 3) - 3
  return 3
}

function rateFor(i: AcquisitionTaxInput): number {
  if (i.houseCount === 'first') return baseRate(i.price)
  if (i.houseCount === 'second') return i.isAdjusted ? 8 : baseRate(i.price)
  return i.isAdjusted ? 12 : 8
}

export function calcAcquisitionTax(i: AcquisitionTaxInput) {
  const rate = rateFor(i)
  const acquisitionTax = i.price * (rate / 100)
  const localEduTax = acquisitionTax * 0.1
  const ruralSpecialTax = i.areaOver85 ? i.price * 0.002 : 0
  const total = acquisitionTax + localEduTax + ruralSpecialTax

  return {
    rate,
    acquisitionTax: Math.round(acquisitionTax),
    localEduTax: Math.round(localEduTax),
    ruralSpecialTax: Math.round(ruralSpecialTax),
    total: Math.round(total),
  }
}
```

- [ ] **Step 2: 예시값으로 손 계산 검증 (테스트 프레임워크 없음 — 아래 값을 기억해두고 Step 8 브라우저 확인에 사용)**

`calcAcquisitionTax({ price: 500_000_000, houseCount: 'first', isAdjusted: false, areaOver85: false })` 기대값:
- `rate` = 1 (5억 ≤ 6억)
- `acquisitionTax` = 5,000,000
- `localEduTax` = 500,000
- `ruralSpecialTax` = 0
- `total` = 5,500,000

- [ ] **Step 3: `src/App.tsx:46`의 GROUP_ORDER 수정**

Before:
```ts
const GROUP_ORDER = ['주식', '저축', '직장인', '나이', '대출', '날짜', '셀러']
```

After:
```ts
const GROUP_ORDER = ['주식', '저축', '직장인', '나이', '대출', '날짜', '셀러', '부동산', '자동차', '생활']
```

- [ ] **Step 4: `src/App.tsx`의 `components` 맵에 항목 추가**

`deposit: lazy(() => import('./pages/DepositCalculator')),` 바로 다음 줄(About 항목 바로 앞)에 추가:

```ts
  acquisitionTax: lazy(() => import('./pages/AcquisitionTaxCalculator')),
```

- [ ] **Step 5: `src/routes.json`에 라우트 추가**

`deposit` 항목(`"id": "deposit"` 로 시작하는 객체) 바로 뒤, `about` 항목 바로 앞에 삽입:

```json
  {
    "id": "acquisitionTax",
    "path": "/acquisition-tax",
    "label": "취득세",
    "group": "부동산",
    "title": "취득세 계산기 — 주택 유상취득세, 지방교육세·농특세 포함 | 계산기",
    "description": "주택 취득가액과 보유주택수, 조정대상지역 여부로 취득세·지방교육세·농어촌특별세를 계산합니다."
  },
```

(JSON 배열 중간 삽입이므로 앞 항목의 닫는 `},` 뒤에 붙이고, 이 항목도 `},`로 끝내 다음 `about` 항목과 이어지게 한다.)

- [ ] **Step 6: `src/lib/pageContent.js`에 콘텐츠 추가**

`deposit: { ... },` 블록(약 668번째 줄) 바로 뒤에 추가:

```js
  acquisitionTax: {
    intro: [
      '주택을 유상으로 취득하면 취득가액에 세율을 곱한 취득세를 내야 합니다. 세율은 취득가액뿐 아니라 이미 보유한 주택 수와 취득하는 주택이 조정대상지역에 있는지에 따라 1%에서 최대 12%까지 크게 차이가 납니다.',
      '이 계산기는 취득세 본세에 지방교육세, 전용면적 85㎡ 초과 시 부과되는 농어촌특별세까지 더한 총 납부액을 계산합니다. 다만 일시적 2주택 특례나 생애최초 감면 등 세부 감면은 반영하지 않은 표준세율 기준 추정치입니다.',
    ],
    faqs: [
      {
        q: '조정대상지역인지 어떻게 확인하나요?',
        a: '국토교통부 또는 각 시·군·구청 홈페이지에서 조정대상지역 지정 현황을 확인할 수 있습니다. 취득 시점 기준으로 판단하므로 계약일이 아닌 잔금일 기준 지정 여부를 확인해야 합니다.',
      },
      {
        q: '일시적 2주택은 왜 1주택 세율을 적용받나요?',
        a: '이사 등의 사유로 기존 주택을 처분하기 전에 새 주택을 취득하는 경우, 일정 기간(통상 3년) 내 기존 주택을 처분하면 1주택자와 동일한 세율을 적용받을 수 있습니다. 정확한 처분 기한은 취득 시점의 조정대상지역 여부에 따라 다릅니다.',
      },
    ],
  },
```

- [ ] **Step 7: `src/pages/AcquisitionTaxCalculator.tsx` 작성**

```tsx
import { useMemo, useState } from 'react'
import { calcAcquisitionTax, type HouseCount } from '../lib/acquisitionTax'
import { Field, Row, fmt } from '../components/ui'

const HOUSE_COUNT_LABEL: Record<HouseCount, string> = {
  first: '1주택',
  second: '2주택',
  thirdPlus: '3주택 이상',
}

export default function AcquisitionTaxCalculator() {
  const [price, setPrice] = useState(500_000_000)
  const [houseCount, setHouseCount] = useState<HouseCount>('first')
  const [isAdjusted, setIsAdjusted] = useState(false)
  const [areaOver85, setAreaOver85] = useState(false)

  const r = useMemo(
    () => calcAcquisitionTax({ price, houseCount, isAdjusted, areaOver85 }),
    [price, houseCount, isAdjusted, areaOver85],
  )

  return (
    <div>
      <h1 className="text-2xl font-bold">취득세 계산기</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        주택 유상취득 시 취득세·지방교육세·농어촌특별세를 계산합니다. 보유주택수와 조정대상지역
        여부에 따라 세율이 크게 달라집니다.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">취득 정보</h2>
          <div className="space-y-4">
            <Field label="취득가액" value={price} onChange={setPrice} step={10_000_000} />

            <div>
              <span className="mb-1.5 block text-sm font-medium text-slate-700">보유주택수</span>
              <div className="flex gap-1.5">
                {(Object.keys(HOUSE_COUNT_LABEL) as HouseCount[]).map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setHouseCount(h)}
                    className={`flex-1 rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                      houseCount === h
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : 'border-slate-300 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {HOUSE_COUNT_LABEL[h]}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 rounded-xl bg-slate-50 p-3">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={isAdjusted}
                  onChange={(e) => setIsAdjusted(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
                />
                조정대상지역
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={areaOver85}
                  onChange={(e) => setAreaOver85(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
                />
                전용면적 85㎡ 초과
              </label>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-sm text-slate-500">예상 총 납부액</p>
            <p className="text-3xl font-extrabold tabular-nums text-emerald-700">
              {fmt(r.total)}원
            </p>
            <p className="mt-2 text-sm text-slate-600">적용 세율 {r.rate.toFixed(1)}%</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-base font-semibold">상세 내역</h2>
            <div className="divide-y divide-slate-100">
              <Row label="취득세" value={`${fmt(r.acquisitionTax)}원`} strong />
              <Row label="지방교육세" value={`${fmt(r.localEduTax)}원`} />
              <Row
                label="농어촌특별세"
                value={`${fmt(r.ruralSpecialTax)}원`}
                sub={areaOver85 ? undefined : '85㎡ 이하 면제'}
              />
              <Row label="합계" value={`${fmt(r.total)}원`} strong />
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800">
            <b>이 계산은 예상치입니다.</b> 일시적 2주택, 생애최초 감면, 지역별 세부 고시에 따라
            실제 세액이 달라질 수 있습니다. 정확한 세액은 위택스(wetax.go.kr)에서 확인하세요.
          </div>
        </section>
      </div>
    </div>
  )
}
```

- [ ] **Step 8: 브라우저 수동 확인**

Run: `npm run dev`

`/acquisition-tax/` 접속 → 사이드바에 "부동산" 그룹과 "취득세" 메뉴가 보이는지 확인 → 기본값(5억, 1주택, 미체크)에서 "예상 총 납부액"이 Step 2의 기대값 `5,500,000원`과 일치하는지 확인 → 조정대상지역 체크 시 세율이 즉시 바뀌는지 확인.

- [ ] **Step 9: 타입체크**

Run: `npx tsc -b --noEmit`
Expected: 에러 없음

- [ ] **Step 10: Commit**

```bash
git add src/App.tsx src/routes.json src/lib/pageContent.js src/lib/acquisitionTax.ts src/pages/AcquisitionTaxCalculator.tsx
git commit -m "feat: 취득세 계산기 추가 (부동산 그룹 신설)"
```

---

### Task 2: 재산세 계산기

**Files:**
- Create: `src/lib/propertyTax.ts`
- Create: `src/pages/PropertyTaxCalculator.tsx`
- Modify: `src/routes.json` (acquisitionTax 항목 뒤에 추가)
- Modify: `src/lib/pageContent.js` (acquisitionTax 항목 뒤에 추가)
- Modify: `src/App.tsx` 의 `components` 맵 (acquisitionTax 항목 뒤에 추가)

**Interfaces:**
- Produces: `calcPropertyTax(input: PropertyTaxInput): { useSpecial, taxBase, propertyTax, urbanTax, localEduTax, total }`
- Consumes: 없음 (Task 1과 독립)

- [ ] **Step 1: `src/lib/propertyTax.ts` 작성**

```ts
/**
 * 주택 재산세 추정 — 공시가격 기준
 * - 공정시장가액비율: 일반 60%, 1세대1주택 특례(공시 9억 이하) 45%
 * - 과세표준 누진세율 4구간 + 도시지역분(0.14%) + 지방교육세(재산세 본세의 20%)
 * - 위택스 고시 기준 단순화 모델이며 실제 고지 세액과 다를 수 있음
 */

interface Bracket {
  limit: number
  rate: number
  deduction: number
}

const GENERAL_BRACKETS: Bracket[] = [
  { limit: 60_000_000, rate: 0.001, deduction: 0 },
  { limit: 150_000_000, rate: 0.0015, deduction: 30_000 },
  { limit: 300_000_000, rate: 0.0025, deduction: 180_000 },
  { limit: Infinity, rate: 0.004, deduction: 630_000 },
]

const SPECIAL_BRACKETS: Bracket[] = [
  { limit: 60_000_000, rate: 0.0005, deduction: 0 },
  { limit: 150_000_000, rate: 0.001, deduction: 30_000 },
  { limit: 300_000_000, rate: 0.002, deduction: 180_000 },
  { limit: Infinity, rate: 0.0035, deduction: 630_000 },
]

function progressiveTax(base: number, brackets: Bracket[]): number {
  const bracket = brackets.find((b) => base <= b.limit) ?? brackets[brackets.length - 1]
  return Math.max(base * bracket.rate - bracket.deduction, 0)
}

export interface PropertyTaxInput {
  publicPrice: number // 공시가격
  isSingleHouse: boolean // 1세대1주택 여부
}

export function calcPropertyTax(i: PropertyTaxInput) {
  const useSpecial = i.isSingleHouse && i.publicPrice <= 900_000_000
  const ratio = useSpecial ? 0.45 : 0.6
  const taxBase = i.publicPrice * ratio
  const propertyTax = progressiveTax(taxBase, useSpecial ? SPECIAL_BRACKETS : GENERAL_BRACKETS)
  const urbanTax = taxBase * 0.0014
  const localEduTax = propertyTax * 0.2
  const total = propertyTax + urbanTax + localEduTax

  return {
    useSpecial,
    taxBase: Math.round(taxBase),
    propertyTax: Math.round(propertyTax),
    urbanTax: Math.round(urbanTax),
    localEduTax: Math.round(localEduTax),
    total: Math.round(total),
  }
}
```

- [ ] **Step 2: 예시값 검증**

`calcPropertyTax({ publicPrice: 500_000_000, isSingleHouse: true })` 기대값:
- `useSpecial` = true
- `taxBase` = 225,000,000
- `propertyTax` = 270,000
- `urbanTax` = 315,000
- `localEduTax` = 54,000
- `total` = 639,000

- [ ] **Step 3: `src/routes.json`에 라우트 추가**

`acquisitionTax` 항목 바로 뒤에 삽입:

```json
  {
    "id": "propertyTax",
    "path": "/property-tax",
    "label": "재산세",
    "group": "부동산",
    "title": "재산세 계산기 — 공시가격 기준, 1주택 특례세율 반영 | 계산기",
    "description": "공시가격으로 재산세와 도시지역분, 지방교육세를 계산합니다. 1세대1주택자 특례세율도 반영합니다."
  },
```

- [ ] **Step 4: `src/lib/pageContent.js`에 콘텐츠 추가**

`acquisitionTax: { ... },` 블록 바로 뒤에 추가:

```js
  propertyTax: {
    intro: [
      '재산세는 매년 6월 1일 기준 주택을 보유한 사람에게 공시가격을 기준으로 부과됩니다. 공시가격에 공정시장가액비율을 곱한 과세표준에 누진세율을 적용하고, 여기에 도시지역분과 지방교육세가 추가됩니다.',
      '1세대1주택자는 공시가격 9억원 이하 주택에 한해 공정시장가액비율과 세율이 모두 낮은 특례를 적용받아 일반세율 대비 세부담이 줄어듭니다.',
    ],
    faqs: [
      {
        q: '재산세는 언제, 몇 번에 나눠 내나요?',
        a: '주택 재산세는 산출세액이 20만원을 넘으면 7월과 9월에 절반씩 나눠 고지되고, 20만원 이하면 7월에 한 번에 고지됩니다.',
      },
      {
        q: '공시가격은 어디서 확인하나요?',
        a: '국토교통부 부동산공시가격 알리미(realtyprice.kr)에서 아파트·연립·단독주택의 공시가격을 조회할 수 있습니다.',
      },
    ],
  },
```

- [ ] **Step 5: `src/App.tsx`의 `components` 맵에 항목 추가**

`acquisitionTax: lazy(() => import('./pages/AcquisitionTaxCalculator')),` 바로 다음 줄에 추가:

```ts
  propertyTax: lazy(() => import('./pages/PropertyTaxCalculator')),
```

- [ ] **Step 6: `src/pages/PropertyTaxCalculator.tsx` 작성**

```tsx
import { useMemo, useState } from 'react'
import { calcPropertyTax } from '../lib/propertyTax'
import { Field, Row, fmt } from '../components/ui'

export default function PropertyTaxCalculator() {
  const [publicPrice, setPublicPrice] = useState(500_000_000)
  const [isSingleHouse, setIsSingleHouse] = useState(true)

  const r = useMemo(
    () => calcPropertyTax({ publicPrice, isSingleHouse }),
    [publicPrice, isSingleHouse],
  )

  return (
    <div>
      <h1 className="text-2xl font-bold">재산세 계산기</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        공시가격 기준으로 재산세·도시지역분·지방교육세를 계산합니다. 1세대1주택자는 공시가격
        9억원 이하일 때 특례세율이 적용됩니다.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">주택 정보</h2>
          <div className="space-y-4">
            <Field
              label="공시가격"
              value={publicPrice}
              onChange={setPublicPrice}
              step={10_000_000}
            />
            <div className="rounded-xl bg-slate-50 p-3">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={isSingleHouse}
                  onChange={(e) => setIsSingleHouse(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
                />
                1세대1주택자
              </label>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-sm text-slate-500">예상 총 납부액</p>
            <p className="text-3xl font-extrabold tabular-nums text-emerald-700">
              {fmt(r.total)}원
            </p>
            <p className="mt-2 text-sm text-slate-600">
              {r.useSpecial ? '1세대1주택 특례세율 적용' : '일반세율 적용'}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-base font-semibold">상세 내역</h2>
            <div className="divide-y divide-slate-100">
              <Row label="과세표준" value={`${fmt(r.taxBase)}원`} />
              <Row label="재산세" value={`${fmt(r.propertyTax)}원`} strong />
              <Row label="도시지역분" value={`${fmt(r.urbanTax)}원`} />
              <Row label="지방교육세" value={`${fmt(r.localEduTax)}원`} />
              <Row label="합계" value={`${fmt(r.total)}원`} strong />
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800">
            <b>이 계산은 예상치입니다.</b> 세부담 상한, 지자체별 감면 조례 등은 반영하지
            않았습니다. 정확한 세액은 위택스(wetax.go.kr) 고지서를 확인하세요.
          </div>
        </section>
      </div>
    </div>
  )
}
```

- [ ] **Step 7: 브라우저 수동 확인**

Run: `npm run dev` → `/property-tax/` 접속 → 기본값(5억, 1세대1주택 체크)에서 "예상 총 납부액"이 `639,000원`인지 확인.

- [ ] **Step 8: 타입체크**

Run: `npx tsc -b --noEmit`
Expected: 에러 없음

- [ ] **Step 9: Commit**

```bash
git add src/routes.json src/lib/pageContent.js src/App.tsx src/lib/propertyTax.ts src/pages/PropertyTaxCalculator.tsx
git commit -m "feat: 재산세 계산기 추가"
```

---

### Task 3: 종합부동산세 계산기

**Files:**
- Create: `src/lib/comprehensiveRealEstateTax.ts`
- Create: `src/pages/ComprehensiveRealEstateTaxCalculator.tsx`
- Modify: `src/routes.json` (propertyTax 항목 뒤에 추가)
- Modify: `src/lib/pageContent.js` (propertyTax 항목 뒤에 추가)
- Modify: `src/App.tsx` 의 `components` 맵 (propertyTax 항목 뒤에 추가)

**Interfaces:**
- Produces: `calcComprehensiveRealEstateTax(input: ComprehensiveRealEstateTaxInput): { taxBase, comprehensiveTax, ruralSpecialTax, total }`
- Consumes: 없음

- [ ] **Step 1: `src/lib/comprehensiveRealEstateTax.ts` 작성**

```ts
/**
 * 종합부동산세(종부세) 추정 — 개인, 다주택 중과 제외한 일반세율 기준
 * - 기본공제: 1세대1주택자 12억, 그 외 9억
 * - 공정시장가액비율 60%, 농특세(종부세의 20%) 별도
 * - 위택스 고시 기준 단순화 모델이며 세부담 상한·다주택 중과는 반영하지 않음
 */

interface Bracket {
  limit: number
  rate: number
  deduction: number
}

const BRACKETS: Bracket[] = [
  { limit: 300_000_000, rate: 0.005, deduction: 0 },
  { limit: 600_000_000, rate: 0.007, deduction: 600_000 },
  { limit: 1_200_000_000, rate: 0.01, deduction: 2_400_000 },
  { limit: 2_500_000_000, rate: 0.013, deduction: 6_000_000 },
  { limit: 5_000_000_000, rate: 0.015, deduction: 11_000_000 },
  { limit: 9_400_000_000, rate: 0.02, deduction: 36_000_000 },
  { limit: Infinity, rate: 0.027, deduction: 100_000_000 },
]

export interface ComprehensiveRealEstateTaxInput {
  totalPublicPrice: number // 공시가격 합산액
  isSingleHouse: boolean // 1세대1주택 여부
}

export function calcComprehensiveRealEstateTax(i: ComprehensiveRealEstateTaxInput) {
  const deduction = i.isSingleHouse ? 1_200_000_000 : 900_000_000
  const excess = Math.max(i.totalPublicPrice - deduction, 0)
  const taxBase = excess * 0.6
  const bracket = BRACKETS.find((b) => taxBase <= b.limit) ?? BRACKETS[BRACKETS.length - 1]
  const comprehensiveTax = Math.max(taxBase * bracket.rate - bracket.deduction, 0)
  const ruralSpecialTax = comprehensiveTax * 0.2
  const total = comprehensiveTax + ruralSpecialTax

  return {
    taxBase: Math.round(taxBase),
    comprehensiveTax: Math.round(comprehensiveTax),
    ruralSpecialTax: Math.round(ruralSpecialTax),
    total: Math.round(total),
  }
}
```

- [ ] **Step 2: 예시값 검증**

`calcComprehensiveRealEstateTax({ totalPublicPrice: 1_500_000_000, isSingleHouse: true })` 기대값:
- `taxBase` = 180,000,000
- `comprehensiveTax` = 900,000
- `ruralSpecialTax` = 180,000
- `total` = 1,080,000

- [ ] **Step 3: `src/routes.json`에 라우트 추가**

`propertyTax` 항목 바로 뒤에 삽입:

```json
  {
    "id": "comprehensiveRealEstateTax",
    "path": "/comprehensive-real-estate-tax",
    "label": "종합부동산세",
    "group": "부동산",
    "title": "종합부동산세(종부세) 계산기 — 공시가격 합산 기준 | 계산기",
    "description": "공시가격 합산액과 1세대1주택 여부로 종합부동산세와 농어촌특별세를 계산합니다."
  },
```

- [ ] **Step 4: `src/lib/pageContent.js`에 콘텐츠 추가**

`propertyTax: { ... },` 블록 바로 뒤에 추가:

```js
  comprehensiveRealEstateTax: {
    intro: [
      '종합부동산세는 매년 6월 1일 기준으로 개인이 보유한 전국 주택의 공시가격을 모두 합산해, 기본공제를 초과하는 금액에 대해 부과됩니다. 재산세와 달리 개별 주택이 아닌 인별 합산액이 과세 기준입니다.',
      '1세대1주택자는 기본공제 12억원을 적용받아 다주택자(9억원)보다 유리하며, 이 계산기는 다주택 중과세율이나 세부담 상한은 반영하지 않은 일반세율 기준 추정치를 제공합니다.',
    ],
    faqs: [
      {
        q: '재산세를 낸 주택도 종부세를 또 내나요?',
        a: '네, 다만 이중과세를 막기 위해 재산세로 낸 부분은 종부세 계산 시 일부 공제됩니다. 이 계산기는 해당 공제를 반영하지 않은 단순 추정치이므로 실제 고지세액보다 다소 높게 나올 수 있습니다.',
      },
      {
        q: '1세대1주택자 기준은 무엇인가요?',
        a: '주민등록상 세대원 전원이 국내에 1주택만 보유한 경우를 말합니다. 일시적 2주택, 상속주택 등 일부 예외는 별도 특례로 1주택자 판정을 받을 수 있어 국세청 홈택스에서 확인이 필요합니다.',
      },
    ],
  },
```

- [ ] **Step 5: `src/App.tsx`의 `components` 맵에 항목 추가**

`propertyTax: lazy(() => import('./pages/PropertyTaxCalculator')),` 바로 다음 줄에 추가:

```ts
  comprehensiveRealEstateTax: lazy(() => import('./pages/ComprehensiveRealEstateTaxCalculator')),
```

- [ ] **Step 6: `src/pages/ComprehensiveRealEstateTaxCalculator.tsx` 작성**

```tsx
import { useMemo, useState } from 'react'
import { calcComprehensiveRealEstateTax } from '../lib/comprehensiveRealEstateTax'
import { Field, Row, fmt } from '../components/ui'

export default function ComprehensiveRealEstateTaxCalculator() {
  const [totalPublicPrice, setTotalPublicPrice] = useState(1_500_000_000)
  const [isSingleHouse, setIsSingleHouse] = useState(true)

  const r = useMemo(
    () => calcComprehensiveRealEstateTax({ totalPublicPrice, isSingleHouse }),
    [totalPublicPrice, isSingleHouse],
  )

  return (
    <div>
      <h1 className="text-2xl font-bold">종합부동산세 계산기</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        인별 공시가격 합산액 기준으로 종합부동산세와 농어촌특별세를 계산합니다. 다주택
        중과세율과 세부담 상한은 반영하지 않은 일반세율 기준 추정치입니다.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">보유 주택 정보</h2>
          <div className="space-y-4">
            <Field
              label="공시가격 합산액"
              value={totalPublicPrice}
              onChange={setTotalPublicPrice}
              step={10_000_000}
              hint="본인 명의 모든 주택 공시가격 합계"
            />
            <div className="rounded-xl bg-slate-50 p-3">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={isSingleHouse}
                  onChange={(e) => setIsSingleHouse(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
                />
                1세대1주택자 (기본공제 12억)
              </label>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-sm text-slate-500">예상 총 납부액</p>
            <p className="text-3xl font-extrabold tabular-nums text-emerald-700">
              {fmt(r.total)}원
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-base font-semibold">상세 내역</h2>
            <div className="divide-y divide-slate-100">
              <Row label="과세표준" value={`${fmt(r.taxBase)}원`} />
              <Row label="종합부동산세" value={`${fmt(r.comprehensiveTax)}원`} strong />
              <Row label="농어촌특별세" value={`${fmt(r.ruralSpecialTax)}원`} />
              <Row label="합계" value={`${fmt(r.total)}원`} strong />
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800">
            <b>이 계산은 예상치입니다.</b> 3주택 이상 중과세율, 세부담 상한, 재산세 중복분
            공제는 반영하지 않았습니다. 정확한 세액은 국세청 홈택스에서 확인하세요.
          </div>
        </section>
      </div>
    </div>
  )
}
```

- [ ] **Step 7: 브라우저 수동 확인**

Run: `npm run dev` → `/comprehensive-real-estate-tax/` 접속 → 기본값(15억, 1세대1주택 체크)에서 "예상 총 납부액"이 `1,080,000원`인지 확인.

- [ ] **Step 8: 타입체크**

Run: `npx tsc -b --noEmit`
Expected: 에러 없음

- [ ] **Step 9: Commit**

```bash
git add src/routes.json src/lib/pageContent.js src/App.tsx src/lib/comprehensiveRealEstateTax.ts src/pages/ComprehensiveRealEstateTaxCalculator.tsx
git commit -m "feat: 종합부동산세 계산기 추가"
```

---

### Task 4: 자동차세 계산기

**Files:**
- Create: `src/lib/carTax.ts`
- Create: `src/pages/CarTaxCalculator.tsx`
- Modify: `src/routes.json` (comprehensiveRealEstateTax 항목 뒤에 추가)
- Modify: `src/lib/pageContent.js` (comprehensiveRealEstateTax 항목 뒤에 추가)
- Modify: `src/App.tsx` 의 `components` 맵 (comprehensiveRealEstateTax 항목 뒤에 추가)

**Interfaces:**
- Produces: `calcCarTax(input: CarTaxInput): { baseTax, depreciationPct, carTax, localEduTax, total }`
- Consumes: 없음

- [ ] **Step 1: `src/lib/carTax.ts` 작성**

```ts
/**
 * 승용차 자동차세 추정 (비영업용 기준)
 * - 배기량 cc당 세액: 1000cc 이하 80원, 1600cc 이하 140원, 초과 200원
 * - 차령 3년차부터 매년 5%p씩 감경, 최대 50%(12년차 이상)
 * - 전기차는 배기량 없이 정액 10만원
 * - 지방교육세는 자동차세의 30%. 연납 할인은 반영하지 않음
 */

export interface CarTaxInput {
  displacement: number // 배기량(cc), 전기차는 무시됨
  yearsElapsed: number // 차령(년)
  isElectric: boolean
}

function ccRate(displacement: number): number {
  if (displacement <= 1000) return 80
  if (displacement <= 1600) return 140
  return 200
}

export function calcCarTax(i: CarTaxInput) {
  if (i.isElectric) {
    const carTax = 100_000
    const localEduTax = Math.round(carTax * 0.3)
    return {
      baseTax: carTax,
      depreciationPct: 0,
      carTax,
      localEduTax,
      total: carTax + localEduTax,
    }
  }

  const baseTax = i.displacement * ccRate(i.displacement)
  const depreciationPct = i.yearsElapsed < 3 ? 0 : Math.min((i.yearsElapsed - 2) * 5, 50)
  const carTax = baseTax * (1 - depreciationPct / 100)
  const localEduTax = carTax * 0.3
  const total = carTax + localEduTax

  return {
    baseTax: Math.round(baseTax),
    depreciationPct,
    carTax: Math.round(carTax),
    localEduTax: Math.round(localEduTax),
    total: Math.round(total),
  }
}
```

- [ ] **Step 2: 예시값 검증**

`calcCarTax({ displacement: 1998, yearsElapsed: 5, isElectric: false })` 기대값:
- `baseTax` = 399,600
- `depreciationPct` = 15
- `carTax` = 339,660
- `localEduTax` = 101,898
- `total` = 441,558

- [ ] **Step 3: `src/routes.json`에 라우트 추가**

`comprehensiveRealEstateTax` 항목 바로 뒤에 삽입:

```json
  {
    "id": "carTax",
    "path": "/car-tax",
    "label": "자동차세",
    "group": "자동차",
    "title": "자동차세 계산기 — 배기량·차령별 연간 세액 | 계산기",
    "description": "배기량과 차령(경과연수)으로 비영업용 승용차의 자동차세와 지방교육세를 계산합니다."
  },
```

- [ ] **Step 4: `src/lib/pageContent.js`에 콘텐츠 추가**

`comprehensiveRealEstateTax: { ... },` 블록 바로 뒤에 추가:

```js
  carTax: {
    intro: [
      '자동차세는 배기량에 cc당 세액을 곱해 계산하며, 매년 6월과 12월에 절반씩 나눠 고지됩니다. 같은 배기량이라도 차량 등록 후 경과연수(차령)가 늘어날수록 세액이 줄어드는 경감 제도가 적용됩니다.',
      '차령 3년차부터 매년 5%포인트씩 세액이 줄어들어 12년 이상 된 차량은 최대 50%까지 경감받습니다. 전기차는 배기량이 없어 정액(10만원)이 부과됩니다.',
    ],
    faqs: [
      {
        q: '자동차세 연납하면 얼마나 할인되나요?',
        a: '1월에 1년치를 미리 납부하는 연납을 신청하면 할인율이 적용됩니다. 할인율은 매년 변경되므로 위택스(wetax.go.kr) 또는 정부24에서 신청 시점 기준 할인율을 확인하세요. 이 계산기는 연납 할인을 반영하지 않은 정기분 기준입니다.',
      },
      {
        q: '영업용 차량도 같은 세율인가요?',
        a: '아니요, 영업용(택시·렌터카 등)은 비영업용보다 낮은 별도의 cc당 세액이 적용됩니다. 이 계산기는 비영업용 승용차 기준입니다.',
      },
    ],
  },
```

- [ ] **Step 5: `src/App.tsx`의 `components` 맵에 항목 추가**

`comprehensiveRealEstateTax: lazy(() => import('./pages/ComprehensiveRealEstateTaxCalculator')),` 바로 다음 줄에 추가:

```ts
  carTax: lazy(() => import('./pages/CarTaxCalculator')),
```

- [ ] **Step 6: `src/pages/CarTaxCalculator.tsx` 작성**

```tsx
import { useMemo, useState } from 'react'
import { calcCarTax } from '../lib/carTax'
import { Field, Row, fmt } from '../components/ui'

export default function CarTaxCalculator() {
  const [displacement, setDisplacement] = useState(1998)
  const [yearsElapsed, setYearsElapsed] = useState(5)
  const [isElectric, setIsElectric] = useState(false)

  const r = useMemo(
    () => calcCarTax({ displacement, yearsElapsed, isElectric }),
    [displacement, yearsElapsed, isElectric],
  )

  return (
    <div>
      <h1 className="text-2xl font-bold">자동차세 계산기</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        배기량과 차령(경과연수)으로 비영업용 승용차의 연간 자동차세를 계산합니다. 차령 3년차부터
        매년 5%p씩, 최대 50%까지 감경됩니다.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">차량 정보</h2>
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-3">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={isElectric}
                  onChange={(e) => setIsElectric(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
                />
                전기차 (정액 10만원)
              </label>
            </div>
            {!isElectric && (
              <>
                <Field
                  label="배기량"
                  value={displacement}
                  onChange={setDisplacement}
                  suffix="cc"
                  step={100}
                />
                <Field
                  label="차령"
                  value={yearsElapsed}
                  onChange={setYearsElapsed}
                  suffix="년"
                  step={1}
                  hint="신차는 0"
                />
              </>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-sm text-slate-500">예상 연간 총액</p>
            <p className="text-3xl font-extrabold tabular-nums text-emerald-700">
              {fmt(r.total)}원
            </p>
            {r.depreciationPct > 0 && (
              <p className="mt-2 text-sm text-slate-600">경년 감경 {r.depreciationPct}% 적용</p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-base font-semibold">상세 내역</h2>
            <div className="divide-y divide-slate-100">
              <Row label="자동차세" value={`${fmt(r.carTax)}원`} strong />
              <Row label="지방교육세" value={`${fmt(r.localEduTax)}원`} />
              <Row label="합계" value={`${fmt(r.total)}원`} strong />
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800">
            <b>이 계산은 예상치입니다.</b> 연납 신청 시 받을 수 있는 할인은 반영하지
            않았습니다. 실제 고지 세액은 위택스(wetax.go.kr)에서 확인하세요.
          </div>
        </section>
      </div>
    </div>
  )
}
```

- [ ] **Step 7: 브라우저 수동 확인**

Run: `npm run dev` → `/car-tax/` 접속 → 기본값(1998cc, 5년, 전기차 미체크)에서 "예상 연간 총액"이 `441,558원`인지 확인 → 전기차 체크 시 `130,000원`(10만원+지방교육세 3만원)으로 바뀌는지 확인.

- [ ] **Step 8: 타입체크**

Run: `npx tsc -b --noEmit`
Expected: 에러 없음

- [ ] **Step 9: Commit**

```bash
git add src/routes.json src/lib/pageContent.js src/App.tsx src/lib/carTax.ts src/pages/CarTaxCalculator.tsx
git commit -m "feat: 자동차세 계산기 추가 (자동차 그룹 신설)"
```

---

### Task 5: 자동차 취득세 계산기

**Files:**
- Create: `src/lib/carAcquisitionTax.ts`
- Create: `src/pages/CarAcquisitionTaxCalculator.tsx`
- Modify: `src/routes.json` (carTax 항목 뒤에 추가)
- Modify: `src/lib/pageContent.js` (carTax 항목 뒤에 추가)
- Modify: `src/App.tsx` 의 `components` 맵 (carTax 항목 뒤에 추가)

**Interfaces:**
- Produces: `calcCarAcquisitionTax(input: CarAcquisitionTaxInput): { rate, tax }`, type `VehicleType = 'nonBusiness' | 'business' | 'lightCar'`
- Consumes: 없음

- [ ] **Step 1: `src/lib/carAcquisitionTax.ts` 작성**

```ts
/**
 * 자동차 취득세 추정
 * - 비영업용 승용 7%, 영업용 4%, 경차 4%
 * - 경차 감면 한도 등 세부 감면은 반영하지 않음
 */

export type VehicleType = 'nonBusiness' | 'business' | 'lightCar'

const RATES: Record<VehicleType, number> = {
  nonBusiness: 7,
  business: 4,
  lightCar: 4,
}

export interface CarAcquisitionTaxInput {
  price: number // 차량가액
  vehicleType: VehicleType
}

export function calcCarAcquisitionTax(i: CarAcquisitionTaxInput) {
  const rate = RATES[i.vehicleType]
  const tax = i.price * (rate / 100)
  return { rate, tax: Math.round(tax) }
}
```

- [ ] **Step 2: 예시값 검증**

`calcCarAcquisitionTax({ price: 30_000_000, vehicleType: 'nonBusiness' })` 기대값:
- `rate` = 7
- `tax` = 2,100,000

- [ ] **Step 3: `src/routes.json`에 라우트 추가**

`carTax` 항목 바로 뒤에 삽입:

```json
  {
    "id": "carAcquisitionTax",
    "path": "/car-acquisition-tax",
    "label": "자동차 취득세",
    "group": "자동차",
    "title": "자동차 취득세 계산기 — 비영업용·경차·영업용 세율 | 계산기",
    "description": "차량가액과 차종으로 자동차 취득세를 계산합니다."
  },
```

- [ ] **Step 4: `src/lib/pageContent.js`에 콘텐츠 추가**

`carTax: { ... },` 블록 바로 뒤에 추가:

```js
  carAcquisitionTax: {
    intro: [
      '자동차를 구입하면 차량가액에 차종별 세율을 곱한 취득세를 신규 등록 시 한 번 납부합니다. 비영업용 승용차는 7%, 영업용 차량과 경차는 4%로 세율 차이가 큽니다.',
      '이 계산기는 표준세율만 반영한 추정치이며, 경차 감면 한도나 다자녀·친환경차 감면 같은 세부 감면 제도는 포함하지 않았습니다.',
    ],
    faqs: [
      {
        q: '경차는 취득세를 아예 안 내나요?',
        a: '배기량 1,000cc 미만 경차는 취득세 감면 한도(지역별로 상이, 통상 50~75만원) 내에서 취득세를 면제받을 수 있습니다. 감면 한도를 넘는 금액에 대해서만 취득세를 납부합니다. 이 계산기는 감면 전 표준세율 기준입니다.',
      },
      {
        q: '전기차도 취득세 감면이 있나요?',
        a: '친환경차(전기차·수소차)는 별도의 취득세 감면 한도가 적용됩니다. 감면 한도와 일몰 기한은 매년 바뀌므로 위택스에서 최신 기준을 확인하는 것이 정확합니다.',
      },
    ],
  },
```

- [ ] **Step 5: `src/App.tsx`의 `components` 맵에 항목 추가**

`carTax: lazy(() => import('./pages/CarTaxCalculator')),` 바로 다음 줄에 추가:

```ts
  carAcquisitionTax: lazy(() => import('./pages/CarAcquisitionTaxCalculator')),
```

- [ ] **Step 6: `src/pages/CarAcquisitionTaxCalculator.tsx` 작성**

```tsx
import { useMemo, useState } from 'react'
import { calcCarAcquisitionTax, type VehicleType } from '../lib/carAcquisitionTax'
import { Field, fmt } from '../components/ui'

const VEHICLE_TYPE_LABEL: Record<VehicleType, string> = {
  nonBusiness: '비영업용 승용',
  business: '영업용',
  lightCar: '경차',
}

export default function CarAcquisitionTaxCalculator() {
  const [price, setPrice] = useState(30_000_000)
  const [vehicleType, setVehicleType] = useState<VehicleType>('nonBusiness')

  const r = useMemo(() => calcCarAcquisitionTax({ price, vehicleType }), [price, vehicleType])

  return (
    <div>
      <h1 className="text-2xl font-bold">자동차 취득세 계산기</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        차량가액과 차종으로 자동차 취득세를 계산합니다.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">차량 정보</h2>
          <div className="space-y-4">
            <Field label="차량가액" value={price} onChange={setPrice} step={1_000_000} />
            <div>
              <span className="mb-1.5 block text-sm font-medium text-slate-700">차종</span>
              <div className="flex gap-1.5">
                {(Object.keys(VEHICLE_TYPE_LABEL) as VehicleType[]).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setVehicleType(v)}
                    className={`flex-1 rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                      vehicleType === v
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : 'border-slate-300 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {VEHICLE_TYPE_LABEL[v]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-sm text-slate-500">예상 취득세</p>
            <p className="text-3xl font-extrabold tabular-nums text-emerald-700">
              {fmt(r.tax)}원
            </p>
            <p className="mt-2 text-sm text-slate-600">적용 세율 {r.rate}%</p>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800">
            <b>이 계산은 예상치입니다.</b> 경차 감면 한도, 다자녀·친환경차 감면 등 세부 감면은
            반영하지 않았습니다. 정확한 세액은 위택스(wetax.go.kr)에서 확인하세요.
          </div>
        </section>
      </div>
    </div>
  )
}
```

- [ ] **Step 7: 브라우저 수동 확인**

Run: `npm run dev` → `/car-acquisition-tax/` 접속 → 기본값(3천만원, 비영업용 승용)에서 "예상 취득세"가 `2,100,000원`인지 확인.

- [ ] **Step 8: 타입체크**

Run: `npx tsc -b --noEmit`
Expected: 에러 없음

- [ ] **Step 9: Commit**

```bash
git add src/routes.json src/lib/pageContent.js src/App.tsx src/lib/carAcquisitionTax.ts src/pages/CarAcquisitionTaxCalculator.tsx
git commit -m "feat: 자동차 취득세 계산기 추가"
```

---

### Task 6: BMI·표준체중 계산기

**Files:**
- Create: `src/lib/bmi.ts`
- Create: `src/pages/BmiCalculator.tsx`
- Modify: `src/routes.json` (carAcquisitionTax 항목 뒤에 추가)
- Modify: `src/lib/pageContent.js` (carAcquisitionTax 항목 뒤에 추가)
- Modify: `src/App.tsx` 의 `components` 맵 (carAcquisitionTax 항목 뒤에 추가)

**Interfaces:**
- Produces: `calcBmi(input: BmiInput): { bmi, standardWeight, category, diffFromStandard }`
- Consumes: 없음

- [ ] **Step 1: `src/lib/bmi.ts` 작성**

```ts
/**
 * BMI(체질량지수) 및 표준체중 계산 — 아시아·태평양 기준 체중 구간
 */

export interface BmiInput {
  heightCm: number
  weightKg: number
}

export function calcBmi(i: BmiInput) {
  const heightM = i.heightCm / 100
  const bmi = heightM > 0 ? i.weightKg / (heightM * heightM) : NaN
  const standardWeight = heightM * heightM * 22

  const category =
    bmi < 18.5
      ? '저체중'
      : bmi < 23
        ? '정상'
        : bmi < 25
          ? '과체중'
          : bmi < 30
            ? '비만'
            : '고도비만'

  return {
    bmi,
    standardWeight: Math.round(standardWeight * 10) / 10,
    category,
    diffFromStandard: Math.round((i.weightKg - standardWeight) * 10) / 10,
  }
}
```

- [ ] **Step 2: 예시값 검증**

`calcBmi({ heightCm: 170, weightKg: 65 })` 기대값:
- `bmi` ≈ 22.49 (표시 시 `22.5`로 반올림)
- `standardWeight` = 63.6
- `category` = '정상'
- `diffFromStandard` = 1.4

- [ ] **Step 3: `src/routes.json`에 라우트 추가**

`carAcquisitionTax` 항목 바로 뒤에 삽입:

```json
  {
    "id": "bmi",
    "path": "/bmi",
    "label": "BMI·표준체중",
    "group": "생활",
    "title": "BMI 계산기 — 체질량지수, 표준체중, 비만도 | 계산기",
    "description": "키와 몸무게로 BMI, 표준체중, 비만도 구간을 계산합니다."
  },
```

- [ ] **Step 4: `src/lib/pageContent.js`에 콘텐츠 추가**

`carAcquisitionTax: { ... },` 블록 바로 뒤에 추가:

```js
  bmi: {
    intro: [
      'BMI(체질량지수)는 키와 몸무게만으로 비만도를 가늠하는 가장 널리 쓰이는 지표입니다. 몸무게(kg)를 키(m)의 제곱으로 나눠 계산하며, 대한비만학회는 아시아·태평양 지역 특성을 반영해 저체중·정상·과체중·비만·고도비만 5단계 기준을 사용합니다.',
      '표준체중은 키(m)의 제곱에 22를 곱한 값으로, BMI 22를 기준체중으로 삼아 현재 체중과 얼마나 차이 나는지 함께 보여줍니다.',
    ],
    faqs: [
      {
        q: 'BMI가 정상이면 건강한 건가요?',
        a: 'BMI는 체지방과 근육량을 구분하지 않으므로, 근육량이 많은 사람은 BMI가 높아도 체지방률은 낮을 수 있습니다. 정확한 체성분은 인바디 등 체성분 검사로 확인하는 것이 좋습니다.',
      },
      {
        q: '아시아 기준과 서구 기준이 다른가요?',
        a: '세계보건기구(WHO)의 일반 기준은 정상 범위를 18.5~24.9로 더 넓게 보지만, 대한비만학회를 포함한 아시아·태평양 기준은 23부터 과체중으로 분류해 더 엄격합니다. 이 계산기는 아시아·태평양 기준을 사용합니다.',
      },
    ],
  },
```

- [ ] **Step 5: `src/App.tsx`의 `components` 맵에 항목 추가**

`carAcquisitionTax: lazy(() => import('./pages/CarAcquisitionTaxCalculator')),` 바로 다음 줄에 추가:

```ts
  bmi: lazy(() => import('./pages/BmiCalculator')),
```

- [ ] **Step 6: `src/pages/BmiCalculator.tsx` 작성**

```tsx
import { useMemo, useState } from 'react'
import { calcBmi } from '../lib/bmi'
import { Field, Row } from '../components/ui'

const CATEGORY_STYLE: Record<string, string> = {
  저체중: 'border-sky-200 bg-sky-50 text-sky-700',
  정상: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  과체중: 'border-amber-200 bg-amber-50 text-amber-700',
  비만: 'border-orange-200 bg-orange-50 text-orange-700',
  고도비만: 'border-red-200 bg-red-50 text-red-700',
}

export default function BmiCalculator() {
  const [heightCm, setHeightCm] = useState(170)
  const [weightKg, setWeightKg] = useState(65)

  const r = useMemo(() => calcBmi({ heightCm, weightKg }), [heightCm, weightKg])

  return (
    <div>
      <h1 className="text-2xl font-bold">BMI·표준체중 계산기</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        키와 몸무게로 체질량지수(BMI)와 표준체중을 계산합니다. 대한비만학회 아시아·태평양 기준
        체중 구간을 사용합니다.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">신체 정보</h2>
          <div className="grid grid-cols-2 gap-x-3">
            <Field label="신장" value={heightCm} onChange={setHeightCm} suffix="cm" step={1} />
            <Field label="체중" value={weightKg} onChange={setWeightKg} suffix="kg" step={0.5} />
          </div>
        </section>

        <section className="space-y-4">
          <div className={`rounded-2xl border p-5 ${CATEGORY_STYLE[r.category]}`}>
            <p className="text-sm opacity-80">BMI</p>
            <p className="text-3xl font-extrabold tabular-nums">{r.bmi.toFixed(1)}</p>
            <p className="mt-2 text-sm font-semibold">{r.category}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-base font-semibold">상세</h2>
            <div className="divide-y divide-slate-100">
              <Row label="표준체중" value={`${r.standardWeight}kg`} sub="신장²×22" />
              <Row
                label="표준체중과의 차이"
                value={`${r.diffFromStandard > 0 ? '+' : ''}${r.diffFromStandard}kg`}
                negative={r.diffFromStandard > 0}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800">
            <b>이 계산은 참고용입니다.</b> BMI는 근육량·체지방률을 구분하지 않으므로 운동선수
            등은 실제 체지방률과 다르게 나올 수 있습니다.
          </div>
        </section>
      </div>
    </div>
  )
}
```

- [ ] **Step 7: 브라우저 수동 확인**

Run: `npm run dev` → `/bmi/` 접속 → 사이드바에 "생활" 그룹이 보이는지 확인 → 기본값(170cm, 65kg)에서 BMI가 `22.5`, 분류가 "정상", 표준체중이 `63.6kg`인지 확인.

- [ ] **Step 8: 타입체크**

Run: `npx tsc -b --noEmit`
Expected: 에러 없음

- [ ] **Step 9: Commit**

```bash
git add src/routes.json src/lib/pageContent.js src/App.tsx src/lib/bmi.ts src/pages/BmiCalculator.tsx
git commit -m "feat: BMI 계산기 추가 (생활 그룹 신설)"
```

---

### Task 7: 전월세 전환율 계산기

**Files:**
- Create: `src/lib/jeonseConversion.ts`
- Create: `src/pages/JeonseConversionCalculator.tsx`
- Modify: `src/routes.json` (bmi 항목 뒤에 추가)
- Modify: `src/lib/pageContent.js` (bmi 항목 뒤에 추가)
- Modify: `src/App.tsx` 의 `components` 맵 (bmi 항목 뒤에 추가)

**Interfaces:**
- Produces: `calcJeonseConversion(input: JeonseConversionInput): { depositDiff, legalCapRate, capMonthlyRent, actualRate, isOverCap }`
- Consumes: 없음

- [ ] **Step 1: `src/lib/jeonseConversion.ts` 작성**

```ts
/**
 * 전월세 전환율 계산 — 주택임대차보호법 기준 법정 상한과 실제 조건 비교
 * - 법정 전환율 상한 = min(기준금리 + 2%p, 10%)
 * - 월세 = (전세보증금 - 월세보증금) × 전환율 ÷ 12
 */

export interface JeonseConversionInput {
  jeonseDeposit: number // 순수 전세 시 보증금
  monthlyDeposit: number // 월세 전환 시 보증금
  monthlyRent: number // 실제(또는 희망) 월세
  baseRate: number // 한국은행 기준금리 %
}

export function calcJeonseConversion(i: JeonseConversionInput) {
  const depositDiff = Math.max(i.jeonseDeposit - i.monthlyDeposit, 0)
  const legalCapRate = Math.min(i.baseRate + 2, 10)
  const capMonthlyRent = (depositDiff * (legalCapRate / 100)) / 12
  const actualRate = depositDiff > 0 ? ((i.monthlyRent * 12) / depositDiff) * 100 : NaN
  const isOverCap = actualRate > legalCapRate

  return {
    depositDiff,
    legalCapRate,
    capMonthlyRent: Math.round(capMonthlyRent),
    actualRate,
    isOverCap,
  }
}
```

- [ ] **Step 2: 예시값 검증**

`calcJeonseConversion({ jeonseDeposit: 300_000_000, monthlyDeposit: 50_000_000, monthlyRent: 1_000_000, baseRate: 3.5 })` 기대값:
- `depositDiff` = 250,000,000
- `legalCapRate` = 5.5
- `capMonthlyRent` = 1,145,833
- `actualRate` = 4.8
- `isOverCap` = false

- [ ] **Step 3: `src/routes.json`에 라우트 추가**

`bmi` 항목 바로 뒤에 삽입:

```json
  {
    "id": "jeonseConversion",
    "path": "/jeonse-conversion",
    "label": "전월세 전환율",
    "group": "생활",
    "title": "전월세 전환율 계산기 — 법정 상한 대비 확인 | 계산기",
    "description": "전세보증금과 월세 전환 조건을 비교해 법정 전환율 상한을 넘는지 확인합니다."
  },
```

- [ ] **Step 4: `src/lib/pageContent.js`에 콘텐츠 추가**

`bmi: { ... },` 블록 바로 뒤에 추가:

```js
  jeonseConversion: {
    intro: [
      '전세를 월세나 반전세로 바꿀 때는 줄어드는 보증금만큼을 월세로 환산하는데, 이때 적용하는 비율이 전월세 전환율입니다. 주택임대차보호법은 계약갱신 시 전환율 상한을 한국은행 기준금리+2%p와 연 10% 중 낮은 값으로 제한합니다.',
      '이 계산기는 보증금 차액과 기준금리를 입력하면 법정 상한 기준 월세를 계산하고, 실제(또는 협의 중인) 월세와 비교해 상한을 넘는지 알려줍니다.',
    ],
    faqs: [
      {
        q: '법정 상한은 신규 계약에도 적용되나요?',
        a: '아니요. 법정 전환율 상한은 기존 임차인의 계약을 갱신할 때 보증금을 월세로 전환하는 경우에만 적용됩니다. 신규 계약의 전월세 조건은 임대인과 임차인이 자유롭게 협의해서 정합니다.',
      },
      {
        q: '기준금리는 어디서 확인하나요?',
        a: '한국은행 기준금리는 한국은행 홈페이지(bok.or.kr)의 통화정책 방향 발표 자료에서 확인할 수 있습니다. 기준금리가 바뀌면 법정 상한도 함께 바뀝니다.',
      },
    ],
  },
```

- [ ] **Step 5: `src/App.tsx`의 `components` 맵에 항목 추가**

`bmi: lazy(() => import('./pages/BmiCalculator')),` 바로 다음 줄에 추가:

```ts
  jeonseConversion: lazy(() => import('./pages/JeonseConversionCalculator')),
```

- [ ] **Step 6: `src/pages/JeonseConversionCalculator.tsx` 작성**

```tsx
import { useMemo, useState } from 'react'
import { calcJeonseConversion } from '../lib/jeonseConversion'
import { Field, Row, fmt, fmtPct } from '../components/ui'

export default function JeonseConversionCalculator() {
  const [jeonseDeposit, setJeonseDeposit] = useState(300_000_000)
  const [monthlyDeposit, setMonthlyDeposit] = useState(50_000_000)
  const [monthlyRent, setMonthlyRent] = useState(1_000_000)
  const [baseRate, setBaseRate] = useState(3.5)

  const r = useMemo(
    () => calcJeonseConversion({ jeonseDeposit, monthlyDeposit, monthlyRent, baseRate }),
    [jeonseDeposit, monthlyDeposit, monthlyRent, baseRate],
  )

  return (
    <div>
      <h1 className="text-2xl font-bold">전월세 전환율 계산기</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        전세보증금과 월세 전환 조건을 비교해 법정 전환율 상한을 넘는지 확인합니다. 상한은
        한국은행 기준금리+2%p와 연 10% 중 낮은 값입니다.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">계약 조건</h2>
          <div className="space-y-4">
            <Field
              label="전세보증금"
              value={jeonseDeposit}
              onChange={setJeonseDeposit}
              step={10_000_000}
            />
            <Field
              label="월세 전환 시 보증금"
              value={monthlyDeposit}
              onChange={setMonthlyDeposit}
              step={10_000_000}
            />
            <Field label="월세" value={monthlyRent} onChange={setMonthlyRent} step={10_000} />
            <Field
              label="기준금리"
              value={baseRate}
              onChange={setBaseRate}
              suffix="%"
              step={0.1}
              hint="한국은행 기준금리"
            />
          </div>
        </section>

        <section className="space-y-4">
          <div
            className={`rounded-2xl border p-5 ${
              r.isOverCap ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'
            }`}
          >
            <p className="text-sm text-slate-500">현재 조건의 전환율</p>
            <p className="text-3xl font-extrabold tabular-nums text-slate-800">
              {fmtPct(r.actualRate)}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              법정 상한 {fmtPct(r.legalCapRate)} {r.isOverCap ? '초과' : '이내'}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-base font-semibold">상세</h2>
            <div className="divide-y divide-slate-100">
              <Row label="보증금 차액" value={`${fmt(r.depositDiff)}원`} />
              <Row label="법정 상한 기준 월세" value={`${fmt(r.capMonthlyRent)}원`} strong />
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800">
            <b>이 계산은 참고용입니다.</b> 법정 상한은 신규 계약이 아닌 계약갱신 시 증액 제한에
            적용되는 기준입니다. 신규 계약의 전월세 전환은 당사자 합의로 정해집니다.
          </div>
        </section>
      </div>
    </div>
  )
}
```

- [ ] **Step 7: 브라우저 수동 확인**

Run: `npm run dev` → `/jeonse-conversion/` 접속 → 기본값에서 "현재 조건의 전환율"이 `4.8%`, "법정 상한 5.5% 이내"로 표시되는지 확인.

- [ ] **Step 8: 타입체크**

Run: `npx tsc -b --noEmit`
Expected: 에러 없음

- [ ] **Step 9: Commit**

```bash
git add src/routes.json src/lib/pageContent.js src/App.tsx src/lib/jeonseConversion.ts src/pages/JeonseConversionCalculator.tsx
git commit -m "feat: 전월세 전환율 계산기 추가"
```

---

### Task 8: 전체 검증

**Files:** 없음 (검증 전용, 커밋 없음)

- [ ] **Step 1: 전체 빌드**

Run: `npm run build`
Expected: `tsc -b`, `vite build`, `scripts/postbuild.mjs` 모두 에러 없이 종료. 콘솔에 7개 신규 라우트(`/acquisition-tax/`, `/property-tax/`, `/comprehensive-real-estate-tax/`, `/car-tax/`, `/car-acquisition-tax/`, `/bmi/`, `/jeonse-conversion/`)의 `index.html` 생성 로그가 찍히는지 확인.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: 에러 없음 (경고만 있다면 기존 컨벤션과 비교해 새로 추가된 파일 관련 경고인지 확인)

- [ ] **Step 3: README 자동 갱신 확인**

Run: `git log --oneline -1 -- README.md` 및 `head -10 README.md`
Expected: Task 1~7에서 `routes.json`을 수정할 때마다 PostToolUse 훅이 `scripts/update-readme.mjs`를 실행했으므로, README.md의 "## 계산기 목록"이 자동으로 "(37개)"로 갱신되어 있어야 함. 만약 훅이 개발 중 비활성화되어 있었다면 수동으로 `node scripts/update-readme.mjs` 실행.

- [ ] **Step 4: 사이드바 회귀 확인**

Run: `npm run dev`

- 사이드바에 그룹 순서가 `주식 → 저축 → 직장인 → 나이 → 대출 → 날짜 → 셀러 → 부동산 → 자동차 → 생활`인지 확인
- 기존 계산기(예: `/`, `/salary/`, `/loan/`) 라우팅이 정상 동작하는지 확인 (회귀 없음)
- 새 계산기 7개 모두 사이드바 클릭으로 진입 가능한지 확인

## Self-Review 결과

- **스펙 커버리지:** 설계 문서의 부동산 3개, 자동차 2개, 생활(건강·전월세) 2개 계산기 모두 Task 1~7에 매핑됨. GROUP_ORDER 갱신(Task 1), README 자동 갱신(기존 훅 재사용, 별도 태스크 불필요), 빌드/린트 검증(Task 8) 포함.
- **플레이스홀더 스캔:** 모든 스텝에 실제 코드/명령어 포함, "TODO"/"나중에" 없음.
- **타입 일관성:** `HouseCount`, `VehicleType` 등 타입은 lib 파일에서 export하고 페이지에서 그대로 import — 함수명/필드명이 태스크 간 일치함 확인함.
