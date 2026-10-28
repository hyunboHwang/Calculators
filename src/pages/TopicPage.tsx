import routes from '../routes.json'
import { pageContent } from '../lib/pageContent'
import { topics } from '../lib/topics'

type Content = {
  intro?: string[]
  faqs?: { q: string; a: string }[]
  updatedAt?: string
}
const content = pageContent as Record<string, Content>

const hubId = (slug: string) => 'topic' + slug[0].toUpperCase() + slug.slice(1)

export default function TopicPage({
  pageId,
  navigate,
}: {
  pageId: string
  navigate: (to: string) => void
}) {
  const topic = topics.find((t) => hubId(t.slug) === pageId)
  if (!topic) return <div />
  const { intro = [], faqs = [] } = content[pageId] ?? {}
  const members = topic.members.flatMap((id) => routes.find((r) => r.id === id) ?? [])
  const guides = members.filter((r) => r.group === '가이드')
  const calcs = members.filter((r) => r.group !== '가이드')

  const link = (to: string, text: string, cls = '') => (
    <a
      href={`${to}/`}
      onClick={(e) => {
        e.preventDefault()
        navigate(to)
      }}
      className={cls || 'underline decoration-rule underline-offset-2 hover:text-accent'}
    >
      {text}
    </a>
  )

  return (
    <article className="max-w-3xl text-body">
      <nav aria-label="현재 위치" className="text-xs text-muted">
        {link('/', '홈')} › <span>{topic.label}</span>
      </nav>
      <h1 className="mt-3 font-serif text-3xl font-bold text-ink">{topic.label}</h1>
      <p className="mt-2 text-sm text-muted">{topic.summary}</p>
      <div className="mt-6 space-y-4 leading-relaxed">
        {intro.map((p) => (
          <p key={p.slice(0, 20)}>{p}</p>
        ))}
      </div>

      {guides.length > 0 && (
        <section className="mt-10" aria-labelledby="topic-guides">
          <h2 id="topic-guides" className="font-serif text-xl font-bold text-ink">이 주제의 가이드</h2>
          <ul className="mt-3 border-t border-rule">
            {guides.map((g) => (
              <li key={g.id} className="border-b border-rule py-3">
                {link(g.path, g.label, 'font-medium text-ink hover:text-accent')}
                <p className="mt-1 text-sm text-muted">{g.description}</p>
                {content[g.id]?.updatedAt && (
                  <p className="mt-1 text-xs text-muted">
                    최종 업데이트 {content[g.id].updatedAt!.replaceAll('-', '. ')}.
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {calcs.length > 0 && (
        <section className="mt-10" aria-labelledby="topic-calcs">
          <h2 id="topic-calcs" className="font-serif text-xl font-bold text-ink">이 주제의 계산기</h2>
          <ul className="mt-3 border-t border-rule">
            {calcs.map((c) => (
              <li key={c.id} className="border-b border-rule py-2.5 text-sm">
                {link(c.path, c.label, 'font-medium text-ink hover:text-accent')}
                <span className="text-muted"> — {c.description}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {faqs.length > 0 && (
        <section className="mt-10" aria-labelledby="topic-faq">
          <h2 id="topic-faq" className="font-serif text-xl font-bold text-ink">자주 묻는 질문</h2>
          <dl className="mt-3 space-y-4">
            {faqs.map((f) => (
              <div key={f.q}>
                <dt className="font-medium text-ink">{f.q}</dt>
                <dd className="mt-1 text-sm leading-relaxed">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <nav aria-label="다른 주제" className="mt-10 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-rule pt-4 text-sm">
        <span className="text-muted">다른 주제</span>
        {topics
          .filter((t) => t.id !== topic.id)
          .map((t) => (
            <span key={t.id}>{link(t.path, t.label)}</span>
          ))}
      </nav>
      <p className="mt-3 text-xs text-muted">
        작성·운영: 계산기 운영자(1인 개발자) · {link('/about', '운영자 소개')} ·{' '}
        {link('/verification', '검증 방식')}
      </p>
    </article>
  )
}
