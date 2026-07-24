/**
 * 연말정산 환급액 추정 계산 (2026년 기준, 간이 모델)
 *
 * 실제 연말정산은 소득·세액공제 항목이 매우 많아(주택자금, 청약저축,
 * 장애인·경로우대 추가공제 등) 완전히 재현할 수 없습니다. 이 계산기는
 * 검색량이 높은 핵심 항목(신용카드 등 사용액, 연금계좌, 보험료, 의료비,
 * 교육비, 기부금, 월세)만 반영한 근사 모델입니다.
 *
 * 흐름: 총급여 → 근로소득공제 → 근로소득금액 → 각종 소득공제 → 과세표준
 *       → 산출세액(기본세율) → 각종 세액공제 → 결정세액
 *       환급/추가납부 = 기납부세액(원천징수 누계) − 결정세액
 */
import {
  RATES_2026,
  insurances,
  earnedIncomeDeduction,
  earnedIncomeTaxCredit,
  childTaxCredit,
  basicTax,
  withholdingIncomeTax,
} from './salary'

const floor10 = (v: number) => Math.floor(v / 10) * 10

export interface YearEndTaxInput {
  annualSalary: number // 연봉 (세전, 비과세 포함 총액)
  nonTaxableMonthly: number // 비과세 월액
  dependents: number // 본인 포함 부양가족 수
  children: number // 8~20세 자녀 수
  withholdingRatio: 80 | 100 | 120 // 매월 원천징수 비율 (기납부세액 추정에 사용)
  creditCard: number // 신용카드 연간 사용액
  debitCashReceipt: number // 체크카드·현금영수증 연간 사용액
  pensionSavings: number // 연금저축 연간 납입액
  irp: number // IRP 연간 납입액
  insurancePremium: number // 보장성보험료 연간 납입액
  medicalExpense: number // 의료비 연간 지출액
  educationExpense: number // 교육비 연간 지출액
  donation: number // 기부금 연간 지출액
  monthlyRent: number // 월세액 (무주택 세대주 요건 가정)
}

/** 신용카드 등 소득공제 (신용카드분 우선 차감 방식) */
function creditCardDeduction(gross: number, credit: number, debitOrCash: number) {
  const threshold = gross * 0.25
  const creditExcess = Math.max(credit - threshold, 0)
  const remainThreshold = Math.max(threshold - credit, 0)
  const debitExcess = Math.max(debitOrCash - remainThreshold, 0)
  const raw = creditExcess * 0.15 + debitExcess * 0.3
  const cap = gross <= 70_000_000 ? 3_000_000 : gross <= 120_000_000 ? 2_500_000 : 2_000_000
  return Math.min(raw, cap)
}

/** 연금계좌세액공제 (연금저축+IRP 합산 한도 900만) */
function pensionAccountCredit(gross: number, pensionSavings: number, irp: number) {
  const pensionSavingsCapped = Math.min(pensionSavings, 6_000_000)
  const base = Math.min(pensionSavingsCapped + irp, 9_000_000)
  const rate = gross <= 55_000_000 ? 0.15 : 0.12
  return base * rate
}

export function calcYearEndTax(i: YearEndTaxInput) {
  const monthlyGross = i.annualSalary / 12
  const monthlyTaxable = Math.max(monthlyGross - i.nonTaxableMonthly, 0)
  const gross = Math.round(monthlyTaxable * 12) // 총급여 (연, 비과세 제외)
  const family = Math.max(i.dependents, 1)

  const ins = insurances(monthlyTaxable)
  const annualInsurance = {
    pension: ins.pension * 12,
    healthAndEmployment: (ins.health + ins.care + ins.employment) * 12,
  }

  // 1. 근로소득금액
  const earnedIncome = Math.max(gross - earnedIncomeDeduction(gross), 0)

  // 2. 소득공제
  const personalDeduction = family * 1_500_000
  const cardDeduction = creditCardDeduction(gross, i.creditCard, i.debitCashReceipt)
  const totalIncomeDeduction =
    personalDeduction + annualInsurance.pension + annualInsurance.healthAndEmployment + cardDeduction

  // 3. 과세표준 · 산출세액
  const taxBase = Math.max(earnedIncome - totalIncomeDeduction, 0)
  const calculatedTax = basicTax(taxBase)

  // 4. 세액공제
  const earnedCredit = earnedIncomeTaxCredit(calculatedTax, gross)
  const childCredit = childTaxCredit(i.children)
  const pensionCredit = pensionAccountCredit(gross, i.pensionSavings, i.irp)
  const insuranceCredit = Math.min(i.insurancePremium, 1_000_000) * 0.12
  const medicalCredit = Math.max(i.medicalExpense - gross * 0.03, 0) * 0.15
  const educationCredit = i.educationExpense * 0.15
  const donationCredit =
    i.donation <= 10_000_000 ? i.donation * 0.15 : 10_000_000 * 0.15 + (i.donation - 10_000_000) * 0.3
  const rentAnnual = Math.min(i.monthlyRent * 12, 7_500_000)
  const rentRate = gross <= 55_000_000 ? 0.17 : gross <= 80_000_000 ? 0.15 : 0
  const rentCredit = rentAnnual * rentRate

  const totalCredit =
    earnedCredit +
    childCredit +
    pensionCredit +
    insuranceCredit +
    medicalCredit +
    educationCredit +
    donationCredit +
    rentCredit

  const finalTax = Math.max(Math.round(calculatedTax - totalCredit), 0)
  const finalLocalTax = Math.round(finalTax * 0.1)

  // 5. 기납부세액 (매월 원천징수 누계 추정)
  const monthlyWithholding = floor10(
    withholdingIncomeTax(monthlyTaxable, i.dependents, i.children) * (i.withholdingRatio / 100),
  )
  const paidTax = monthlyWithholding * 12
  const paidLocalTax = Math.round(paidTax * 0.1)

  const refund = paidTax + paidLocalTax - (finalTax + finalLocalTax)

  return {
    gross,
    earnedIncome: Math.round(earnedIncome),
    personalDeduction,
    pensionInsuranceDeduction: annualInsurance.pension,
    healthInsuranceDeduction: annualInsurance.healthAndEmployment,
    cardDeduction: Math.round(cardDeduction),
    totalIncomeDeduction: Math.round(totalIncomeDeduction),
    taxBase: Math.round(taxBase),
    calculatedTax: Math.round(calculatedTax),
    earnedCredit: Math.round(earnedCredit),
    childCredit,
    pensionCredit: Math.round(pensionCredit),
    insuranceCredit: Math.round(insuranceCredit),
    medicalCredit: Math.round(medicalCredit),
    educationCredit: Math.round(educationCredit),
    donationCredit: Math.round(donationCredit),
    rentCredit: Math.round(rentCredit),
    totalCredit: Math.round(totalCredit),
    finalTax,
    finalLocalTax,
    paidTax,
    paidLocalTax,
    refund: Math.round(refund),
    isRefund: refund >= 0,
  }
}

export { RATES_2026 }
