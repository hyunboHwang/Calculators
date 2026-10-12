import routes from '../routes.json'
import { pageContent } from '../lib/pageContent'
import InfoSection from './InfoSection'

const content = pageContent as Record<string, { updatedAt?: string }>

export default function GuideArticlePage({ pageId }: { pageId: string }) {
  const route = routes.find((r) => r.id === pageId)
  const updatedAt = content[pageId]?.updatedAt

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold">{route?.label}</h1>
      {updatedAt && (
        <p className="mt-1 text-xs text-slate-500">
          최종 업데이트: <time dateTime={updatedAt}>{updatedAt.replaceAll('-', '. ')}.</time>
        </p>
      )}
      <InfoSection pageId={pageId} />
    </div>
  )
}
