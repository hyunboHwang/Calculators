import { useEffect, useRef, useState } from 'react'
import routes from '../routes.json'
import { topics, LIFE_IDS } from '../lib/topics'

type R = (typeof routes)[number]
const byId = (id: string) => routes.find((r) => r.id === id)
const pick = (ids: string[]) => ids.map(byId).filter((r): r is R => !!r && r.group !== '가이드')

/** 도구 패널 5열: 주제별 계산기(가이드 제외) + 생활. 지원·청년 주제는 계산기가 없어 열이 없다. */
const COLUMNS: { title: string; items: R[] }[] = [
  ...['work', 'tax', 'property', 'finance'].map((id) => {
    const t = topics.find((x) => x.id === id)!
    return { title: t.label, items: pick(t.members) }
  }),
  // 일반 계산기가 맨 위
  { title: '생활', items: pick(['generalCalculator', ...LIFE_IDS.filter((i) => i !== 'generalCalculator')]) },
].filter((c) => c.items.length > 0)

const ALL = COLUMNS.flatMap((c) => c.items)

export default function ToolsPanel({
  activeRouteId,
  onNavigate,
  id,
}: {
  activeRouteId: string
  onNavigate: (to: string) => void
  id: string
}) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    // 데스크톱 패널에서만 자동 포커스 (모바일 메뉴에서는 키보드가 올라오지 않게)
    if (window.matchMedia('(min-width: 1024px)').matches) inputRef.current?.focus({ preventScroll: true })
  }, [])

  const q = query.trim().toLowerCase()
  const results = q ? ALL.filter((r) => `${r.label} ${r.description}`.toLowerCase().includes(q)) : []

  const link = (r: R) => (
    <a
      key={r.id}
      href={`${r.path}/`}
      onClick={(e) => {
        e.preventDefault()
        onNavigate(r.path)
      }}
      aria-current={activeRouteId === r.id ? 'page' : undefined}
      className={`flex min-h-11 items-center py-1 hover:text-accent lg:min-h-0 lg:py-1 ${
        r.id === 'generalCalculator' || activeRouteId === r.id ? 'font-semibold text-accent' : 'text-body'
      }`}
    >
      {r.label}
    </a>
  )

  return (
    <div id={id} className="text-[13px]">
      <div className="flex items-center border-b-2 border-ink focus-within:border-accent">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="계산기 검색"
          aria-label="계산기 검색"
          className="min-h-11 w-full bg-transparent py-1.5 text-[15px] text-ink placeholder:text-muted focus:outline-none focus-visible:outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              inputRef.current?.focus()
            }}
            aria-label="검색어 지우기"
            className="min-h-11 min-w-11 text-muted hover:text-ink"
          >
            ×
          </button>
        )}
      </div>

      <div className="tools-scroll max-h-[60vh] overflow-y-auto pt-4 lg:max-h-[70vh]">
        {q ? (
          results.length ? (
            <div className="grid gap-x-7 sm:grid-cols-2 lg:grid-cols-3">
              {results.map(link)}
            </div>
          ) : (
            <p className="py-2 text-muted">검색 결과가 없습니다.</p>
          )
        ) : (
          <div className="grid grid-cols-2 gap-x-7 gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
            {COLUMNS.map((c) => (
              <div key={c.title}>
                <h3 className="mb-2 border-b border-ink pb-1.5 font-serif text-[15px] text-ink">{c.title}</h3>
                {c.items.map(link)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
