/**
 * 종합부동산세(종부세) 추정 — 개인, 다주택 중과 제외한 일반세율 기준
 * - 기본공제: 1세대1주택자 12억, 그 외 9억
 * - 공정시장가액비율 60%, 농특세(종부세의 20%) 별도
 * - 홈택스 고시 기준 단순화 모델이며 세부담 상한·재산세 중복분 공제·다주택 중과는 반영하지 않음
 * - 1세대1주택자(isSingleHouse)는 종부세법 제9조 세액공제 적용: 고령자(만 60/65/70세 이상 20/30/40%)
 *   + 장기보유(5/10/15년 이상 20/40/50%), 합산 80% 한도. 공제 대상은 '산출세액'.
 *   법상 순서는 산출세액(세율 적용 − 재산세 중복분) → 세액공제 → 세부담 상한이나,
 *   재산세 중복분·세부담 상한은 미반영이므로 여기서는 세율 적용 세액에 바로 공제율을 곱함
 *   (실제 공제액은 재산세 중복분을 뺀 산출세액 기준이라 더 작을 수 있음)
 * - 공동명의 1주택(ownership): 'jointSpecial'(특례 신청, 9/16~9/30)은 1세대1주택자로 보아 12억 공제와
 *   세액공제를 받고(종부세법 제10조의2제3항, 연령·보유기간은 합의한 1인 기준), 'jointEach'(특례 미신청,
 *   인별 9억 공제)는 세액공제 불가. jointEach는 지분 50:50을 가정해 1인당으로 계산해 합산
 * - 출처: 국세청 종합부동산세 세액계산 흐름도 https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?cntntsId=7735&mi=2353
 */
import type { InfoTable } from './infoTable.ts'

interface Bracket {
  limit: number
  rate: number
  deduction: number
}

const BRACKETS: Bracket[] = [
  { limit: 300_000_000, rate: 0.005, deduction: 0 },
  { limit: 600_000_000, rate: 0.007, deduction: 600_000 },
  { limit: 1_200_000_000, rate: 0.01, deduction: 2_400_000 },
  { limit: 2_500_000_000, rate: 0.013, deduction: 6_000_000 },
  { limit: 5_000_000_000, rate: 0.015, deduction: 11_000_000 },
  { limit: 9_400_000_000, rate: 0.02, deduction: 36_000_000 },
  { limit: Infinity, rate: 0.027, deduction: 101_800_000 },
]

export interface ComprehensiveRealEstateTaxInput {
  totalPublicPrice: number // 공시가격 합산액
  isSingleHouse: boolean // 1세대1주택 여부
  age?: number // 만 나이 구간 하한(0|60|65|70). 기본 0 = 공제 없음
  holdYears?: number // 보유기간 구간 하한(0|5|10|15). 기본 0 = 공제 없음
  ownership?: 'sole' | 'jointSpecial' | 'jointEach' // 1세대1주택일 때 소유 형태. 기본 단독명의
}

/** 공동명의 특례 미신청(인별 9억씩) — 부부 지분 50:50 가정, 세액공제 불가 */
const isJointEach = (i: ComprehensiveRealEstateTaxInput) => i.isSingleHouse && i.ownership === 'jointEach'
/** 과세 여부 판단용 총 공제 한도 */
const exemptLimit = (i: ComprehensiveRealEstateTaxInput) =>
  isJointEach(i) ? 2 * 900_000_000 : getDeduction(i.isSingleHouse)

const AGE_RATES: [number, number][] = [[70, 0.4], [65, 0.3], [60, 0.2]]
const HOLD_RATES: [number, number][] = [[15, 0.5], [10, 0.4], [5, 0.2]]
const MAX_CREDIT_RATE = 0.8
const rateOf = (t: [number, number][], v: number) => t.find(([min]) => v >= min)?.[1] ?? 0

function getDeduction(isSingleHouse: boolean): number {
  return isSingleHouse ? 1_200_000_000 : 900_000_000
}

export function calcComprehensiveRealEstateTax(i: ComprehensiveRealEstateTaxInput) {
  const persons = isJointEach(i) ? 2 : 1
  const deduction = isJointEach(i) ? 900_000_000 : getDeduction(i.isSingleHouse)
  const excess = Math.max(i.totalPublicPrice / persons - deduction, 0)
  const taxBase = excess * 0.6 // 1인당 과세표준
  const bracket = BRACKETS.find((b) => taxBase <= b.limit) ?? BRACKETS[BRACKETS.length - 1]
  const taxBeforeCredit = Math.max(taxBase * bracket.rate - bracket.deduction, 0) * persons
  const creditable = i.isSingleHouse && !isJointEach(i)
  const ageRate = creditable ? rateOf(AGE_RATES, i.age ?? 0) : 0
  const holdRate = creditable ? rateOf(HOLD_RATES, i.holdYears ?? 0) : 0
  const creditRate = Math.min(ageRate + holdRate, MAX_CREDIT_RATE)
  const creditAmount = taxBeforeCredit * creditRate
  const comprehensiveTax = taxBeforeCredit - creditAmount
  const ruralSpecialTax = comprehensiveTax * 0.2
  const total = comprehensiveTax + ruralSpecialTax

  return {
    persons,
    taxBase: Math.round(taxBase),
    taxBeforeCredit: Math.round(taxBeforeCredit),
    ageRate,
    holdRate,
    creditRate,
    creditAmount: Math.round(creditAmount),
    comprehensiveTax: Math.round(comprehensiveTax),
    ruralSpecialTax: Math.round(ruralSpecialTax),
    total: Math.round(total),
  }
}

// 타입 전용 import 유지 필수 — postbuild.mjs가 이 파일을 Node 타입 스트리핑으로 직접
// import하므로, 값 import로 바뀌면 React 컴포넌트 파일을 Node가 로드하려다 빌드가 깨진다.
import type { Verdict } from '../components/VerdictBanner'

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`

export function getComprehensiveRealEstateTaxVerdict(
  i: ComprehensiveRealEstateTaxInput,
  r: ReturnType<typeof calcComprehensiveRealEstateTax>,
): Verdict {
  const deduction = exemptLimit(i)
  const deductionLabel = isJointEach(i) ? '공동명의 인별 9억원씩 18억원' : i.isSingleHouse ? '1세대1주택 12억원' : '9억원'
  if (i.totalPublicPrice <= deduction) {
    return {
      tone: 'good',
      badgeLabel: '종부세 비과세 대상',
      headline: '0원',
      headlineUnit: '예상 종부세',
      description: `공시가격 합산액이 기본공제(${deductionLabel}) 이하라 종합부동산세가 없습니다.`,
    }
  }
  return {
    tone: 'neutral',
    badgeLabel: '종부세 과세 대상',
    headline: won(r.total),
    headlineUnit: '예상 종부세',
    description: `공시가격 합산액이 기본공제(${deductionLabel})를 초과해 과세 대상입니다.${r.creditRate > 0 ? ` 고령자·장기보유 세액공제 ${Math.round(r.creditRate * 100)}%(${won(r.creditAmount)})를 반영했습니다.` : ''}`,
  }
}

export function comprehensiveRealEstateTaxTables(): InfoTable[] {
  const pct = (n: number) => `${+(n * 100).toFixed(1)}%`
  const man = (n: number) => `${(n / 100_000_000).toLocaleString('ko-KR')}억원`
  let prev = 0
  const rateRows = BRACKETS.map((b) => {
    const range = b.limit === Infinity ? `${man(prev)} 초과` : `${man(prev)} 초과 ~ ${man(b.limit)} 이하`
    prev = b.limit
    return [range, pct(b.rate), b.deduction === 0 ? '-' : `${b.deduction.toLocaleString('ko-KR')}원`]
  })
  const credit = (label: string, t: [number, number][], unit: string) =>
    [...t].reverse().map(([min, r]) => [label, `${min}${unit} 이상`, pct(r)])
  return [
    {
      title: '종합부동산세 세율표 (2주택 이하 개인)',
      note: '세액 = 과세표준 × 세율 − 누진공제. 과세표준 = (공시가격 합산 − 기본공제) × 공정시장가액비율 60%.',
      headers: ['과세표준', '세율', '누진공제'],
      rows: rateRows,
    },
    {
      title: '1세대1주택 고령자·장기보유 세액공제율',
      note: `단독명의 또는 공동명의 1주택 특례(9/16~9/30 신청)를 택한 1세대1주택자에게 적용되며 두 공제율을 더하되 합산 ${pct(MAX_CREDIT_RATE)}가 한도입니다. 공동명의 인별 9억 공제 방식은 적용 불가. 출처: 종합부동산세법 제9조·제10조의2, 국세청 세액계산 흐름도.`,
      headers: ['구분', '조건', '공제율'],
      rows: [...credit('고령자(만 나이)', AGE_RATES, '세'), ...credit('장기보유', HOLD_RATES, '년')],
    },
  ]
}
