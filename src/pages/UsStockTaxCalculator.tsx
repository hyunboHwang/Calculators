import { useMemo, useState } from 'react'
import { Field, Row, fmt } from '../components/ui'

const DEDUCTION = 2_500_000 // 양도소득 기본공제 (연간)
const TAX_RATE = 0.22 // 20% + 지방소득세 2%

export default function UsStockTaxCalculator() {
  const [gain, setGain] = useState(10_000_000)
  const [loss, setLoss] = useState(0)

  const r = useMemo(() => {
    const net = gain - loss // 손익 통산
    const taxBase = Math.max(net - DEDUCTION, 0)
    const tax = taxBase * TAX_RATE
    const remainingDeduction = Math.max(DEDUCTION - Math.max(net, 0), 0)
    return {
      net,
      taxBase,
      tax,
      afterTax: net - tax,
      remainingDeduction,
      effectiveRate: net > 0 ? (tax / net) * 100 : 0,
    }
  }, [gain, loss])

  return (
    <div>
      <h1 className="text-2xl font-bold">미국주식 양도소득세 계산기</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        해외주식 양도차익은 연 250만원 공제 후 22%(지방세 포함)로 과세됩니다. 올해 실현한
        손익을 넣어 내년 5월에 낼 세금을 미리 확인하세요.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">올해 실현 손익 (1.1 ~ 12.31 결제 기준)</h2>
          <div className="space-y-4">
            <Field label="실현 이익 합계" value={gain} onChange={setGain} step={500_000} hint="원화 환산" />
            <Field label="실현 손실 합계" value={loss} onChange={setLoss} step={500_000} hint="손익 통산 가능" />
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-sm text-slate-500">예상 양도소득세 (지방세 포함)</p>
            <p className="mt-1 text-3xl font-extrabold tabular-nums text-emerald-700">
              {fmt(r.tax)}원
            </p>
            <p className="mt-2 text-sm text-slate-600">
              순손익 {fmt(r.net)}원 기준 실효세율 <b>{r.effectiveRate.toFixed(1)}%</b>
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-base font-semibold">계산 내역</h2>
            <div className="divide-y divide-slate-100">
              <Row label="실현 이익" value={`${fmt(gain)}원`} />
              <Row label="실현 손실 (통산)" value={`-${fmt(loss)}원`} />
              <Row label="순손익" value={`${fmt(r.net)}원`} strong negative={r.net < 0} />
              <Row label="기본공제" value={`-${fmt(Math.min(Math.max(r.net, 0), DEDUCTION))}원`} sub="연 250만원" />
              <Row label="과세표준" value={`${fmt(r.taxBase)}원`} />
              <Row label="양도소득세 (22%)" value={`${fmt(r.tax)}원`} strong />
              <Row label="세후 순수익" value={`${fmt(r.afterTax)}원`} />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-base font-semibold">절세 포인트</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              {r.remainingDeduction > 0 ? (
                <>
                  올해 공제 한도가 <b className="text-emerald-700">{fmt(r.remainingDeduction)}원</b>{' '}
                  남았습니다. 이 금액까지는 이익을 실현해도 세금이 없으니, 연말 전에 수익
                  종목 일부를 매도해 공제를 활용하는 것을 검토해보세요.
                </>
              ) : (
                <>
                  공제 250만원을 모두 사용했습니다. 평가손실 중인 종목이 있다면 연내 매도해
                  손익 통산으로 과세표준을 줄일 수 있습니다 (매도 후 재매수 시 환율·가격 변동
                  리스크는 감안하세요).
                </>
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800">
            손익은 결제일 기준 환율로 원화 환산해 계산하며, 매매 수수료는 차감됩니다. 신고는
            다음 해 5월 종합소득세 기간에 하며 대부분 증권사가 신고 대행 서비스를 제공합니다.
            세법은 바뀔 수 있으니 신고 시점 기준을 확인하세요.
          </div>
        </section>
      </div>
    </div>
  )
}
