import GuideArticlePage from '../../components/GuideArticlePage'

export default function GiftTaxProcedureGuide() {
  return (
    <GuideArticlePage
      pageId="giftTaxProcedureGuide"
      relatedCalculators={[{ label: '증여세 계산기', path: '/gift-tax' }]}
    />
  )
}
