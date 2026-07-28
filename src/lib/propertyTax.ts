/**
 * 주택 재산세 추정 — 공시가격 기준
 * - 공정시장가액비율: 일반 60%, 1세대1주택 특례(공시 9억 이하) 45%
 * - 과세표준 누진세율 4구간 + 도시지역분(0.14%) + 지방교육세(재산세 본세의 20%)
 * - 위택스 고시 기준 단순화 모델이며 실제 고지 세액과 다를 수 있음
 */

interface Bracket {
  limit: number
  rate: number
  deduction: number
}

const GENERAL_BRACKETS: Bracket[] = [
  { limit: 60_000_000, rate: 0.001, deduction: 0 },
  { limit: 150_000_000, rate: 0.0015, deduction: 30_000 },
  { limit: 300_000_000, rate: 0.0025, deduction: 180_000 },
  { limit: Infinity, rate: 0.004, deduction: 630_000 },
]

const SPECIAL_BRACKETS: Bracket[] = [
  { limit: 60_000_000, rate: 0.0005, deduction: 0 },
  { limit: 150_000_000, rate: 0.001, deduction: 30_000 },
  { limit: 300_000_000, rate: 0.002, deduction: 180_000 },
  { limit: Infinity, rate: 0.0035, deduction: 630_000 },
]

function progressiveTax(base: number, brackets: Bracket[]): number {
  const bracket = brackets.find((b) => base <= b.limit) ?? brackets[brackets.length - 1]
  return Math.max(base * bracket.rate - bracket.deduction, 0)
}

export interface PropertyTaxInput {
  publicPrice: number // 공시가격
  isSingleHouse: boolean // 1세대1주택 여부
}

export function calcPropertyTax(i: PropertyTaxInput) {
  const useSpecial = i.isSingleHouse && i.publicPrice <= 900_000_000
  const ratio = useSpecial ? 0.45 : 0.6
  const taxBase = i.publicPrice * ratio
  const propertyTax = progressiveTax(taxBase, useSpecial ? SPECIAL_BRACKETS : GENERAL_BRACKETS)
  const urbanTax = taxBase * 0.0014
  const localEduTax = propertyTax * 0.2
  const total = propertyTax + urbanTax + localEduTax

  return {
    useSpecial,
    taxBase: Math.round(taxBase),
    propertyTax: Math.round(propertyTax),
    urbanTax: Math.round(urbanTax),
    localEduTax: Math.round(localEduTax),
    total: Math.round(total),
  }
}
