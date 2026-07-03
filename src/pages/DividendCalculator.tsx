import { useMemo, useState } from 'react'
import { Field, Row, fmt } from '../components/ui'
import {
  CurrencyToggle,
  fmtMoney,
  moneySuffix,
  type Currency,
} from '../components/currency'

/** KRW: 국내 배당소득세 15.4% / USD: 미국 원천징수 15% */
const TAX: Record<Currency, { rate: number; label: string }> = {
  KRW: { rate: 0.154, label: '배당소득세 (15.4%)' },
  USD: { rate: 0.15, label: '미국 원천징수 (15%)' },
}

const defaults: Record<Currency, { invested: number; target: number; step: number }> = {
  KRW: { invested: 50_000_000, target: 1_000_000, step: 1_000_000 },
  USD: { invested: 50_000, target: 1_000, step: 1_000 },
}

export default function DividendCalculator() {
  const [currency, setCurrency] = useState<Currency>('KRW')
  const [invested, setInvested] = useState(50_000_000)
  const [yieldPct, setYieldPct] = useState(4)
  const [targetMonthly, setTargetMonthly] = useState(1_000_000)
  const [fxRate, setFxRate] = useState(1_400)

  const switchCurrency = (c: Currency) => {
    if (c !== currency) {
      setCurrency(c)
      setInvested(defaults[c].invested)
      setTargetMonthly(defaults[c].target)
    }
  }

  const tax = TAX[currency]

  const r = useMemo(() => {
    const annualGross = invested * (yieldPct / 100)
    const annualNet = annualGross * (1 - tax.rate)
    const needed =
      yieldPct > 0 ? (targetMonthly * 12) / ((yieldPct / 100) * (1 - tax.rate)) : NaN
    const grossKrw = currency === 'USD' ? annualGross * fxRate : annualGross
    return {
      annualGross,
      taxAmount: annualGross * tax.rate,
      annualNet,
      monthlyNet: annualNet / 12,
      needed,
      overThreshold: grossKrw > 20_000_000,
    }
  }, [invested, yieldPct, targetMonthly, tax, currency, fxRate])

  const m = (n: number) => fmtMoney(n, currency)

  return (
    <div>
      <h1 className="text-2xl font-bold">배당금 계산기</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        투자금과 배당수익률로 세후 배당금을 계산하고, 목표 월 배당에 필요한 투자금을
        역산합니다. 원화(15.4%)·달러(미국 원천징수 15%) 모두 지원합니다.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">투자 정보</h2>
          <div className="space-y-4">
            <CurrencyToggle value={currency} onChange={switchCurrency} />
            <Field
              label="투자금액"
              value={invested}
              onChange={setInvested}
              suffix={moneySuffix(currency)}
              step={defaults[currency].step}
            />
            <Field
              label="연 배당수익률"
              value={yieldPct}
              onChange={setYieldPct}
              suffix="%"
              step={0.1}
              hint="시가배당률 기준"
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
            <div className="border-t border-slate-100 pt-4">
              <Field
                label="목표 월 배당금 (세후)"
                value={targetMonthly}
                onChange={setTargetMonthly}
                suffix={moneySuffix(currency)}
                step={defaults[currency].step / 10}
                hint="필요 투자금 역산용"
              />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">월평균 배당금 (세후)</p>
                <p className="text-3xl font-extrabold tabular-nums text-emerald-700">
                  {m(r.monthlyNet)}
                </p>
                {currency === 'USD' && fxRate > 0 && (
                  <p className="mt-1 text-sm text-slate-500">
                    약 {fmt(r.monthlyNet * fxRate)}원
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500">연 배당금 (세후)</p>
                <p className="text-lg font-bold tabular-nums">{m(r.annualNet)}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-base font-semibold">상세 내역</h2>
            <div className="divide-y divide-slate-100">
              <Row label="연 배당금 (세전)" value={m(r.annualGross)} />
              <Row label={tax.label} value={`-${m(r.taxAmount)}`} />
              <Row label="연 배당금 (세후)" value={m(r.annualNet)} strong />
              <Row label="월평균 (세후)" value={m(r.monthlyNet)} strong />
              {currency === 'USD' && fxRate > 0 && (
                <Row label="연 배당 원화 환산 (세후)" value={`${fmt(r.annualNet * fxRate)}원`} />
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-base font-semibold">목표 배당 역산</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              세후 월 <b>{m(targetMonthly)}</b>을 배당으로 받으려면 배당수익률 {yieldPct}%
              기준 약 <b className="text-emerald-700">{m(r.needed)}</b>
              {currency === 'USD' && fxRate > 0 && Number.isFinite(r.needed) && (
                <span className="text-slate-400"> (약 {fmt(r.needed * fxRate)}원)</span>
              )}
              을 투자해야 합니다.
            </p>
          </div>

          {r.overThreshold && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800">
              연간 금융소득(이자+배당)이 원화 기준 2,000만원을 초과하면 금융소득종합과세
              대상이 되어 다른 소득과 합산 과세됩니다. 지금 계산된 세전 배당금이 이 기준을
              넘으니 실제 세부담은 원천징수율보다 커질 수 있습니다.
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
