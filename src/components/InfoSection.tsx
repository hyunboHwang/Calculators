import { pageContent } from '../lib/pageContent'
import AdSlot from './AdSlot'
import { SLOTS } from '../lib/ads'

interface PageInfo {
  intro: string[]
  faqs: { q: string; a: string }[]
  hidden?: boolean
}

const content = pageContent as Record<string, PageInfo>

/**
 * 페이지 하단 설명 + FAQ 섹션.
 * FAQ는 구글 리치 결과용 FAQPage 구조화 데이터(JSON-LD)로도 출력됩니다.
 */
export default function InfoSection({ pageId }: { pageId: string }) {
  const c = content[pageId]
  if (!c || c.hidden) return null

  const jsonLd =
    c.faqs.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: c.faqs.map((f) => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a },
          })),
        }
      : null

  return (
    <div className="mt-14 border-t border-slate-200 pt-8">
      <section>
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <span className="h-4 w-1 rounded-full bg-emerald-500" aria-hidden="true" />
          알아두면 좋은 것
        </h2>
        {c.intro.map((p, i) => (
          <p key={i} className="mt-3 text-sm leading-relaxed text-slate-600">
            {p}
          </p>
        ))}
      </section>

      <AdSlot key={`${pageId}-article`} slot={SLOTS.inArticle} className="my-8" />

      {c.faqs.length > 0 && (
        <section className="mt-8">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <span className="h-4 w-1 rounded-full bg-emerald-500" aria-hidden="true" />
            자주 묻는 질문
          </h2>
          <div className="mt-3 space-y-2">
            {c.faqs.map((f) => (
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
        </section>
      )}

      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
    </div>
  )
}
