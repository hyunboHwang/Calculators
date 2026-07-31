/**
 * 청약가점 추정 — 민영주택 일반공급 가점제(84점 만점)
 * 무주택기간 32점 + 부양가족수 35점 + 청약통장 가입기간 17점
 * - 배우자 통장 가입기간 합산제(2024.3.25 시행): 배우자 가입개월수를 6개월 단위로 환산한
 *   점수(최대 3점)를 본인 점수에 더하되, 합계는 17점을 넘지 않음 — "배우자 점수의 50%"가 아님
 * - 무주택세대구성원 자격 자체(세대 전원 무주택 여부 등)는 검증하지 않음
 */

export interface SubscriptionScoreInput {
  noHouseSinceDate: string // YYYY-MM-DD, 무주택 인정 시작일
  dependentsCount: number // 부양가족 수 (본인 제외)
  subscriptionJoinDate: string // YYYY-MM-DD, 청약통장 가입일
  spouseSubscriptionJoinDate?: string // YYYY-MM-DD, 배우자 청약통장 가입일 (선택)
}

const DAY = 86_400_000

function daysBetween(from: string, to: Date): number {
  const f = new Date(`${from}T00:00:00`)
  return Math.max(0, (to.getTime() - f.getTime()) / DAY)
}

export function calcSubscriptionScore(i: SubscriptionScoreInput, asOf: Date) {
  const noHouseYears = daysBetween(i.noHouseSinceDate, asOf) / 365
  const noHouseScore = Math.min(2 + 2 * Math.floor(noHouseYears), 32)

  const dependentsScore = Math.min((i.dependentsCount + 1) * 5, 35)

  const ownMonths = daysBetween(i.subscriptionJoinDate, asOf) / 30
  let ownScore: number
  if (ownMonths < 6) ownScore = 1
  else if (ownMonths < 12) ownScore = 2
  else ownScore = Math.min(2 + Math.floor(ownMonths / 12), 17)

  let spouseBonus = 0
  if (i.spouseSubscriptionJoinDate) {
    const spouseMonths = daysBetween(i.spouseSubscriptionJoinDate, asOf) / 30
    spouseBonus = Math.min(Math.floor(spouseMonths / 6), 3)
  }

  const subscriptionScore = Math.min(ownScore + spouseBonus, 17)
  const totalScore = noHouseScore + dependentsScore + subscriptionScore

  return { noHouseScore, dependentsScore, subscriptionScore, totalScore }
}
