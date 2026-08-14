import { useMemo, useState } from 'react'
import { buildGlossaryIndex } from '../lib/glossaryIndex'

export default function GlossaryPage() {
  const entries = useMemo(() => buildGlossaryIndex(), [])
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return entries
    return entries.filter(
      (e) =>
        e.term.toLowerCase().includes(q) ||
        e.definitions.some((d) => d.text.toLowerCase().includes(q)),
    )
  }, [entries, query])

  return (
    <div>
      <h1 className="text-2xl font-bold">용어사전</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        이 사이트의 계산기·가이드에서 검증한 용어 설명 {entries.length}개를 가나다순으로
        모았습니다. 각 용어 아래 링크로 관련 계산기·가이드를 바로 확인할 수 있습니다.
      </p>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="용어 검색 (예: 공정시장가액비율, 간이세액표)"
        className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
      />

      {filtered.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">일치하는 용어가 없습니다.</p>
      ) : (
        <dl className="mt-6 space-y-5">
          {filtered.map((e) => (
            <div
              key={e.term}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <dt className="text-base font-semibold text-slate-800">{e.term}</dt>
              {e.definitions.map((d, i) => (
                <dd key={i} className="mt-2">
                  <p className="text-sm leading-relaxed text-slate-600">{d.text}</p>
                  <p className="mt-1.5 text-xs text-slate-400">
                    관련:{' '}
                    {d.sources.map((s, si) => (
                      <span key={s.id}>
                        {si > 0 && ', '}
                        <a
                          href={`${s.path}/`}
                          className="text-emerald-700 underline decoration-emerald-300 underline-offset-2 hover:text-emerald-800"
                        >
                          {s.label}
                        </a>
                      </span>
                    ))}
                  </p>
                </dd>
              ))}
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}
