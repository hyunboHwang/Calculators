import GuideArticlePage from '../../components/GuideArticlePage'

export default function SubscriptionRankGuide() {
  return (
    <GuideArticlePage
      pageId="subscriptionRankGuide"
      relatedCalculators={[{ label: '청약순위 계산기', path: '/subscription-rank' }]}
    />
  )
}
