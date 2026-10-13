import routes from '../routes.json'
import { pageContent } from '../lib/pageContent'
import InfoSection from './InfoSection'

const content = pageContent as Record<
  string,
  { updatedAt?: string; changelog?: { date: string; text: string }[] }
>

export default function GuideArticlePage({ pageId }: { pageId: string }) {
  const route = routes.find((r) => r.id === pageId)
  const { updatedAt, changelog } = content[pageId] ?? {}

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold">{route?.label}</h1>
      {updatedAt && (
        <>
          <p className="mt-1 text-xs text-slate-500">
            최종 업데이트: <time dateTime={updatedAt}>{updatedAt.replaceAll('-', '. ')}.</time>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            작성·운영: 계산기 운영자(1인 개발자) ·{' '}
            <a href="/about/" className="underline underline-offset-2">운영자 소개</a> ·{' '}
            <a href="/verification/" className="underline underline-offset-2">검증 방식</a>
          </p>
        </>
      )}
      <InfoSection pageId={pageId} />
      {changelog && changelog.length > 0 && (
        <section className="mt-8 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-bold text-slate-800">변경 이력</h2>
          <ul className="mt-2 space-y-1 text-xs text-slate-600">
            {changelog.map((l) => (
              <li key={l.date + l.text}>
                <time dateTime={l.date}>{l.date.replaceAll('-', '. ')}.</time> — {l.text}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
