/**
 * 연차수당 계산 (근로기준법 60조)
 *
 * 발생 연차일수
 * - 계속근로 1년 미만: 1개월 개근 시 1일 (최대 11일)
 * - 계속근로 1년 이상: 15일 + 최초 1년 이후 매 2년마다 1일 가산 (한도 25일)
 *   → 15 + floor((근속연수-1)/2), 25일 한도
 *
 * 1일 통상임금 = (월 통상임금 ÷ 209시간) × 8시간
 * 연차수당 = 미사용 연차일수 × 1일 통상임금
 */

export interface AnnualLeaveInput {
  joinDate: string // YYYY-MM-DD 입사일
  referenceDate: string // YYYY-MM-DD 정산 기준일(퇴사일 등)
  usedDays: number // 이미 사용한 연차일수
  ordinaryWageMonthly: number // 월 통상임금
}

export function calcAccruedDays(serviceDays: number): number {
  const years = Math.floor(serviceDays / 365)
  if (years < 1) {
    const months = Math.floor(serviceDays / 30)
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

  const accruedDays = calcAccruedDays(serviceDays)
  const unusedDays = Math.max(accruedDays - Math.max(i.usedDays, 0), 0)

  const hourlyWage = i.ordinaryWageMonthly / 209
  const dailyWage = hourlyWage * 8
  const amount = unusedDays * dailyWage

  const years = Math.floor(serviceDays / 365)
  const months = Math.floor((serviceDays % 365) / 30.44)

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
