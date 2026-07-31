/**
 * 연금저축·IRP 세액공제 추정
 * - 연금저축 단독 한도 600만원, 연금저축+IRP 합산 한도 900만원(2023년 세법개정으로 통합)
 * - 공제율: 총급여 5,500만원 이하 16.5%, 초과 13.2%(지방소득세 포함)
 * - 50세 이상 추가한도(200만원)는 2022년 일몰 종료되어 반영하지 않음
 */

export interface PensionTaxCreditInput {
  totalSalary: number // 총급여
  pensionSavingsContribution: number // 연금저축 납입액
  irpContribution: number // IRP 납입액
}

export function calcPensionTaxCredit(i: PensionTaxCreditInput) {
  const pensionSavingsRecognized = Math.min(i.pensionSavingsContribution, 6_000_000)
  const totalRecognized = Math.min(pensionSavingsRecognized + i.irpContribution, 9_000_000)
  const rate = i.totalSalary <= 55_000_000 ? 0.165 : 0.132
  const deductionAmount = Math.round(totalRecognized * rate)

  return { pensionSavingsRecognized, totalRecognized, rate, deductionAmount }
}
