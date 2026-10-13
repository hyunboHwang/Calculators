/**
 * 연봉 실수령액 계산 엔진 (2026년 기준)
 *
 * 근거
 * - 국민연금: 전체 9.5%, 근로자 4.75% / 기준소득월액 하한 410,000원, 상한 6,590,000원 (2026.7~2027.6)
 * - 건강보험: 전체 7.19%, 근로자 3.595%
 * - 장기요양보험: 건강보험료의 13.14% (2026)
 * - 고용보험(실업급여): 전체 1.8%, 근로자 0.9%
 * - 소득세: 소득세법 시행령 별표 2 근로소득 간이세액표 조회값(withholdingTable.ts)을 그대로 사용.
 *   월급여 1,000만원 초과분은 별표 2의 산식, 8~20세 자녀는 별표 2 주3의 공제액을 적용.
 *   연말정산 계산(yearEndTax)은 기본세율 기반 산출 함수를 따로 쓴다.
 */

import { WITHHOLDING_ROWS, WITHHOLDING_AT_10M } from './withholdingTable.ts'

export const RATES_2026 = {
  pensionEmployee: 0.0475,
  pensionFloorMonthly: 410_000,
  pensionCapMonthly: 6_590_000,
  healthEmployee: 0.03595,
  longTermCareOfHealth: 0.1314,
  employmentEmployee: 0.009,
} as const

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)
/** 10원 미만 절사 (고지·원천징수 관행) */
const floor10 = (v: number) => Math.floor(v / 10) * 10

/* ---------- 4대보험 (근로자 부담, 월) ---------- */

export function insurances(monthlyTaxable: number) {
  if (monthlyTaxable <= 0) {
    return { pension: 0, health: 0, care: 0, employment: 0, total: 0 }
  }
  // 기준소득월액: 신고 소득월액의 천원 미만 절사 후 상·하한 적용 (국민연금법 시행령 제5조)
  const pensionBase = clamp(
    Math.floor(monthlyTaxable / 1000) * 1000,
    RATES_2026.pensionFloorMonthly,
    RATES_2026.pensionCapMonthly,
  )
  const pension = floor10(pensionBase * RATES_2026.pensionEmployee)
  const health = floor10(monthlyTaxable * RATES_2026.healthEmployee)
  const care = floor10(health * RATES_2026.longTermCareOfHealth)
  const employment = floor10(monthlyTaxable * RATES_2026.employmentEmployee)
  return {
    pension,
    health,
    care,
    employment,
    total: pension + health + care + employment,
  }
}

/* ---------- 소득세 (연말정산용 기본세율 함수 + 간이세액표 조회) ---------- */

/** 근로소득공제 (연간 총급여 기준, 한도 2,000만원) */
export function earnedIncomeDeduction(gross: number): number {
  let d: number
  if (gross <= 5_000_000) d = gross * 0.7
  else if (gross <= 15_000_000) d = 3_500_000 + (gross - 5_000_000) * 0.4
  else if (gross <= 45_000_000) d = 7_500_000 + (gross - 15_000_000) * 0.15
  else if (gross <= 100_000_000) d = 12_000_000 + (gross - 45_000_000) * 0.05
  else d = 14_750_000 + (gross - 100_000_000) * 0.02
  return Math.min(d, 20_000_000)
}

/** 소득세 기본세율 [과세표준 상한, 세율, 누진공제] */
export const BASIC_BRACKETS: [number, number, number][] = [
  [14_000_000, 0.06, 0],
  [50_000_000, 0.15, 840_000],
  [88_000_000, 0.24, 6_240_000],
  [150_000_000, 0.35, 15_360_000],
  [300_000_000, 0.38, 37_060_000],
  [500_000_000, 0.4, 94_060_000],
  [1_000_000_000, 0.42, 174_060_000],
  [Infinity, 0.45, 384_060_000],
]

/** 기본세율 (2026 과세표준 구간) */
export function basicTax(taxBase: number): number {
  if (taxBase <= 0) return 0
  const brackets = BASIC_BRACKETS
  let prev = 0
  for (const [limit, rate, acc] of brackets) {
    if (taxBase <= limit) return acc + (taxBase - prev) * rate
    prev = limit
  }
  return 0
}

/** 근로소득세액공제 (한도: 총급여 구간별) */
export function earnedIncomeTaxCredit(calculated: number, gross: number): number {
  const credit =
    calculated <= 1_300_000
      ? calculated * 0.55
      : 715_000 + (calculated - 1_300_000) * 0.3
  let cap: number
  if (gross <= 33_000_000) cap = 740_000
  else if (gross <= 70_000_000) cap = Math.max(740_000 - (gross - 33_000_000) * 0.008, 660_000)
  else if (gross <= 120_000_000) cap = Math.max(660_000 - (gross - 70_000_000) * 0.5, 500_000)
  else cap = Math.max(500_000 - (gross - 120_000_000) * 0.5, 200_000)
  return Math.min(credit, cap)
}

/** 자녀세액공제 (8세 이상 20세 이하, 연간): 1명 25만 / 2명 55만 / 셋째부터 +40만 */
export function childTaxCredit(children: number): number {
  if (children <= 0) return 0
  if (children === 1) return 250_000
  return 550_000 + (children - 2) * 400_000
}

/** 별표 2 주3: 8세 이상 20세 이하 자녀 수별 공제액(월 세액에서 차감) */
function childWithholdingDeduction(children: number): number {
  if (children <= 0) return 0
  if (children === 1) return 20_830
  return 45_830 + (children - 2) * 33_330
}

/** 별표 2 월급여(천원 단위가 아닌 원) → 가족 수별 세액. 10원 미만 절사 */
function tableTax(monthlyTaxable: number, family: number): number {
  const k = monthlyTaxable / 1000 // 천원
  if (k < 770) return 0
  // 별표 2 주4: 11명 초과는 (11명 세액) - (10명 세액 - 11명 세액) × 초과 인원
  const col = Math.min(family, 11)
  const over = Math.max(family - 11, 0)
  const at = (c: number): number => {
    if (k < 10_000) {
      let lo = 0
      let hi = WITHHOLDING_ROWS.length - 1
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1
        if (WITHHOLDING_ROWS[mid][0] <= k) lo = mid
        else hi = mid - 1
      }
      return WITHHOLDING_ROWS[lo][c]
    }
    const base = WITHHOLDING_AT_10M[c - 1]
    const x = monthlyTaxable - 10_000_000
    if (x <= 0) return base
    if (k <= 14_000) return base + x * 0.98 * 0.35 + 25_000
    if (k <= 28_000) return base + 1_397_000 + (monthlyTaxable - 14_000_000) * 0.98 * 0.38
    if (k <= 30_000) return base + 6_610_600 + (monthlyTaxable - 28_000_000) * 0.98 * 0.4
    if (k <= 45_000) return base + 7_394_600 + (monthlyTaxable - 30_000_000) * 0.4
    if (k <= 87_000) return base + 13_394_600 + (monthlyTaxable - 45_000_000) * 0.42
    return base + 31_034_600 + (monthlyTaxable - 87_000_000) * 0.45
  }
  const t11 = at(col)
  const t = over > 0 ? t11 - (at(10) - t11) * over : t11
  return floor10(Math.max(t, 0))
}

/**
 * 월 원천징수 소득세 (소득세법 시행령 별표 2 간이세액표 조회, 원천징수비율 100% 기준)
 * @param monthlyTaxable 비과세·학자금 제외 월급여
 * @param dependents 본인 포함 공제대상 가족 수
 * @param children 8~20세 자녀 수 (dependents에 포함되어 있어야 함)
 */
export function withholdingIncomeTax(
  monthlyTaxable: number,
  dependents: number,
  children: number,
): number {
  const tax = tableTax(monthlyTaxable, Math.max(Math.floor(dependents), 1))
  return Math.max(tax - childWithholdingDeduction(children), 0)
}

/* ---------- 통합 계산 ---------- */

export interface SalaryInput {
  annualSalary: number // 연봉
  nonTaxableMonthly: number // 비과세 월액 (식대 등)
  dependents: number // 본인 포함 공제대상 가족 수
  children: number // 8~20세 자녀 수
  withholdingRatio: 80 | 100 | 120 // 원천징수 비율
}

export function calcSalary(i: SalaryInput) {
  const monthlyGross = i.annualSalary / 12
  const monthlyTaxable = Math.max(monthlyGross - i.nonTaxableMonthly, 0)

  const ins = insurances(monthlyTaxable)

  const baseTax = withholdingIncomeTax(monthlyTaxable, i.dependents, i.children)
  const incomeTax = floor10(baseTax * (i.withholdingRatio / 100))
  const localTax = floor10(incomeTax * 0.1)

  const totalDeduction = ins.total + incomeTax + localTax
  const monthlyNet = Math.round(monthlyGross - totalDeduction)

  return {
    monthlyGross: Math.round(monthlyGross),
    monthlyTaxable: Math.round(monthlyTaxable),
    ...ins,
    incomeTax,
    localTax,
    totalDeduction,
    monthlyNet,
    annualNet: monthlyNet * 12,
    netRatio: i.annualSalary > 0 ? (monthlyNet * 12) / i.annualSalary : NaN,
  }
}

/* ---------- 연봉 실수령액표 (레퍼런스 페이지용) ---------- */

export interface SalaryTableRow {
  annualSalary: number
  monthlyGross: number
  /** 아래 4개 공제 항목은 1인 가구(부양가족 1명) 기준. 4대보험은 가구원 수와 무관해 모든 가구에 동일하게 적용됨 */
  pension: number
  health: number // 건강보험 + 장기요양보험 합산
  employment: number
  incomeTaxTotal: number // 소득세 + 지방소득세 (1인 가구 기준. 가구원 수가 늘면 공제가 커져 실제로는 이보다 작아짐)
  totalDeduction: number // 공제 합계 (1인 가구 기준)
  net: [number, number, number, number] // 1인·2인·3인·4인 가구 월 실수령액
}

/**
 * 연봉 구간별 실수령액표를 생성한다.
 * 2,000만원~1억원: 100만원 단위(81행), 1억500만원~2억원: 500만원 단위(20행).
 * 계산 가정: 비과세 0원, 8~20세 자녀 0명, 원천징수비율 100%.
 */
export function buildSalaryTable(): SalaryTableRow[] {
  const salaries: number[] = []
  for (let s = 20_000_000; s <= 100_000_000; s += 1_000_000) salaries.push(s)
  for (let s = 105_000_000; s <= 200_000_000; s += 5_000_000) salaries.push(s)

  return salaries.map((annualSalary) => {
    const calcFor = (dependents: number) =>
      calcSalary({ annualSalary, nonTaxableMonthly: 0, dependents, children: 0, withholdingRatio: 100 })
    const base = calcFor(1)
    const net: [number, number, number, number] = [
      base.monthlyNet,
      calcFor(2).monthlyNet,
      calcFor(3).monthlyNet,
      calcFor(4).monthlyNet,
    ]
    return {
      annualSalary,
      monthlyGross: base.monthlyGross,
      pension: base.pension,
      health: base.health + base.care,
      employment: base.employment,
      incomeTaxTotal: base.incomeTax + base.localTax,
      totalDeduction: base.totalDeduction,
      net,
    }
  })
}

// 타입 전용 import 유지 필수 — postbuild.mjs가 이 파일을 Node 타입 스트리핑으로 직접
// import하므로, 값 import로 바뀌면 React 컴포넌트 파일을 Node가 로드하려다 빌드가 깨진다.
import type { Verdict } from '../components/VerdictBanner'

/** 동일 연봉을 표준조건(비과세 0원·부양가족 1명·동일 원천징수 비율)으로 계산한 실수령률과 비교한다. */
export function getSalaryVerdict(
  input: SalaryInput,
  result: ReturnType<typeof calcSalary>,
): Verdict | null {
  if (!Number.isFinite(result.netRatio) || result.netRatio < 0 || result.netRatio > 1) return null

  // withholdingRatio는 사용자가 선택한 값 그대로 유지한다.
  // 표준조건 비교는 비과세 항목·부양가족 수 차이만 격리해서 보기 위한 것이므로,
  // 원천징수 비율까지 100으로 고정하면 그 선택 자체가 diff에 섞여 들어가 버린다.
  const baseline = calcSalary({
    annualSalary: input.annualSalary,
    nonTaxableMonthly: 0,
    dependents: 1,
    children: 0,
    withholdingRatio: input.withholdingRatio,
  })
  if (!Number.isFinite(baseline.netRatio) || baseline.netRatio < 0 || baseline.netRatio > 1) return null

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
