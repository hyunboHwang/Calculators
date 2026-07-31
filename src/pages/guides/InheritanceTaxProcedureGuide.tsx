import GuideArticlePage from '../../components/GuideArticlePage'

export default function InheritanceTaxProcedureGuide() {
  return (
    <GuideArticlePage
      pageId="inheritanceTaxProcedureGuide"
      relatedCalculators={[{ label: '상속세 계산기', path: '/inheritance-tax' }]}
    />
  )
}
