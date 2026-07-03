import { useMemo, useState } from 'react'
import { Field, Row, fmt } from '../components/ui'
import {
  CurrencyToggle,
  fmtMoney,
  moneyStep,
  moneySuffix,
  type Currency,
} from '../components/currency'

/** 국내 주식 관례: 수익 = 빨강, 손실 = 파랑 */
const pnlColor = (v: number) => (v > 0 ? 'text-red-600' : v < 0 ? 'text-blue-600' : 'text-slate-800')

const defaults: Record<Currency, { buy: number; sell: number }> = {
  KRW: { buy: 50_000, sell: 55_000 },
  USD: { buy: 100, sell: 110 },
}

export default function StockReturnCalculator() {
  const [currency, setCurrency] = useState<Currency>('KRW')
  const [buyPrice, setBuyPrice] = useState(50_000)
  const [sellPrice, setSellPrice] = useState(55_000)
  const [quantity, setQuantity] = useState(100)
  const [fxRate, setFxRate] = useState(1_400)

  const switchCurrency = (c: Currency) => {
    if (c !== currency) {
      setCurrency(c)
      setBuyPrice(defaults[c].buy)
      setSellPrice(defaults[c].sell)
    }
  }

  const r = useMemo(() => {
    const invested = buyPrice * quantity
    const value = sellPrice * quantity
    const pnl = value - invested
    const rate = invested > 0 ? (pnl / invested) * 100 : NaN
    const lossRatio = rate < 0 ? -rate / 100 : 0
    const recoveryRate = lossRatio > 0 && lossRatio < 1 ? (lossRatio / (1 - lossRatio)) * 100 : NaN
    return { invested, value, pnl, rate, recoveryRate }
  }, [buyPrice, sellPrice, quantity])

  const m = (n: number) => fmtMoney(n, currency)

  return (
    <div>
      <h1 className="text-2xl font-bold">주식 수익률 계산기</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        매수가와 매도(현재)가로 손익과 수익률을 계산합니다. 원화·달러 모두 지원하며, 손실
        시 본전까지 필요한 상승률도 알려드립니다.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">거래 정보</h2>
          <div className="space-y-4">
            <CurrencyToggle value={currency} onChange={switchCurrency} />
            <Field
              label="매수가 (평단가)"
              value={buyPrice}
              onChange={setBuyPrice}
              suffix={moneySuffix(currency)}
              step={moneyStep(currency)}
            />
            <Field
              label="매도가 (현재가)"
              value={sellPrice}
              onChange={setSellPrice}
              suffix={moneySuffix(currency)}
              step={moneyStep(currency)}
            />
            <Field
              label="수량"
              value={quantity}
              onChange={(v) => setQuantity(Math.max(0, Math.round(v)))}
              suffix="주"
              step={1}
            />
            {currency === 'USD' && (
              <Field
                label="환율 (원/달러)"
                value={fxRate}
                onChange={setFxRate}
                suffix="원"
                step={10}
                hint="원화 환산 표시용"
              />
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div
            className={`rounded-2xl border p-6 text-center ${
              r.pnl > 0 ? 'border-red-200 bg-red-50' : r.pnl < 0 ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-white'
            }`}
          >
            <p className="text-sm text-slate-500">평가 손익</p>
            <p className={`mt-1 text-4xl font-extrabold tabular-nums ${pnlColor(r.pnl)}`}>
              {r.pnl > 0 ? '+' : ''}
              {m(r.pnl)}
            </p>
            <p className={`mt-1 text-xl font-bold tabular-nums ${pnlColor(r.pnl)}`}>
              {r.rate > 0 ? '+' : ''}
              {Number.isFinite(r.rate) ? r.rate.toFixed(2) : '-'}%
            </p>
            {currency === 'USD' && fxRate > 0 && (
              <p className="mt-2 text-sm text-slate-500">
                원화 환산 약{' '}
                <b className={pnlColor(r.pnl)}>
                  {r.pnl > 0 ? '+' : ''}
                  {fmt(r.pnl * fxRate)}원
                </b>
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="divide-y divide-slate-100">
              <Row label="총 매수금액" value={m(r.invested)} />
              <Row label="평가/매도금액" value={m(r.value)} />
              {currency === 'USD' && fxRate > 0 && (
                <Row label="총 매수금액 (원화 환산)" value={`${fmt(r.invested * fxRate)}원`} />
              )}
              <Row label="손익" value={`${r.pnl > 0 ? '+' : ''}${m(r.pnl)}`} strong negative={r.pnl < 0} />
            </div>
            {r.pnl < 0 && Number.isFinite(r.recoveryRate) && (
              <p className="mt-3 rounded-lg bg-blue-50 p-3 text-sm leading-relaxed text-blue-800">
                현재 {(-r.rate).toFixed(1)}% 손실 상태입니다. 본전이 되려면 현재가에서{' '}
                <b>+{r.recoveryRate.toFixed(1)}%</b> 올라야 합니다. 손실이 깊어질수록 복구에
                필요한 상승률은 기하급수적으로 커집니다.
              </p>
            )}
            {r.pnl > 0 && (
              <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm leading-relaxed text-red-700">
                원금 대비 <b>+{r.rate.toFixed(1)}%</b> 수익입니다. 실제 수령액은 증권사
                수수료와 세금(국내 거래세, 해외 양도세 등)
                {currency === 'USD' && ', 환율 변동'}에 따라 달라질 수 있습니다.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
