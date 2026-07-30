import GuideArticlePage from '../../components/GuideArticlePage'

export default function YearEndTaxProcedureGuide() {
  return (
    <GuideArticlePage
      pageId="yearEndTaxProcedureGuide"
      relatedCalculators={[{ label: '연말정산 환급액 계산기', path: '/year-end-tax' }]}
    />
  )
}
