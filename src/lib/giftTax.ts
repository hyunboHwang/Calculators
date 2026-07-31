/**
 * 증여세 추정 — 상속세와 동일한 5단계 누진세율 사용.
 * - 10년 이내 동일인 증여 합산과세를 반영하되, 사용자가 합산액을 직접 입력합니다.
 * - 혼인·출산 증여재산공제(추가 1억원)는 직계존속→직계비속 증여에만 적용됩니다(2024-01-01 이후 증여분부터).
 * - 재산평가 특례(감정평가 등)는 반영하지 않습니다.
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

export type GiftRelation =
  | 'spouse'
  | 'ancestorToDescendant'
  | 'descendantToAncestor'
  | 'otherRelative'
  | 'stranger'

export interface GiftTaxInput {
  giftValue: number // 증여재산가액
  relation: GiftRelation
  isMinor: boolean // 수증자 미성년 여부 (ancestorToDescendant일 때만 의미 있음)
  isGenerationSkip: boolean // 세대생략 증여 여부
  priorGiftSum: number // 최근 10년 내 동일인 증여 합산액
  marriageOrBirthDeduction: boolean // 혼인·출산 증여재산공제 해당 여부
}

function relationDeduction(i: GiftTaxInput): number {
  switch (i.relation) {
    case 'spouse':
      return 600_000_000
    case 'ancestorToDescendant': {
      const base = i.isMinor ? 20_000_000 : 50_000_000
      const marriageOrBirth = i.marriageOrBirthDeduction ? 100_000_000 : 0
      return base + marriageOrBirth
    }
    case 'descendantToAncestor':
      return 50_000_000
    case 'otherRelative':
      return 10_000_000
    case 'stranger':
      return 0
  }
}

export function calcGiftTax(i: GiftTaxInput) {
  const taxableValue = i.giftValue + i.priorGiftSum
  const deduction = relationDeduction(i)
  const taxBase = Math.max(taxableValue - deduction, 0)
  const calculatedTax = calcTax(taxBase)

  const surchargeRate = i.isGenerationSkip ? (i.isMinor && i.giftValue > 2_000_000_000 ? 0.4 : 0.3) : 0
  const taxWithSurcharge = calculatedTax * (1 + surchargeRate)
  const finalTax = taxWithSurcharge * 0.97 // 신고세액공제 3%

  return {
    taxableValue: Math.round(taxableValue),
    deduction: Math.round(deduction),
    taxBase: Math.round(taxBase),
    calculatedTax: Math.round(calculatedTax),
    finalTax: Math.round(finalTax),
  }
}
