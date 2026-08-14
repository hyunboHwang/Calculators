import { pageContent } from './pageContent'
import routes from '../routes.json'

interface GlossaryContentEntry {
  glossary?: { term: string; definition: string }[]
}

const content = pageContent as Record<string, GlossaryContentEntry>

export interface GlossarySource {
  id: string
  label: string
  path: string
}

export interface GlossaryDefinition {
  text: string
  sources: GlossarySource[]
}

export interface GlossaryEntry {
  term: string
  definitions: GlossaryDefinition[]
}

/**
 * 모든 계산기·가이드 페이지의 glossary 항목을 용어 기준으로 집계한다.
 * 같은 용어·같은 정의는 하나로 합치고 출처를 모두 모은다. 같은 용어라도
 * 정의 텍스트가 다르면(문맥별 의미 차이) 별도 정의로 분리해 보존한다.
 */
export function buildGlossaryIndex(): GlossaryEntry[] {
  // term -> definition text -> sources
  const byTerm = new Map<string, Map<string, GlossarySource[]>>()

  for (const [id, c] of Object.entries(content)) {
    if (!c.glossary || c.glossary.length === 0) continue
    const route = routes.find((r) => r.id === id)
    if (!route) continue
    const source: GlossarySource = { id, label: route.label, path: route.path }

    for (const g of c.glossary) {
      if (!byTerm.has(g.term)) byTerm.set(g.term, new Map())
      const defMap = byTerm.get(g.term)!
      if (!defMap.has(g.definition)) defMap.set(g.definition, [])
      defMap.get(g.definition)!.push(source)
    }
  }

  const entries: GlossaryEntry[] = [...byTerm.entries()].map(([term, defMap]) => ({
    term,
    definitions: [...defMap.entries()].map(([text, sources]) => ({ text, sources })),
  }))

  entries.sort((a, b) => a.term.localeCompare(b.term, 'ko'))
  return entries
}
