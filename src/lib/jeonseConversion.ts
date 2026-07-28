/**
 * 전월세 전환율 계산 — 주택임대차보호법 기준 법정 상한과 실제 조건 비교
 * - 법정 전환율 상한 = min(기준금리 + 2%p, 10%)
 * - 월세 = (전세보증금 - 월세보증금) × 전환율 ÷ 12
 */

export interface JeonseConversionInput {
  jeonseDeposit: number // 순수 전세 시 보증금
  monthlyDeposit: number // 월세 전환 시 보증금
  monthlyRent: number // 실제(또는 희망) 월세
  baseRate: number // 한국은행 기준금리 %
}

export function calcJeonseConversion(i: JeonseConversionInput) {
  const depositDiff = Math.max(i.jeonseDeposit - i.monthlyDeposit, 0)
  const legalCapRate = Math.min(i.baseRate + 2, 10)
  const capMonthlyRent = (depositDiff * (legalCapRate / 100)) / 12
  const actualRate = depositDiff > 0 ? ((i.monthlyRent * 12) / depositDiff) * 100 : NaN
  const isOverCap = actualRate > legalCapRate

  return {
    depositDiff,
    legalCapRate,
    capMonthlyRent: Math.round(capMonthlyRent),
    actualRate,
    isOverCap,
  }
}
