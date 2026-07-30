import GuideArticlePage from '../../components/GuideArticlePage'

export default function SeveranceInterimGuide() {
  return (
    <GuideArticlePage
      pageId="severanceInterimGuide"
      relatedCalculators={[{ label: '퇴직금 계산기', path: '/severance' }]}
    />
  )
}
