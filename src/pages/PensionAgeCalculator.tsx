import { useMemo, useState } from 'react'
import { parseDate, todayStr, pensionStartAge, addYears, dday, fmtDate } from '../lib/age'
import { DateField, Row } from '../components/ui'

const EARLY_RATE = 6 // 조기수령 1년당 감액 %
const DELAY_RATE = 7.2 // 연기수령 1년당 증액 %

export default function PensionAgeCalculator() {
  const [birthStr, setBirthStr] = useState('1970-01-01')

  const r = useMemo(() => {
    const birth = parseDate(birthStr)
    if (!birth) return null
    const today = parseDate(todayStr())!
    const startAge = pensionStartAge(birth.getFullYear())
    const startDate = addYears(birth, startAge)
    const d = dday(startDate, today)
    return {
      birthYear: birth.getFullYear(),
      startAge,
      startDate,
      d,
      earlyAge: startAge - 5,
      earlyDate: addYears(birth, startAge - 5),
      delayAge: startAge + 5,
      delayDate: addYears(birth, startAge + 5),
    }
  }, [birthStr])

  return (
    <div>
      <h1 className="text-2xl font-bold">국민연금 수령나이 계산기</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        출생연도별 노령연금 수령 개시 연령과 조기·연기 수령 시 금액 변화를 확인합니다.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="h-fit space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold">생년월일 입력</h2>
            <DateField label="생년월일" value={birthStr} onChange={setBirthStr} />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-base font-semibold">출생연도별 개시 연령</h2>
            <div className="divide-y divide-slate-100">
              {(
                [
                  ['1952년생 이전', 60],
                  ['1953~1956년생', 61],
                  ['1957~1960년생', 62],
                  ['1961~1964년생', 63],
                  ['1965~1968년생', 64],
                  ['1969년생 이후', 65],
                ] as [string, number][]
              ).map(([label, age]) => (
                <Row
                  key={label}
                  label={label}
                  value={`만 ${age}세`}
                  strong={r !== null && pensionStartAge(r.birthYear) === age}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          {!r ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
              날짜를 확인해주세요.
            </div>
          ) : (
            <>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                <p className="text-sm text-slate-500">{r.birthYear}년생의 노령연금 개시</p>
                <p className="mt-1 text-3xl font-extrabold text-emerald-700">
                  만 {r.startAge}세
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {fmtDate(r.startDate)} 도달 ·{' '}
                  {r.d > 0 ? (
                    <>
                      약 <b>{Math.floor(r.d / 365)}년 {Math.round((r.d % 365) / 30)}개월</b> 남음
                    </>
                  ) : (
                    <b>이미 수령 연령에 도달했습니다</b>
                  )}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  실제 지급은 도달일이 속한 달의 다음 달부터 시작됩니다.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-3 text-base font-semibold">조기 vs 정상 vs 연기 수령</h2>
                <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-2 text-xs font-semibold text-slate-400">
                  <span>수령 시점</span>
                  <span className="text-right">나이</span>
                  <span className="text-right">수령액</span>
                </div>
                {[
                  [`5년 조기 (${r.earlyDate.getFullYear()}년~)`, r.earlyAge, 100 - EARLY_RATE * 5],
                  [`3년 조기`, r.startAge - 3, 100 - EARLY_RATE * 3],
                  [`1년 조기`, r.startAge - 1, 100 - EARLY_RATE],
                  [`정상 수령 (${r.startDate.getFullYear()}년~)`, r.startAge, 100],
                  [`1년 연기`, r.startAge + 1, 100 + DELAY_RATE],
                  [`3년 연기`, r.startAge + 3, 100 + DELAY_RATE * 3],
                  [`5년 연기 (${r.delayDate.getFullYear()}년~)`, r.delayAge, 100 + DELAY_RATE * 5],
                ].map(([label, age, pct], i) => (
                  <div
                    key={String(label)}
                    className={`grid grid-cols-3 gap-2 py-2 text-sm ${
                      pct === 100 ? 'font-bold text-emerald-700' : 'text-slate-600'
                    } ${i > 0 ? 'border-t border-slate-100' : ''}`}
                  >
                    <span>{label}</span>
                    <span className="text-right tabular-nums">만 {age}세</span>
                    <span className="text-right tabular-nums">
                      {Number(pct).toFixed(1).replace(/\.0$/, '')}%
                    </span>
                  </div>
                ))}
                <p className="mt-3 text-xs leading-relaxed text-slate-400">
                  조기노령연금은 1년당 6%(월 0.5%) 감액, 연기연금은 1년당 7.2%(월 0.6%)
                  증액되며 평생 적용됩니다. 조기수령은 가입기간 10년 이상, 소득이 일정 기준
                  이하일 때 가능합니다.
                </p>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800">
                수령 개시 연령 기준이며 실제 연금액은 가입기간과 평균소득에 따라 다릅니다.
                정확한 예상 연금액은 국민연금공단 '내 연금 알아보기'에서 확인하세요.
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
