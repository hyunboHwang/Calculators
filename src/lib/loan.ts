/* 대출 공용 계산 로직 */

export type RepayType = 'equalPayment' | 'equalPrincipal' | 'bullet'

export const REPAY_LABELS: Record<RepayType, string> = {
  equalPayment: '원리금균등',
  equalPrincipal: '원금균등',
  bullet: '만기일시',
}

export interface ScheduleRow {
  month: number
  payment: number
  principal: number
  interest: number
  balance: number
}

/** 원리금균등 월 상환액 */
export function equalMonthly(principal: number, annualRatePct: number, months: number): number {
  const r = annualRatePct / 100 / 12
  if (months <= 0) return 0
  if (r === 0) return principal / months
  const k = Math.pow(1 + r, months)
  return (principal * r * k) / (k - 1)
}

/** 월 상환액으로 감당 가능한 최대 원금 (원리금균등 역산) */
export function maxPrincipal(monthly: number, annualRatePct: number, months: number): number {
  const r = annualRatePct / 100 / 12
  if (months <= 0 || monthly <= 0) return 0
  if (r === 0) return monthly * months
  const k = Math.pow(1 + r, months)
  return (monthly * (k - 1)) / (r * k)
}

/** 상환 스케줄 생성 */
export function amortize(
  principal: number,
  annualRatePct: number,
  months: number,
  type: RepayType,
) {
  const r = annualRatePct / 100 / 12
  const schedule: ScheduleRow[] = []
  let totalInterest = 0

  if (months <= 0 || principal <= 0) {
    return { schedule, totalInterest: 0, totalPayment: 0, firstPayment: 0, lastPayment: 0 }
  }

  if (type === 'equalPayment') {
    const pay = equalMonthly(principal, annualRatePct, months)
    let bal = principal
    for (let m = 1; m <= months; m++) {
      const interest = bal * r
      const prin = m === months ? bal : pay - interest // 마지막 회차 잔액 정리
      bal = Math.max(bal - prin, 0)
      totalInterest += interest
      schedule.push({ month: m, payment: prin + interest, principal: prin, interest, balance: bal })
    }
  } else if (type === 'equalPrincipal') {
    const prinFixed = principal / months
    let bal = principal
    for (let m = 1; m <= months; m++) {
      const interest = bal * r
      bal = Math.max(bal - prinFixed, 0)
      totalInterest += interest
      schedule.push({
        month: m,
        payment: prinFixed + interest,
        principal: prinFixed,
        interest,
        balance: bal,
      })
    }
  } else {
    for (let m = 1; m <= months; m++) {
      const interest = principal * r
      const isLast = m === months
      totalInterest += interest
      schedule.push({
        month: m,
        payment: interest + (isLast ? principal : 0),
        principal: isLast ? principal : 0,
        interest,
        balance: isLast ? 0 : principal,
      })
    }
  }

  return {
    schedule,
    totalInterest,
    totalPayment: principal + totalInterest,
    firstPayment: schedule[0].payment,
    lastPayment: schedule[schedule.length - 1].payment,
  }
}

/**
 * 중도상환수수료 (잔여기간 슬라이딩 방식)
 * 수수료 = 상환금액 × 수수료율 × (부과기간 − 경과기간) / 부과기간
 */
export function prepaymentFee(
  amount: number,
  feeRatePct: number,
  elapsedMonths: number,
  feePeriodMonths = 36,
): number {
  if (elapsedMonths >= feePeriodMonths) return 0
  return Math.max(
    amount * (feeRatePct / 100) * ((feePeriodMonths - elapsedMonths) / feePeriodMonths),
    0,
  )
}
