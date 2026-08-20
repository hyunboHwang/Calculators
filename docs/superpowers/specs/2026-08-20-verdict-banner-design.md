# 결과 판정 배지(VerdictBanner) 설계

## 배경

AdSense가 "가치 낮은 콘텐츠"로 반복 거절했고, 콘텐츠(글)를 더 추가하는 방식은 중단하기로 했다.
대신 계산기가 "입력 → 숫자 출력"에서 끝나지 않고 결과를 해석해주는 실질적 기능을 넣어
고유 가치를 만든다. `DsrCalculator`·`MarginCalculator`·`SubscriptionRankCalculator`에는
이미 규칙 기반 "판정" 배지(예: DSR 40% 이하 = "은행권 가능 범위")가 있다 — 이 검증된 패턴을
아직 배지가 없는 계산기로 확장한다.

YMYL(세금·대출·부동산) 특성상 배지는 **개인화된 조언이 아니라, 이미 코드로 검증된 계산
결과가 어느 공식 기준 구간에 속하는지를 보여주는 것**으로 한정한다. 계산 엔진이 실제로
모델링하지 않은 규칙(예: 종부세 다주택 중과)은 배지로 표현하지 않는다.

## 범위

이번 라운드는 3개 계산기에 배지를 추가한다: **연봉 실수령액(salary)**, **재산세
(propertyTax)**, **종합부동산세(comprehensiveRealEstateTax)**. DSR·마진·청약순위는
이미 자체 판정 배지가 있으므로 이번엔 건드리지 않는다(공용 컴포넌트로의 이전은 별도 과제).

## 아키텍처

- 판정 로직은 **각 계산 lib**(`salary.ts`, `propertyTax.ts`, `comprehensiveRealEstateTax.ts`)에
  순수 함수로 추가한다. 이미 검증된 법정 기준 상수(9억원, 12억원 등)를 그 자리에서 재사용하므로,
  나중에 기준이 바뀌어도 계산 로직과 판정 로직을 한 파일에서 함께 고칠 수 있다.
- **공용 프레젠테이션 컴포넌트** `src/components/VerdictBanner.tsx`를 신설해 배지 UI를
  통일한다. 각 페이지는 lib이 반환한 판정 객체를 이 컴포넌트로 그리기만 한다.
- 기존 DSR/마진/청약순위 페이지는 이번 범위에서 리팩터링하지 않는다(회귀 위험 최소화).

## 컴포넌트: `VerdictBanner`

```tsx
export type VerdictTone = 'good' | 'neutral' | 'warn'

export interface Verdict {
  tone: VerdictTone
  badgeLabel: string   // 배지 안 짧은 라벨, 예: "1세대1주택 특례 적용"
  headline: string     // 강조 숫자, 예: "82.1%"
  headlineUnit?: string // 숫자 옆 단위/설명, 예: "실수령률"
  description: string  // 근거를 밝히는 한 줄 설명
}

export default function VerdictBanner({ verdict }: { verdict: Verdict }): JSX.Element
```

- `tone`별 스타일(기존 DSR/마진 패턴 그대로 재사용):
  - `good`: `border-emerald-200 bg-emerald-50` / 배지 `bg-emerald-600`
  - `neutral`: `border-slate-200 bg-slate-50` / 배지 `bg-slate-600`
  - `warn`: `border-amber-200 bg-amber-50` / 배지 `bg-amber-500`
- 렌더링 구조는 기존 DSR/마진과 동일: `rounded-2xl border p-5` 박스 안에 배지 pill +
  `headline`(text-2xl~3xl font-extrabold) + `headlineUnit` + 아래 `description` 한 줄.
- `warn` tone이라도 "위험/나쁨"이 아니라 "참고용 정보"라는 톤을 유지한다 — 특히 연봉
  배지는 절대 "손해/불리"처럼 읽히지 않게 description에서 이유(부양가족 수 차이 등)를
  담백하게 설명한다.

## 계산기별 판정 로직

### 1. 연봉 실수령액 (`salary.ts`)

`calcSalary()`는 이미 `netRatio`를 반환한다(`SalaryCalculator.tsx`에서 이미 사용 중).
동일 `annualSalary`를 표준조건(`nonTaxableMonthly: 0, dependents: 1, children: 0,
withholdingRatio: 100`)으로 다시 계산해 `netRatio`를 비교한다. 외부 통계를 쓰지 않고
100% 자체 계산 엔진으로 재현 가능한 기준선이다.

```ts
export function getSalaryVerdict(input: SalaryInput, result: SalaryResult): Verdict {
  const baseline = calcSalary({
    annualSalary: input.annualSalary,
    nonTaxableMonthly: 0,
    dependents: 1,
    children: 0,
    withholdingRatio: 100,
  })
  const diff = (result.netRatio - baseline.netRatio) * 100 // %p

  if (Math.abs(diff) < 0.5) {
    return {
      tone: 'neutral',
      badgeLabel: '표준 수준',
      headline: `${(result.netRatio * 100).toFixed(1)}%`,
      headlineUnit: '실수령률',
      description: `동일 연봉을 표준조건(비과세 0원·부양가족 1명)으로 계산한 ${(baseline.netRatio * 100).toFixed(1)}%와 비슷한 수준입니다.`,
    }
  }
  const better = diff > 0
  return {
    tone: better ? 'good' : 'neutral',
    badgeLabel: better ? '표준보다 유리' : '표준보다 낮음',
    headline: `${(result.netRatio * 100).toFixed(1)}%`,
    headlineUnit: '실수령률',
    description: `동일 연봉 표준조건(비과세 0원·부양가족 1명) 기준 ${(baseline.netRatio * 100).toFixed(1)}%보다 ${Math.abs(diff).toFixed(1)}%p ${better ? '높습니다' : '낮습니다'}. 비과세 항목·부양가족 수 차이 때문입니다.`,
  }
}
```

`SalaryCalculator.tsx`가 이 함수를 호출해 `<VerdictBanner>`를 기존 "월 예상 실수령액"
요약 박스 위(또는 안)에 추가한다.

### 2. 재산세 (`propertyTax.ts`)

`calcPropertyTax()`가 이미 반환하는 `useSpecial`과 입력값 `isSingleHouse`,
`publicPrice`로 3단계를 구분한다(둘은 서로 다른 조건이라 별도 분기 필요 — 코드 주석에
이미 명시됨).

```ts
// lib 파일은 지금도 components/ 쪽을 import하지 않는 순수 계산 모듈이므로
// (React 훅을 갖고 있는 ui.tsx의 fmt를 끌어오지 않고) 숫자 포맷은 여기서 직접 처리한다.
const won = (n: number) => `${n.toLocaleString('ko-KR')}원`

export function getPropertyTaxVerdict(i: PropertyTaxInput, r: ReturnType<typeof calcPropertyTax>): Verdict {
  if (r.useSpecial) {
    return {
      tone: 'good',
      badgeLabel: '1세대1주택 특례 적용',
      headline: won(r.total),
      headlineUnit: '예상 재산세',
      description: '공시가격 9억원 이하 1세대1주택으로 낮은 공정시장가액비율(43~45%)과 특례세율(0.05~0.35%)을 모두 적용받습니다.',
    }
  }
  if (i.isSingleHouse) {
    return {
      tone: 'neutral',
      badgeLabel: '특례세율 미적용 (9억원 초과)',
      headline: won(r.total),
      headlineUnit: '예상 재산세',
      description: '1세대1주택으로 공정시장가액비율(43~45%)은 낮게 적용되지만, 공시가격이 9억원을 초과해 특례세율은 적용되지 않습니다.',
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

### 3. 종합부동산세 (`comprehensiveRealEstateTax.ts`)

이 계산기는 보유 주택 수(다주택 중과)를 입력받지 않으므로 — 코드 주석에 "다주택 중과는
반영하지 않음"이라 명시됨 — 배지는 **비과세 여부**만 정확하게 표현할 수 있는 2단계로
한정한다. 다주택 중과 자체를 계산에 반영하는 건 이번 스펙 범위 밖이다.

```ts
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

## 데이터 흐름

각 페이지의 기존 패턴 그대로: `useMemo`로 계산 결과를 구하고, 같은 `useMemo`(또는
바로 다음 줄)에서 판정 함수를 호출해 `Verdict` 객체를 얻은 뒤 `<VerdictBanner verdict={v} />`를
기존 결과 요약 박스 자리(또는 바로 위)에 삽입한다. 새 상태(state)나 API 호출은 없다 —
100% 기존에 이미 계산된 값의 재구성이다.

## 에러·엣지 케이스

- `annualSalary`가 0이거나 매우 작은 값이면 `netRatio`가 `NaN`/비정상일 수 있다 —
  기존 계산기가 이미 이런 입력을 어떻게 처리하는지 확인 후, `Verdict` 계산도 동일한
  가드를 따른다(예: 유효하지 않으면 배지 자체를 렌더링하지 않음).
- 재산세: `publicPrice`가 0이면 `useSpecial`이 `isSingleHouse`에 따라 그대로 참/거짓이
  나오므로 배지는 정상 렌더링되지만 금액이 0원 — 문제 없음.
- 종부세: `totalPublicPrice`가 공제액과 정확히 같으면(`excess === 0`) 비과세 분기로 처리됨(경계값 포함, `<=`).

## 테스트/검증 (테스트 프레임워크 없음 — 기존 세션 원칙 유지)

- `npx tsc -b --noEmit`, `npm run build`, `npm run lint` 통과 확인.
- 각 계산기에서 대표 입력값 2~3개(경계값 포함: 재산세 9억원 정확히, 종부세 공제액
  정확히)로 배지가 올바른 tier로 나오는지 수동 확인.
- 연봉: 표준조건과 동일한 입력(비과세 0, 부양가족 1)을 넣었을 때 diff가 0에 수렴해
  "표준 수준" 배지가 나오는지 확인(자기 자신과 비교 시 회귀 검증 역할).
- 프리렌더(`postbuild.mjs`)는 이 배지를 렌더링하지 않는다 — React 클라이언트 계산
  결과에 의존하는 상호작용 요소이며, 기존 DSR/마진 배지도 프리렌더에 포함되지 않는
  것과 동일한 패턴이다. SEO 텍스트 콘텐츠(`pageContent.js`)는 이번 변경과 무관하다.

## 파일

- 신규: `src/components/VerdictBanner.tsx`
- 수정: `src/lib/salary.ts` (`getSalaryVerdict` 추가)
- 수정: `src/lib/propertyTax.ts` (`getPropertyTaxVerdict` 추가)
- 수정: `src/lib/comprehensiveRealEstateTax.ts` (`getComprehensiveRealEstateTaxVerdict` 추가)
- 수정: `src/pages/SalaryCalculator.tsx`, `src/pages/PropertyTaxCalculator.tsx`,
  `src/pages/ComprehensiveRealEstateTaxCalculator.tsx` (배지 삽입)

## 범위 밖 (별도 과제로 남김)

- DSR·마진·청약순위 페이지를 `VerdictBanner`로 리팩터링하는 것.
- 종부세 계산기에 실제 다주택 중과(3주택 이상 최고 5%)를 반영하는 것 — 지금은 계산
  엔진 자체가 이를 모델링하지 않는다는 것을 확인했을 뿐, 고치는 작업은 아니다.
- 나머지 계산기(청약가점 등)로의 확장.
