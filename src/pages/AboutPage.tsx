import { pageContent } from '../lib/pageContent'
import routes from '../routes.json'

export default function AboutPage() {
  const paras: string[] = pageContent.about.intro
  const groups = [...new Set(routes.filter((r) => r.group !== '정보').map((r) => r.group))]

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

      <p className="mt-8 text-sm text-slate-500">
        문의: <a href="mailto:hyunbo.hwang@chungchy.com" className="text-emerald-700 underline">hyunbo.hwang@chungchy.com</a>
      </p>
    </div>
  )
}
