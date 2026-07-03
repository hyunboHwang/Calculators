/* 통화 선택 (원화/달러) 공용 유틸 */

export type Currency = 'KRW' | 'USD'

export const fmtMoney = (n: number, c: Currency) => {
  if (!Number.isFinite(n)) return '-'
  if (c === 'KRW') return `${Math.round(n).toLocaleString('ko-KR')}원`
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export const moneyStep = (c: Currency) => (c === 'KRW' ? 100 : 0.01)
export const moneySuffix = (c: Currency) => (c === 'KRW' ? '원' : '$')

export function CurrencyToggle({
  value,
  onChange,
}: {
  value: Currency
  onChange: (c: Currency) => void
}) {
  return (
    <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
      {(
        [
          ['KRW', '₩ 원화'],
          ['USD', '$ 달러'],
        ] as [Currency, string][]
      ).map(([c, label]) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            value === c ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
