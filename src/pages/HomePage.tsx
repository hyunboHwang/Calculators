import routes from '../routes.json'
import GROUP_ORDER from '../groups.json'
import { pageContent } from '../lib/pageContent'

const content = pageContent as Record<string, { changelog?: { date: string; text: string }[] }>

const href = (path: string) => (path === '/' ? '/' : `${path}/`)

const CALC_GROUPS = GROUP_ORDER.filter((g) => g !== '용어사전')

/** 가이드 변경 이력 중 최신 5건 (날짜 내림차순) */
const recentUpdates = routes
  .filter((r) => r.group === '가이드')
  .flatMap((r) => (content[r.id]?.changelog ?? []).map((l) => ({ ...l, label: r.label, path: r.path })))
  .sort((a, b) => b.date.localeCompare(a.date))
  .slice(0, 5)

export default function HomePage() {
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold">연봉 실수령액·퇴직금·연말정산 계산기 모음</h1>
      <p className="mt-3 leading-relaxed text-slate-600">
        연봉 실수령액, 퇴직금, 연말정산, 실업급여, 취득세·재산세·종부세, 대출 상환까지 생활·금융
        계산기를 한곳에 모았습니다. 회원가입 없이 브라우저에서 바로 계산할 수 있고, 세율·한도·기준값은
        국세청·고용노동부 등 공식기관 자료로 확인해 반영합니다. 모든 결과는 참고용 추정치입니다.
      </p>

      <section className="mt-8">
        <h2 className="text-lg font-bold">카테고리별 계산기</h2>
        {CALC_GROUPS.map((g) => {
          const items = routes.filter((r) => r.group === g)
          if (items.length === 0) return null
          return (
            <div key={g} className="mt-4">
              <h3 className="text-sm font-semibold text-slate-500">{g}</h3>
              <ul className="mt-1.5 space-y-1.5">
                {items.map((r) => (
                  <li key={r.id} className="text-sm leading-relaxed">
                    <a href={href(r.path)} className="font-medium text-emerald-700 underline underline-offset-2">
                      {r.label}
                    </a>
                    <span className="text-slate-500"> — {r.description}</span>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-bold">세금·정책 가이드</h2>
        <p className="mt-1 text-sm text-slate-500">
          신청 절차와 기준을 공식 자료로 정리한 가이드입니다. 각 가이드에 최종 업데이트 날짜와 변경 이력을 공개합니다.
        </p>
        <ul className="mt-2 space-y-1.5">
          {routes
            .filter((r) => r.group === '가이드' && r.id !== 'guidesIndex')
            .map((r) => (
              <li key={r.id} className="text-sm leading-relaxed">
                <a href={href(r.path)} className="font-medium text-emerald-700 underline underline-offset-2">
                  {r.label}
                </a>
              </li>
            ))}
        </ul>
        <p className="mt-2 text-sm">
          <a href="/guides/" className="font-medium text-emerald-700 underline underline-offset-2">
            가이드 전체 보기 →
          </a>
        </p>
      </section>

      {recentUpdates.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-bold">최근 업데이트</h2>
          <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-slate-600">
            {recentUpdates.map((u) => (
              <li key={u.path + u.date + u.text}>
                <time dateTime={u.date}>{u.date.replaceAll('-', '. ')}.</time>{' '}
                <a href={href(u.path)} className="font-medium text-emerald-700 underline underline-offset-2">
                  {u.label}
                </a>{' '}
                — {u.text}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5">
        <h2 className="text-base font-bold">운영자와 검증 방식</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          1인 개발자가 직접 만들고 운영합니다. 계산 기준은 공식기관 자료로 확인하고, 실제 사례와 대조하며,
          기준이 바뀌면 수정 이력을 남깁니다.{' '}
          <a href="/about/" className="font-medium text-emerald-700 underline underline-offset-2">운영자 소개</a>
          {' · '}
          <a href="/verification/" className="font-medium text-emerald-700 underline underline-offset-2">계산기 검증 방식</a>
        </p>
      </section>
    </div>
  )
}
