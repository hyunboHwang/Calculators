/**
 * 종합부동산세(종부세) 추정 — 개인, 다주택 중과 제외한 일반세율 기준
 * - 기본공제: 1세대1주택자 12억, 그 외 9억
 * - 공정시장가액비율 60%, 농특세(종부세의 20%) 별도
 * - 홈택스 고시 기준 단순화 모델이며 세부담 상한·다주택 중과는 반영하지 않음
 * - 1세대1주택자 중 고령자(만 60세 이상)·장기보유자(5년 이상)는 세액공제(최대 80%)로
 *   실제 부담이 크게 줄어들 수 있으나, 이 계산기는 해당 공제를 반영하지 않음
 */

interface Bracket {
  limit: number
  rate: number
  deduction: number
}

const BRACKETS: Bracket[] = [
  { limit: 300_000_000, rate: 0.005, deduction: 0 },
  { limit: 600_000_000, rate: 0.007, deduction: 600_000 },
  { limit: 1_200_000_000, rate: 0.01, deduction: 2_400_000 },
  { limit: 2_500_000_000, rate: 0.013, deduction: 6_000_000 },
  { limit: 5_000_000_000, rate: 0.015, deduction: 11_000_000 },
  { limit: 9_400_000_000, rate: 0.02, deduction: 36_000_000 },
  { limit: Infinity, rate: 0.027, deduction: 101_800_000 },
]

export interface ComprehensiveRealEstateTaxInput {
  totalPublicPrice: number // 공시가격 합산액
  isSingleHouse: boolean // 1세대1주택 여부
}

export function calcComprehensiveRealEstateTax(i: ComprehensiveRealEstateTaxInput) {
  const deduction = i.isSingleHouse ? 1_200_000_000 : 900_000_000
  const excess = Math.max(i.totalPublicPrice - deduction, 0)
  const taxBase = excess * 0.6
  const bracket = BRACKETS.find((b) => taxBase <= b.limit) ?? BRACKETS[BRACKETS.length - 1]
  const comprehensiveTax = Math.max(taxBase * bracket.rate - bracket.deduction, 0)
  const ruralSpecialTax = comprehensiveTax * 0.2
  const total = comprehensiveTax + ruralSpecialTax

  return {
    taxBase: Math.round(taxBase),
    comprehensiveTax: Math.round(comprehensiveTax),
    ruralSpecialTax: Math.round(ruralSpecialTax),
    total: Math.round(total),
  }
}
