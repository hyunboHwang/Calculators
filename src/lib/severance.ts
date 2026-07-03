/**
 * 퇴직금 계산 (고용노동부 평균임금 방식)
 * 퇴직금 = 1일 평균임금 × 30일 × (재직일수 / 365)
 * 1일 평균임금 = 퇴직 전 3개월 임금 총액 / 그 3개월의 총 일수
 * 3개월 임금 총액 = 3개월 급여 + 연간 상여 × 3/12 + 연차수당 × 3/12
 */
export interface SeveranceInput {
  joinDate: string // YYYY-MM-DD
  leaveDate: string // YYYY-MM-DD (마지막 근무일)
  monthlySalary: number // 최근 3개월 월 급여 (기본급+수당, 동일 가정)
  annualBonus: number // 연간 상여금 총액
  annualLeavePay: number // 퇴직 전 1년간 받은 연차수당
}

export function calcSeverance(i: SeveranceInput) {
  const join = new Date(i.joinDate)
  const leave = new Date(i.leaveDate)
  if (Number.isNaN(join.getTime()) || Number.isNaN(leave.getTime())) {
    return { valid: false as const }
  }

  // 재직일수: 입사일 ~ 마지막 근무일 (양 끝 포함)
  const serviceDays = Math.round((leave.getTime() - join.getTime()) / 86_400_000) + 1
  if (serviceDays <= 0) return { valid: false as const }

  const eligible = serviceDays >= 365

  // 퇴직 전 3개월의 실제 일수
  const threeMonthsAgo = new Date(leave)
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
  const periodDays = Math.round((leave.getTime() - threeMonthsAgo.getTime()) / 86_400_000)

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
  }
}
