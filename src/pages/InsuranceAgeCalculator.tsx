import { useMemo, useState } from 'react'
import { parseDate, todayStr, ageParts, insuranceAge, fmtDate } from '../lib/age'
import { DateField, Row } from '../components/ui'

export default function InsuranceAgeCalculator() {
  const [birthStr, setBirthStr] = useState('1990-01-01')
  const [refStr, setRefStr] = useState(todayStr())

  const r = useMemo(() => {
    const birth = parseDate(birthStr)
    const ref = parseDate(refStr)
    if (!birth || !ref || birth.getTime() > ref.getTime()) return null
    const parts = ageParts(birth, ref)
    const ins = insuranceAge(birth, ref)
    return { parts, ...ins, man: parts.years }
  }, [birthStr, refStr])

  return (
    <div>
      <h1 className="text-2xl font-bold">보험나이 계산기</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        보험나이는 만 나이에서 6개월 미만은 버리고 6개월 이상은 올린 나이입니다. 상령일이
        지나면 보험나이가 1살 올라 보험료가 비싸집니다.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">정보 입력</h2>
          <div className="space-y-4">
            <DateField label="생년월일" value={birthStr} onChange={setBirthStr} />
            <DateField
              label="가입(계약) 예정일"
              value={refStr}
              onChange={setRefStr}
              hint="기본: 오늘"
            />
          </div>
        </section>

        <section className="space-y-4">
          {!r ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
              날짜를 확인해주세요.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center">
                  <p className="text-xs font-semibold text-slate-500">보험나이</p>
                  <p className="mt-1 text-3xl font-extrabold text-emerald-700">{r.age}세</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
                  <p className="text-xs font-semibold text-slate-500">만 나이</p>
                  <p className="mt-1 text-3xl font-extrabold">{r.man}세</p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-2 text-base font-semibold">상령일 정보</h2>
                <div className="divide-y divide-slate-100">
                  <Row
                    label="정확한 만 나이"
                    value={`${r.parts.years}년 ${r.parts.months}개월 ${r.parts.days}일`}
                  />
                  <Row label="다음 상령일" value={fmtDate(r.nextSangryeong)} strong />
                  <Row
                    label="상령일까지"
                    value={`${r.daysLeft.toLocaleString('ko-KR')}일 남음`}
                    negative={r.daysLeft <= 30}
                  />
                </div>
                <p
                  className={`mt-3 rounded-lg p-3 text-sm leading-relaxed ${
                    r.daysLeft <= 30
                      ? 'bg-red-50 text-red-700'
                      : 'bg-slate-50 text-slate-600'
                  }`}
                >
                  {r.daysLeft <= 30 ? (
                    <>
                      상령일이 <b>{r.daysLeft}일</b> 남았습니다. 보험 가입 예정이라면{' '}
                      <b>{fmtDate(r.nextSangryeong)} 전에</b> 가입해야 보험나이 {r.age}세
                      보험료가 적용됩니다. 그 이후엔 {r.age + 1}세로 계산됩니다.
                    </>
                  ) : (
                    <>
                      다음 상령일({fmtDate(r.nextSangryeong)}) 전까지는 보험나이 {r.age}세로
                      가입할 수 있습니다.
                    </>
                  )}
                </p>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800">
                보험나이는 생명보험·장기손해보험의 표준 계산 방식이며, 일부 상품(자동차보험
                등)은 만 나이나 다른 기준을 사용합니다. 정확한 적용 나이는 약관을
                확인하세요.
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
