import { useMemo, useState } from 'react'
import { parseDate, todayStr, dday, fmtDate, addDays } from '../lib/age'
import { DateField, Field, Row } from '../components/ui'

export default function DueDateCalculator() {
  const [lmpStr, setLmpStr] = useState(todayStr())
  const [cycle, setCycle] = useState(28)

  const r = useMemo(() => {
    const lmp = parseDate(lmpStr)
    if (!lmp) return null
    const adjust = cycle - 28
    const base = addDays(lmp, adjust) // 주기 보정된 기준일
    const due = addDays(base, 280) // 40주
    const today = parseDate(todayStr())!
    const gestDays = dday(today, base)
    const weeks = Math.floor(gestDays / 7)
    const days = gestDays % 7
    const valid = gestDays >= 0 && gestDays <= 320
    const trimester = weeks < 14 ? 1 : weeks < 28 ? 2 : 3
    return {
      due,
      d: dday(due, today),
      weeks,
      days,
      valid,
      trimester,
      fullTerm: addDays(base, 259), // 37주 0일 (만삭 시작)
      t2: addDays(base, 98), // 14주 0일
      t3: addDays(base, 196), // 28주 0일
    }
  }, [lmpStr, cycle])

  return (
    <div>
      <h1 className="text-2xl font-bold">출산예정일 계산기</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        마지막 생리 시작일 기준으로 출산예정일(임신 40주)과 현재 임신 주수를 계산합니다.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">정보 입력</h2>
          <div className="space-y-4">
            <DateField label="마지막 생리 시작일" value={lmpStr} onChange={setLmpStr} />
            <Field
              label="평소 생리 주기"
              value={cycle}
              onChange={(v) => setCycle(Math.min(Math.max(Math.round(v), 20), 45))}
              suffix="일"
              step={1}
              hint="기본 28일"
            />
          </div>
        </section>

        <section className="space-y-4">
          {r && (
            <>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
                <p className="text-sm text-slate-500">출산예정일 (임신 40주)</p>
                <p className="mt-1 text-3xl font-extrabold text-emerald-700">{fmtDate(r.due)}</p>
                {r.valid && (
                  <p className="mt-3 text-sm text-slate-600">
                    오늘은 임신 <b>{r.weeks}주 {r.days}일</b> ({r.trimester}분기) · 예정일까지{' '}
                    <b>D-{Math.max(r.d, 0)}</b>
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-2 text-base font-semibold">주요 시점</h2>
                <div className="divide-y divide-slate-100">
                  <Row label="2분기 시작 (14주)" value={fmtDate(r.t2)} />
                  <Row label="3분기 시작 (28주)" value={fmtDate(r.t3)} />
                  <Row label="만삭 시작 (37주)" value={fmtDate(r.fullTerm)} />
                  <Row label="출산예정일 (40주)" value={fmtDate(r.due)} strong />
                </div>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800">
                마지막 생리일 기준 네겔레 법칙(+280일, 주기 보정)에 따른 추정치입니다. 실제
                예정일은 초음파 검사 결과에 따라 조정될 수 있으며, 정확한 진단과 관리는
                반드시 산부인과 진료를 따르세요.
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
