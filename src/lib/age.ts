/* 나이 · 날짜 공용 로직 */

export const DAY = 86_400_000

export const parseDate = (s: string): Date | null => {
  const d = new Date(`${s}T00:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

const stripTime = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

export const todayStr = () => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** 만 나이를 년/월/일로 분해 */
export function ageParts(birth: Date, ref: Date) {
  let y = ref.getFullYear() - birth.getFullYear()
  let m = ref.getMonth() - birth.getMonth()
  let d = ref.getDate() - birth.getDate()
  if (d < 0) {
    m -= 1
    d += new Date(ref.getFullYear(), ref.getMonth(), 0).getDate()
  }
  if (m < 0) {
    y -= 1
    m += 12
  }
  return { years: y, months: m, days: d }
}

export const koreanAges = (birth: Date, ref: Date) => ({
  man: ageParts(birth, ref).years, // 만 나이
  yeon: ref.getFullYear() - birth.getFullYear(), // 연 나이
  seneun: ref.getFullYear() - birth.getFullYear() + 1, // 세는 나이
})

/** 띠 (연도 % 12 기준: 2016=원숭이) */
const ZODIAC = ['원숭이', '닭', '개', '돼지', '쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양']
export const zodiacAnimal = (year: number) => `${ZODIAC[((year % 12) + 12) % 12]}띠`

/** 별자리 (양력) */
const SIGNS: [number, number, string][] = [
  [1, 20, '염소자리'], [2, 19, '물병자리'], [3, 21, '물고기자리'], [4, 20, '양자리'],
  [5, 21, '황소자리'], [6, 22, '쌍둥이자리'], [7, 23, '게자리'], [8, 23, '사자자리'],
  [9, 24, '처녀자리'], [10, 23, '천칭자리'], [11, 23, '전갈자리'], [12, 22, '사수자리'],
  [12, 32, '염소자리'],
]
export function starSign(month: number, day: number): string {
  for (const [m, d, name] of SIGNS) {
    if (month < m || (month === m && day < d)) return name
  }
  return '염소자리'
}

/** D-day: 양수 = 앞으로 n일, 0 = 오늘, 음수 = n일 지남 */
export const dday = (target: Date, ref: Date) =>
  Math.round((stripTime(target).getTime() - stripTime(ref).getTime()) / DAY)

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
export const fmtDate = (d: Date) =>
  `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`

export const addYears = (d: Date, n: number) =>
  new Date(d.getFullYear() + n, d.getMonth(), d.getDate())
export const addMonths = (d: Date, n: number) =>
  new Date(d.getFullYear(), d.getMonth() + n, d.getDate())
export const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY)

/** 다음 생일 */
export function nextBirthday(birth: Date, ref: Date): Date {
  const thisYear = new Date(ref.getFullYear(), birth.getMonth(), birth.getDate())
  return stripTime(thisYear).getTime() >= stripTime(ref).getTime()
    ? thisYear
    : new Date(ref.getFullYear() + 1, birth.getMonth(), birth.getDate())
}

/* ---------- 보험나이 ---------- */

export function insuranceAge(birth: Date, ref: Date) {
  const { years, months } = ageParts(birth, ref)
  const age = months >= 6 ? years + 1 : years
  // 마지막 생일 + 6개월 = 이번 주기 상령일
  const lastBirthday = addYears(birth, years)
  const thisCycle = addMonths(lastBirthday, 6)
  const next = dday(thisCycle, ref) > 0 ? thisCycle : addYears(thisCycle, 1)
  return { age, nextSangryeong: next, daysLeft: dday(next, ref) }
}

/* ---------- 국민연금 수령 개시 연령 ---------- */

export function pensionStartAge(birthYear: number): number {
  if (birthYear <= 1952) return 60
  if (birthYear <= 1956) return 61
  if (birthYear <= 1960) return 62
  if (birthYear <= 1964) return 63
  if (birthYear <= 1968) return 64
  return 65
}

/* ---------- 장수 기념일 ---------- */

export interface Celebration {
  name: string
  desc: string
  date: Date
}

export function celebrations(birth: Date): Celebration[] {
  return [
    { name: '백일', desc: '출생 100일째 되는 날', date: addDays(birth, 99) },
    { name: '첫돌', desc: '첫 번째 생일', date: addYears(birth, 1) },
    { name: '환갑 (회갑)', desc: '만 60세 생일 · 간지가 한 바퀴', date: addYears(birth, 60) },
    { name: '진갑', desc: '만 61세 생일', date: addYears(birth, 61) },
    { name: '칠순 (고희)', desc: '세는나이 70세 생일', date: addYears(birth, 69) },
    { name: '희수', desc: '세는나이 77세 생일', date: addYears(birth, 76) },
    { name: '팔순 (산수)', desc: '세는나이 80세 생일', date: addYears(birth, 79) },
    { name: '미수', desc: '세는나이 88세 생일', date: addYears(birth, 87) },
    { name: '구순 (졸수)', desc: '세는나이 90세 생일', date: addYears(birth, 89) },
    { name: '백수', desc: '세는나이 99세 생일', date: addYears(birth, 98) },
  ]
}
