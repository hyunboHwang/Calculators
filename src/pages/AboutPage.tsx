import { pageContent } from '../lib/pageContent'
import routes from '../routes.json'
import GROUP_ORDER from '../groups.json'
import { GUIDE_TRACKS } from './GuidesIndexPage'

export default function AboutPage() {
  const paras: string[] = pageContent.about.intro
  const groups = [...new Set(routes.filter((r) => GROUP_ORDER.includes(r.group)).map((r) => r.group))]

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold">계산기 소개</h1>
      {paras.map((p, i) => (
        <p key={i} className="mt-4 text-sm leading-relaxed text-slate-600">
          {p}
        </p>
      ))}

      <h2 className="mt-8 text-lg font-bold">제공하는 계산기</h2>
      <div className="mt-3 space-y-3">
        {groups.map((g) => (
          <p key={g} className="text-sm leading-relaxed text-slate-600">
            <b className="text-slate-800">{g}</b> —{' '}
            {routes
              .filter((r) => r.group === g)
              .map((r) => r.label)
              .join(', ')}
          </p>
        ))}
      </div>

      <h2 className="mt-8 text-lg font-bold">제공하는 가이드</h2>
      <div className="mt-3 space-y-3">
        {GUIDE_TRACKS.map((track) => (
          <p key={track.title} className="text-sm leading-relaxed text-slate-600">
            <b className="text-slate-800">{track.title}</b> —{' '}
            {track.ids
              .map((id) => routes.find((r) => r.id === id)?.label)
              .filter(Boolean)
              .join(', ')}
          </p>
        ))}
      </div>

      <p className="mt-6 text-xs text-slate-400">최근 업데이트: 2026년 7월</p>

      <p className="mt-8 text-sm text-slate-500">
        문의: <a href="mailto:hwang177@gmail.com" className="text-emerald-700 underline">hwang177@gmail.com</a>
      </p>
    </div>
  )
}
