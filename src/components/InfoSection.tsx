import { pageContent } from '../lib/pageContent'

/**
 * 페이지 하단 설명 + FAQ 섹션.
 * FAQ는 구글 리치 결과용 FAQPage 구조화 데이터(JSON-LD)로도 출력됩니다.
 */
export default function InfoSection({ pageId }: { pageId: string }) {
  const c = pageContent[pageId]
  if (!c) return null

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: c.faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }

  return (
    <div className="mt-12 border-t border-slate-200 pt-8">
      <section>
        <h2 className="text-lg font-bold">알아두면 좋은 것</h2>
        {c.intro.map((p, i) => (
          <p key={i} className="mt-3 text-sm leading-relaxed text-slate-600">
            {p}
          </p>
        ))}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold">자주 묻는 질문</h2>
        <div className="mt-3 space-y-2">
          {c.faqs.map((f) => (
            <details key={f.q} className="group rounded-xl border border-slate-200 bg-white p-4">
              <summary className="cursor-pointer list-none text-sm font-semibold text-slate-800">
                <span className="mr-1.5 text-emerald-600">Q.</span>
                {f.q}
              </summary>
              <p className="mt-2 pl-6 text-sm leading-relaxed text-slate-600">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </div>
  )
}
