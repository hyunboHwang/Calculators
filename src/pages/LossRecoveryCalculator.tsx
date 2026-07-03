import { useMemo, useState } from 'react'
import { Field, Row } from '../components/ui'
import {
  CurrencyToggle,
  fmtMoney,
  moneyStep,
  moneySuffix,
  type Currency,
} from '../components/currency'

type Mode = 'price' | 'percent'

/** 손실률 L(0~1) → 본전까지 필요한 상승률 */
const recovery = (loss: number) => (loss > 0 && loss < 1 ? loss / (1 - loss) : NaN)

const TABLE = [5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 80, 90]

const defaults: Record<Currency, { buy: number; cur: number }> = {
  KRW: { buy: 50_000, cur: 35_000 },
  USD: { buy: 100, cur: 70 },
}

export default function LossRecoveryCalculator() {
  const [mode, setMode] = useState<Mode>('price')
  const [currency, setCurrency] = useState<Currency>('KRW')
  const [buyPrice, setBuyPrice] = useState(50_000)
  const [currentPrice, setCurrentPrice] = useState(35_000)
  const [lossPct, setLossPct] = useState(30)

  const switchCurrency = (c: Currency) => {
    if (c !== currency) {
      setCurrency(c)
      setBuyPrice(defaults[c].buy)
      setCurrentPrice(defaults[c].cur)
    }
  }

  const r = useMemo(() => {
    if (mode === 'price') {
      if (buyPrice <= 0 || currentPrice <= 0) return null
      const loss = (buyPrice - currentPrice) / buyPrice
      if (loss <= 0) return { isProfit: true as const, loss, need: NaN }
      return { isProfit: false as const, loss, need: recovery(loss) }
    }
    const loss = lossPct / 100
    if (loss <= 0) return { isProfit: true as const, loss, need: NaN }
    if (loss >= 1) return null
    return { isProfit: false as const, loss, need: recovery(loss) }
  }, [mode, buyPrice, currentPrice, lossPct])

  const m = (n: number) => fmtMoney(n, currency)

  return (
    <div>
      <h1 className="text-2xl font-bold">본전 계산기 (손실 복구율)</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        손실 중인 주식이 몇 % 올라야 본전이 되는지 계산합니다. 손실과 복구는 대칭이
        아닙니다 — 50% 손실은 100% 상승이 필요합니다.
      </p>

      <div className="mb-6 flex gap-1 rounded-xl bg-slate-100 p-1 sm:w-fit">
        {(
          [
            ['price', '가격으로 계산'],
            ['percent', '손실률로 계산'],
          ] as [Mode, string][]
        ).map(([mo, label]) => (
          <button
            key={mo}
            type="button"
            onClick={() => setMode(mo)}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors sm:flex-none ${
              mode === mo ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="h-fit space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold">
              {mode === 'price' ? '가격 입력' : '손실률 입력'}
            </h2>
            <div className="space-y-4">
              {mode === 'price' ? (
                <>
                  <CurrencyToggle value={currency} onChange={switchCurrency} />
                  <Field
                    label="매수가 (평단가)"
                    value={buyPrice}
                    onChange={setBuyPrice}
                    suffix={moneySuffix(currency)}
                    step={moneyStep(currency)}
                  />
                  <Field
                    label="현재가"
                    value={currentPrice}
                    onChange={setCurrentPrice}
                    suffix={moneySuffix(currency)}
                    step={moneyStep(currency)}
                  />
                </>
              ) : (
                <Field
                  label="현재 손실률"
                  value={lossPct}
                  onChange={(v) => setLossPct(Math.min(Math.max(v, 0), 99.9))}
                  suffix="%"
                  step={1}
                />
              )}
            </div>
          </div>

          {/* 결과 */}
          {r === null ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
              입력값을 확인해주세요.
            </div>
          ) : r.isProfit ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
              <p className="text-sm text-slate-500">손실이 아닙니다</p>
              <p className="mt-1 text-2xl font-extrabold text-red-600">
                현재 {(-r.loss * 100).toFixed(1)}% 수익 중
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6 text-center">
              <p className="text-sm text-slate-500">
                {(r.loss * 100).toFixed(1)}% 손실 → 본전까지 필요한 상승률
              </p>
              <p className="mt-1 text-5xl font-extrabold tabular-nums text-blue-700">
                +{(r.need * 100).toFixed(1)}%
              </p>
              {mode === 'price' && (
                <p className="mt-3 text-sm text-slate-600">
                  현재가 {m(currentPrice)} → <b>{m(buyPrice)}</b>까지 올라야 본전입니다.
                </p>
              )}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-base font-semibold">손실률별 복구 필요 상승률</h2>
            <div className="divide-y divide-slate-100">
              {TABLE.map((l) => {
                const need = recovery(l / 100) * 100
                const highlight =
                  r && !r.isProfit && Math.abs(r.loss * 100 - l) < 2.5
                return (
                  <div
                    key={l}
                    className={`flex items-center justify-between px-2 py-1.5 ${
                      highlight ? 'rounded-lg bg-blue-50 font-bold' : ''
                    }`}
                  >
                    <span className="text-sm text-blue-600">-{l}%</span>
                    <div className="mx-3 h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-red-400"
                        style={{ width: `${Math.min(need / 9, 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium tabular-nums text-red-600">
                      +{need.toFixed(1)}%
                    </span>
                  </div>
                )
              })}
            </div>
            <p className="mt-3 text-xs text-slate-400">
              필요 상승률 = 손실률 ÷ (1 − 손실률). 손실이 커질수록 복구 난이도는
              기하급수적으로 올라갑니다.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-base font-semibold">이 숫자의 의미</h2>
            <div className="divide-y divide-slate-100">
              <Row label="-10% 손실" value="+11.1% 필요 · 복구 쉬움" />
              <Row label="-30% 손실" value="+42.9% 필요 · 복구 어려움" />
              <Row label="-50% 손실" value="+100% 필요 · 2배 상승" />
              <Row label="-90% 손실" value="+900% 필요 · 사실상 신규 투자" />
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              많은 투자자가 -7~-10% 선에서 기계적 손절 규칙을 두는 이유가 이 비대칭성
              때문입니다. 복구에 필요한 상승률이 감당 가능한 구간에서 결정을 내리세요.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
