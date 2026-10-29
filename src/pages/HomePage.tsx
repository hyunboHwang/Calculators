import routes from '../routes.json'
import popularLinks from '../popularLinks.json'
import { pageContent } from '../lib/pageContent'
import { topics } from '../lib/topics'

const content = pageContent as Record<string, { changelog?: { date: string; text: string }[] }>

const href = (path: string) => (path === '/' ? '/' : `${path}/`)

/** 가이드 변경 이력 중 최신 5건 (날짜 내림차순) */
const recentUpdates = routes
  .filter((r) => r.group === '가이드')
  .flatMap((r) => (content[r.id]?.changelog ?? []).map((l) => ({ ...l, label: r.label, path: r.path })))
  .sort((a, b) => b.date.localeCompare(a.date))
  .slice(0, 5)

const popular = popularLinks.calculators.flatMap((id) => routes.find((r) => r.id === id) ?? [])

const LINK = 'underline decoration-rule underline-offset-2 hover:text-accent'

export default function HomePage({ navigate }: { navigate: (to: string) => void }) {
  const link = (to: string, text: string, cls = LINK) => (
    <a
      href={href(to)}
      onClick={(e) => {
        e.preventDefault()
        navigate(to)
      }}
      className={cls}
    >
      {text}
    </a>
  )

  return (
    <div className="max-w-3xl text-body">
      <h1 className="font-serif text-3xl font-bold text-ink">생활·금융 가이드와 계산기</h1>
      <p className="mt-3 leading-relaxed">
        월급·퇴직·연말정산, 부동산 세금, 대출 같은 생활·금융 주제를 가이드로 정리하고, 바로 계산해 볼 수
        있는 계산기를 함께 모았습니다. 세율·한도·기준값은 국세청·고용노동부 등 공식기관 자료로 확인해
        반영하며 수정 이력을 공개합니다. 모든 결과는 참고용 추정치입니다.
      </p>

      <section className="mt-10" aria-labelledby="home-topics">
        <h2 id="home-topics" className="font-serif text-xl font-bold text-ink">주제별로 보기</h2>
        <ol className="mt-3 border-t border-rule">
          {topics.map((t, i) => {
            const members = t.members.flatMap((id) => routes.find((r) => r.id === id) ?? [])
            const guides = members.filter((r) => r.group === '가이드').length
            const calcs = members.length - guides
            return (
              <li key={t.id} className="border-b border-rule">
                <a
                  href={href(t.path)}
                  onClick={(e) => {
                    e.preventDefault()
                    navigate(t.path)
                  }}
                  className="group flex gap-4 py-4"
                >
                  <span className="pt-1 font-mono text-sm text-muted">{String(i + 1).padStart(2, '0')}</span>
                  <span className="min-w-0">
                    <span className="block font-serif text-lg font-bold text-ink group-hover:text-accent">
                      {t.label}
                    </span>
                    <span className="mt-0.5 block text-sm">{t.summary}</span>
                    <span className="mt-1 block text-xs text-muted">
                      {[guides && `가이드 ${guides}`, calcs && `계산기 ${calcs}`].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                </a>
              </li>
            )
          })}
        </ol>
        <p className="mt-3 text-sm">{link('/guides', '가이드 전체 보기 →')}</p>
      </section>

      {recentUpdates.length > 0 && (
        <section className="mt-10" aria-labelledby="home-recent">
          <h2 id="home-recent" className="font-serif text-xl font-bold text-ink">최근 업데이트된 가이드</h2>
          <ul className="mt-3 border-t border-rule">
            {recentUpdates.map((u) => (
              <li key={u.path + u.date + u.text} className="border-b border-rule py-2.5 text-sm leading-relaxed">
                <time dateTime={u.date} className="font-mono text-xs text-muted">
                  {u.date.replaceAll('-', '. ')}.
                </time>{' '}
                {link(u.path, u.label, 'font-medium text-ink hover:text-accent')} — {u.text}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10" aria-labelledby="home-popular">
        <h2 id="home-popular" className="font-serif text-xl font-bold text-ink">많이 쓰는 계산기</h2>
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 border-t border-rule pt-3 text-sm">
          {popular.map((r) => (
            <li key={r.id}>{link(r.path, r.label, 'font-medium text-ink hover:text-accent')}</li>
          ))}
        </ul>
      </section>

      <section className="mt-10 border-t border-ink pt-4" aria-labelledby="home-operator">
        <h2 id="home-operator" className="font-serif text-base font-bold text-ink">운영자와 검증 방식</h2>
        <p className="mt-2 text-sm leading-relaxed">
          1인 개발자가 직접 만들고 운영합니다. 계산 기준은 공식기관 자료로 확인하고, 실제 사례와 대조하며,
          기준이 바뀌면 수정 이력을 남깁니다. {link('/about', '운영자 소개')}
          {' · '}
          {link('/verification', '계산기 검증 방식')}
        </p>
      </section>
    </div>
  )
}
