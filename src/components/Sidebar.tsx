import { useEffect, useRef, useState } from 'react'
import routes from '../routes.json'
import GROUP_ORDER from '../groups.json'

const groups = GROUP_ORDER.filter((g) => routes.some((r) => r.group === g))

export function MenuLink({
  to,
  label,
  active,
  onNavigate,
  compact,
}: {
  to: string
  label: string
  active: boolean
  onNavigate: (to: string) => void
  compact?: boolean
}) {
  return (
    <a
      href={to === '/' ? '/' : `${to}/`}
      onClick={(e) => {
        e.preventDefault()
        onNavigate(to)
      }}
      aria-current={active ? 'page' : undefined}
      className={
        compact
          ? `shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`
          : `block rounded-lg border-l-2 py-2 pr-3 pl-2.5 text-sm font-medium transition-colors ${
              active
                ? 'border-emerald-500 bg-emerald-50 font-semibold text-emerald-700'
                : 'border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`
      }
    >
      {label}
    </a>
  )
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className={`h-3.5 w-3.5 shrink-0 text-slate-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.148l3.71-3.918a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  )
}

export default function Sidebar({
  activeRouteId,
  activeGroup,
  onNavigate,
}: {
  activeRouteId: string
  activeGroup: string
  onNavigate: (to: string) => void
}) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() =>
    new Set([groups.includes(activeGroup) ? activeGroup : groups[0]]),
  )

  // 다른 계산기로 이동하면 그 그룹을 펼침 목록에 추가한다 (기존에 펼친 그룹은 접지 않음)
  useEffect(() => {
    if (!groups.includes(activeGroup)) return
    setExpandedGroups((prev) => {
      if (prev.has(activeGroup)) return prev
      const next = new Set(prev)
      next.add(activeGroup)
      return next
    })
  }, [activeGroup])

  const toggleGroup = (g: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(g)) next.delete(g)
      else next.add(g)
      return next
    })
  }

  const isSearching = query.trim().length > 0
  const matches = (label: string) => label.toLowerCase().includes(query.trim().toLowerCase())
  const routesForGroup = (g: string) =>
    routes.filter((r) => r.group === g && (!isSearching || matches(r.label)))
  const visibleGroups = groups.filter((g) => routesForGroup(g).length > 0)
  const isExpanded = (g: string) => isSearching || expandedGroups.has(g)

  const handleSelect = (to: string) => {
    setQuery('')
    onNavigate(to)
  }

  return (
    <nav
      className="sidebar-scroll min-h-0 flex-1 space-y-6 overflow-y-auto px-3 pb-4"
      aria-label="계산기 메뉴"
    >
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="계산기 검색"
          aria-label="계산기 검색"
          className="w-full rounded-lg border border-slate-300 bg-white py-2 pr-8 pl-3 text-sm transition-colors hover:border-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              inputRef.current?.focus()
            }}
            aria-label="검색어 지우기"
            className="absolute inset-y-0 right-2 flex items-center text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        )}
      </div>

      {isSearching && visibleGroups.length === 0 && (
        <p className="px-3 text-sm text-slate-400">검색 결과가 없습니다.</p>
      )}

      {visibleGroups.map((g) => {
        const expanded = isExpanded(g)
        return (
          <div key={g}>
            <button
              type="button"
              onClick={() => {
                if (!isSearching) toggleGroup(g)
              }}
              aria-disabled={isSearching}
              aria-expanded={expanded}
              aria-controls={`sidebar-group-${g}`}
              className={`flex w-full items-center justify-between px-3 py-1 text-xs font-semibold tracking-wide text-slate-500 hover:text-slate-700 ${isSearching ? 'cursor-default' : ''}`}
            >
              {g}
              {!isSearching && <ChevronIcon expanded={expanded} />}
            </button>
            <div id={`sidebar-group-${g}`} className="mt-1 space-y-0.5" hidden={!expanded}>
              {routesForGroup(g).map((r) => (
                <MenuLink
                  key={r.id}
                  to={r.path}
                  label={r.label}
                  active={activeRouteId === r.id}
                  onNavigate={handleSelect}
                />
              ))}
            </div>
          </div>
        )
      })}
    </nav>
  )
}
