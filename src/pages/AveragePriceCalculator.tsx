import { useMemo, useState } from 'react'
import { Field, Row, fmt } from '../components/ui'

type Mode = 'average' | 'target'

export default function AveragePriceCalculator() {
  const [mode, setMode] = useState<Mode>('average')
  // 공통: 기존 보유
  const [avgPrice, setAvgPrice] = useState(50_000)
  const [quantity, setQuantity] = useState(100)
  // 평단 계산 모드
  const [addPrice, setAddPrice] = useState(40_000)
  const [addQty, setAddQty] = useState(100)
  // 목표 평단 모드
  const [currentPrice, setCurrentPrice] = useState(40_000)
  const [targetAvg, setTargetAvg] = useState(45_000)

  const avg = useMemo(() => {
    const totalCost = avgPrice * quantity + addPrice * addQty
    const totalQty = quantity + addQty
    const newAvg = totalQty > 0 ? totalCost / totalQty : NaN
    const change = avgPrice > 0 ? ((newAvg - avgPrice) / avgPrice) * 100 : NaN
    return { totalCost, totalQty, newAvg, change, isDown: addPrice < avgPrice }
  }, [avgPrice, quantity, addPrice, addQty])

  const target = useMemo(() => {
    // (q·avg + n·p) / (q+n) = t  →  n = q(avg−t) / (t−p)
    const denom = targetAvg - currentPrice
    const n = denom !== 0 ? (quantity * (avgPrice - targetAvg)) / denom : NaN
    const possible = Number.isFinite(n) && n > 0
    const shares = possible ? Math.ceil(n) : NaN
    const cost = possible ? shares * currentPrice : NaN
    return { shares, cost, possible }
  }, [avgPrice, quantity, currentPrice, targetAvg])

  return (
    <div>
      <h1 className="text-2xl font-bold">평단가 계산기 (물타기 · 불타기)</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        추가 매수 후 평균단가를 계산하고, 목표 평단을 만들려면 몇 주를 더 사야 하는지
        역산합니다.
      </p>

      <div className="mb-6 flex gap-1 rounded-xl bg-slate-100 p-1 sm:w-fit">
        {(
          [
            ['average', '평단 계산'],
            ['target', '목표 평단 역산'],
          ] as [Mode, string][]
        ).map(([m, label]) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors sm:flex-none ${
              mode === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">현재 보유</h2>
          <div className="grid grid-cols-2 gap-x-3 gap-y-4">
            <Field label="평단가" value={avgPrice} onChange={setAvgPrice} step={100} />
            <Field label="보유 수량" value={quantity} onChange={(v) => setQuantity(Math.max(0, Math.round(v)))} suffix="주" step={1} />
            {mode === 'average' ? (
              <>
                <Field label="추가 매수가" value={addPrice} onChange={setAddPrice} step={100} />
                <Field label="추가 수량" value={addQty} onChange={(v) => setAddQty(Math.max(0, Math.round(v)))} suffix="주" step={1} />
              </>
            ) : (
              <>
                <Field label="현재가" value={currentPrice} onChange={setCurrentPrice} step={100} />
                <Field label="목표 평단가" value={targetAvg} onChange={setTargetAvg} step={100} />
              </>
            )}
          </div>
        </section>

        <section className="space-y-4">
          {mode === 'average' ? (
            <>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
                <p className="text-sm text-slate-500">
                  {avg.isDown ? '물타기' : '불타기'} 후 새 평단가
                </p>
                <p className="mt-1 text-4xl font-extrabold tabular-nums text-emerald-700">
                  {fmt(avg.newAvg)}원
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  기존 대비{' '}
                  <b className={avg.change < 0 ? 'text-blue-600' : 'text-red-600'}>
                    {avg.change > 0 ? '+' : ''}
                    {Number.isFinite(avg.change) ? avg.change.toFixed(2) : '-'}%
                  </b>
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="divide-y divide-slate-100">
                  <Row label="총 보유 수량" value={`${fmt(avg.totalQty)}주`} />
                  <Row label="총 투자금액" value={`${fmt(avg.totalCost)}원`} />
                  <Row label="새 평단가" value={`${fmt(avg.newAvg)}원`} strong />
                </div>
              </div>
            </>
          ) : (
            <>
              {target.possible ? (
                <>
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
                    <p className="text-sm text-slate-500">
                      평단 {fmt(targetAvg)}원을 만들려면 현재가로
                    </p>
                    <p className="mt-1 text-4xl font-extrabold tabular-nums text-emerald-700">
                      {fmt(target.shares)}주
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      약 <b>{fmt(target.cost)}원</b>어치를 추가 매수해야 합니다
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="divide-y divide-slate-100">
                      <Row label="추가 매수 수량" value={`${fmt(target.shares)}주`} strong />
                      <Row label="추가 투자금" value={`${fmt(target.cost)}원`} strong />
                      <Row label="매수 후 총 수량" value={`${fmt(quantity + target.shares)}주`} />
                      <Row
                        label="매수 후 총 투자금"
                        value={`${fmt(avgPrice * quantity + target.cost)}원`}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm leading-relaxed text-red-700">
                  이 조건으로는 목표 평단을 만들 수 없습니다. 목표 평단가는{' '}
                  <b>현재가와 기존 평단가 사이</b>여야 합니다. (물타기: 현재가 &lt; 목표 &lt;
                  평단 / 불타기: 평단 &lt; 목표 &lt; 현재가)
                </div>
              )}
            </>
          )}

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800">
            물타기는 평단을 낮추지만 투자금과 리스크도 함께 커집니다. 하락 이유가 해소되지
            않은 종목의 기계적 물타기는 손실을 키울 수 있습니다. 계산 결과는 수수료·세금을
            반영하지 않습니다.
          </div>
        </section>
      </div>
    </div>
  )
}
