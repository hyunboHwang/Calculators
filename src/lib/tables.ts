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

const yearEndTax2026Guide = (): InfoTable[] => [
  {
    title: '2026년 귀속 연말정산 달라지는 점 (변경 전 → 후)',
    note: '조세특례제한법·소득세법 2025.12.23 개정(2026.1.1 시행)과 2026.2.27 시행령 개정 기준입니다. 2026.1.1 이후 지출·지급분부터 적용됩니다.',
    headers: ['항목', '2025년 귀속까지', '2026년 귀속부터', '근거'],
    rows: [
      ['신용카드 등 소득공제 기본한도 (총급여 7,000만원 이하)', '300만원', '자녀 1명 350만원, 2명 이상 400만원', '조특법 제126조의2 ⑩'],
      ['신용카드 등 소득공제 기본한도 (총급여 7,000만원 초과)', '250만원', '자녀 1명 275만원, 2명 이상 300만원', '조특법 제126조의2 ⑩'],
      ['신용카드 등 소득공제 적용 기한', '2025.12.31까지', '2028.12.31까지 3년 연장', '조특법 제126조의2 ①'],
      ['월세 세액공제 — 배우자', '세대주만 공제', '세대주가 공제받은 경우 배우자도 요건 충족 시 추가 공제(부부 합산 월세 한도 1,000만원)', '조특법 제95조의2 ②'],
      ['교육비 세액공제 — 소득 요건', '기본공제 대상자 중 소득 요건 충족자', '나이·소득 제한 없음', '소득세법 제59조의4 ③'],
      ['교육비 — 초등 저학년 예체능 학원비', '공제 대상 아님', '9세 미만 또는 초등 2학년 이하 초등학생의 예능 학원·체육시설 수강료(월 단위, 주 1회 이상) 15%, 1인당 300만원 한도', '소득세법 제59조의4 ③, 시행령 제118조의6'],
      ['6세 이하 자녀 보육수당 비과세', '월 20만원', '자녀 1명당 월 20만원', '소득세법 제12조 제3호'],
      ['고향사랑기부금 세액공제', '10만원 이하 100/110, 초과분 15%', '10만원 이하 100/110, 10만원 초과 20만원 이하 40%(지방소득세 포함 44%), 20만원 초과 15%(16.5%)', '조특법 제58조 ①'],
    ],
  },
  {
    title: '달라지지 않았지만 헷갈리기 쉬운 항목',
    headers: ['항목', '현행', '비고'],
    rows: [
      ['월세 세액공제 한도', '연 1,000만원', '2024년 지급분부터 적용(2026년 귀속 변경 아님)'],
      ['자녀세액공제', '8세 이상 1명 25만원, 2명 55만원, 3명 이상 55만원+초과 1명당 40만원', '2025년 귀속부터 적용된 금액'],
      ['연금계좌 세액공제', '연금저축 600만원, 연금저축+IRP 합산 900만원, 총급여 5,500만원 이하 15%·초과 12%', '변경 없음'],
      ['보험료 세액공제', '보장성보험 연 100만원 한도, 12%', '변경 없음'],
      ['의료비 세액공제', '총급여 3% 초과분의 15%, 일반 부양가족 연 700만원 한도', '본인·65세 이상·6세 이하·장애인 등은 한도 없음'],
    ],
  },
  {
    title: '놓치기 쉬운 공제 체크리스트',
    note: '요건과 한도는 법령 기준 요약이며 개인 상황에 따라 다를 수 있습니다. 정확한 판정은 홈택스와 회사 담당자 안내를 따르세요.',
    headers: ['항목', '핵심 요건·한도', '근거'],
    rows: [
      ['부양가족 기본공제', '1명당 150만원. 소득금액 100만원 이하(근로소득만이면 총급여 500만원 이하), 직계존속 60세 이상, 직계비속·입양자 20세 이하, 형제자매 20세 이하 또는 60세 이상(장애인은 나이 제한 없음)', '소득세법 제50조'],
      ['맞벌이·중복 공제', '부양가족이 다른 거주자의 공제대상과 겹치면 신고서에 적은 1인에게 공제. 서로 신고했으면 배우자 우선 등 시행령 순서에 따름', '소득세법 제50조 ③, 시행령 제106조'],
      ['안경·콘택트렌즈', '의료비로 1인당 연 50만원 한도', '소득세법 시행령 제118조의5'],
      ['산후조리원', '의료비로 출산 1회당 200만원 한도', '소득세법 시행령 제118조의5'],
      ['난임시술비', '의료비 세액공제율 30%', '소득세법 제59조의4 ②'],
      ['교복·체험학습비', '중·고생 교복 1인당 50만원, 현장체험학습비 1인당 30만원까지 교육비에 포함', '소득세법 시행령 제118조의6'],
      ['정치자금 기부', '10만원까지 기부액의 100/110, 10만원 초과분은 15%(3천만원 초과분 25%)', '조특법 제76조 ①'],
      ['월세', '무주택 세대주, 총급여 8,000만원 이하·종합소득금액 7,000만원 이하, 계약서 주소와 주민등록 주소 일치, 공제 대상 월세 연 1,000만원', '조특법 제95조의2, 시행령 제95조'],
      ['주택임차차입금 원리금 상환액', '무주택 세대주가 국민주택규모 주택을 임차하며 받은 대출, 40% 공제(청약저축과 합산 연 400만원 한도)', '소득세법 제52조 ④'],
      ['장기주택저당차입금 이자', '취득 당시 기준시가 6억원 이하 주택, 한도는 상환기간·금리 방식에 따라 600만원~2,000만원', '소득세법 제52조 ⑤⑥'],
      ['중소기업 취업자 소득세 감면', '청년은 5년간 90%, 그 외 대상은 3년간 70%(연 200만원 한도), 취업일이 2026.12.31까지인 경우', '조특법 제30조'],
    ],
  },
]

const BUILDERS: Record<string, () => InfoTable[]> = {
  unemployment,
  salary,
  yearEndTax,
  yearEndTax2026Guide,
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
