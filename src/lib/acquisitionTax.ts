/**
 * 주택 유상취득 시 취득세 추정 (개인 기준)
 * - 1주택(또는 일시적 2주택 포함) 표준세율: 6억 이하 1%, 6~9억 구간 선형 보간, 9억 초과 3%
 * - 2주택 조정대상지역 8%, 3주택 이상 비조정 8% / 조정 12%
 * - 지방교육세는 취득세액의 10%로 근사, 농특세는 전용 85㎡ 초과 시 0.2%
 * - 위택스 고시 기준 단순화 모델이며 실제 신고 세액과 다를 수 있음
 */

export type HouseCount = 'first' | 'second' | 'thirdPlus'

export interface AcquisitionTaxInput {
  price: number // 취득가액
  houseCount: HouseCount
  isAdjusted: boolean // 조정대상지역 여부
  areaOver85: boolean // 전용면적 85㎡ 초과 여부
}

function baseRate(price: number): number {
  if (price <= 600_000_000) return 1
  if (price <= 900_000_000) return (price / 100_000_000) * (2 / 3) - 3
  return 3
}

function rateFor(i: AcquisitionTaxInput): number {
  if (i.houseCount === 'first') return baseRate(i.price)
  if (i.houseCount === 'second') return i.isAdjusted ? 8 : baseRate(i.price)
  return i.isAdjusted ? 12 : 8
}

export function calcAcquisitionTax(i: AcquisitionTaxInput) {
  const rate = rateFor(i)
  const acquisitionTax = i.price * (rate / 100)
  const localEduTax = acquisitionTax * 0.1
  const ruralSpecialTax = i.areaOver85 ? i.price * 0.002 : 0
  const total = acquisitionTax + localEduTax + ruralSpecialTax

  return {
    rate,
    acquisitionTax: Math.round(acquisitionTax),
    localEduTax: Math.round(localEduTax),
    ruralSpecialTax: Math.round(ruralSpecialTax),
    total: Math.round(total),
  }
}
