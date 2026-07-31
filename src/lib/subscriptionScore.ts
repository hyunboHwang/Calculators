/**
 * 청약가점 추정 — 민영주택 일반공급 가점제(84점 만점)
 * 무주택기간 32점 + 부양가족수 35점 + 청약통장 가입기간 17점
 * - 배우자 통장 가입기간 합산제(2024.3.25 시행): 배우자의 실제 가입기간을 절반으로 나눈 뒤,
 *   그 절반 기간을 본인과 동일한 가입기간 점수표에 대입해 점수를 구하고(최대 3점), 본인 점수에
 *   더함 — "배우자 점수의 50%"도 아니고 "배우자 개월수/6"도 아님. 정부 발표 공식 예시(배우자
 *   30개월 → 절반 15개월 → 점수표 조회 → 3점)로 검증됨.
 * - 무주택세대구성원 자격 자체(세대 전원 무주택 여부 등)는 검증하지 않음
 * - 날짜는 달력 기준(연/월)으로 계산하며, 일수 근사(/30, /365)는 사용하지 않음
 */

import { parseDate, ageParts, monthsBetween } from './age'

export interface SubscriptionScoreInput {
  noHouseSinceDate: string // YYYY-MM-DD, 무주택 인정 시작일
  dependentsCount: number // 부양가족 수 (본인 제외)
  subscriptionJoinDate: string // YYYY-MM-DD, 청약통장 가입일
  spouseSubscriptionJoinDate?: string // YYYY-MM-DD, 배우자 청약통장 가입일 (선택)
}

function joinPeriodScore(months: number): number {
  if (months < 6) return 1
  if (months < 12) return 2
  return Math.min(2 + Math.floor(months / 12), 17)
}

export function calcSubscriptionScore(i: SubscriptionScoreInput, asOf: Date) {
  const noHouseSince = parseDate(i.noHouseSinceDate)
  const joined = parseDate(i.subscriptionJoinDate)
  const spouseJoined = i.spouseSubscriptionJoinDate ? parseDate(i.spouseSubscriptionJoinDate) : null
  if (!noHouseSince || !joined || (i.spouseSubscriptionJoinDate && !spouseJoined)) {
    return { valid: false as const }
  }

  const noHouseYears = Math.max(0, ageParts(noHouseSince, asOf).years)
  const noHouseScore = Math.min(2 + 2 * noHouseYears, 32)

  const dependentsScore = Math.min((i.dependentsCount + 1) * 5, 35)

  const ownMonths = Math.max(0, monthsBetween(joined, asOf))
  const ownScore = joinPeriodScore(ownMonths)

  let spouseBonus = 0
  if (spouseJoined) {
    const spouseMonths = Math.max(0, monthsBetween(spouseJoined, asOf))
    spouseBonus = Math.min(joinPeriodScore(Math.floor(spouseMonths / 2)), 3)
  }

  const subscriptionScore = Math.min(ownScore + spouseBonus, 17)
  const totalScore = noHouseScore + dependentsScore + subscriptionScore

  return { valid: true as const, noHouseScore, dependentsScore, subscriptionScore, totalScore }
}
