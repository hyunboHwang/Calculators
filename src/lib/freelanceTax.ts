/**
 * 프리랜서 3.3% 원천징수 계산 (사업소득세 3% + 지방소득세 0.3%)
 * + 연간 종합소득세 간이 추정(단순경비율 방식, bizTax.ts와 동일 산식)
 */
import { basicTax } from './salary'

export const FREELANCE_WITHHOLDING_RATE = 0.033

export interface WithholdingInput {
  mode: 'grossToNet' | 'netToGross'
  amount: number
}

export function calcWithholding(i: WithholdingInput) {
  const r = FREELANCE_WITHHOLDING_RATE
  const gross = i.mode === 'grossToNet' ? i.amount : i.amount / (1 - r)
  const withholding = gross * r
  const net = gross - withholding

  return {
    gross: Math.round(gross),
    withholding: Math.round(withholding),
    net: Math.round(net),
  }
}

export interface AnnualTaxInput {
  annualIncome: number // 연간 총 용역비 (세전 합계)
  expenseRate: number // 경비율 %
  dependents: number // 본인 포함 부양가족 수
}

export function calcFreelanceAnnualTax(i: AnnualTaxInput) {
  const income = Math.max(i.annualIncome * (1 - i.expenseRate / 100), 0)
  const taxBase = Math.max(income - Math.max(i.dependents, 1) * 1_500_000, 0)
  const calculated = basicTax(taxBase)
  const incomeTax = Math.max(calculated - 70_000, 0) // 표준세액공제
  const localTax = incomeTax * 0.1
  const total = incomeTax + localTax

  const alreadyWithheld = i.annualIncome * FREELANCE_WITHHOLDING_RATE
  const settlement = alreadyWithheld - total // 양수 = 환급, 음수 = 추가납부

  return {
    income: Math.round(income),
    taxBase: Math.round(taxBase),
    incomeTax: Math.round(incomeTax),
    localTax: Math.round(localTax),
    total: Math.round(total),
    alreadyWithheld: Math.round(alreadyWithheld),
    settlement: Math.round(settlement),
    isRefund: settlement >= 0,
  }
}
