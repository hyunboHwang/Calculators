/**
 * 예금·적금 이자 계산
 *
 * 예금(거치식): 단리 = 원금 × 연이율 × 개월/12, 월복리 = 원금 × (1+연이율/12)^개월 − 원금
 * 적금(적립식, 단리 후취): 세전이자 = 월납입액 × 개월×(개월+1)/2 × (연이율/12)
 *   → 매월 납입분이 만기까지 남은 개월수만큼 단리로 이자가 붙는 방식(은행 표준 산식)
 * 이자소득세: 일반과세 15.4%, 세금우대 9.5%, 비과세 0%
 */

export type TaxOption = 'general' | 'preferential' | 'exempt'

export const TAX_RATES: Record<TaxOption, number> = {
  general: 0.154,
  preferential: 0.095,
  exempt: 0,
}

export interface DepositInput {
  mode: 'deposit' | 'savings' // 예금(거치식) / 적금(적립식)
  amount: number // 예금 원금 또는 적금 월납입액
  annualRate: number // 연이율 (%)
  months: number
  compound: boolean // 예금 전용: 월복리 여부 (적금은 항상 단리 후취)
  taxOption: TaxOption
}

export function calcDeposit(i: DepositInput) {
  const rate = i.annualRate / 100
  const principal = i.mode === 'deposit' ? i.amount : i.amount * i.months

  let preTaxInterest: number
  if (i.mode === 'deposit') {
    preTaxInterest = i.compound
      ? i.amount * ((1 + rate / 12) ** i.months - 1)
      : i.amount * rate * (i.months / 12)
  } else {
    preTaxInterest = i.amount * ((i.months * (i.months + 1)) / 2) * (rate / 12)
  }

  const taxRate = TAX_RATES[i.taxOption]
  const tax = preTaxInterest * taxRate
  const postTaxInterest = preTaxInterest - tax
  const maturityAmount = principal + postTaxInterest

  // 세후 실질 연이율 (단리 환산, 원금 대비)
  const effectiveAnnualRate =
    principal > 0 && i.months > 0 ? (postTaxInterest / principal) * (12 / i.months) * 100 : 0

  return {
    principal: Math.round(principal),
    preTaxInterest: Math.round(preTaxInterest),
    tax: Math.round(tax),
    postTaxInterest: Math.round(postTaxInterest),
    maturityAmount: Math.round(maturityAmount),
    effectiveAnnualRate,
  }
}
