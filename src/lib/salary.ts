/**
 * 연봉 실수령액 계산 엔진 (2026년 기준)
 *
 * 근거
 * - 국민연금: 전체 9.5%, 근로자 4.75% / 기준소득월액 하한 410,000원, 상한 6,590,000원 (2026.7~2027.6)
 * - 건강보험: 전체 7.19%, 근로자 3.595%
 * - 장기요양보험: 건강보험료의 13.14% (2026)
 * - 고용보험(실업급여): 전체 1.8%, 근로자 0.9%
 * - 소득세: 근로소득 간이세액표 산출방식(소득세법 시행령 별표2)에 따른 근사 계산.
 *   실제 간이세액표 조회값과 일부 구간에서 소액 차이가 날 수 있음.
 *
 * 정확도를 높이려면 국세청 간이세액표 원본 JSON을 src/data/taxTable.json 으로
 * 추가하고 lookupTable()을 연결하면 됨 (구조는 하단 주석 참고).
 */

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
  const pensionBase = clamp(
    monthlyTaxable,
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

/* ---------- 소득세: 간이세액표 산출방식 근사 ---------- */

/** 근로소득공제 (연간 총급여 기준, 한도 2,000만원) */
function earnedIncomeDeduction(gross: number): number {
  let d: number
  if (gross <= 5_000_000) d = gross * 0.7
  else if (gross <= 15_000_000) d = 3_500_000 + (gross - 5_000_000) * 0.4
  else if (gross <= 45_000_000) d = 7_500_000 + (gross - 15_000_000) * 0.15
  else if (gross <= 100_000_000) d = 12_000_000 + (gross - 45_000_000) * 0.05
  else d = 14_750_000 + (gross - 100_000_000) * 0.02
  return Math.min(d, 20_000_000)
}

/**
 * 간이세액표 방식의 "특별소득공제·특별세액공제 중 일부" 근사
 * (공제대상 가족 수 · 연간 총급여 구간별 산식)
 */
function specialDeduction(gross: number, family: number): number {
  const base = family <= 1 ? 3_100_000 : family === 2 ? 3_600_000 : 5_000_000

  let rate: number
  if (gross <= 30_000_000) rate = gross * 0.04
  else if (gross <= 45_000_000) rate = gross * 0.04 - (gross - 30_000_000) * 0.05
  else if (gross <= 70_000_000) rate = gross * 0.015
  else rate = gross * 0.005

  // 3명 이상: 총급여 4천만원 초과분의 4% 추가
  const extra =
    family >= 3 && gross > 40_000_000
      ? (Math.min(gross, 90_000_000) - 40_000_000) * 0.04
      : 0

  return Math.max(base + rate + extra, 0)
}

/** 기본세율 (2026 과세표준 구간) */
export function basicTax(taxBase: number): number {
  if (taxBase <= 0) return 0
  const brackets: [number, number, number][] = [
    [14_000_000, 0.06, 0],
    [50_000_000, 0.15, 840_000],
    [88_000_000, 0.24, 6_240_000],
    [150_000_000, 0.35, 15_360_000],
    [300_000_000, 0.38, 37_060_000],
    [500_000_000, 0.4, 94_060_000],
    [1_000_000_000, 0.42, 174_060_000],
    [Infinity, 0.45, 384_060_000],
  ]
  let prev = 0
  for (const [limit, rate, acc] of brackets) {
    if (taxBase <= limit) return acc + (taxBase - prev) * rate
    prev = limit
  }
  return 0
}

/** 근로소득세액공제 (한도: 총급여 구간별) */
function earnedIncomeTaxCredit(calculated: number, gross: number): number {
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
function childTaxCredit(children: number): number {
  if (children <= 0) return 0
  if (children === 1) return 250_000
  return 550_000 + (children - 2) * 400_000
}

/**
 * 월 원천징수 소득세 (간이세액표 산출방식 근사)
 * @param monthlyTaxable 비과세 제외 월급여
 * @param dependents 본인 포함 공제대상 가족 수
 * @param children 8~20세 자녀 수
 */
export function withholdingIncomeTax(
  monthlyTaxable: number,
  dependents: number,
  children: number,
): number {
  const gross = monthlyTaxable * 12
  const pensionAnnual =
    floor10(
      clamp(monthlyTaxable, RATES_2026.pensionFloorMonthly, RATES_2026.pensionCapMonthly) *
        RATES_2026.pensionEmployee,
    ) * 12

  const taxBase = Math.max(
    gross -
      earnedIncomeDeduction(gross) -
      Math.max(dependents, 1) * 1_500_000 -
      pensionAnnual -
      specialDeduction(gross, Math.max(dependents, 1)),
    0,
  )

  const calculated = basicTax(taxBase)
  const afterCredit = Math.max(calculated - earnedIncomeTaxCredit(calculated, gross), 0)
  const annual = Math.max(afterCredit - childTaxCredit(children), 0)
  return floor10(annual / 12)
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
