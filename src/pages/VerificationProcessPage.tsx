import { pageContent } from '../lib/pageContent'

export default function VerificationProcessPage() {
  const paras: string[] = pageContent.verificationProcess.intro
  const STEPS: { icon: string; title: string; desc: string }[] = pageContent.verificationProcess.steps
  const CORRECTIONS: { title: string; desc: string }[] = pageContent.verificationProcess.corrections
  const faqs: { q: string; a: string }[] = pageContent.verificationProcess.faqs

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
      <h1 className="text-2xl font-bold">계산기 검증 방식</h1>
      {paras.map((p, i) => (
        <p key={i} className="mt-4 text-sm leading-relaxed text-slate-600">
          {p}
        </p>
      ))}

      <h2 className="mt-8 text-lg font-bold">검증 5단계</h2>
      <div className="mt-4 space-y-3">
        {STEPS.map((s, i) => (
          <div key={s.title} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-base">
                <span aria-hidden="true">{s.icon}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="mt-1 w-px flex-1 bg-slate-200" aria-hidden="true" />
              )}
            </div>
            <div className="pb-3">
              <p className="text-sm font-semibold text-slate-800">
                {i + 1}. {s.title}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <h2 className="mt-8 text-lg font-bold">실제 오류 발견·수정 사례</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-500">
        이 절차를 거쳐 실제로 발견하고 고친 사례 일부입니다. 완벽함을 주장하는 대신, 오류를
        발견하고 고치는 과정 자체를 투명하게 공개합니다.
      </p>
      <div className="mt-3 space-y-2">
        {CORRECTIONS.map((c) => (
          <div key={c.title} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-800">{c.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">{c.desc}</p>
          </div>
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

      <p className="mt-8 text-sm text-slate-500">
        운영자 소개와 문의 방법은{' '}
        <a
          href="/about/"
          className="font-medium text-emerald-700 underline decoration-emerald-300 underline-offset-2 hover:text-emerald-800"
        >
          소개 페이지
        </a>
        에서 확인할 수 있습니다.
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
