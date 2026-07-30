import routes from '../routes.json'
import InfoSection from './InfoSection'

interface RelatedCalculator {
  label: string
  path: string
}

export default function GuideArticlePage({
  pageId,
  relatedCalculators,
}: {
  pageId: string
  relatedCalculators?: RelatedCalculator[]
}) {
  const route = routes.find((r) => r.id === pageId)

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold">{route?.label}</h1>
      <InfoSection pageId={pageId} />
      {relatedCalculators && relatedCalculators.length > 0 && (
        <div className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50/40 p-5">
          <h2 className="text-sm font-semibold text-slate-800">관련 계산기</h2>
          <ul className="mt-2 space-y-1">
            {relatedCalculators.map((c) => (
              <li key={c.path}>
                <a
                  href={`${c.path}/`}
                  className="text-sm text-emerald-700 underline decoration-emerald-300 underline-offset-2 hover:text-emerald-800"
                >
                  {c.label} →
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
