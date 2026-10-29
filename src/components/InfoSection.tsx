import { pageContent } from '../lib/pageContent'
import AdSlot from './AdSlot'
import { tablesFor } from '../lib/tables'
import { SLOTS } from '../lib/ads'

interface PageInfo {
  intro: string[]
  faqs: { q: string; a: string }[]
  formula?: { title: string; steps: string[] }
  glossary?: { term: string; definition: string }[]
  examples?: { title: string; result: string }[]
  sources?: { label: string; url: string }[]
  highlights?: { icon: string; label: string; text: string }[]
  stepChips?: { icon: string; label: string }[]
  verification?: { basis: string; lastVerified: string; scope: string; excludes: string }
  relatedGuides?: { label: string; path: string }[]
  relatedCalculators?: { label: string; path: string }[]
  hidden?: boolean
}

const content = pageContent as Record<string, PageInfo>
const verificationSteps: { title: string; desc: string }[] =
  (pageContent as Record<string, { steps?: { title: string; desc: string }[] }>).verificationProcess
    ?.steps ?? []

const stripStepNumber = (s: string) => s.replace(/^\d+\.\s+/, '')

/**
 * 페이지 하단 설명 + FAQ 섹션.
 * FAQ는 구글 리치 결과용 FAQPage JSON-LD로, formula는 HowTo JSON-LD로도 출력됩니다.
 */
export default function InfoSection({ pageId, guide = false }: { pageId: string; guide?: boolean }) {
  const c = content[pageId]
  if (!c || c.hidden) return null
  const tables = tablesFor(pageId)

  const faqJsonLd =
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
    <div className={guide ? 'mt-6' : 'mt-14 border-t border-ink pt-8'}>
      {c.verification && (
        <section className="mb-8 border-l-[3px] border-accent bg-tint px-4 py-3">
          <h2 className="font-serif text-base font-bold text-ink">계산 기준</h2>
          <dl className="mt-3 space-y-1.5 text-[13px] leading-[1.7]">
            <div className="flex gap-2">
              <dt className="w-24 shrink-0 text-muted">적용 기준</dt>
              <dd className="text-body">{c.verification.basis}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-24 shrink-0 text-muted">마지막 검증</dt>
              <dd className="text-body">{c.verification.lastVerified}</dd>
            </div>
            {c.sources && c.sources.length > 0 && (
              <div className="flex gap-2">
                <dt className="w-24 shrink-0 text-muted">공식 자료</dt>
                <dd className="text-body">{c.sources.map((s) => s.label).join(' / ')}</dd>
              </div>
            )}
            <div className="flex gap-2">
              <dt className="w-24 shrink-0 text-muted">계산 대상</dt>
              <dd className="text-body">{c.verification.scope}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-24 shrink-0 text-muted">제외 사항</dt>
              <dd className="text-body">{c.verification.excludes}</dd>
            </div>
          </dl>

          {verificationSteps.length > 0 && (
            <details className="group mt-4 border border-rule bg-paper p-3">
              <summary className="cursor-pointer list-none text-sm font-semibold text-ink marker:content-none">
                이 계산기는 어떻게 검증했나요?{' '}
                <span className="text-accent transition-transform group-open:rotate-180">▾</span>
              </summary>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs leading-relaxed text-body">
                {verificationSteps.map((s, i) => (
                  <li key={i}>
                    <b>{s.title}</b> — {s.desc}
                  </li>
                ))}
              </ol>
              <a
                href="/verification/"
                className="mt-2 inline-block text-xs font-medium text-accent underline underline-offset-2"
              >
                전체 검증 방식·실제 수정 사례 보기 →
              </a>
            </details>
          )}
        </section>
      )}

      {c.highlights && c.highlights.length > 0 && (
        <section className="mb-8 grid grid-cols-2 gap-3">
          {c.highlights.map((h, i) => (
            <div key={i} className="border border-rule p-3">
              <p className="text-xs font-bold text-ink">{h.label}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted">{h.text}</p>
            </div>
          ))}
        </section>
      )}

      <section>
        <h2 className="font-serif text-lg font-bold text-ink">
            알아두면 좋은 것
        </h2>
        {c.intro.map((p, i) => (
          <p key={i} className="mt-3 text-[15px] leading-[1.9] text-body">
            {p}
          </p>
        ))}
      </section>

      {c.formula && (
        <section className="mt-8 border-t border-rule pt-6">
          <h2 className="font-serif text-lg font-bold text-ink">
            {c.formula.title}
          </h2>
          {c.stepChips && c.stepChips.length > 0 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {c.stepChips.map((chip, i) => (
                <span
                  key={i}
                  className="shrink-0 whitespace-nowrap border border-ink px-3 py-1.5 text-xs font-semibold text-ink"
                >
                  {chip.label}
                </span>
              ))}
            </div>
          )}
          <ol className={c.stepChips && c.stepChips.length > 0 ? 'mt-4 space-y-2' : 'mt-3 space-y-2'}>
            {c.formula.steps.map((step, i) => (
              <li key={i} className="flex gap-2 text-sm leading-relaxed text-body">
                <span className="shrink-0 font-semibold text-accent">{i + 1}.</span>
                <span>{stripStepNumber(step)}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <AdSlot key={`${pageId}-article`} slot={SLOTS.inArticle} className="my-8 min-h-[280px]" />

      {tables.map((t) => (
        <section key={t.title} className="mt-8">
          <h2 className="font-serif text-lg font-bold text-ink">{t.title}</h2>
          <div className="mt-3 overflow-x-auto border border-rule">
            <table className="w-full min-w-max text-left text-sm">
              <thead className="bg-tint text-xs text-muted">
                <tr>
                  {t.headers.map((h) => (
                    <th key={h} className="px-3 py-2 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-rule text-body">
                {t.rows.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td key={j} className="px-3 py-2">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {t.note && <p className="mt-2 text-xs text-muted">{t.note}</p>}
        </section>
      ))}

      {c.glossary && c.glossary.length > 0 && (
        <section className="mt-8 border-t border-rule pt-6">
          <h2 className="font-serif text-lg font-bold text-ink">
            용어 설명
          </h2>
          <dl className="mt-3 space-y-3">
            {c.glossary.map((g) => (
              <div key={g.term}>
                <dt className="text-sm font-semibold text-ink">{g.term}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-body">{g.definition}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {c.examples && c.examples.length > 0 && (
        <section className="mt-8 border-t border-rule pt-6">
          <h2 className="font-serif text-lg font-bold text-ink">
            숫자로 보는 예시
          </h2>
          <div className="mt-3 space-y-2">
            {c.examples.map((ex, i) => (
              <div key={i} className="border border-rule p-4">
                <p className="text-sm font-semibold text-ink">{ex.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-body">{ex.result}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {c.faqs.length > 0 && (
        <section className="mt-8 border-t border-rule pt-6">
          <h2 className="font-serif text-lg font-bold text-ink">
            자주 묻는 질문
          </h2>
          <div className="mt-3 space-y-2">
            {c.faqs.map((f) => (
              <details
                key={f.q}
                className="group border border-rule p-4 open:bg-tint"
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
        </section>
      )}

      {c.sources && c.sources.length > 0 && (
        <section className="mt-8 border-t border-rule pt-6">
          <h2 className="font-serif text-lg font-bold text-ink">
            참고 자료
          </h2>
          <ul className="mt-3 space-y-1">
            {c.sources.map((s) => (
              <li key={s.url}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-accent underline underline-offset-2"
                >
                  {s.label} ↗
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {c.relatedGuides && c.relatedGuides.length > 0 && (
        <section className="mt-8 border-t border-ink pt-6">
          <h2 className="font-serif text-lg font-bold text-ink">관련 가이드</h2>
          <ul className="mt-3 space-y-1">
            {c.relatedGuides.map((g) => (
              <li key={g.path}>
                <a
                  href={`${g.path}/`}
                  className="text-sm font-medium text-accent underline underline-offset-2"
                >
                  {g.label} →
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {c.relatedCalculators && c.relatedCalculators.length > 0 && (
        <section className="mt-8 border-t border-ink pt-6">
          <h2 className="font-serif text-lg font-bold text-ink">관련 계산기</h2>
          <ul className="mt-3 space-y-1">
            {c.relatedCalculators.map((cal) => (
              <li key={cal.path}>
                <a
                  href={`${cal.path}/`}
                  className="text-sm font-medium text-accent underline underline-offset-2"
                >
                  {cal.label} →
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}
    </div>
  )
}
