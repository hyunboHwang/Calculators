import { useMemo, useState } from 'react'
import { parseDate, todayStr, dday, fmtDate, addMonths, addDays } from '../lib/age'
import { DateField, Row } from '../components/ui'

const BRANCHES = [
  { id: 'army', name: '육군', months: 18 },
  { id: 'marine', name: '해병대', months: 18 },
  { id: 'navy', name: '해군', months: 20 },
  { id: 'airforce', name: '공군', months: 21 },
  { id: 'social', name: '사회복무요원', months: 21 },
] as const

export default function DischargeCalculator() {
  const [enlistStr, setEnlistStr] = useState(todayStr())
  const [branchId, setBranchId] = useState<(typeof BRANCHES)[number]['id']>('army')

  const r = useMemo(() => {
    const enlist = parseDate(enlistStr)
    if (!enlist) return null
    const branch = BRANCHES.find((b) => b.id === branchId)!
    const discharge = addDays(addMonths(enlist, branch.months), -1) // 전역일 = 입대일 + 복무개월 - 1일
    const today = parseDate(todayStr())!
    const total = dday(discharge, enlist)
    const served = Math.min(Math.max(dday(today, enlist) + 1, 0), total + 1)
    const remain = dday(discharge, today)
    const progress = Math.min(Math.max((served / (total + 1)) * 100, 0), 100)
    return { branch, discharge, total: total + 1, served, remain, progress }
  }, [enlistStr, branchId])

  return (
    <div>
      <h1 className="text-2xl font-bold">전역일 계산기</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        입대일과 군종을 선택하면 전역일, 남은 복무일, 진행률을 계산합니다.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">복무 정보</h2>
          <DateField label="입대일" value={enlistStr} onChange={setEnlistStr} />
          <div className="mt-4">
            <span className="mb-1 block text-sm font-medium text-slate-700">군종</span>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {BRANCHES.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBranchId(b.id)}
                  className={`rounded-lg border px-2 py-2 text-sm font-medium transition-colors ${
                    branchId === b.id
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-slate-300 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {b.name}
                  <span className="block text-[11px] font-normal opacity-70">{b.months}개월</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          {r && (
            <>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
                <p className="text-sm text-slate-500">
                  {r.branch.name} · 전역일 {fmtDate(r.discharge)}
                </p>
                <p className="mt-2 text-5xl font-extrabold tabular-nums text-emerald-700">
                  {r.remain > 0 ? `D-${r.remain.toLocaleString('ko-KR')}` : r.remain === 0 ? 'D-DAY 🎉' : '전역 완료'}
                </p>
                <div className="mx-auto mt-5 max-w-md">
                  <div className="h-3 overflow-hidden rounded-full bg-white">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${r.progress}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500">
                    복무 진행률 <b>{r.progress.toFixed(1)}%</b>
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="divide-y divide-slate-100">
                  <Row label="입대일" value={fmtDate(parseDate(enlistStr)!)} />
                  <Row label="전역일" value={fmtDate(r.discharge)} strong />
                  <Row label="총 복무일" value={`${r.total.toLocaleString('ko-KR')}일`} />
                  <Row label="복무한 날" value={`${r.served.toLocaleString('ko-KR')}일`} />
                  <Row
                    label="남은 날"
                    value={r.remain > 0 ? `${r.remain.toLocaleString('ko-KR')}일` : '없음'}
                    strong
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800">
                복무기간은 현행 기준(육군·해병 18개월, 해군 20개월, 공군·사회복무요원
                21개월)이며, 전역일은 입대일로부터 복무개월 후 전날로 계산했습니다. 부대
                사정이나 제도 변경에 따라 실제 전역일과 다를 수 있습니다.
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
