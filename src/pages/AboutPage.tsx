import { pageContent } from '../lib/pageContent'
import routes from '../routes.json'
import GROUP_ORDER from '../groups.json'
import { GUIDE_TRACKS } from './GuidesIndexPage'

export default function AboutPage() {
  const operatorParas: string[] = pageContent.about.operatorIntro
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
      <h1 className="font-serif text-3xl font-bold text-ink">계산기 소개</h1>

      <section className="mt-6 border border-rule bg-paper p-5">
        <h2 className="font-serif text-xl font-bold text-ink">운영자 소개</h2>
        {operatorParas.map((p, i) => (
          <p key={i} className="mt-3 text-sm leading-relaxed text-body">
            {p}
          </p>
        ))}
        <a
          href="/verification/"
          className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-accent underline decoration-accent underline-offset-2 hover:text-accent"
        >
          계산기 검증 방식 자세히 보기 →
        </a>
      </section>

      {paras.map((p, i) => (
        <p key={i} className="mt-4 text-sm leading-relaxed text-body">
          {p}
        </p>
      ))}

      <h2 className="mt-8 font-serif text-xl font-bold text-ink">제공하는 계산기</h2>
      <div className="mt-3 space-y-3">
        {groups.map((g) => (
          <p key={g} className="text-sm leading-relaxed text-body">
            <b className="text-ink">{g}</b> —{' '}
            {routes
              .filter((r) => r.group === g)
              .map((r) => r.label)
              .join(', ')}
          </p>
        ))}
      </div>

      <h2 className="mt-8 font-serif text-xl font-bold text-ink">제공하는 가이드</h2>
      <div className="mt-3 space-y-3">
        {GUIDE_TRACKS.map((track) => (
          <p key={track.title} className="text-sm leading-relaxed text-body">
            <b className="text-ink">{track.title}</b> —{' '}
            {track.ids
              .map((id) => routes.find((r) => r.id === id)?.label)
              .filter(Boolean)
              .join(', ')}
          </p>
        ))}
      </div>

      {faqs.length > 0 && (
        <>
          <h2 className="mt-8 font-serif text-xl font-bold text-ink">자주 묻는 질문</h2>
          <div className="mt-3 space-y-2">
            {faqs.map((f) => (
              <details
                key={f.q}
                className="group border border-rule bg-paper p-4 transition-colors open:border-accent open:bg-tint"
              >
                <summary className="flex cursor-pointer list-none items-start justify-between gap-3 text-sm font-semibold text-ink marker:content-none">
                  <span>
                    <span className="mr-1.5 text-accent">Q.</span>
                    {f.q}
                  </span>
                  <svg
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                    className="mt-0.5 h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-180"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.23 7.21a.75.75 0 011.06.02L10 11.148l3.71-3.918a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                      clipRule="evenodd"
                    />
                  </svg>
                </summary>
                <p className="mt-2 pl-6 text-sm leading-relaxed text-body">{f.a}</p>
              </details>
            ))}
          </div>
        </>
      )}

      <p className="mt-6 text-xs text-muted">최근 업데이트: 2026년 8월</p>

      <p className="mt-8 text-sm text-muted">
        문의: <a href="mailto:hwang177@gmail.com" className="text-accent underline">hwang177@gmail.com</a>
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
