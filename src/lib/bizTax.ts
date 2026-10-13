import { basicTax } from './salary.ts'

/**
 * 셀러(통신판매업) 세금 추정 — 부가가치세 + 종합소득세
 * 단순화한 추정치이며 실제 신고 세액과 다를 수 있음.
 *
 * 기준 (입력 매출·매입은 공급가액. 간이과세 판정·세액·카드공제는 공급대가=공급가액×1.1 기준)
 * - 일반과세: 매출세액(공급가액×10%) − 매입세액(공급가액×10%)
 * - 간이과세(소매·통신판매 부가가치율 15%): 공급대가×10%×15% − 매입 공급대가×0.5%
 *   · 간이과세 기준: 직전년도 공급대가 1억 400만원 미만
 *   · 공급대가 4,800만원 미만이면 납부의무 면제
 *   · 간이과세자는 환급 없음
 * - 신용카드 등 발행 세액공제: 발행금액(공급대가)의 1.3%, 연 1,000만원 한도 (개인사업자).
 *   2026.12.31까지의 한시 특례(원칙 1%·연 500만원, 직전연도 공급가액 10억원 이하 사업자 대상)
 * - 종합소득세: 수입금액 × (1 − 경비율) − 기본공제(150만×가족수) → 기본세율
 *   − 표준세액공제 7만원. 다른 소득·공제 없다고 가정.
 */

export const VAT_2026 = {
  rate: 0.1,
  simplifiedValueAddedRate: 0.15, // 소매업·통신판매업
  simplifiedThreshold: 104_000_000,
  simplifiedExemptBelow: 48_000_000,
  simplifiedPurchaseCredit: 0.005,
  cardCreditRate: 0.013,
  cardCreditCap: 10_000_000,
} as const

export interface VatInput {
  annualSales: number // 연 매출 (공급가액, 부가세 별도)
  annualPurchases: number // 연 매입 (공급가액, 세금계산서·카드 수취분)
  applyCardCredit: boolean // 신용카드 등 발행 세액공제 (발행비율 100% 가정)
}

export function calcVat(i: VatInput) {
  const V = VAT_2026
  // 공급가액 → 공급대가(부가세 포함). 간이과세 판정·세액·카드공제는 공급대가 기준
  const salesGross = i.annualSales * (1 + V.rate)
  const purchasesGross = i.annualPurchases * (1 + V.rate)
  const cardCredit = i.applyCardCredit
    ? Math.min(salesGross * V.cardCreditRate, V.cardCreditCap)
    : 0

  // 일반과세 (음수 = 환급)
  const generalBeforeCredit = (i.annualSales - i.annualPurchases) * V.rate
  const general =
    generalBeforeCredit > 0
      ? Math.max(generalBeforeCredit - cardCredit, 0)
      : generalBeforeCredit

  // 간이과세
  const simplifiedRaw =
    salesGross * V.rate * V.simplifiedValueAddedRate -
    purchasesGross * V.simplifiedPurchaseCredit
  const simplifiedEligible = salesGross < V.simplifiedThreshold
  const simplifiedExempt = salesGross < V.simplifiedExemptBelow
  const simplified = simplifiedExempt
    ? 0
    : Math.max(Math.max(simplifiedRaw, 0) - cardCredit, 0)

  return {
    general: Math.round(general),
    generalIsRefund: general < 0,
    simplified: Math.round(simplified),
    simplifiedEligible,
    simplifiedExempt,
    cardCredit: Math.round(cardCredit),
    savings: Math.round(general - simplified), // 간이 선택 시 절감액
  }
}

export interface IncomeTaxInput {
  annualSales: number // 연 매출
  expenseRate: number // 경비율 % (통신판매 단순경비율 약 86% 수준)
  dependents: number // 본인 포함 부양가족 수
}

export function calcBizIncomeTax(i: IncomeTaxInput) {
  const income = Math.max(i.annualSales * (1 - Math.min(Math.max(i.expenseRate, 0), 100) / 100), 0) // 소득금액
  const taxBase = Math.max(income - Math.max(i.dependents, 1) * 1_500_000, 0)
  const calculated = basicTax(taxBase)
  const incomeTax = Math.max(calculated - 70_000, 0) // 표준세액공제
  const localTax = incomeTax * 0.1

  return {
    income: Math.round(income),
    taxBase: Math.round(taxBase),
    incomeTax: Math.round(incomeTax),
    localTax: Math.round(localTax),
    total: Math.round(incomeTax + localTax),
    effectiveRate: i.annualSales > 0 ? ((incomeTax + localTax) / i.annualSales) * 100 : NaN,
  }
}
