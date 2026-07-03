import { useMemo, useState } from 'react'
import {
  parseDate,
  todayStr,
  ageParts,
  koreanAges,
  zodiacAnimal,
  starSign,
  nextBirthday,
  dday,
  fmtDate,
} from '../lib/age'
import { DateField, Row } from '../components/ui'

export default function AgeCalculator() {
  const [birthStr, setBirthStr] = useState('1990-01-01')
  const [refStr, setRefStr] = useState(todayStr())

  const r = useMemo(() => {
    const birth = parseDate(birthStr)
    const ref = parseDate(refStr)
    if (!birth || !ref || birth.getTime() > ref.getTime()) return null
    const parts = ageParts(birth, ref)
    const ages = koreanAges(birth, ref)
    const nb = nextBirthday(birth, ref)
    return {
      parts,
      ages,
      zodiac: zodiacAnimal(birth.getFullYear()),
      sign: starSign(birth.getMonth() + 1, birth.getDate()),
      nextBirthday: nb,
      birthdayDday: dday(nb, ref),
      elementary: birth.getFullYear() + 7,
      middle: birth.getFullYear() + 13,
      high: birth.getFullYear() + 16,
      univ: birth.getFullYear() + 19,
    }
  }, [birthStr, refStr])

  return (
    <div>
      <h1 className="text-2xl font-bold">나이 계산기</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        만 나이 · 연 나이 · 세는 나이를 한 번에 계산합니다. 2023년 6월부터 법적 나이는 만
        나이로 통일되었습니다.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">생년월일 입력</h2>
          <div className="space-y-4">
            <DateField label="생년월일" value={birthStr} onChange={setBirthStr} />
            <DateField label="기준일" value={refStr} onChange={setRefStr} hint="기본: 오늘" />
          </div>
        </section>

        <section className="space-y-4">
          {!r ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
              날짜를 확인해주세요. 생년월일이 기준일보다 늦습니다.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center">
                  <p className="text-xs font-semibold text-slate-500">만 나이 (법적)</p>
                  <p className="mt-1 text-3xl font-extrabold text-emerald-700">{r.ages.man}세</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
                  <p className="text-xs font-semibold text-slate-500">연 나이</p>
                  <p className="mt-1 text-3xl font-extrabold">{r.ages.yeon}세</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
                  <p className="text-xs font-semibold text-slate-500">세는 나이</p>
                  <p className="mt-1 text-3xl font-extrabold">{r.ages.seneun}세</p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-2 text-base font-semibold">상세 정보</h2>
                <div className="divide-y divide-slate-100">
                  <Row
                    label="정확한 만 나이"
                    value={`${r.parts.years}년 ${r.parts.months}개월 ${r.parts.days}일`}
                    strong
                  />
                  <Row label="띠" value={r.zodiac} sub="양력 연도 기준, 음력 설 이전 출생은 이전 해 띠일 수 있음" />
                  <Row label="별자리" value={r.sign} />
                  <Row
                    label="다음 생일"
                    value={`${fmtDate(r.nextBirthday)} · D-${r.birthdayDday === 0 ? 'DAY' : r.birthdayDday}`}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-2 text-base font-semibold">입학년도</h2>
                <div className="divide-y divide-slate-100">
                  <Row label="초등학교" value={`${r.elementary}년 3월`} />
                  <Row label="중학교" value={`${r.middle}년 3월`} />
                  <Row label="고등학교" value={`${r.high}년 3월`} />
                  <Row label="대학교" value={`${r.univ}년 3월`} sub="재수·조기입학 미반영" />
                </div>
                <p className="mt-3 text-xs text-slate-400">
                  2009년 이후 초등학교 입학 기준(출생연도 + 7년, 1~2월생 조기입학 제도 폐지
                  이후). 그 이전 출생자는 빠른년생 여부에 따라 1년 다를 수 있습니다.
                </p>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
