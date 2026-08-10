/**
 * 연차수당 계산 (근로기준법 60조)
 *
 * 발생 연차일수
 * - 계속근로 1년 미만: 완성된 개월마다 1일 (최대 11일, 달력 기준 만근 개월수)
 * - 계속근로 1년 이상: 15일 + 최초 1년 이후 매 2년마다 1일 가산 (한도 25일)
 *   → 15 + floor((근속연수-1)/2), 25일 한도
 *
 * 1일 통상임금 = (월 통상임금 ÷ 209시간) × 8시간
 * 연차수당 = 미사용 연차일수 × 1일 통상임금
 *
 * 근속연수·개월수는 일수 근사(서비스일수/365, /30)가 아니라 달력 기준(만 나이 계산과
 * 동일한 age.ts의 ageParts/monthsBetween)으로 계산합니다. 일수 근사 방식은 31일짜리
 * 달을 지날 때 실제보다 하루 이른 시점에 개월수가 올라가는 오차가 있었습니다.
 */

import { ageParts, monthsBetween } from './age'

export interface AnnualLeaveInput {
  joinDate: string // YYYY-MM-DD 입사일
  referenceDate: string // YYYY-MM-DD 정산 기준일(퇴사일 등)
  usedDays: number // 이미 사용한 연차일수
  ordinaryWageMonthly: number // 월 통상임금
}

export function calcAccruedDays(join: Date, ref: Date): number {
  const { years } = ageParts(join, ref)
  if (years < 1) {
    const months = monthsBetween(join, ref)
    return Math.min(months, 11)
  }
  return Math.min(15 + Math.floor((years - 1) / 2), 25)
}

export function calcAnnualLeave(i: AnnualLeaveInput) {
  const join = new Date(i.joinDate)
  const ref = new Date(i.referenceDate)
  if (Number.isNaN(join.getTime()) || Number.isNaN(ref.getTime())) {
    return { valid: false as const }
  }

  const serviceDays = Math.round((ref.getTime() - join.getTime()) / 86_400_000) + 1
  if (serviceDays <= 0) return { valid: false as const }

  const accruedDays = calcAccruedDays(join, ref)
  const unusedDays = Math.max(accruedDays - Math.max(i.usedDays, 0), 0)

  const hourlyWage = i.ordinaryWageMonthly / 209
  const dailyWage = hourlyWage * 8
  const amount = unusedDays * dailyWage

  const { years, months } = ageParts(join, ref)

  return {
    valid: true as const,
    serviceDays,
    serviceText: `${years}년 ${months}개월 (총 ${serviceDays.toLocaleString('ko-KR')}일)`,
    accruedDays,
    unusedDays,
    hourlyWage: Math.round(hourlyWage),
    dailyWage: Math.round(dailyWage),
    amount: Math.round(amount),
  }
}
