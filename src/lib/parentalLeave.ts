/**
 * 육아휴직급여 계산 (2025년 개편 기준: 사후지급금 폐지, 전액 매월 지급)
 *
 * 구간별로 지급률과 상한액이 모두 다르며 하한액은 전 구간 70만원
 * - 1~3개월차: 통상임금 100%, 상한 250만원
 * - 4~6개월차: 통상임금 100%, 상한 200만원
 * - 7개월차~: 통상임금 80%, 상한 160만원 (100%가 아님에 주의)
 *
 * "6+6 부모육아휴직제"(부모 모두 사용 시 첫 6개월 특례 상한 인상)는
 * 별도 제도라 이 계산기에는 반영하지 않았습니다.
 */

const LOWER = 700_000

function monthlyRate(monthOrdinal: number): number {
  return monthOrdinal <= 6 ? 1 : 0.8
}

function monthlyCap(monthOrdinal: number): number {
  if (monthOrdinal <= 3) return 2_500_000
  if (monthOrdinal <= 6) return 2_000_000
  return 1_600_000
}

export interface ParentalLeaveInput {
  ordinaryWage: number // 월 통상임금
  leaveMonths: number // 육아휴직 개월수
}

export function calcParentalLeave(i: ParentalLeaveInput) {
  const months = Math.max(Math.round(i.leaveMonths), 0)
  const byMonth: { month: number; amount: number }[] = []
  let total = 0

  for (let m = 1; m <= months; m++) {
    const cap = monthlyCap(m)
    const amount = Math.min(Math.max(i.ordinaryWage * monthlyRate(m), LOWER), cap)
    byMonth.push({ month: m, amount })
    total += amount
  }

  const phase1 = byMonth.filter((b) => b.month <= 3).reduce((s, b) => s + b.amount, 0)
  const phase2 = byMonth.filter((b) => b.month > 3 && b.month <= 6).reduce((s, b) => s + b.amount, 0)
  const phase3 = byMonth.filter((b) => b.month > 6).reduce((s, b) => s + b.amount, 0)

  return {
    byMonth,
    phase1,
    phase2,
    phase3,
    total: Math.round(total),
    average: months > 0 ? Math.round(total / months) : 0,
    isCapped: i.ordinaryWage > monthlyCap(1),
    isFloored: i.ordinaryWage < LOWER,
  }
}
