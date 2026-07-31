import GuideArticlePage from '../../components/GuideArticlePage'

export default function PensionTaxCreditGuide() {
  return (
    <GuideArticlePage
      pageId="pensionTaxCreditGuide"
      relatedCalculators={[{ label: '연금저축·IRP 세액공제 계산기', path: '/pension-tax-credit' }]}
    />
  )
}
