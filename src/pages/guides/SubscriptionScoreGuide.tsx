import GuideArticlePage from '../../components/GuideArticlePage'

export default function SubscriptionScoreGuide() {
  return (
    <GuideArticlePage
      pageId="subscriptionScoreGuide"
      relatedCalculators={[{ label: '청약가점 계산기', path: '/subscription-score' }]}
    />
  )
}
