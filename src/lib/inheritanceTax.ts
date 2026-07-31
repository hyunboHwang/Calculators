/**
 * 상속세 추정 — 2026년 현재 법 기준(2024년 발의된 자녀공제 확대·최고세율 인하 개정안은
 * 국회에서 부결되어 미시행. 현행 자녀공제 5,000만원, 최고세율 50% 기준으로 계산합니다.)
 * - 배우자 법정상속분 정밀 계산, 사전증여재산 합산, 재산평가 특례, 유류분은 반영하지 않습니다.
 */

interface Bracket {
  limit: number
  rate: number
  deduction: number
}

const BRACKETS: Bracket[] = [
  { limit: 100_000_000, rate: 0.1, deduction: 0 },
  { limit: 500_000_000, rate: 0.2, deduction: 10_000_000 },
  { limit: 1_000_000_000, rate: 0.3, deduction: 60_000_000 },
  { limit: 3_000_000_000, rate: 0.4, deduction: 160_000_000 },
  { limit: Infinity, rate: 0.5, deduction: 460_000_000 },
]

function calcTax(taxBase: number): number {
  if (taxBase <= 0) return 0
  const bracket = BRACKETS.find((b) => taxBase <= b.limit) ?? BRACKETS[BRACKETS.length - 1]
  return Math.max(taxBase * bracket.rate - bracket.deduction, 0)
}

export interface InheritanceTaxInput {
  estateValue: number // 상속재산가액
  debtAndFuneralCost: number // 채무·공과금·장례비용 합산
  hasSpouse: boolean
  spouseActualShare: number // 배우자 실제 상속액 (0이면 미입력)
  childrenCount: number
  minorHeirsCount: number
  minorRemainingYears: number // 미성년 상속인 평균 잔여연수(19세까지)
  elderlyHeirsCount: number // 65세 이상
  disabledHeirsCount: number
  disabledRemainingYears: number // 장애인 평균 기대여명 연수
  netFinancialAssets: number // 순금융재산가액
}

export function calcInheritanceTax(i: InheritanceTaxInput) {
  const taxableValue = Math.max(i.estateValue - i.debtAndFuneralCost, 0)

  const personalDeduction =
    i.childrenCount * 50_000_000 +
    i.minorHeirsCount * 10_000_000 * i.minorRemainingYears +
    i.elderlyHeirsCount * 50_000_000 +
    i.disabledHeirsCount * 10_000_000 * i.disabledRemainingYears

  const isSpouseSoleHeir =
    i.hasSpouse &&
    i.childrenCount === 0 &&
    i.minorHeirsCount === 0 &&
    i.elderlyHeirsCount === 0 &&
    i.disabledHeirsCount === 0

  const basicOrLumpSumDeduction = isSpouseSoleHeir
    ? 200_000_000 + personalDeduction
    : Math.max(200_000_000 + personalDeduction, 500_000_000)

  const spouseDeduction = !i.hasSpouse
    ? 0
    : i.spouseActualShare < 500_000_000
      ? 500_000_000
      : Math.min(i.spouseActualShare, 3_000_000_000)

  const financialDeduction =
    i.netFinancialAssets <= 20_000_000
      ? i.netFinancialAssets
      : Math.min(Math.max(i.netFinancialAssets * 0.2, 20_000_000), 200_000_000)

  const totalDeduction = basicOrLumpSumDeduction + spouseDeduction + financialDeduction
  const taxBase = Math.max(taxableValue - totalDeduction, 0)
  const calculatedTax = calcTax(taxBase)
  const finalTax = calculatedTax * 0.97 // 신고세액공제 3%

  return {
    taxableValue: Math.round(taxableValue),
    totalDeduction: Math.round(totalDeduction),
    taxBase: Math.round(taxBase),
    calculatedTax: Math.round(calculatedTax),
    finalTax: Math.round(finalTax),
  }
}
