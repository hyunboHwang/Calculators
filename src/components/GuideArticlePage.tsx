import routes from '../routes.json'
import InfoSection from './InfoSection'

export default function GuideArticlePage({ pageId }: { pageId: string }) {
  const route = routes.find((r) => r.id === pageId)

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold">{route?.label}</h1>
      <InfoSection pageId={pageId} />
    </div>
  )
}
