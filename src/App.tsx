import { useEffect, useState } from 'react'
import routes from './routes.json'
import AdSlot from './components/AdSlot'
import InfoSection from './components/InfoSection'
import { SLOTS, loadAdsense } from './lib/ads'
import MarginCalculator from './pages/MarginCalculator'
import SalaryCalculator from './pages/SalaryCalculator'
import RaiseComparator from './pages/RaiseComparator'
import SeveranceCalculator from './pages/SeveranceCalculator'
import BizTaxCalculator from './pages/BizTaxCalculator'
import AgeCalculator from './pages/AgeCalculator'
import CelebrationCalculator from './pages/CelebrationCalculator'
import InsuranceAgeCalculator from './pages/InsuranceAgeCalculator'
import PensionAgeCalculator from './pages/PensionAgeCalculator'
import LoanCalculator from './pages/LoanCalculator'
import DsrCalculator from './pages/DsrCalculator'
import PrepaymentCalculator from './pages/PrepaymentCalculator'
import RefinanceCalculator from './pages/RefinanceCalculator'
import DdayCalculator from './pages/DdayCalculator'
import DateCalculator from './pages/DateCalculator'
import DischargeCalculator from './pages/DischargeCalculator'
import DueDateCalculator from './pages/DueDateCalculator'
import PartTimeCalculator from './pages/PartTimeCalculator'
import StockReturnCalculator from './pages/StockReturnCalculator'
import AveragePriceCalculator from './pages/AveragePriceCalculator'
import DividendCalculator from './pages/DividendCalculator'
import CompoundCalculator from './pages/CompoundCalculator'
import UsStockTaxCalculator from './pages/UsStockTaxCalculator'
import LossRecoveryCalculator from './pages/LossRecoveryCalculator'
import AboutPage from './pages/AboutPage'
import PrivacyPage from './pages/PrivacyPage'

const components: Record<string, () => React.JSX.Element> = {
  margin: MarginCalculator,
  bizTax: BizTaxCalculator,
  salary: SalaryCalculator,
  raise: RaiseComparator,
  severance: SeveranceCalculator,
  age: AgeCalculator,
  celebration: CelebrationCalculator,
  insuranceAge: InsuranceAgeCalculator,
  pensionAge: PensionAgeCalculator,
  loan: LoanCalculator,
  dsr: DsrCalculator,
  prepayment: PrepaymentCalculator,
  refinance: RefinanceCalculator,
  partTime: PartTimeCalculator,
  dday: DdayCalculator,
  dateCalc: DateCalculator,
  discharge: DischargeCalculator,
  dueDate: DueDateCalculator,
  stockReturn: StockReturnCalculator,
  averagePrice: AveragePriceCalculator,
  dividend: DividendCalculator,
  compound: CompoundCalculator,
  usStockTax: UsStockTaxCalculator,
  lossRecovery: LossRecoveryCalculator,
  about: AboutPage,
  privacy: PrivacyPage,
}

/** 사이드바 그룹 표시 순서 ('정보' 그룹은 푸터에만 노출) */
const GROUP_ORDER = ['주식', '직장인', '나이', '대출', '날짜', '셀러']
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
  }, [route])
}

function MenuLink({
  to,
  label,
  active,
  onNavigate,
  compact,
}: {
  to: string
  label: string
  active: boolean
  onNavigate: (to: string) => void
  compact?: boolean
}) {
  return (
    <a
      href={to === '/' ? '/' : `${to}/`}
      onClick={(e) => {
        e.preventDefault()
        onNavigate(to)
      }}
      aria-current={active ? 'page' : undefined}
      className={
        compact
          ? `shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              active ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:bg-slate-100'
            }`
          : `block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? 'bg-emerald-600 text-white'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`
      }
    >
      {label}
    </a>
  )
}

function App() {
  const { route, navigate } = useRoute()
  useSeo(route)
  useEffect(loadAdsense, []) // 자동 광고 (ADSENSE_CLIENT 설정 시에만 동작)
  const Current = components[route.id] ?? MarginCalculator

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* 모바일 상단 바 */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white lg:hidden">
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="shrink-0 text-lg font-bold">계산기</span>
          <nav className="flex gap-1 overflow-x-auto" aria-label="계산기 메뉴">
            {routes.filter((r) => r.group !== '정보').map((r) => (
              <MenuLink
                key={r.id}
                to={r.path}
                label={r.label}
                active={route.id === r.id}
                onNavigate={navigate}
                compact
              />
            ))}
          </nav>
        </div>
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
              className="text-xl font-extrabold tracking-tight"
            >
              계산기
            </a>
            <p className="mt-1 text-xs text-slate-400">돈·나이·날짜, 생활 계산 한곳에서</p>
          </div>
          <nav
            className="min-h-0 flex-1 space-y-6 overflow-y-auto px-3 pb-4"
            aria-label="계산기 메뉴"
          >
            {groups.map((g) => (
              <div key={g}>
                <p className="mb-1 px-3 text-xs font-semibold tracking-wide text-slate-400">
                  {g}
                </p>
                <div className="space-y-0.5">
                  {routes
                    .filter((r) => r.group === g)
                    .map((r) => (
                      <MenuLink
                        key={r.id}
                        to={r.path}
                        label={r.label}
                        active={route.id === r.id}
                        onNavigate={navigate}
                      />
                    ))}
                </div>
              </div>
            ))}
          </nav>
          <AdSlot slot={SLOTS.sidebar} className="min-h-[250px] shrink-0 px-3 pt-2" />
          <p className="px-5 py-4 text-[11px] leading-relaxed text-slate-300">
            모든 결과는 참고용 추정치입니다.
          </p>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-8 lg:px-10">
          <Current />
          <AdSlot key={`${route.id}-mid`} slot={SLOTS.belowResult} />
          <InfoSection pageId={route.id} />
          <AdSlot key={`${route.id}-bottom`} slot={SLOTS.bottomOfPage} />

          <footer className="mt-14 border-t border-slate-200 pt-5 pb-2 text-xs text-slate-400">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
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
                    className="hover:text-slate-600"
                  >
                    {r.label}
                  </a>
                ))}
              <span>© {new Date().getFullYear()} 계산기 · calculators.ai.kr</span>
            </div>
            <p className="mt-2">
              모든 계산 결과는 참고용 추정치이며, 세무·법률·투자 판단의 근거로 사용할 수
              없습니다.
            </p>
          </footer>
        </main>
      </div>
    </div>
  )
}

export default App
