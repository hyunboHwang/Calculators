import { useEffect, useRef, useState } from 'react'
import routes from '../routes.json'
import { pageContent } from '../lib/pageContent'
import { topicOf } from '../lib/topics'
import InfoSection from './InfoSection'

const content = pageContent as Record<
  string,
  { updatedAt?: string; changelog?: { date: string; text: string }[] }
>

type TocItem = { id: string; text: string }

export default function GuideArticlePage({ pageId }: { pageId: string }) {
  const route = routes.find((r) => r.id === pageId)
  const { updatedAt, changelog } = content[pageId] ?? {}
  const topic = topicOf(pageId)
  const articleRef = useRef<HTMLElement>(null)
  const [toc, setToc] = useState<TocItem[]>([])

  // 본문 h2를 마운트 후 수집해 차례를 만든다(프리렌더 HTML에는 차례 없음). ponytail: 한 번만 수집, 본문이 동적으로 바뀌면 재수집 필요.
  useEffect(() => {
    const used = new Set<string>()
    const items: TocItem[] = []
    articleRef.current?.querySelectorAll('h2').forEach((h) => {
      const text = (h.textContent ?? '').trim()
      if (!text) return
      const base = h.id || text.replace(/\s+/g, '-').replace(/[^\p{L}\p{N}-]/gu, '') || 'section'
      let id = base
      for (let n = 2; used.has(id); n++) id = `${base}-${n}`
      used.add(id)
      h.id = id
      items.push({ id, text })
    })
    setToc(items)
  }, [pageId])

  return (
    <div className="lg:grid lg:grid-cols-[170px_1fr] lg:gap-10">
      <nav
        aria-label="이 글의 차례"
        className="sticky top-6 hidden self-start border-t border-ink pt-2.5 text-[12.5px] leading-normal text-body lg:block"
      >
        <p className="font-semibold text-ink">이 글의 차례</p>
        {toc.map((t) => (
          <a key={t.id} href={`#${t.id}`} className="block border-b border-rule py-1.5 hover:text-accent">
            {t.text}
          </a>
        ))}
      </nav>
      <article ref={articleRef} className="min-w-0 max-w-[640px] leading-[1.95]">
        <p className="text-xs text-muted">
          {topic ? (
            <a href={`${topic.path}/`} className="hover:text-accent">{topic.label}</a>
          ) : null}
          {topic ? ' › ' : ''}가이드
        </p>
        <h1 className="mt-2 font-serif text-[28px] font-bold leading-snug text-ink">{route?.label}</h1>
        {updatedAt && (
          <p className="mt-4 mb-5 flex flex-wrap gap-x-5 gap-y-1 border-t border-ink border-b border-b-rule py-2 text-xs leading-normal text-muted">
            <span>
              최종 업데이트 <time dateTime={updatedAt}>{updatedAt.replaceAll('-', '. ')}.</time>
            </span>
            <span>
              작성·운영 계산기 운영자(1인 개발자) ·{' '}
              <a href="/about/" className="underline underline-offset-2">운영자 소개</a> ·{' '}
              <a href="/verification/" className="underline underline-offset-2">검증 방식</a>
            </span>
            {changelog && changelog.length > 0 && <span>변경 이력 {changelog.length}건</span>}
          </p>
        )}
        <InfoSection pageId={pageId} guide />
        {changelog && changelog.length > 0 && (
          <section className="mt-8 border-t border-rule pt-6">
            <h2 className="font-serif text-lg font-bold text-ink">변경 이력</h2>
            <ul className="mt-2 space-y-1 text-xs leading-normal text-body">
              {changelog.map((l) => (
                <li key={l.date + l.text}>
                  <time dateTime={l.date}>{l.date.replaceAll('-', '. ')}.</time> — {l.text}
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>
    </div>
  )
}
