/**
 * 청약순위 판정 — 국민주택(공공분양) 1순위·2순위 + 순차제
 * - 2순위 강등 조건(투기과열지구·조정대상지역 한정: 세대주 아님/최근5년 당첨이력)은
 *   재당첨제한(주택공급에 관한 규칙 제54조, 지역별 5~10년)과는 별개 제도이며 반영하지 않음
 * - 지역 지정 현황은 수시로 바뀌므로 사용자가 지역 유형을 직접 선택하게 함(도시명 하드코딩 없음)
 * - 저축총액/납입횟수는 사용자가 이미 월 25만원 인정한도를 반영해 파악한 값을 그대로 입력받음
 * - 날짜는 달력 기준(연/월)으로 계산하며, 일수 근사(/30)는 사용하지 않음
 */

import { parseDate, monthsBetween } from './age'

export type RegionType = 'speculation' | 'metro' | 'nonMetro' | 'shrinking'

export interface SubscriptionRankInput {
  allHouseholdNoHouse: boolean // 세대 전원 무주택 여부
  isHouseholdHead: boolean // 세대주 여부
  wonInLast5Years: boolean // 최근 5년 이내 세대구성원 당첨 이력
  regionType: RegionType
  subscriptionJoinDate: string // YYYY-MM-DD
  paymentCount: number // 납입 횟수
  totalSavings: number // 저축총액 (원)
  unitSizeOver40: boolean // 희망 평형 40㎡ 초과 여부
}

const REGION_REQUIREMENTS: Record<RegionType, { months: number; payments: number }> = {
  speculation: { months: 24, payments: 24 },
  metro: { months: 12, payments: 12 },
  nonMetro: { months: 6, payments: 6 },
  shrinking: { months: 0, payments: 0 },
}

export function calcSubscriptionRank(i: SubscriptionRankInput, asOf: Date) {
  if (!i.allHouseholdNoHouse) {
    return { eligible: false as const, reason: '무주택 요건 미충족' }
  }

  const joined = parseDate(i.subscriptionJoinDate)
  if (!joined) {
    return { eligible: false as const, reason: '청약통장 가입일을 입력하세요' }
  }

  const months = Math.max(0, monthsBetween(joined, asOf))
  const req = REGION_REQUIREMENTS[i.regionType]
  const meetsJoinPeriod = months >= req.months
  const meetsPaymentCount = i.paymentCount >= req.payments
  const meetsFirstPriorityRequirement = meetsJoinPeriod && meetsPaymentCount

  let rank: '1순위' | '2순위'
  if (!meetsFirstPriorityRequirement) {
    rank = '2순위'
  } else if (i.regionType === 'speculation' && (!i.isHouseholdHead || i.wonInLast5Years)) {
    rank = '2순위'
  } else {
    rank = '1순위'
  }

  const sequencingBasis = i.unitSizeOver40 ? '저축총액' : '납입횟수'
  const sequencingValue = i.unitSizeOver40 ? i.totalSavings : i.paymentCount

  return { eligible: true as const, rank, sequencingBasis, sequencingValue }
}
