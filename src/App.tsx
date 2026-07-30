import { lazy, Suspense, useEffect, useState } from 'react'
import routes from './routes.json'
import GROUP_ORDER from './groups.json'
import AdSlot from './components/AdSlot'
import InfoSection from './components/InfoSection'
import Sidebar, { MenuLink } from './components/Sidebar'
import { SLOTS, loadAdsense } from './lib/ads'
import { loadAnalytics, trackPageView } from './lib/analytics'

/** 라우트별 코드 스플리팅: 방문한 계산기의 JS만 내려받도록 지연 로드 */
const components: Record<string, React.LazyExoticComponent<() => React.JSX.Element>> = {
  margin: lazy(() => import('./pages/MarginCalculator')),
  bizTax: lazy(() => import('./pages/BizTaxCalculator')),
  salary: lazy(() => import('./pages/SalaryCalculator')),
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
  guidesIndex: lazy(() => import('./pages/GuidesIndexPage')),
  yearEndTaxProcedureGuide: lazy(() => import('./pages/guides/YearEndTaxProcedureGuide')),
  jeonseDepositRecoveryGuide: lazy(() => import('./pages/guides/JeonseDepositRecoveryGuide')),
  severanceInterimGuide: lazy(() => import('./pages/guides/SeveranceInterimGuide')),
  about: lazy(() => import('./pages/AboutPage')),
  privacy: lazy(() => import('./pages/PrivacyPage')),
}
const DEFAULT_PAGE = components.stockReturn

/** 사이드바 그룹 표시 순서 ('정보' 그룹은 푸터에만 노출) */
const groups = GROUP_ORDER.filter((g) => routes.some((r) => r.group === g))

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
    const url =
      window.location.origin + (route.path === '/' ? '/' : `${route.path}/`)
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
  const Current = components[route.id] ?? DEFAULT_PAGE

  const [menuOpen, setMenuOpen] = useState(false)
  useEffect(() => setMenuOpen(false), [route])

  const handleNavigate = (to: string) => {
    navigate(to)
    setMenuOpen(false)
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* 모바일 상단 바 */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur-sm lg:hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault()
              handleNavigate('/')
            }}
            className="flex shrink-0 items-center gap-1.5 text-lg font-bold"
          >
            <img src="/favicon.svg" alt="" className="h-6 w-6" aria-hidden="true" />
            계산기
          </a>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-label="전체 계산기 메뉴 열기"
            className="flex min-w-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50"
          >
            <span className="max-w-40 truncate">{route.label}</span>
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className={`h-4 w-4 shrink-0 transition-transform ${menuOpen ? 'rotate-180' : ''}`}
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.148l3.71-3.918a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-10 bg-slate-900/30"
              onClick={() => setMenuOpen(false)}
              aria-hidden="true"
            />
            <nav
              className="animate-menu-in absolute inset-x-0 top-full z-20 max-h-[calc(100vh-56px)] overflow-y-auto border-t border-slate-200 bg-white px-4 py-4 shadow-lg"
              aria-label="계산기 메뉴"
            >
              <a
                href="/guides/"
                onClick={(e) => {
                  e.preventDefault()
                  handleNavigate('/guides')
                }}
                className="mb-4 flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600"
              >
                📖 가이드
              </a>
              {groups.map((g) => (
                <div key={g} className="mb-4 last:mb-0">
                  <p className="mb-1.5 text-xs font-semibold tracking-wide text-slate-400">{g}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {routes
                      .filter((r) => r.group === g)
                      .map((r) => (
                        <MenuLink
                          key={r.id}
                          to={r.path}
                          label={r.label}
                          active={route.id === r.id}
                          onNavigate={handleNavigate}
                          compact
                        />
                      ))}
                  </div>
                </div>
              ))}
            </nav>
          </>
        )}
      </header>

      <div className="mx-auto flex max-w-6xl">
        {/* 데스크톱 사이드바 */}
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
          <div className="px-5 py-6">
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault()
                navigate('/')
              }}
              className="flex items-center gap-2 text-xl font-extrabold tracking-tight"
            >
              <img src="/favicon.svg" alt="" className="h-7 w-7" aria-hidden="true" />
              계산기
            </a>
            <p className="mt-1.5 text-xs text-slate-400">돈·나이·날짜, 생활 계산 한곳에서</p>
          </div>
          <div className="px-5 pb-3">
            <a
              href="/guides/"
              onClick={(e) => {
                e.preventDefault()
                navigate('/guides')
              }}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-emerald-300 hover:bg-emerald-50/40"
            >
              📖 가이드
            </a>
          </div>
          <Sidebar activeRouteId={route.id} activeGroup={route.group} onNavigate={navigate} />
          <AdSlot slot={SLOTS.sidebar} className="min-h-[250px] shrink-0 px-3 pt-2" />
          <p className="px-5 py-4 text-[11px] leading-relaxed text-slate-300">
            모든 결과는 참고용 추정치입니다.
          </p>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
          <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-slate-100" />}>
            <Current />
          </Suspense>
          <AdSlot key={`${route.id}-mid`} slot={SLOTS.belowResult} />
          <InfoSection pageId={route.id} />
          <AdSlot key={`${route.id}-bottom`} slot={SLOTS.bottomOfPage} />

          <footer className="mt-14 border-t border-slate-200 pt-5 pb-2 text-xs text-slate-400">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {routes
                .filter((r) => r.group === '정보')
                .map((r) => (
                  <a
                    key={r.id}
                    href={`${r.path}/`}
                    onClick={(e) => {
                      e.preventDefault()
                      navigate(r.path)
                    }}
                    className="font-medium text-slate-500 underline decoration-slate-300 underline-offset-2 hover:text-slate-700 hover:decoration-slate-400"
                  >
                    {r.label}
                  </a>
                ))}
            </div>
            <p className="mt-3 leading-relaxed">
              모든 계산 결과는 참고용 추정치이며, 세무·법률·투자 판단의 근거로 사용할 수
              없습니다.
            </p>
            <p className="mt-1 text-slate-300">
              © {new Date().getFullYear()} 계산기 · calculators.ai.kr
            </p>
          </footer>
        </main>
      </div>
    </div>
  )
}

export default App
