import { useMemo } from 'react'
import { buildSalaryTable } from '../lib/salary'
import { fmt } from '../components/ui'

export default function SalaryTableCalculator() {
  const rows = useMemo(() => buildSalaryTable(), [])

  return (
    <div>
      <h1 className="text-2xl font-bold">연봉 실수령액표</h1>
      <p className="mt-1 mb-6 text-sm text-muted">
        연봉 2,000만원부터 2억원까지 가구원 수별 월 실수령액을 미리 계산했습니다. 내 연봉과
        가까운 행을 찾아보세요.
      </p>

      <div className="border border-rule bg-tint p-4 text-xs leading-relaxed text-body">
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

      <div className="mt-4 overflow-x-auto border border-rule bg-paper">
        <table className="w-full min-w-[920px] text-right text-sm tabular-nums">
          <thead className="bg-tint text-xs text-muted">
            <tr>
              <th className="py-2 pl-4 pr-2 text-left font-medium" rowSpan={2}>
                연봉
              </th>
              <th className="px-2 py-2 font-medium" rowSpan={2}>
                월급(세전)
              </th>
              <th className="border-l border-rule px-2 py-1 text-center font-medium" colSpan={5}>
                공제 내역(1인 가구 기준)
              </th>
              <th className="border-l border-rule px-2 py-1 text-center font-medium" colSpan={4}>
                월 실수령액
              </th>
            </tr>
            <tr className="border-b border-rule">
              <th className="border-l border-rule px-2 py-1.5 font-medium">국민연금</th>
              <th className="px-2 py-1.5 font-medium">건강보험</th>
              <th className="px-2 py-1.5 font-medium">고용보험</th>
              <th className="px-2 py-1.5 font-medium">소득세</th>
              <th className="px-2 py-1.5 font-medium">공제 합계</th>
              <th className="border-l border-rule px-2 py-1.5 font-medium">1인</th>
              <th className="px-2 py-1.5 font-medium">2인</th>
              <th className="px-2 py-1.5 font-medium">3인</th>
              <th className="py-1.5 pl-2 pr-4 font-medium">4인+</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.annualSalary} className="border-b border-rule even:bg-tint">
                <td className="py-1.5 pl-4 pr-2 text-left font-semibold text-ink">
                  {fmt(r.annualSalary)}
                </td>
                <td className="px-2 py-1.5 text-muted">{fmt(r.monthlyGross)}</td>
                <td className="border-l border-rule px-2 py-1.5 text-muted">
                  -{fmt(r.pension)}
                </td>
                <td className="px-2 py-1.5 text-muted">-{fmt(r.health)}</td>
                <td className="px-2 py-1.5 text-muted">-{fmt(r.employment)}</td>
                <td className="px-2 py-1.5 text-muted">-{fmt(r.incomeTaxTotal)}</td>
                <td className="px-2 py-1.5 font-medium text-body">-{fmt(r.totalDeduction)}</td>
                <td className="border-l border-rule px-2 py-1.5">{fmt(r.net[0])}</td>
                <td className="px-2 py-1.5">{fmt(r.net[1])}</td>
                <td className="px-2 py-1.5">{fmt(r.net[2])}</td>
                <td className="py-1.5 pl-2 pr-4 font-medium text-accent">{fmt(r.net[3])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-muted">
        단위: 원(월 기준). 가구원 수는 본인을 포함한 부양가족 수입니다. 국민연금·건강보험·고용보험은
        가구원 수와 무관하게 급여에만 연동되지만, 소득세는 가구원 수에 따라 달라져 공제 내역은
        1인 가구 기준으로만 표시합니다.
      </p>
    </div>
  )
}
