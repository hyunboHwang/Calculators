import { pageContent } from '../lib/pageContent'
import routes from '../routes.json'
import GROUP_ORDER from '../groups.json'
import { GUIDE_TRACKS } from './GuidesIndexPage'

export default function AboutPage() {
  const paras: string[] = pageContent.about.intro
  const faqs: { q: string; a: string }[] = pageContent.about.faqs
  const groups = [...new Set(routes.filter((r) => GROUP_ORDER.includes(r.group)).map((r) => r.group))]

  const faqJsonLd =
    faqs.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faqs.map((f) => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a },
          })),
        }
      : null

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

      {faqs.length > 0 && (
        <>
          <h2 className="mt-8 text-lg font-bold">자주 묻는 질문</h2>
          <div className="mt-3 space-y-2">
            {faqs.map((f) => (
              <details
                key={f.q}
                className="group rounded-xl border border-slate-200 bg-white p-4 transition-colors open:border-emerald-200 open:bg-emerald-50/30"
              >
                <summary className="flex cursor-pointer list-none items-start justify-between gap-3 text-sm font-semibold text-slate-800 marker:content-none">
                  <span>
                    <span className="mr-1.5 text-emerald-600">Q.</span>
                    {f.q}
                  </span>
                  <svg
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                    className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.23 7.21a.75.75 0 011.06.02L10 11.148l3.71-3.918a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                      clipRule="evenodd"
                    />
                  </svg>
                </summary>
                <p className="mt-2 pl-6 text-sm leading-relaxed text-slate-600">{f.a}</p>
              </details>
            ))}
          </div>
        </>
      )}

      <p className="mt-6 text-xs text-slate-400">최근 업데이트: 2026년 8월</p>

      <p className="mt-8 text-sm text-slate-500">
        문의: <a href="mailto:hwang177@gmail.com" className="text-emerald-700 underline">hwang177@gmail.com</a>
      </p>

      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}
    </div>
  )
}
