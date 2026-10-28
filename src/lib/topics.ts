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
