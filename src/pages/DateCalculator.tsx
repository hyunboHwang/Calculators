import { useMemo, useState } from 'react'
import { parseDate, todayStr, dday, fmtDate, addDays, addMonths } from '../lib/age'
import { DateField, Field, Row } from '../components/ui'

export default function DateCalculator() {
  // 두 날짜 사이
  const [fromStr, setFromStr] = useState(todayStr())
  const [toStr, setToStr] = useState(todayStr())
  // 날짜 더하기/빼기
  const [baseStr, setBaseStr] = useState(todayStr())
  const [amount, setAmount] = useState(100)
  const [unit, setUnit] = useState<'days' | 'weeks' | 'months'>('days')
  const [direction, setDirection] = useState<1 | -1>(1)

  const between = useMemo(() => {
    const a = parseDate(fromStr)
    const b = parseDate(toStr)
    if (!a || !b) return null
    const diff = dday(b, a) // b - a
    return { diff, abs: Math.abs(diff) }
  }, [fromStr, toStr])

  const added = useMemo(() => {
    const base = parseDate(baseStr)
    if (!base) return null
    const n = amount * direction
    const result =
      unit === 'days' ? addDays(base, n) : unit === 'weeks' ? addDays(base, n * 7) : addMonths(base, n)
    return { result }
  }, [baseStr, amount, unit, direction])

  return (
    <div>
      <h1 className="text-2xl font-bold">날짜 계산기</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        두 날짜 사이의 일수를 세고, 특정 날짜로부터 N일·N주·N개월 후가 언제인지 계산합니다.
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 두 날짜 사이 */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">두 날짜 사이 일수</h2>
          <div className="grid grid-cols-2 gap-3">
            <DateField label="시작일" value={fromStr} onChange={setFromStr} />
            <DateField label="종료일" value={toStr} onChange={setToStr} />
          </div>
          {between && (
            <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-center">
              <p className="text-3xl font-extrabold tabular-nums text-emerald-700">
                {between.abs.toLocaleString('ko-KR')}일
              </p>
              <p className="mt-1 text-xs text-slate-500">
                양쪽 날짜 모두 포함하면 {(between.abs + 1).toLocaleString('ko-KR')}일 · 약{' '}
                {(between.abs / 7).toFixed(1)}주 · 약 {(between.abs / 30.44).toFixed(1)}개월
              </p>
            </div>
          )}
        </section>

        {/* 날짜 더하기/빼기 */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">N일 후 · 전 날짜</h2>
          <div className="space-y-3">
            <DateField label="기준일" value={baseStr} onChange={setBaseStr} />
            <div className="grid grid-cols-3 gap-2">
              <Field label="숫자" value={amount} onChange={(v) => setAmount(Math.max(0, Math.round(v)))} suffix="" step={1} />
              <div>
                <span className="mb-1 block text-sm font-medium text-slate-700">단위</span>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as typeof unit)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                >
                  <option value="days">일</option>
                  <option value="weeks">주</option>
                  <option value="months">개월</option>
                </select>
              </div>
              <div>
                <span className="mb-1 block text-sm font-medium text-slate-700">방향</span>
                <select
                  value={direction}
                  onChange={(e) => setDirection(Number(e.target.value) as 1 | -1)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                >
                  <option value={1}>후 (+)</option>
                  <option value={-1}>전 (−)</option>
                </select>
              </div>
            </div>
          </div>
          {added && (
            <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-center">
              <p className="text-xl font-extrabold text-emerald-700">{fmtDate(added.result)}</p>
            </div>
          )}
          <div className="mt-4 divide-y divide-slate-100 border-t border-slate-100 pt-1">
            {[
              ['+50일', 50],
              ['+100일', 100],
              ['+200일', 200],
              ['+1000일', 1000],
            ].map(([label, n]) => {
              const base = parseDate(baseStr)
              return base ? (
                <Row key={String(label)} label={String(label)} value={fmtDate(addDays(base, Number(n)))} />
              ) : null
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
