import { lazy, Suspense, useEffect, useState } from 'react'
import routes from './routes.json'
import popularLinks from './popularLinks.json'
import AdSlot from './components/AdSlot'
import InfoSection from './components/InfoSection'
import Masthead from './components/Masthead'
import { SLOTS, loadAdsense } from './lib/ads'
import { LIFE_IDS } from './lib/topics'
import { loadAnalytics, trackPageView } from './lib/analytics'

/** 라우트별 코드 스플리팅: 방문한 계산기의 JS만 내려받도록 지연 로드 */
const components: Record<string, React.LazyExoticComponent<() => React.JSX.Element>> = {
  margin: lazy(() => import('./pages/MarginCalculator')),
  bizTax: lazy(() => import('./pages/BizTaxCalculator')),
  salary: lazy(() => import('./pages/SalaryCalculator')),
  salaryTable: lazy(() => import('./pages/SalaryTableCalculator')),
  raise: lazy(() => import('./pages/RaiseComparator')),
  severance: lazy(() => import('./pages/SeveranceCalculator')),
  yearEndTax: lazy(() => import('./pages/YearEndTaxCalculator')),
  unemployment: lazy(() => import('./pages/UnemploymentCalculator')),
  parentalLeave: lazy(() => import('./pages/ParentalLeaveCalculator')),
  freelanceTax: lazy(() => import('./pages/FreelanceTaxCalculator')),
  annualLeave: lazy(() => import('./pages/AnnualLeaveCalculator')),
  age: lazy(() => import('./pages/AgeCalculator')),
  celebration: lazy(() => import('./pages/CelebrationCalculator')),
  insuranceAge: lazy(() => import('./pages/InsuranceAgeCalculator')),
  pensionAge: lazy(() => import('./pages/PensionAgeCalculator')),
  loan: lazy(() => import('./pages/LoanCalculator')),
  dsr: lazy(() => import('./pages/DsrCalculator')),
  prepayment: lazy(() => import('./pages/PrepaymentCalculator')),
  refinance: lazy(() => import('./pages/RefinanceCalculator')),
  partTime: lazy(() => import('./pages/PartTimeCalculator')),
  dday: lazy(() => import('./pages/DdayCalculator')),
  dateCalc: lazy(() => import('./pages/DateCalculator')),
  discharge: lazy(() => import('./pages/DischargeCalculator')),
  dueDate: lazy(() => import('./pages/DueDateCalculator')),
  stockReturn: lazy(() => import('./pages/StockReturnCalculator')),
  averagePrice: lazy(() => import('./pages/AveragePriceCalculator')),
  dividend: lazy(() => import('./pages/DividendCalculator')),
  compound: lazy(() => import('./pages/CompoundCalculator')),
  usStockTax: lazy(() => import('./pages/UsStockTaxCalculator')),
  lossRecovery: lazy(() => import('./pages/LossRecoveryCalculator')),
  deposit: lazy(() => import('./pages/DepositCalculator')),
  acquisitionTax: lazy(() => import('./pages/AcquisitionTaxCalculator')),
  propertyTax: lazy(() => import('./pages/PropertyTaxCalculator')),
  comprehensiveRealEstateTax: lazy(() => import('./pages/ComprehensiveRealEstateTaxCalculator')),
  carTax: lazy(() => import('./pages/CarTaxCalculator')),
  carAcquisitionTax: lazy(() => import('./pages/CarAcquisitionTaxCalculator')),
  bmi: lazy(() => import('./pages/BmiCalculator')),
  jeonseConversion: lazy(() => import('./pages/JeonseConversionCalculator')),
  inheritanceTax: lazy(() => import('./pages/InheritanceTaxCalculator')),
  giftTax: lazy(() => import('./pages/GiftTaxCalculator')),
  subscriptionScore: lazy(() => import('./pages/SubscriptionScoreCalculator')),
  subscriptionRank: lazy(() => import('./pages/SubscriptionRankCalculator')),
  managementFee: lazy(() => import('./pages/ManagementFeeCalculator')),
  movingCost: lazy(() => import('./pages/MovingCostCalculator')),
  pensionTaxCredit: lazy(() => import('./pages/PensionTaxCreditCalculator')),
  generalCalculator: lazy(() => import('./pages/GeneralCalculator')),
  guidesIndex: lazy(() => import('./pages/GuidesIndexPage')),
  yearEndTaxProcedureGuide: lazy(() => import('./pages/guides/YearEndTaxProcedureGuide')),
  yearEndTax2026Guide: lazy(() => import('./pages/guides/YearEndTax2026Guide')),
  jeonseDepositRecoveryGuide: lazy(() => import('./pages/guides/JeonseDepositRecoveryGuide')),
  severanceInterimGuide: lazy(() => import('./pages/guides/SeveranceInterimGuide')),
  unemploymentApplicationGuide: lazy(() => import('./pages/guides/UnemploymentApplicationGuide')),
  youthRentSubsidyGuide: lazy(() => import('./pages/guides/YouthRentSubsidyGuide')),
  youthLeapAccountGuide: lazy(() => import('./pages/guides/YouthLeapAccountGuide')),
  youthJeonseLoanGuide: lazy(() => import('./pages/guides/YouthJeonseLoanGuide')),
  nationalEmploymentSupportGuide: lazy(() => import('./pages/guides/NationalEmploymentSupportGuide')),
  inheritanceTaxProcedureGuide: lazy(() => import('./pages/guides/InheritanceTaxProcedureGuide')),
  giftTaxProcedureGuide: lazy(() => import('./pages/guides/GiftTaxProcedureGuide')),
  subscriptionScoreGuide: lazy(() => import('./pages/guides/SubscriptionScoreGuide')),
  subscriptionRankGuide: lazy(() => import('./pages/guides/SubscriptionRankGuide')),
  pensionTaxCreditGuide: lazy(() => import('./pages/guides/PensionTaxCreditGuide')),
  holdingTaxGuide: lazy(() => import('./pages/guides/HoldingTaxGuide')),
  glossaryHub: lazy(() => import('./pages/GlossaryPage')),
  about: lazy(() => import('./pages/AboutPage')),
  verificationProcess: lazy(() => import('./pages/VerificationProcessPage')),
  privacy: lazy(() => import('./pages/PrivacyPage')),
  yutnori: lazy(() => import('./pages/YutnoriGame')),
}
const TopicPage = lazy(() => import('./pages/TopicPage'))
const HomePage = lazy(() => import('./pages/HomePage'))

/** 끝 슬래시 제거 정규화 */
const normalize = (p: string) => p.replace(/\/+$/, '') || '/'

function useRoute() {
  const [path, setPath] = useState(() => normalize(window.location.pathname))

  useEffect(() => {
    const onPop = () => setPath(normalize(window.location.pathname))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const navigate = (to: string) => {
    if (to !== path) {
      window.history.pushState({}, '', to)
      setPath(to)
      window.scrollTo(0, 0)
    }
  }

  const route = routes.find((r) => r.path === path) ?? routes[0]
  return { route, navigate }
}

/** 라우트 변경 시 title / description / canonical 갱신 */
function useSeo(route: (typeof routes)[number]) {
  useEffect(() => {
    document.title = route.title
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', route.description)
    // 접속 호스트(apex/www)와 무관하게 정식 호스트로 고정 — postbuild의 정적 canonical과 일치
    const url = 'https://www.calculators.ai.kr' + (route.path === '/' ? '/' : `${route.path}/`)
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', url)
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', route.title)
    document
      .querySelector('meta[property="og:description"]')
      ?.setAttribute('content', route.description)
    document.querySelector('meta[property="og:url"]')?.setAttribute('content', url)

    loadAnalytics()
    trackPageView(window.location.pathname, route.title)
  }, [route])
}

function App() {
  const { route, navigate } = useRoute()
  useSeo(route)
  useEffect(loadAdsense, []) // 자동 광고 (ADSENSE_CLIENT 설정 시에만 동작)
  const Current = components[route.id]
  const hideChrome = route.group === '게임' // 숨김 페이지(예: 윷놀이)는 좌측 메뉴·광고 없이 전체 폭으로 렌더

  return (
    <div className="min-h-screen bg-paper">
      {!hideChrome && <Masthead activeRouteId={route.id} onNavigate={navigate} />}
      <main className={hideChrome ? 'min-w-0 px-4 py-6 sm:px-6 sm:py-8' : 'mx-auto max-w-5xl px-4 py-8'}>
        <Suspense fallback={<div className="h-40 animate-pulse bg-tint" />}>
          {route.group === '주제' ? (
            <TopicPage pageId={route.id} navigate={navigate} />
          ) : route.id === 'home' ? (
            <HomePage navigate={navigate} />
          ) : (
            <Current />
          )}
          {/* 페이지·광고·푸터를 한 경계 안에 둬서, 지연 로드 중 아래 요소가 먼저 보였다 밀리는 CLS를 막는다 */}
          {!hideChrome && route.group !== '주제' && <AdSlot key={`${route.id}-mid`} slot={SLOTS.belowResult} />}
        {route.group !== '가이드' && route.group !== '주제' && <InfoSection pageId={route.id} />}
        {!hideChrome && <AdSlot key={`${route.id}-bottom`} slot={SLOTS.bottomOfPage} />}

        {!hideChrome && (
          <footer className="mt-14 border-t border-ink pt-5 pb-2 text-xs text-muted">
            {(
              [
                ['인기 계산기', popularLinks.calculators],
                ['인기 가이드', popularLinks.guides],
                ['생활 계산기', LIFE_IDS],
              ] as const
            ).map(([title, ids]) => (
              <nav key={title} aria-label={title} className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <span className="font-semibold text-ink">{title}</span>
                {routes
                  .filter((r) => (ids as readonly string[]).includes(r.id) && r.id !== route.id)
                  .map((r) => (
                    <a
                      key={r.id}
                      href={`${r.path === '/' ? '' : r.path}/`}
                      onClick={(e) => {
                        e.preventDefault()
                        navigate(r.path)
                      }}
                      className="text-body underline decoration-rule underline-offset-2 hover:text-accent"
                    >
                      {r.label}
                    </a>
                  ))}
              </nav>
            ))}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {routes
                .filter((r) => r.group === '정보' || r.id === 'glossaryHub')
                .map((r) => (
                  <a
                    key={r.id}
                    href={`${r.path}/`}
                    onClick={(e) => {
                      e.preventDefault()
                      navigate(r.path)
                    }}
                    className="font-medium text-body underline decoration-rule underline-offset-2 hover:text-accent hover:decoration-accent"
                  >
                    {r.label}
                  </a>
                ))}
            </div>
            <p className="mt-3 leading-relaxed">
              모든 계산 결과는 참고용 추정치이며, 세무·법률·투자 판단의 근거로 사용할 수
              없습니다.
            </p>
            <p className="mt-1">
              © {new Date().getFullYear()} 계산기 · calculators.ai.kr
            </p>
          </footer>
        )}
        </Suspense>
      </main>
    </div>
  )
}

export default App
