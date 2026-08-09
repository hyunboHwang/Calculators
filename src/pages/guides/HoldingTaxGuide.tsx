import GuideArticlePage from '../../components/GuideArticlePage'

export default function HoldingTaxGuide() {
  return (
    <GuideArticlePage
      pageId="holdingTaxGuide"
      relatedCalculators={[
        { label: '재산세 계산기', path: '/property-tax' },
        { label: '종합부동산세 계산기', path: '/comprehensive-real-estate-tax' },
      ]}
    />
  )
}
