import { useMemo } from 'react'
import { buildSalaryTable } from '../lib/salary'
import { fmt } from '../components/ui'

export default function SalaryTableCalculator() {
  const rows = useMemo(() => buildSalaryTable(), [])

  return (
    <div>
      <h1 className="text-2xl font-bold">연봉 실수령액표</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        연봉 2,000만원부터 2억원까지 가구원 수별 월 실수령액을 미리 계산했습니다. 내 연봉과
        가까운 행을 찾아보세요.
      </p>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800">
        <b>계산 기준</b>: 비과세 월액 0원 · 8~20세 자녀 0명 · 원천징수비율 100% 기준입니다.
        식대 등 비과세 항목이 있거나 자녀가 있다면 실제 실수령액은 표보다 더 많습니다. 내
        조건에 맞춘 정확한 계산은{' '}
        <a
          href="/salary/"
          className="font-semibold underline decoration-amber-400 underline-offset-2"
        >
          연봉 실수령액 계산기
        </a>
        를 이용하세요.
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[640px] text-right text-sm tabular-nums">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr className="border-b border-slate-200">
              <th className="py-2 pl-4 pr-2 text-left font-medium">연봉</th>
              <th className="px-2 py-2 font-medium">월급(세전)</th>
              <th className="px-2 py-2 font-medium">1인 가구</th>
              <th className="px-2 py-2 font-medium">2인 가구</th>
              <th className="px-2 py-2 font-medium">3인 가구</th>
              <th className="py-2 pl-2 pr-4 font-medium">4인 가구+</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.annualSalary} className="border-b border-slate-50 even:bg-slate-50/60">
                <td className="py-1.5 pl-4 pr-2 text-left font-semibold text-slate-700">
                  {fmt(r.annualSalary)}
                </td>
                <td className="px-2 py-1.5 text-slate-500">{fmt(r.monthlyGross)}</td>
                <td className="px-2 py-1.5">{fmt(r.net[0])}</td>
                <td className="px-2 py-1.5">{fmt(r.net[1])}</td>
                <td className="px-2 py-1.5">{fmt(r.net[2])}</td>
                <td className="py-1.5 pl-2 pr-4 font-medium text-emerald-700">{fmt(r.net[3])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-slate-400">
        단위: 원(월 실수령액). 가구원 수는 본인을 포함한 부양가족 수입니다.
      </p>
    </div>
  )
}
