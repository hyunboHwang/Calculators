import type { InfoTable } from './infoTable.ts'
import { UNEMPLOYMENT_2026, BENEFIT_DAYS, calcUnemployment } from './unemployment.ts'
import {
  RATES_2026,
  BASIC_BRACKETS,
  earnedIncomeDeduction,
  buildSalaryTable,
} from './salary.ts'
import { calcAcquisitionTax } from './acquisitionTax.ts'
import { GENERAL_BRACKETS, SPECIAL_BRACKETS } from './propertyTax.ts'
import { BRACKETS as GIFT_BRACKETS } from './giftTax.ts'
import { BRACKETS as INHERIT_BRACKETS } from './inheritanceTax.ts'
import { calcCarTax } from './carTax.ts'
import { RATES as CAR_ACQ_RATES } from './carAcquisitionTax.ts'
import { comprehensiveRealEstateTaxTables } from './comprehensiveRealEstateTax.ts'
import { severanceTaxTables } from './severance.ts'

const n = (v: number) => v.toLocaleString('ko-KR')
const won = (v: number) => `${n(Math.round(v))}원`
const man = (v: number) => (v >= 100_000_000 && v % 100_000_000 === 0 ? `${v / 100_000_000}억원` : `${n(v / 10_000)}만원`)
const eok = (v: number) => (v >= 100_000_000 ? `${v / 100_000_000}억원` : man(v))
const pct = (r: number) => `${+(r * 100).toFixed(4)}%`

type Br = { limit: number; rate: number; deduction: number }
/** 구간 [상한, 세율, 누진공제] 목록 → 과세표준 구간표 행 */
function bracketRows(b: Br[]): (string | number)[][] {
  let prev = 0
  return b.map(({ limit, rate, deduction }) => {
    const range = limit === Infinity ? `${eok(prev)} 초과` : prev === 0 ? `${eok(limit)} 이하` : `${eok(prev)} 초과 ~ ${eok(limit)} 이하`
    prev = limit
    return [range, pct(rate), deduction ? won(deduction) : '없음']
  })
}
const asBr = (b: [number, number, number][]): Br[] =>
  b.map(([limit, rate, deduction]) => ({ limit, rate, deduction }))

const unemployment = (): InfoTable[] => {
  const periods: [keyof typeof BENEFIT_DAYS, string][] = [
    ['<1', '1년 미만'],
    ['1-3', '1년 이상 3년 미만'],
    ['3-5', '3년 이상 5년 미만'],
    ['5-10', '5년 이상 10년 미만'],
    ['10+', '10년 이상'],
  ]
  const u = UNEMPLOYMENT_2026
  return [
    {
      title: '구직급여 지급률·상한액·하한액 (2026년)',
      note: '2026.1.1 이후 이직자 기준. 상한액은 임금일액 상한 113,500원 × 60%(고용보험법 시행령 제68조), 하한액은 최저시급 × 80% × 1일 8시간.',
      headers: ['항목', '기준'],
      rows: [
        ['1일 지급률', '이직 전 평균임금의 60%'],
        ['1일 상한액', won(u.upperDaily)],
        ['2026년 최저시급', won(u.minWageHourly)],
        ['1일 하한액', won(u.lowerDaily)],
        ['하한액 월 환산(30일)', won(u.lowerDaily * 30)],
        ['상한액 월 환산(30일)', won(u.upperDaily * 30)],
      ],
    },
    {
      title: '소정급여일수 (고용보험 가입기간·연령별)',
      note: '이직일 현재 만 나이 기준. 고용보험법 시행령 별표 1.',
      headers: ['가입기간', '50세 미만', '50세 이상 · 장애인'],
      rows: periods.map(([k, label]) => [label, `${BENEFIT_DAYS[k][0]}일`, `${BENEFIT_DAYS[k][1]}일`]),
    },
    {
      title: '월 평균임금별 구직급여 예시',
      note: '세전 월급을 3개월 평균 기준으로 환산한 근사 계산이며, 상·하한액을 적용했습니다. 120일은 가입 1년 미만 소정급여일수 기준입니다.',
      headers: ['월 평균임금(세전)', '1일 평균임금', '1일 구직급여', '30일 수령액', '120일 수령액'],
      rows: [2_000_000, 2_500_000, 3_000_000, 4_000_000, 5_000_000, 6_000_000].map((m) => {
        const r = calcUnemployment({ monthlySalary: m, insuredPeriod: '<1', isOlderOrDisabled: false })
        return [man(m), won(r.avgDailyWage), won(r.dailyBenefit), won(r.dailyBenefit * 30), won(r.dailyBenefit * 120)]
      }),
    },
  ]
}

const salary = (): InfoTable[] => {
  const r = RATES_2026
  const rows = buildSalaryTable().filter(
    (x) => x.annualSalary >= 30_000_000 && x.annualSalary <= 100_000_000 && x.annualSalary % 10_000_000 === 0,
  )
  return [
    {
      title: '4대보험 근로자 부담 요율 (2026년)',
      note: '국민연금 기준소득월액 상·하한은 2026.7~2027.6 적용 값입니다(2026.1~6월분은 40만~637만원). 산재보험은 사업주 전액 부담이라 제외했습니다.',
      headers: ['항목', '근로자 부담', '비고'],
      rows: [
        ['국민연금', pct(r.pensionEmployee), `기준소득월액 ${won(r.pensionFloorMonthly)} ~ ${won(r.pensionCapMonthly)}`],
        ['건강보험', pct(r.healthEmployee), '보수월액 기준(상·하한 별도)'],
        ['장기요양보험', `건강보험료의 ${pct(r.longTermCareOfHealth)}`, `소득 대비 약 ${pct(r.healthEmployee * r.longTermCareOfHealth)}`],
        ['고용보험(실업급여)', pct(r.employmentEmployee), '사업주는 별도 요율 추가 부담'],
      ],
    },
    {
      title: '연봉별 월 실수령액 (1인 가구 기준)',
      note: '비과세 0원, 8~20세 자녀 없음, 원천징수 100% 가정. 소득세는 소득세법 시행령 별표 2 근로소득 간이세액표 조회값입니다.',
      headers: ['연봉', '월 급여(세전)', '4대보험+세금 공제', '월 실수령액'],
      rows: rows.map((x) => [man(x.annualSalary), won(x.monthlyGross), won(x.totalDeduction), won(x.net[0])]),
    },
  ]
}

const yearEndTax = (): InfoTable[] => [
  {
    title: '근로소득공제표',
    note: '공제한도 2,000만원. 오른쪽은 해당 구간 상한 총급여에서의 공제액입니다.',
    headers: ['총급여', '공제액', '구간 상한 시 공제액'],
    rows: [
      ['500만원 이하', '총급여의 70%', won(earnedIncomeDeduction(5_000_000))],
      ['500만원 초과 ~ 1,500만원 이하', '350만원 + 500만원 초과분의 40%', won(earnedIncomeDeduction(15_000_000))],
      ['1,500만원 초과 ~ 4,500만원 이하', '750만원 + 1,500만원 초과분의 15%', won(earnedIncomeDeduction(45_000_000))],
      ['4,500만원 초과 ~ 1억원 이하', '1,200만원 + 4,500만원 초과분의 5%', won(earnedIncomeDeduction(100_000_000))],
      ['1억원 초과', '1,475만원 + 1억원 초과분의 2% (한도 2,000만원)', won(earnedIncomeDeduction(1_000_000_000_000))],
    ],
  },
  {
    title: '소득세 기본세율표 (과세표준 구간)',
    note: '산출세액 = 과세표준 × 세율 − 누진공제. 지방소득세는 소득세의 10%가 별도로 붙습니다.',
    headers: ['과세표준', '세율', '누진공제'],
    // BASIC_BRACKETS 세 번째 값은 구간 시작 시 누적세액이므로 누진공제 = 구간 하한 × 세율 − 누적세액
    rows: bracketRows(
      asBr(BASIC_BRACKETS).map((br, k, arr) => {
        const lower = k === 0 ? 0 : arr[k - 1].limit
        return { ...br, deduction: Math.round(lower * br.rate - br.deduction) }
      }),
    ),
  },
]

const acquisitionTax = (): InfoTable[] => {
  const p = (price: number) =>
    calcAcquisitionTax({ price, houseCount: 'first', isAdjusted: false, areaOver85: false }).rate
  return [
    {
      title: '주택 유상취득 취득세율 (1주택 기준)',
      note: '6억~9억 구간은 세율이 1%에서 3%까지 선형 보간(소수점 4자리 반올림). 지방교육세·농어촌특별세 별도.',
      headers: ['취득가액', '취득세율'],
      rows: [
        ['6억원 이하', `${p(600_000_000)}%`],
        ['7억 5천만원', `${p(750_000_000)}%`],
        ['9억원', `${p(900_000_000)}%`],
        ['9억원 초과', `${p(1_200_000_000)}%`],
      ],
    },
    {
      title: '다주택 취득세 중과세율',
      note: '2주택 비조정은 표준세율, 3주택 비조정 8%, 4주택 이상은 지역과 무관하게 12%. 법인·증여 등은 별도 세율.',
      headers: ['구분', '조정대상지역', '비조정지역'],
      rows: [
        ['1주택', '표준세율(1~3%)', '표준세율(1~3%)'],
        ['2주택', `${calcAcquisitionTax({ price: 1, houseCount: 'second', isAdjusted: true, areaOver85: false }).rate}%`, '표준세율(1~3%)'],
        ['3주택', `${calcAcquisitionTax({ price: 1, houseCount: 'third', isAdjusted: true, areaOver85: false }).rate}%`, `${calcAcquisitionTax({ price: 1, houseCount: 'third', isAdjusted: false, areaOver85: false }).rate}%`],
        ['4주택 이상', `${calcAcquisitionTax({ price: 1, houseCount: 'fourthPlus', isAdjusted: true, areaOver85: false }).rate}%`, `${calcAcquisitionTax({ price: 1, houseCount: 'fourthPlus', isAdjusted: false, areaOver85: false }).rate}%`],
      ],
    },
  ]
}

const propertyTax = (): InfoTable[] => [
  {
    title: '재산세 주택 세율표 (일반세율)',
    note: '과세표준 = 공시가격 × 공정시장가액비율. 도시지역분 0.14%, 지방교육세(재산세의 20%) 별도.',
    headers: ['과세표준', '세율', '누진공제'],
    rows: bracketRows(GENERAL_BRACKETS),
  },
  {
    title: '1세대 1주택 특례세율 (공시가격 9억원 이하)',
    note: '지방세법 제111조의2에 따라 2026년 12월 28일까지 납세의무가 성립하는 분에 한해 적용됩니다. 2027년 이후는 연장 입법 여부를 확인해야 합니다.',
    headers: ['과세표준', '세율', '누진공제'],
    rows: bracketRows(SPECIAL_BRACKETS),
  },
  {
    title: '공정시장가액비율',
    headers: ['구분', '비율'],
    rows: [
      ['1세대 1주택 (공시가격 3억원 이하)', '43%'],
      ['1세대 1주택 (3억원 초과 6억원 이하)', '44%'],
      ['1세대 1주택 (6억원 초과)', '45%'],
      ['다주택·그 외', '60%'],
    ],
  },
]

const giftTax = (): InfoTable[] => [
  {
    title: '증여세 세율표',
    note: '산출세액 = 과세표준 × 세율 − 누진공제. 상속세와 동일한 5단계 세율입니다. 신고세액공제 3%.',
    headers: ['과세표준', '세율', '누진공제'],
    rows: bracketRows(GIFT_BRACKETS),
  },
  {
    title: '증여재산공제 한도 (10년 합산)',
    headers: ['수증자 기준', '공제액'],
    rows: [
      ['배우자', '6억원'],
      ['직계존속 → 성년 직계비속', '5,000만원'],
      ['직계존속 → 미성년 직계비속', '2,000만원'],
      ['직계비속 → 직계존속', '5,000만원'],
      ['기타 친족', '1,000만원'],
      ['혼인·출산 추가공제 (직계존속 증여)', '1억원'],
    ],
  },
]

const inheritanceTax = (): InfoTable[] => [
  {
    title: '상속세 세율표',
    note: '산출세액 = 과세표준 × 세율 − 누진공제. 신고세액공제 3%.',
    headers: ['과세표준', '세율', '누진공제'],
    rows: bracketRows(INHERIT_BRACKETS),
  },
  {
    title: '주요 상속공제',
    headers: ['공제', '금액'],
    rows: [
      ['기초공제', '2억원'],
      ['자녀공제 (1인당)', '5,000만원'],
      ['연로자공제 (65세 이상, 1인당)', '5,000만원'],
      ['일괄공제 (기초+인적공제 합계가 5억원 미만일 때 선택)', '5억원'],
      ['배우자 상속공제', '최소 5억원 ~ 최대 30억원'],
      ['금융재산 상속공제', '순금융재산의 20% (한도 2억원)'],
    ],
  },
]

const carTax = (): InfoTable[] => {
  const t = (cc: number, y = 0) => calcCarTax({ displacement: cc, yearsElapsed: y, isElectric: false })
  return [
    {
      title: '승용차 자동차세 (비영업용, cc당 세액)',
      note: '지방교육세 30% 별도. 연납 할인은 반영하지 않았습니다.',
      headers: ['배기량', 'cc당 세액', '예시 연 세액(본세)'],
      rows: [
        ['1,000cc 이하', '80원', `${won(t(1000).baseTax)} (1,000cc)`],
        ['1,600cc 이하', '140원', `${won(t(1600).baseTax)} (1,600cc)`],
        ['1,600cc 초과', '200원', `${won(t(2000).baseTax)} (2,000cc)`],
        ['전기차', '정액', won(calcCarTax({ displacement: 0, yearsElapsed: 0, isElectric: true }).carTax)],
      ],
    },
    {
      title: '차령별 자동차세 경감률',
      note: '차령 3년차부터 매년 5%p씩 경감, 12년차 이상 50% (전기차 제외).',
      headers: ['차령', '경감률'],
      rows: [2, 3, 4, 6, 8, 10, 12].map((y) => [y === 2 ? '2년 이하' : `${y}년차`, `${t(2000, y).depreciationPct}%`]),
    },
  ]
}

const carAcquisitionTax = (): InfoTable[] => [
  {
    title: '자동차 취득세율',
    note: '경차 감면 등 세부 감면은 반영하지 않았습니다.',
    headers: ['차량 구분', '취득세율'],
    rows: [
      ['비영업용 승용', `${CAR_ACQ_RATES.nonBusiness}%`],
      ['영업용', `${CAR_ACQ_RATES.business}%`],
      ['경차', `${CAR_ACQ_RATES.lightCar}%`],
    ],
  },
]

const BUILDERS: Record<string, () => InfoTable[]> = {
  unemployment,
  salary,
  yearEndTax,
  acquisitionTax,
  propertyTax,
  giftTax,
  inheritanceTax,
  carTax,
  carAcquisitionTax,
  comprehensiveRealEstateTax: comprehensiveRealEstateTaxTables,
  severance: severanceTaxTables,
}

/** 페이지별 요율·세율·기준 표. InfoSection(React)과 postbuild(프리렌더)가 함께 사용 */
export function tablesFor(pageId: string): InfoTable[] {
  return BUILDERS[pageId]?.() ?? []
}
