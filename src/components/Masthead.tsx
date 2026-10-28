import { useEffect, useRef, useState } from 'react'
import routes from '../routes.json'
import { topics, topicOf, LIFE_IDS } from '../lib/topics'
import ToolsPanel from './ToolsPanel'

function useIsDesktop() {
  const mq = '(min-width: 1024px)'
  const [v, setV] = useState(() => window.matchMedia(mq).matches)
  useEffect(() => {
    const m = window.matchMedia(mq)
    const on = () => setV(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return v
}

const hubId = (path: string) => routes.find((r) => r.path === path)?.id

export default function Masthead({
  activeRouteId,
  onNavigate,
}: {
  activeRouteId: string
  onNavigate: (to: string) => void
}) {
  const [toolsOpen, setToolsOpen] = useState(false) // 데스크톱 패널 / 모바일 도구 접이식 공용
  const [menuOpen, setMenuOpen] = useState(false) // 모바일 햄버거
  const isDesktop = useIsDesktop()
  const rootRef = useRef<HTMLElement>(null)
  const toolsBtn = useRef<HTMLButtonElement>(null)
  const burgerBtn = useRef<HTMLButtonElement>(null)

  const close = () => {
    setToolsOpen(false)
    setMenuOpen(false)
  }
  const go = (to: string) => {
    close()
    onNavigate(to)
  }

  useEffect(() => {
    if (!toolsOpen && !menuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      // 보이는 쪽 트리거로 포커스 복귀 (모바일 메뉴가 열려 있으면 햄버거)
      const target = menuOpen ? burgerBtn.current : toolsBtn.current
      close()
      target?.focus()
    }
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
    }
  }, [toolsOpen, menuOpen])

  const topicActive = (t: (typeof topics)[number]) =>
    activeRouteId === hubId(t.path) || topicOf(activeRouteId)?.id === t.id
  const toolsActive = LIFE_IDS.includes(activeRouteId) || toolsOpen

  const item = (active: boolean) =>
    `border-b-2 pb-0.5 hover:text-accent ${active ? 'border-accent font-semibold text-ink' : 'border-transparent'}`
  const mobileItem = (active: boolean) =>
    `flex min-h-11 items-center border-b border-rule text-[15px] ${active ? 'font-semibold text-accent' : 'text-ink'}`

  const a = (to: string, label: string, cls: string, active: boolean) => (
    <a
      key={to}
      href={to === '/' ? '/' : `${to}/`}
      onClick={(e) => {
        e.preventDefault()
        go(to)
      }}
      aria-current={active ? 'page' : undefined}
      className={cls}
    >
      {label}
    </a>
  )

  const chevron = (open: boolean) => (
    <span aria-hidden="true" className="ml-1 text-[10px]">
      {open ? '▴' : '▾'}
    </span>
  )

  return (
    <header ref={rootRef} className="sticky top-0 z-20 bg-paper lg:static">
    <div className="relative mx-auto max-w-5xl px-4">
      <div className="flex items-baseline justify-between border-b-[3px] border-double border-ink pt-5 pb-3">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault()
            go('/')
          }}
          className="flex items-baseline gap-3"
        >
          <span className="font-serif text-2xl font-bold text-ink">계산기</span>
          <span className="hidden text-xs text-muted sm:inline">생활·금융 가이드와 계산기</span>
        </a>

        {/* 데스크톱 내비 */}
        <nav aria-label="주 메뉴" className="hidden items-baseline gap-5 text-[13px] text-body lg:flex">
          {a('/', '홈', item(activeRouteId === 'home'), activeRouteId === 'home')}
          {topics.map((t) => a(t.path, t.label, item(topicActive(t)), topicActive(t)))}
          <button
            ref={toolsBtn}
            type="button"
            aria-expanded={toolsOpen}
            aria-controls="tools-panel-desktop"
            onClick={() => setToolsOpen((v) => !v)}
            className={item(toolsActive)}
          >
            도구{chevron(toolsOpen)}
          </button>
        </nav>

        {/* 모바일 햄버거 */}
        <button
          ref={burgerBtn}
          type="button"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          aria-label="메뉴"
          onClick={() => setMenuOpen((v) => !v)}
          className="-mr-2 flex min-h-11 min-w-11 items-center justify-center text-ink lg:hidden"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {/* 데스크톱 도구 패널 */}
      {isDesktop && toolsOpen && (
        <div className="animate-menu-in absolute inset-x-4 top-full z-30 border-y border-rule bg-paper pt-5 pb-6 lg:block">
          <ToolsPanel id="tools-panel-desktop" activeRouteId={activeRouteId} onNavigate={go} />
        </div>
      )}

      {/* 모바일 메뉴 */}
      {!isDesktop && menuOpen && (
        <nav
          id="mobile-menu"
          aria-label="모바일 메뉴"
          className="animate-menu-in absolute inset-x-0 top-full z-30 max-h-[calc(100vh-4.5rem)] overflow-y-auto border-y border-rule bg-paper px-4 pb-4 lg:hidden"
        >
          {a('/', '홈', mobileItem(activeRouteId === 'home'), activeRouteId === 'home')}
          {topics.map((t) => a(t.path, t.label, mobileItem(topicActive(t)), topicActive(t)))}
          {a('/guides', '가이드 전체', mobileItem(activeRouteId === 'guidesIndex'), activeRouteId === 'guidesIndex')}
          {a('/calculator', '일반 계산기', `${mobileItem(activeRouteId === 'generalCalculator')} font-semibold text-accent`, activeRouteId === 'generalCalculator')}
          <button
            type="button"
            aria-expanded={toolsOpen}
            aria-controls="tools-panel-mobile"
            onClick={() => setToolsOpen((v) => !v)}
            className={`${mobileItem(toolsActive)} w-full`}
          >
            도구{chevron(toolsOpen)}
          </button>
          {toolsOpen && (
            <div className="pt-3">
              <ToolsPanel id="tools-panel-mobile" activeRouteId={activeRouteId} onNavigate={go} />
            </div>
          )}
        </nav>
      )}
    </div>
    </header>
  )
}
