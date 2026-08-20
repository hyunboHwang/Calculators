# 결과 판정 배지(VerdictBanner) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 연봉·재산세·종합부동산세 계산기에 규칙 기반 "판정 배지"를 추가해 결과가 어느
공식 기준 구간에 속하는지 한눈에 보여준다.

**Architecture:** 판정 로직은 각 계산 lib(`salary.ts`/`propertyTax.ts`/
`comprehensiveRealEstateTax.ts`)에 순수 함수로 추가하고, 렌더링은 신규 공용 컴포넌트
`VerdictBanner`가 담당한다. 기존 DSR/마진 계산기의 검증된 배지 UI 패턴(뱃지 pill + 큰
숫자 + 설명 한 줄)을 그대로 재사용한다.

**Tech Stack:** React 19 + TypeScript, Tailwind CSS v4. 테스트 프레임워크 없음 —
`npx tsc -b --noEmit` / `npm run build` / `npm run lint`과 임시 Node 스크립트로 수동
검증한다(이 저장소의 기존 방식, Vitest 등 도입 금지).

**Spec:** `docs/superpowers/specs/2026-08-20-verdict-banner-design.md`

## Global Constraints

- 테스트 프레임워크(Vitest 등)를 새로 도입하지 않는다. 검증은 `tsc --noEmit`, `npm run
  build`, `npm run lint`, 그리고 필요시 임시 Node 스크립트(커밋하지 않음)로 한다.
- lib 파일(`src/lib/*.ts`)은 `src/components/*`에서 **런타임 값**을 import하지 않는다 —
  React 훅을 가진 `ui.tsx`의 `fmt` 같은 함수를 lib 계층으로 끌어오지 않도록, 숫자 포맷은
  lib 안에서 `toLocaleString('ko-KR')`로 직접 처리한다. `VerdictBanner.tsx`에서 `Verdict`
  타입만 `import type`으로 가져오는 것은 허용된다 — 타입 전용 import는 Node의 타입
  스트리핑 단계에서 완전히 제거되어 런타임에 해당 파일을 로드하거나 React를 끌어오지
  않는다(빈 파일을 가리켜도 무방함을 직접 확인함).
- 배지 tone별 스타일은 고정한다: `good` → `border-emerald-200 bg-emerald-50` 박스 /
  `bg-emerald-600` 배지, `neutral` → `border-slate-200 bg-slate-50` 박스 /
  `bg-slate-600` 배지, `warn` → `border-amber-200 bg-amber-50` 박스 / `bg-amber-500` 배지.
- 배지 문구는 "손해/불리/추천하지 않음" 같은 개인화된 조언 톤을 쓰지 않는다 — 특히 연봉
  배지는 표준조건보다 낮아도 "표준보다 낮음"(neutral 톤)이라고만 하고 이유(부양가족 수
  차이 등)를 설명 문구에 담백하게 적는다.
- 종합부동산세 계산기는 다주택 중과를 모델링하지 않는다(계산 엔진이 `isSingleHouse`
  boolean만 받음) — 배지도 "비과세/과세" 2단계로만 표현하고 "3주택 중과" 같은 계산 엔진에
  없는 문구를 넣지 않는다.
- 새 상태(state)나 API 호출을 추가하지 않는다 — 이미 계산된 `useMemo` 결과의 재구성이다.
- `postbuild.mjs` 프리렌더는 이번 변경과 무관하다(기존 DSR/마진 배지도 프리렌더 대상이
  아님, 그대로 유지).

---

### Task 1: VerdictBanner 컴포넌트 + 연봉 계산기 통합

**Files:**
- Create: `src/components/VerdictBanner.tsx`
- Modify: `src/lib/salary.ts` (파일 끝에 `getSalaryVerdict` 추가)
- Modify: `src/pages/SalaryCalculator.tsx:106-125` (요약 박스 바로 아래에 배지 삽입)

**Interfaces:**
- Produces: `VerdictTone` (`'good' | 'neutral' | 'warn'`), `Verdict` 인터페이스
  (`{ tone: VerdictTone; badgeLabel: string; headline: string; headlineUnit?: string;
  description: string }`), 기본 export `VerdictBanner({ verdict: Verdict })` 컴포넌트 —
  이후 Task 2·3이 그대로 재사용한다.
- Produces: `getSalaryVerdict(input: SalaryInput, result: ReturnType<typeof calcSalary>): Verdict | null`
- Consumes: 없음(첫 번째 태스크).

- [ ] **Step 1: `VerdictBanner` 컴포넌트 작성**

`src/components/VerdictBanner.tsx` 새 파일:

```tsx
export type VerdictTone = 'good' | 'neutral' | 'warn'

export interface Verdict {
  tone: VerdictTone
  badgeLabel: string
  headline: string
  headlineUnit?: string
  description: string
}

const TONE_STYLE: Record<VerdictTone, { box: string; badge: string }> = {
  good: { box: 'border-emerald-200 bg-emerald-50', badge: 'bg-emerald-600' },
  neutral: { box: 'border-slate-200 bg-slate-50', badge: 'bg-slate-600' },
  warn: { box: 'border-amber-200 bg-amber-50', badge: 'bg-amber-500' },
}

export default function VerdictBanner({ verdict }: { verdict: Verdict }) {
  const style = TONE_STYLE[verdict.tone]
  return (
    <div className={`rounded-2xl border p-5 ${style.box}`}>
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-sm font-bold whitespace-nowrap text-white ${style.badge}`}
        >
          {verdict.badgeLabel}
        </span>
        <span className="text-2xl font-extrabold tabular-nums">{verdict.headline}</span>
        {verdict.headlineUnit && (
          <span className="text-sm text-slate-500">{verdict.headlineUnit}</span>
        )}
      </div>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">{verdict.description}</p>
    </div>
  )
}
```

- [ ] **Step 2: `getSalaryVerdict` 작성**

`src/lib/salary.ts` 파일 맨 끝(203번째 줄, `buildSalaryTable` 함수 뒤)에 추가:

```ts
import type { Verdict } from '../components/VerdictBanner'

/** 동일 연봉을 표준조건(비과세 0원·부양가족 1명·원천징수 100%)으로 계산한 실수령률과 비교한다. */
export function getSalaryVerdict(
  input: SalaryInput,
  result: ReturnType<typeof calcSalary>,
): Verdict | null {
  if (!Number.isFinite(result.netRatio)) return null

  const baseline = calcSalary({
    annualSalary: input.annualSalary,
    nonTaxableMonthly: 0,
    dependents: 1,
    children: 0,
    withholdingRatio: 100,
  })
  if (!Number.isFinite(baseline.netRatio)) return null

  const netRatioPct = result.netRatio * 100
  const baselinePct = baseline.netRatio * 100
  const diff = netRatioPct - baselinePct
  const headline = `${netRatioPct.toFixed(1)}%`

  if (Math.abs(diff) < 0.5) {
    return {
      tone: 'neutral',
      badgeLabel: '표준 수준',
      headline,
      headlineUnit: '실수령률',
      description: `동일 연봉을 표준조건(비과세 0원·부양가족 1명)으로 계산한 ${baselinePct.toFixed(1)}%와 비슷한 수준입니다.`,
    }
  }
  const better = diff > 0
  return {
    tone: better ? 'good' : 'neutral',
    badgeLabel: better ? '표준보다 유리' : '표준보다 낮음',
    headline,
    headlineUnit: '실수령률',
    description: `동일 연봉 표준조건(비과세 0원·부양가족 1명) 기준 ${baselinePct.toFixed(1)}%보다 ${Math.abs(diff).toFixed(1)}%p ${better ? '높습니다' : '낮습니다'}. 비과세 항목·부양가족 수 차이 때문입니다.`,
  }
}
```

주의: `Verdict`는 `../components/VerdictBanner`에서 타입만 import한다(`import type` —
번들에 컴포넌트 코드가 섞여 들어가지 않고, lib 파일이 여전히 순수 계산 모듈로 남는다).

- [ ] **Step 3: 임시 Node 스크립트로 경계값 확인 (커밋하지 않음)**

```bash
cd /Users/hwanghyeonbo/persnal_project/calculator
cat > /tmp/verify-salary-verdict.mjs << 'EOF'
import { calcSalary, getSalaryVerdict } from './src/lib/salary.ts'

// 1) 표준조건과 동일한 입력 → "표준 수준" (neutral, diff ~0)
const input1 = { annualSalary: 40_000_000, nonTaxableMonthly: 0, dependents: 1, children: 0, withholdingRatio: 100 }
const r1 = calcSalary(input1)
console.log('case1 (표준조건 그대로):', getSalaryVerdict(input1, r1))

// 2) 비과세를 반영해 표준조건보다 실수령률이 높아지는 입력 → "표준보다 유리" (good)
const input2 = { annualSalary: 40_000_000, nonTaxableMonthly: 200_000, dependents: 1, children: 0, withholdingRatio: 100 }
const r2 = calcSalary(input2)
console.log('case2 (비과세 20만원):', getSalaryVerdict(input2, r2))

// 3) annualSalary가 0인 엣지 케이스 → null
const input3 = { annualSalary: 0, nonTaxableMonthly: 0, dependents: 1, children: 0, withholdingRatio: 100 }
const r3 = calcSalary(input3)
console.log('case3 (연봉 0원):', getSalaryVerdict(input3, r3))
EOF
node /tmp/verify-salary-verdict.mjs
```

Expected:
- case1: `tone: 'neutral'`, `badgeLabel: '표준 수준'`
- case2: `tone: 'good'`, `badgeLabel: '표준보다 유리'`
- case3: `null`

스크립트 실행 후 `/tmp/verify-salary-verdict.mjs`는 삭제한다(임시 검증용, 저장소에 커밋하지 않음).

- [ ] **Step 4: `SalaryCalculator.tsx`에 배지 삽입**

`src/pages/SalaryCalculator.tsx` 최상단 import에 추가:

```tsx
import { calcSalary, getSalaryVerdict, RATES_2026, type SalaryInput } from '../lib/salary'
import VerdictBanner from '../components/VerdictBanner'
```

(기존 `import { calcSalary, RATES_2026, type SalaryInput } from '../lib/salary'` 줄을
위와 같이 `getSalaryVerdict` 추가한 형태로 교체)

`const r = useMemo(() => calcSalary(input), [input])` 바로 다음 줄에 추가:

```tsx
  const verdict = useMemo(() => getSalaryVerdict(input, r), [input, r])
```

기존 "요약" 박스는 아래 정확히 이 내용이다(`src/pages/SalaryCalculator.tsx:109-127`):

```tsx
          {/* 요약 */}
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">월 예상 실수령액</p>
                <p className="text-3xl font-extrabold tabular-nums text-emerald-700">
                  {fmt(r.monthlyNet)}원
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500">연 예상 실수령액</p>
                <p className="text-lg font-bold tabular-nums">{fmt(r.annualNet)}원</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              연봉의 <b>{(r.netRatio * 100).toFixed(1)}%</b>를 실수령하고, 매월{' '}
              <b>{fmt(r.totalDeduction)}원</b>이 공제됩니다.
            </p>
          </div>

          {/* 공제 내역 */}
```

이 블록은 그대로 두고, `</div>`(요약 박스 닫힘, 127번째 줄)와 `{/* 공제 내역 */}`
주석 사이에 한 줄을 끼워 넣는다 — `</div>` 다음, `{/* 공제 내역 */}` 이전에:

```tsx
          {verdict && <VerdictBanner verdict={verdict} />}
```

- [ ] **Step 5: 검증**

```bash
npx tsc -b --noEmit
npm run build
npm run lint
```

세 명령 모두 에러 없이 통과해야 한다(기존 oxlint `only-export-components` 경고는
무관한 사전 존재 경고이므로 무시).

`npm run dev`로 로컬 서버를 띄우고 `/salary/` 페이지에서:
- 기본값(연봉 4천만원, 비과세 20만원, 부양가족 1명)일 때 배지가 "표준보다 유리"로
  나오는지 확인
- 비과세를 0원으로 바꾸면 배지가 "표준 수준"으로 바뀌는지 확인

- [ ] **Step 6: 커밋**

```bash
git add src/components/VerdictBanner.tsx src/lib/salary.ts src/pages/SalaryCalculator.tsx
git commit -m "feat: 연봉 실수령액 계산기에 결과 판정 배지 추가

VerdictBanner 공용 컴포넌트를 신설하고, 동일 연봉을 표준조건(비과세 0원·
부양가족 1명)으로 재계산해 실수령률을 비교하는 배지를 추가."
```

---

### Task 2: 재산세 계산기 배지 통합

**Files:**
- Modify: `src/lib/propertyTax.ts` (파일 끝에 `getPropertyTaxVerdict` 추가)
- Modify: `src/pages/PropertyTaxCalculator.tsx:46-55` (기존 요약 박스를 배지로 교체)

**Interfaces:**
- Consumes: Task 1의 `Verdict`, `VerdictTone`, 기본 export `VerdictBanner`
  (`src/components/VerdictBanner.tsx`).
- Produces: `getPropertyTaxVerdict(i: PropertyTaxInput, r: ReturnType<typeof
  calcPropertyTax>): Verdict` — 이후 태스크에서는 쓰이지 않지만 동일 패턴을 유지한다.

- [ ] **Step 1: `getPropertyTaxVerdict` 작성**

`src/lib/propertyTax.ts` 파일 끝에 추가:

```ts
import type { Verdict } from '../components/VerdictBanner'

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`

export function getPropertyTaxVerdict(
  i: PropertyTaxInput,
  r: ReturnType<typeof calcPropertyTax>,
): Verdict {
  if (r.useSpecial) {
    return {
      tone: 'good',
      badgeLabel: '1세대1주택 특례 적용',
      headline: won(r.total),
      headlineUnit: '예상 재산세',
      description:
        '공시가격 9억원 이하 1세대1주택으로 낮은 공정시장가액비율(43~45%)과 특례세율(0.05~0.35%)을 모두 적용받습니다.',
    }
  }
  if (i.isSingleHouse) {
    return {
      tone: 'neutral',
      badgeLabel: '특례세율 미적용 (9억원 초과)',
      headline: won(r.total),
      headlineUnit: '예상 재산세',
      description:
        '1세대1주택으로 공정시장가액비율(43~45%)은 낮게 적용되지만, 공시가격이 9억원을 초과해 특례세율은 적용되지 않습니다.',
    }
  }
  return {
    tone: 'warn',
    badgeLabel: '다주택 기준',
    headline: won(r.total),
    headlineUnit: '예상 재산세',
    description: '1세대1주택이 아니라 공정시장가액비율 60%와 일반세율이 적용됩니다.',
  }
}
```

- [ ] **Step 2: 임시 Node 스크립트로 3단계 경계값 확인 (커밋하지 않음)**

```bash
cd /Users/hwanghyeonbo/persnal_project/calculator
cat > /tmp/verify-property-tax-verdict.mjs << 'EOF'
import { calcPropertyTax, getPropertyTaxVerdict } from './src/lib/propertyTax.ts'

// 1) 1세대1주택, 공시가 9억원 정확히 (경계값, 이하이므로 특례 적용)
const i1 = { publicPrice: 900_000_000, isSingleHouse: true }
console.log('case1 (1주택, 9억 정확히):', getPropertyTaxVerdict(i1, calcPropertyTax(i1)).badgeLabel)

// 2) 1세대1주택, 공시가 9억원 초과
const i2 = { publicPrice: 1_000_000_000, isSingleHouse: true }
console.log('case2 (1주택, 10억):', getPropertyTaxVerdict(i2, calcPropertyTax(i2)).badgeLabel)

// 3) 다주택
const i3 = { publicPrice: 500_000_000, isSingleHouse: false }
console.log('case3 (다주택):', getPropertyTaxVerdict(i3, calcPropertyTax(i3)).badgeLabel)
EOF
node /tmp/verify-property-tax-verdict.mjs
```

Expected:
- case1: `'1세대1주택 특례 적용'`
- case2: `'특례세율 미적용 (9억원 초과)'`
- case3: `'다주택 기준'`

확인 후 `/tmp/verify-property-tax-verdict.mjs` 삭제.

- [ ] **Step 3: `PropertyTaxCalculator.tsx` 수정**

import 교체:

```tsx
import { calcPropertyTax, getPropertyTaxVerdict } from '../lib/propertyTax'
import { Field, Row, fmt } from '../components/ui'
import VerdictBanner from '../components/VerdictBanner'
```

`const r = useMemo(...)` 다음 줄에 추가:

```tsx
  const verdict = useMemo(() => getPropertyTaxVerdict({ publicPrice, isSingleHouse }, r), [publicPrice, isSingleHouse, r])
```

기존 요약 박스를 통째로 교체:

```tsx
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-sm text-slate-500">예상 총 납부액</p>
            <p className="text-3xl font-extrabold tabular-nums text-emerald-700">
              {fmt(r.total)}원
            </p>
            <p className="mt-2 text-sm text-slate-600">
              {r.useSpecial ? '1세대1주택 특례세율 적용' : '일반세율 적용'}
            </p>
          </div>
```

위 블록을 아래로 교체:

```tsx
          <VerdictBanner verdict={verdict} />
```

- [ ] **Step 4: 검증**

```bash
npx tsc -b --noEmit
npm run build
npm run lint
```

`npm run dev`로 `/property-tax/` 페이지에서 공시가격을 9억원 전후로 바꿔가며 배지
문구가 바뀌는지, "1세대1주택자" 체크를 해제하면 "다주택 기준"으로 바뀌는지 확인.

- [ ] **Step 5: 커밋**

```bash
git add src/lib/propertyTax.ts src/pages/PropertyTaxCalculator.tsx
git commit -m "feat: 재산세 계산기에 결과 판정 배지 추가

1세대1주택 특례 적용 여부(공시가 9억원 기준)와 다주택 여부에 따라
3단계 배지를 보여준다."
```

---

### Task 3: 종합부동산세 계산기 배지 통합

**Files:**
- Modify: `src/lib/comprehensiveRealEstateTax.ts` (파일 끝에
  `getComprehensiveRealEstateTaxVerdict` 추가)
- Modify: `src/pages/ComprehensiveRealEstateTaxCalculator.tsx:47-53` (기존 요약 박스를
  배지로 교체)

**Interfaces:**
- Consumes: Task 1의 `Verdict`, 기본 export `VerdictBanner`
  (`src/components/VerdictBanner.tsx`).
- Produces: `getComprehensiveRealEstateTaxVerdict(i: ComprehensiveRealEstateTaxInput, r:
  ReturnType<typeof calcComprehensiveRealEstateTax>): Verdict` — 이후 태스크 없음(이
  플랜의 마지막 태스크).

- [ ] **Step 1: `getComprehensiveRealEstateTaxVerdict` 작성**

`src/lib/comprehensiveRealEstateTax.ts` 파일 끝에 추가:

```ts
import type { Verdict } from '../components/VerdictBanner'

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`

export function getComprehensiveRealEstateTaxVerdict(
  i: ComprehensiveRealEstateTaxInput,
  r: ReturnType<typeof calcComprehensiveRealEstateTax>,
): Verdict {
  const deduction = i.isSingleHouse ? 1_200_000_000 : 900_000_000
  if (i.totalPublicPrice <= deduction) {
    return {
      tone: 'good',
      badgeLabel: '종부세 비과세 대상',
      headline: '0원',
      headlineUnit: '예상 종부세',
      description: `공시가격 합산액이 기본공제(${i.isSingleHouse ? '1세대1주택 12억원' : '9억원'}) 이하라 종합부동산세가 없습니다.`,
    }
  }
  return {
    tone: 'neutral',
    badgeLabel: '종부세 과세 대상',
    headline: won(r.total),
    headlineUnit: '예상 종부세',
    description: `공시가격 합산액이 기본공제(${i.isSingleHouse ? '1세대1주택 12억원' : '9억원'})를 초과해 과세 대상입니다.`,
  }
}
```

- [ ] **Step 2: 임시 Node 스크립트로 경계값 확인 (커밋하지 않음)**

```bash
cd /Users/hwanghyeonbo/persnal_project/calculator
cat > /tmp/verify-comprehensive-tax-verdict.mjs << 'EOF'
import { calcComprehensiveRealEstateTax, getComprehensiveRealEstateTaxVerdict } from './src/lib/comprehensiveRealEstateTax.ts'

// 1) 1세대1주택, 공시가 합산 12억원 정확히 (경계값, 이하이므로 비과세)
const i1 = { totalPublicPrice: 1_200_000_000, isSingleHouse: true }
console.log('case1 (1주택, 12억 정확히):', getComprehensiveRealEstateTaxVerdict(i1, calcComprehensiveRealEstateTax(i1)).badgeLabel)

// 2) 1세대1주택, 12억원 초과
const i2 = { totalPublicPrice: 1_500_000_000, isSingleHouse: true }
console.log('case2 (1주택, 15억):', getComprehensiveRealEstateTaxVerdict(i2, calcComprehensiveRealEstateTax(i2)).badgeLabel)

// 3) 다주택, 9억원 이하 (비과세)
const i3 = { totalPublicPrice: 800_000_000, isSingleHouse: false }
console.log('case3 (다주택, 8억):', getComprehensiveRealEstateTaxVerdict(i3, calcComprehensiveRealEstateTax(i3)).badgeLabel)
EOF
node /tmp/verify-comprehensive-tax-verdict.mjs
```

Expected:
- case1: `'종부세 비과세 대상'`
- case2: `'종부세 과세 대상'`
- case3: `'종부세 비과세 대상'`

확인 후 `/tmp/verify-comprehensive-tax-verdict.mjs` 삭제.

- [ ] **Step 3: `ComprehensiveRealEstateTaxCalculator.tsx` 수정**

import 교체:

```tsx
import { calcComprehensiveRealEstateTax, getComprehensiveRealEstateTaxVerdict } from '../lib/comprehensiveRealEstateTax'
import { Field, Row, fmt } from '../components/ui'
import VerdictBanner from '../components/VerdictBanner'
```

`const r = useMemo(...)` 다음 줄에 추가:

```tsx
  const verdict = useMemo(
    () => getComprehensiveRealEstateTaxVerdict({ totalPublicPrice, isSingleHouse }, r),
    [totalPublicPrice, isSingleHouse, r],
  )
```

기존 요약 박스를 통째로 교체:

```tsx
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-sm text-slate-500">예상 총 납부액</p>
            <p className="text-3xl font-extrabold tabular-nums text-emerald-700">
              {fmt(r.total)}원
            </p>
          </div>
```

위 블록을 아래로 교체:

```tsx
          <VerdictBanner verdict={verdict} />
```

- [ ] **Step 4: 검증**

```bash
npx tsc -b --noEmit
npm run build
npm run lint
```

`npm run dev`로 `/comprehensive-real-estate-tax/` 페이지에서 공시가격 합산액을 기본공제
전후로 바꿔가며 "비과세 대상" ↔ "과세 대상" 배지가 정확히 바뀌는지, 1세대1주택 체크를
해제하면 기본공제 기준이 9억원으로 바뀌는지 확인.

- [ ] **Step 5: 커밋**

```bash
git add src/lib/comprehensiveRealEstateTax.ts src/pages/ComprehensiveRealEstateTaxCalculator.tsx
git commit -m "feat: 종합부동산세 계산기에 결과 판정 배지 추가

공시가격 합산액이 기본공제(1세대1주택 12억원/그 외 9억원)를 넘는지에
따라 비과세/과세 2단계 배지를 보여준다. 다주택 중과는 계산 엔진이
모델링하지 않아 배지에도 반영하지 않는다."
```
