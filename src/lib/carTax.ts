/**
 * 승용차 자동차세 추정 (비영업용 기준)
 * - 배기량 cc당 세액: 1000cc 이하 80원, 1600cc 이하 140원, 초과 200원
 * - 차령 3년차부터 매년 5%p씩 감경, 최대 50%(12년차 이상)
 * - 전기차는 배기량 없이 정액 10만원
 * - 지방교육세는 자동차세의 30%. 연납 할인은 반영하지 않음
 */

export interface CarTaxInput {
  displacement: number // 배기량(cc), 전기차는 무시됨
  yearsElapsed: number // 차령(년)
  isElectric: boolean
}

function ccRate(displacement: number): number {
  if (displacement <= 1000) return 80
  if (displacement <= 1600) return 140
  return 200
}

export function calcCarTax(i: CarTaxInput) {
  if (i.isElectric) {
    const carTax = 100_000
    const localEduTax = Math.round(carTax * 0.3)
    return {
      baseTax: carTax,
      depreciationPct: 0,
      carTax,
      localEduTax,
      total: carTax + localEduTax,
    }
  }

  const baseTax = i.displacement * ccRate(i.displacement)
  const depreciationPct = i.yearsElapsed < 3 ? 0 : Math.min((i.yearsElapsed - 2) * 5, 50)
  const carTax = baseTax * (1 - depreciationPct / 100)
  const localEduTax = carTax * 0.3
  const total = carTax + localEduTax

  return {
    baseTax: Math.round(baseTax),
    depreciationPct,
    carTax: Math.round(carTax),
    localEduTax: Math.round(localEduTax),
    total: Math.round(total),
  }
}
