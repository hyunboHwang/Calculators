/**
 * 주택 재산세 추정 — 공시가격 기준
 * - 공정시장가액비율: 1세대1주택은 공시가격 제한 없이 구간별로 3억원 이하 43%,
 *   3억원 초과 6억원 이하 44%, 6억원 초과 45%가 적용되고(2026년도 지방세법 시행령
 *   제109조, 9억원 초과 주택도 포함), 다주택·법인은 60%가 적용됨
 * - 4단계 누진세율 중 더 낮은 특례세율(0.05~0.35%)은 1세대1주택이면서 공시가격
 *   9억원 이하인 경우에만 적용되고, 9억원 초과 1세대1주택은 낮은 비율(43~45%)은
 *   그대로 받으면서 세율은 일반세율(0.1~0.4%)을 적용받음 — 비율과 세율의 특례 적용
 *   기준이 서로 다름에 주의
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

/** 1세대1주택 특례 공정시장가액비율 — 공시가격 구간별로 다름 */
function specialRatio(publicPrice: number): number {
  if (publicPrice <= 300_000_000) return 0.43
  if (publicPrice <= 600_000_000) return 0.44
  return 0.45
}

export function calcPropertyTax(i: PropertyTaxInput) {
  // 공정시장가액비율 특례는 1세대1주택이면 공시가격 제한 없이 적용된다.
  const ratioIsSpecial = i.isSingleHouse
  // 반면 더 낮은 특례세율(세율 구간표)은 공시가격 9억원 이하일 때만 적용된다.
  const useSpecial = i.isSingleHouse && i.publicPrice <= 900_000_000
  const ratio = ratioIsSpecial ? specialRatio(i.publicPrice) : 0.6
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

import type { Verdict } from '../components/VerdictBanner'

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`

export function getPropertyTaxVerdict(
  i: PropertyTaxInput,
  r: ReturnType<typeof calcPropertyTax>,
): Verdict {
  if (r.useSpecial) {
    return {
      tone: 'good',
      badgeLabel: '1세대1주택 특례 적용',
      headline: won(r.total),
      headlineUnit: '예상 재산세',
      description:
        '공시가격 9억원 이하 1세대1주택으로 낮은 공정시장가액비율(43~45%)과 특례세율(0.05~0.35%)을 모두 적용받습니다.',
    }
  }
  if (i.isSingleHouse) {
    return {
      tone: 'neutral',
      badgeLabel: '특례세율 미적용 (9억원 초과)',
      headline: won(r.total),
      headlineUnit: '예상 재산세',
      description:
        '1세대1주택으로 공정시장가액비율(43~45%)은 낮게 적용되지만, 공시가격이 9억원을 초과해 특례세율은 적용되지 않습니다.',
    }
  }
  return {
    tone: 'warn',
    badgeLabel: '다주택 기준',
    headline: won(r.total),
    headlineUnit: '예상 재산세',
    description: '1세대1주택이 아니라 공정시장가액비율 60%와 일반세율이 적용됩니다.',
  }
}
