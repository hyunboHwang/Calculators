import GuideArticlePage from '../../components/GuideArticlePage'

export default function UnemploymentApplicationGuide() {
  return (
    <GuideArticlePage
      pageId="unemploymentApplicationGuide"
      relatedCalculators={[{ label: '실업급여 계산기', path: '/unemployment' }]}
    />
  )
}
