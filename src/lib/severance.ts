import type { InfoTable } from './infoTable.ts'
import { parseDate, addMonths, DAY } from './age.ts'

/**
 * 퇴직금 계산 (고용노동부 평균임금 방식) + 퇴직소득세(소득세법 제48조·제55조, 2026 시행분) 반영
 * 퇴직금 = 1일 평균임금 × 30일 × (재직일수 / 365)
 * 1일 평균임금 = 퇴직 전 3개월 임금 총액 / 그 3개월의 총 일수
 * 3개월 임금 총액 = 3개월 급여 + 연간 상여 × 3/12 + 연차수당 × 3/12
 * 퇴직소득세: 근속연수공제 → 환산급여(×12/근속연수) → 환산급여공제 → 기본세율 → ×근속연수/12, 지방소득세 10%.
 * 미반영: 2012.12.31 이전 입사분 경과규정, 퇴직연금(IRP) 이전 시 과세이연.
 */

const M = 10_000
/** 근속연수공제 (제48조): 연수 상한, 기본공제, 연당 공제, 기준연수 */
const SERVICE_DED = [
  { upTo: 5, base: 0, per: 100 * M, from: 0 },
  { upTo: 10, base: 500 * M, per: 200 * M, from: 5 },
  { upTo: 20, base: 1500 * M, per: 250 * M, from: 10 },
  { upTo: Infinity, base: 4000 * M, per: 300 * M, from: 20 },
]
/** 환산급여공제 (제48조): 구간 상한, 기본공제, 초과분 공제율, 구간 하한 */
const CONV_DED = [
  { upTo: 800 * M, base: 0, rate: 1, from: 0 },
  { upTo: 7000 * M, base: 800 * M, rate: 0.6, from: 800 * M },
  { upTo: 10000 * M, base: 4520 * M, rate: 0.55, from: 7000 * M },
  { upTo: 30000 * M, base: 6170 * M, rate: 0.45, from: 10000 * M },
  { upTo: Infinity, base: 15170 * M, rate: 0.35, from: 30000 * M },
]
/** 소득세 기본세율 (제55조): 과세표준 상한, 세율, 누진공제 */
const RATES = [
  { upTo: 1400 * M, rate: 0.06, ded: 0 },
  { upTo: 5000 * M, rate: 0.15, ded: 126 * M },
  { upTo: 8800 * M, rate: 0.24, ded: 576 * M },
  { upTo: 15000 * M, rate: 0.35, ded: 1544 * M },
  { upTo: 30000 * M, rate: 0.38, ded: 1994 * M },
  { upTo: 50000 * M, rate: 0.4, ded: 2594 * M },
  { upTo: 100000 * M, rate: 0.42, ded: 3594 * M },
  { upTo: Infinity, rate: 0.45, ded: 6594 * M },
]

export function serviceDeduction(years: number) {
  const t = SERVICE_DED.find((x) => years <= x.upTo)!
  return t.base + t.per * (years - t.from)
}
export function convertedDeduction(conv: number) {
  const t = CONV_DED.find((x) => conv <= x.upTo)!
  // 정수 연산(부동소수 오차 방지): 율은 % 정수로 곱하고 마지막에 나눗셈 절사
  return t.base + Math.floor(((conv - t.from) * Math.round(t.rate * 100)) / 100)
}

/** 퇴직소득세 (원 미만 절사). years = 1년 미만 올림한 근속연수 */
export function calcRetirementTax(amount: number, years: number) {
  const svcDed = serviceDeduction(years)
  const converted = Math.floor((Math.max(amount - svcDed, 0) * 12) / years)
  const convDed = convertedDeduction(converted)
  const base = Math.max(converted - convDed, 0)
  const r = RATES.find((x) => base <= x.upTo)!
  const convTax = Math.max(Math.floor((base * Math.round(r.rate * 100)) / 100) - r.ded, 0)
  const incomeTax = Math.floor((convTax * years) / 12)
  const localTax = Math.floor(incomeTax * 0.1)
  return {
    taxYears: years,
    serviceDed: svcDed,
    converted,
    convDed,
    base,
    incomeTax,
    localTax,
    netAmount: amount - incomeTax - localTax,
  }
}

/** 근속연수: 입사일~퇴사일(양끝 포함), 1년 미만 기간은 1년으로 올림 */
function taxYearsOf(join: Date, leave: Date) {
  const end = new Date(leave)
  end.setDate(end.getDate() + 1) // 마지막 근무일 다음날 (배타적 종료)
  let y = end.getFullYear() - join.getFullYear()
  const anniv = (n: number) => {
    const d = new Date(join)
    d.setFullYear(join.getFullYear() + n)
    return d
  }
  if (end < anniv(y)) y--
  return end > anniv(y) ? y + 1 : y
}

const won = (n: number) => (n % M === 0 ? `${(n / M).toLocaleString('ko-KR')}만원` : `${n.toLocaleString('ko-KR')}원`)
const pct = (r: number) => `${Math.round(r * 100)}%`

export function severanceTaxTables(): InfoTable[] {
  return [
    {
      title: '근속연수공제표',
      note: '소득세법 제48조 (2026년 기준). 근속연수 1년 미만은 1년으로 올림',
      headers: ['근속연수', '공제액'],
      rows: SERVICE_DED.map((t, i) => [
        i === 0 ? '5년 이하' : t.upTo === Infinity ? '20년 초과' : `${t.from}년 초과 ${t.upTo}년 이하`,
        i === 0 ? '100만원 × 근속연수' : `${won(t.base)} + ${won(t.per)} × (근속연수 − ${t.from}년)`,
      ]),
    },
    {
      title: '환산급여공제표',
      note: '소득세법 제48조 (2026년 기준). 환산급여 = (퇴직소득 − 근속연수공제) × 12 ÷ 근속연수',
      headers: ['환산급여', '공제액'],
      rows: CONV_DED.map((t, i) => [
        i === 0
          ? `${won(t.upTo)} 이하`
          : t.upTo === Infinity
            ? `${won(t.from)} 초과`
            : `${won(t.from)} 초과 ${won(t.upTo)} 이하`,
        i === 0 ? '환산급여의 100%' : `${won(t.base)} + (${won(t.from)} 초과분의 ${pct(t.rate)})`,
      ]),
    },
    {
      title: '소득세 기본세율표',
      note: '소득세법 제55조 (2026년 기준). 퇴직소득 과세표준(환산급여 − 환산급여공제)에 적용',
      headers: ['과세표준', '세율', '누진공제'],
      rows: RATES.map((t, i) => [
        i === 0
          ? `${won(t.upTo)} 이하`
          : t.upTo === Infinity
            ? `${won(RATES[i - 1].upTo)} 초과`
            : `${won(RATES[i - 1].upTo)} 초과 ${won(t.upTo)} 이하`,
        pct(t.rate),
        t.ded === 0 ? '-' : won(t.ded),
      ]),
    },
  ]
}
export interface SeveranceInput {
  joinDate: string // YYYY-MM-DD
  leaveDate: string // YYYY-MM-DD (마지막 근무일)
  monthlySalary: number // 최근 3개월 월 급여 (기본급+수당, 동일 가정)
  annualBonus: number // 연간 상여금 총액
  annualLeavePay: number // 퇴직 전 1년간 받은 연차수당
}

export function calcSeverance(i: SeveranceInput) {
  const join = parseDate(i.joinDate)
  const leave = parseDate(i.leaveDate)
  if (!join || !leave) {
    return { valid: false as const }
  }

  // 재직일수: 입사일 ~ 마지막 근무일 (양 끝 포함)
  const serviceDays = Math.round((leave.getTime() - join.getTime()) / DAY) + 1
  if (serviceDays <= 0) return { valid: false as const }

  const eligible = serviceDays >= 365

  // 퇴직 전 3개월의 실제 일수: 산정사유 발생일(마지막 근무일 다음 날) 기준 3개월 전(말일 보정)부터 마지막 근무일까지
  const retireDay = new Date(leave.getFullYear(), leave.getMonth(), leave.getDate() + 1)
  const periodDays = Math.round((retireDay.getTime() - addMonths(retireDay, -3).getTime()) / DAY)

  const threeMonthPay =
    i.monthlySalary * 3 + (i.annualBonus * 3) / 12 + (i.annualLeavePay * 3) / 12
  const avgDailyWage = periodDays > 0 ? threeMonthPay / periodDays : 0
  const amount = avgDailyWage * 30 * (serviceDays / 365)

  const years = Math.floor(serviceDays / 365)
  const remainDays = serviceDays % 365
  const months = Math.floor(remainDays / 30.44)

  return {
    valid: true as const,
    eligible,
    serviceDays,
    serviceText: `${years}년 ${months}개월 (총 ${serviceDays.toLocaleString('ko-KR')}일)`,
    avgDailyWage: Math.round(avgDailyWage),
    amount: Math.round(amount),
    tax: calcRetirementTax(Math.round(amount), taxYearsOf(join, leave)),
  }
}
