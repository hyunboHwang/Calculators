import topicsJson from '../topics.json'

export type Topic = {
  id: string
  slug: string
  label: string
  path: string
  summary: string
  members: string[]
}

export const topics: Topic[] = topicsJson

export function topicOf(routeId: string): Topic | undefined {
  return topics.find((t) => t.members.includes(routeId))
}

/** 주제에 속하지 않는 생활 계산기(도구 패널 '생활' 열). scripts/check-topics.mjs의 LIFE와 같아야 한다. */
export const LIFE_IDS = ['age', 'celebration', 'insuranceAge', 'pensionAge', 'dday', 'dateCalc', 'discharge', 'dueDate', 'bmi', 'generalCalculator']
