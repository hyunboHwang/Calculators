/**
 * 실업급여(구직급여) 계산 — 비자발적 이직(권고사직·계약만료·폐업 등) 가정
 *
 * 1일 구직급여액 = 이직 전 평균임금의 60%, 상한·하한액 적용
 * - 상한액: 68,100원/일 (2026년 고용보험법 시행령 개정, 2026.1.1 이직자부터 적용. 2025년까지는 66,000원)
 * - 하한액: 2026년 최저시급 10,320원 × 80% × 1일 소정근로시간(8시간)
 * 소정급여일수: 이직 당시 만 나이(50세 기준)와 고용보험 가입기간에 따른 표
 */

const MIN_WAGE_HOURLY_2026 = 10_320
const LOWER_DAILY_2026 = Math.round(MIN_WAGE_HOURLY_2026 * 0.8 * 8)
const UPPER_DAILY_2026 = 68_100

export const UNEMPLOYMENT_2026 = {
  upperDaily: UPPER_DAILY_2026,
  minWageHourly: MIN_WAGE_HOURLY_2026,
  lowerDaily: LOWER_DAILY_2026,
} as const

export type InsuredPeriod = '<1' | '1-3' | '3-5' | '5-10' | '10+'

/** 소정급여일수 표 [만 50세 미만, 만 50세 이상 또는 장애인] */
const BENEFIT_DAYS: Record<InsuredPeriod, [number, number]> = {
  '<1': [120, 120],
  '1-3': [150, 180],
  '3-5': [180, 210],
  '5-10': [210, 240],
  '10+': [240, 270],
}

export interface UnemploymentInput {
  monthlySalary: number // 이직 전 평균 월급여 (세전)
  insuredPeriod: InsuredPeriod
  isOlderOrDisabled: boolean // 만 50세 이상 또는 장애인 여부
}

export function calcUnemployment(i: UnemploymentInput) {
  // 3개월 총급여 ÷ 3개월 평균 일수(약 91일)로 1일 평균임금 근사
  const avgDailyWage = (i.monthlySalary * 3) / 91
  const base = avgDailyWage * 0.6
  const dailyBenefit = Math.min(
    Math.max(base, UNEMPLOYMENT_2026.lowerDaily),
    UNEMPLOYMENT_2026.upperDaily,
  )

  const days = BENEFIT_DAYS[i.insuredPeriod][i.isOlderOrDisabled ? 1 : 0]
  const totalBenefit = dailyBenefit * days
  const monthlyEquivalent = dailyBenefit * 30

  return {
    avgDailyWage: Math.round(avgDailyWage),
    dailyBenefit: Math.round(dailyBenefit),
    isCapped: base > UNEMPLOYMENT_2026.upperDaily,
    isFloored: base < UNEMPLOYMENT_2026.lowerDaily,
    days,
    totalBenefit: Math.round(totalBenefit),
    monthlyEquivalent: Math.round(monthlyEquivalent),
  }
}
