import routes from '../routes.json'

const TRACK1_IDS = [
  'yearEndTaxProcedureGuide',
  'jeonseDepositRecoveryGuide',
  'severanceInterimGuide',
  'unemploymentApplicationGuide',
]

const TRACK2_IDS = [
  'youthRentSubsidyGuide',
  'youthLeapAccountGuide',
  'youthJeonseLoanGuide',
  'nationalEmploymentSupportGuide',
]

const TRACK3_IDS = [
  'inheritanceTaxProcedureGuide',
  'giftTaxProcedureGuide',
  'subscriptionScoreGuide',
  'subscriptionRankGuide',
]

function GuideList({ ids, title }: { ids: string[]; title: string }) {
  const items = ids
    .map((id) => routes.find((r) => r.id === id))
    .filter((r): r is (typeof routes)[number] => Boolean(r))

  if (items.length === 0) return null

  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold">{title}</h2>
      <div className="mt-3 space-y-2">
        {items.map((r) => (
          <a
            key={r.id}
            href={`${r.path}/`}
            className="block rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-emerald-300 hover:bg-emerald-50/30"
          >
            <p className="text-sm font-semibold text-slate-800">{r.label}</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">{r.description}</p>
          </a>
        ))}
      </div>
    </section>
  )
}

export default function GuidesIndexPage() {
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold">가이드</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-500">
        계산기와 함께 보면 도움이 되는 절차·정책 안내 아티클입니다. 모든 내용은 작성 시점 기준
        참고용이며, 정확한 신청·적용은 반드시 각 글에 표기된 공식 출처에서 최신 정보를
        확인하세요.
      </p>
      <GuideList ids={TRACK1_IDS} title="계산기 활용 가이드" />
      <GuideList ids={TRACK2_IDS} title="정부지원금·청년정책" />
      <GuideList ids={TRACK3_IDS} title="세금·부동산 절차" />
    </div>
  )
}
