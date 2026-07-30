import GuideArticlePage from '../../components/GuideArticlePage'

export default function JeonseDepositRecoveryGuide() {
  return (
    <GuideArticlePage
      pageId="jeonseDepositRecoveryGuide"
      relatedCalculators={[{ label: '전월세 전환율 계산기', path: '/jeonse-conversion' }]}
    />
  )
}
