import { useMemo, useState } from 'react'
import { Field, Row, fmt, fmtPct } from '../components/ui'

/* ---------- 계산 로직 ---------- */

export interface MarginInput {
  sellPrice: number // 판매가
  buyerShipping: number // 구매자 부담 배송비
  supplyPrice: number // 공급가(위탁 원가)
  sellerShipping: number // 판매자 부담 배송비
  packaging: number // 포장비
  adCost: number // 건당 광고비
  coupon: number // 쿠폰/할인액
  feeRate: number // 수수료율 %
  returnRate: number // 예상 반품률 %
  returnLoss: number // 반품 1건당 예상 손실
  targetMonthly: number // 목표 월 순이익
}

export type Verdict = 'good' | 'soso' | 'risky'

export function calc(i: MarginInput) {
  const gross = i.sellPrice + i.buyerShipping // 총매출
  const platformFee = gross * (i.feeRate / 100) // 플랫폼 비용

  // 건당 순이익 (반품 미반영)
  const unitProfit =
    i.sellPrice -
    i.supplyPrice -
    i.sellerShipping -
    i.packaging -
    i.adCost -
    i.coupon -
    platformFee

  // 반품 기대손실 = 반품률 × 반품 1건당 손실
  const expectedReturnLoss = (i.returnRate / 100) * i.returnLoss

  // 반품 반영 후 기대 순이익
  const finalProfit = unitProfit - expectedReturnLoss

  const marginRate = i.sellPrice > 0 ? (finalProfit / i.sellPrice) * 100 : NaN
  const costRate = i.sellPrice > 0 ? (i.supplyPrice / i.sellPrice) * 100 : NaN

  // 손익분기 판매가: P(1-r) = 고정비 + 구매자배송비×r + 반품기대손실
  const r = i.feeRate / 100
  const breakEvenPrice =
    r < 1
      ? (i.supplyPrice +
          i.sellerShipping +
          i.packaging +
          i.adCost +
          i.coupon +
          i.buyerShipping * r +
          expectedReturnLoss) /
        (1 - r)
      : NaN

  // 목표 월수익 달성에 필요한 월 판매량
  const neededMonthly =
    finalProfit > 0 ? Math.ceil(i.targetMonthly / finalProfit) : NaN

  // 반품 1건 발생 시 사라지는 판매 이익 건수
  const returnEatsSales = unitProfit > 0 ? i.returnLoss / unitProfit : NaN

  // 광고비 여력: 광고비 제외 시 이익 기준
  const profitNoAd = finalProfit + i.adCost
  const maxAdBreakEven = Math.max(0, profitNoAd) // 이 이상 쓰면 적자
  const maxAdSafe = Math.max(0, profitNoAd - i.sellPrice * 0.1) // 마진율 10% 유지 한도

  // 판정
  let verdict: Verdict
  if (
    marginRate < 10 ||
    finalProfit <= 0 ||
    (Number.isFinite(returnEatsSales) && returnEatsSales >= 5)
  ) {
    verdict = 'risky'
  } else if (marginRate >= 25 && finalProfit >= 5000) {
    verdict = 'good'
  } else {
    verdict = 'soso'
  }

  return {
    gross,
    platformFee,
    unitProfit,
    expectedReturnLoss,
    finalProfit,
    marginRate,
    costRate,
    breakEvenPrice,
    neededMonthly,
    returnEatsSales,
    maxAdBreakEven,
    maxAdSafe,
    verdict,
  }
}

/* ---------- 판정 스타일 ---------- */

const verdictStyle: Record<
  Verdict,
  { label: string; badge: string; box: string; desc: string }
> = {
  good: {
    label: '좋음 · 등록해도 됩니다',
    badge: 'bg-emerald-600',
    box: 'border-emerald-200 bg-emerald-50',
    desc: '마진율 25% 이상, 건당 순이익 5,000원 이상. 광고·반품 변수에 버틸 체력이 있는 상품입니다.',
  },
  soso: {
    label: '애매 · 조건부로만',
    badge: 'bg-amber-500',
    box: 'border-amber-200 bg-amber-50',
    desc: '마진율 10~25% 구간입니다. 광고비를 쓰기 시작하면 적자로 전환될 수 있으니 무료 노출 위주로 팔 수 있을 때만 등록하세요.',
  },
  risky: {
    label: '위험 · 등록 비추천',
    badge: 'bg-red-600',
    box: 'border-red-200 bg-red-50',
    desc: '마진율 10% 미만이거나 반품 1건이 여러 건의 이익을 지웁니다. 공급가를 낮추거나 판매가를 올리지 못하면 팔수록 손해에 가깝습니다.',
  },
}

/* ---------- 페이지 ---------- */

export default function MarginCalculator() {
  const [input, setInput] = useState<MarginInput>({
    sellPrice: 15000,
    buyerShipping: 3000,
    supplyPrice: 8000,
    sellerShipping: 0,
    packaging: 300,
    adCost: 0,
    coupon: 0,
    feeRate: 5.6,
    returnRate: 5,
    returnLoss: 6000,
    targetMonthly: 300000,
  })

  const set = (k: keyof MarginInput) => (v: number) =>
    setInput((prev) => ({ ...prev, [k]: v }))

  const r = useMemo(() => calc(input), [input])
  const v = verdictStyle[r.verdict]

  return (
    <div>
      <h1 className="text-2xl font-bold">스마트스토어 위탁판매 마진 계산기</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        상품 등록 전에 숫자로 판단하세요. 반품·광고비까지 반영한 기대 이익 기준입니다.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* 입력 */}
        <section className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">상품 정보 입력</h2>
          <div className="grid grid-cols-2 gap-x-3 gap-y-4">
            <Field label="판매가" value={input.sellPrice} onChange={set('sellPrice')} />
            <Field
              label="구매자 배송비"
              value={input.buyerShipping}
              onChange={set('buyerShipping')}
              hint="고객이 내는 배송비"
            />
            <Field label="공급가" value={input.supplyPrice} onChange={set('supplyPrice')} hint="위탁 원가" />
            <Field
              label="판매자 부담 배송비"
              value={input.sellerShipping}
              onChange={set('sellerShipping')}
            />
            <Field label="포장비" value={input.packaging} onChange={set('packaging')} />
            <Field label="광고비 (건당)" value={input.adCost} onChange={set('adCost')} />
            <Field label="쿠폰/할인액" value={input.coupon} onChange={set('coupon')} />
            <Field
              label="수수료율"
              value={input.feeRate}
              onChange={set('feeRate')}
              suffix="%"
              step={0.1}
              hint="연동수수료+결제수수료"
            />
            <Field
              label="예상 반품률"
              value={input.returnRate}
              onChange={set('returnRate')}
              suffix="%"
              step={0.5}
            />
            <Field
              label="반품 1건당 손실"
              value={input.returnLoss}
              onChange={set('returnLoss')}
              hint="왕복 배송비 등"
            />
            <div className="col-span-2">
              <Field
                label="목표 월 순이익"
                value={input.targetMonthly}
                onChange={set('targetMonthly')}
                step={10000}
              />
            </div>
          </div>
        </section>

        {/* 결과 */}
        <section className="space-y-4">
          {/* 판정 */}
          <div className={`rounded-2xl border p-5 ${v.box}`}>
            <div className="flex items-center gap-3">
              <span className={`rounded-full px-3 py-1 text-sm font-bold text-white ${v.badge}`}>
                {v.label}
              </span>
              <span className="text-2xl font-extrabold tabular-nums">
                {fmtPct(r.marginRate)}
              </span>
              <span className="text-sm text-slate-500">최종 마진율</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-700">{v.desc}</p>
          </div>

          {/* 핵심 지표 */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-base font-semibold">핵심 지표</h2>
            <div className="divide-y divide-slate-100">
              <Row label="건당 순이익 (반품 미반영)" value={`${fmt(r.unitProfit)}원`} negative={r.unitProfit < 0} />
              <Row
                label="반품 반영 후 기대 순이익"
                value={`${fmt(r.finalProfit)}원`}
                strong
                negative={r.finalProfit < 0}
              />
              <Row label="마진율" value={fmtPct(r.marginRate)} negative={r.marginRate < 0} />
              <Row label="원가율" value={fmtPct(r.costRate)} />
              <Row label="수수료 총액 (건당)" value={`${fmt(r.platformFee)}원`} />
              <Row label="반품 기대손실 (건당)" value={`-${fmt(r.expectedReturnLoss)}원`} />
              <Row label="손익분기 판매가" value={`${fmt(r.breakEvenPrice)}원`} />
              <Row
                label="목표 월수익 필요 판매량"
                value={Number.isFinite(r.neededMonthly) ? `월 ${fmt(r.neededMonthly)}건` : '달성 불가'}
                negative={!Number.isFinite(r.neededMonthly)}
              />
            </div>
          </div>

          {/* 판단 코멘트 */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-base font-semibold">이 숫자가 의미하는 것</h2>
            <ul className="space-y-2 text-sm leading-relaxed text-slate-700">
              <li className="flex gap-2">
                <span aria-hidden>↩️</span>
                {Number.isFinite(r.returnEatsSales) ? (
                  <span>
                    반품 1건이 발생하면 약{' '}
                    <b className={r.returnEatsSales >= 5 ? 'text-red-600' : ''}>
                      {r.returnEatsSales.toFixed(1)}건
                    </b>
                    의 판매 이익이 사라집니다.
                  </span>
                ) : (
                  <span className="text-red-600">
                    건당 이익이 없어 반품이 나면 손실이 그대로 쌓입니다.
                  </span>
                )}
              </li>
              <li className="flex gap-2">
                <span aria-hidden>🎯</span>
                {Number.isFinite(r.neededMonthly) ? (
                  <span>
                    목표 월 순이익 <b>{fmt(input.targetMonthly)}원</b>을 만들려면 월{' '}
                    <b>{fmt(r.neededMonthly)}건</b> 판매가 필요합니다.
                  </span>
                ) : (
                  <span className="text-red-600">
                    기대 이익이 0 이하라 아무리 팔아도 목표 월 순이익을 달성할 수 없습니다.
                  </span>
                )}
              </li>
              <li className="flex gap-2">
                <span aria-hidden>📣</span>
                {r.maxAdSafe > 0 ? (
                  <span>
                    광고비는 건당 최대 <b>{fmt(r.maxAdSafe)}원</b>까지만 쓰는 게 안전합니다
                    <span className="text-slate-400">
                      {' '}
                      (마진율 10% 유지 기준 · 건당 {fmt(r.maxAdBreakEven)}원부터는 적자)
                    </span>
                    .
                  </span>
                ) : (
                  <span className="text-red-600">
                    광고비를 쓸 여력이 없는 상품입니다. 무료 노출로만 판매 가능한 경우에만
                    고려하세요.
                  </span>
                )}
              </li>
            </ul>
          </div>

          {/* 계산 내역 */}
          <details className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <summary className="cursor-pointer text-sm font-semibold text-slate-600">
              계산 내역 펼쳐보기
            </summary>
            <div className="mt-3 divide-y divide-slate-100">
              <Row label="총매출 (판매가 + 구매자 배송비)" value={`${fmt(r.gross)}원`} />
              <Row label="판매가" value={`${fmt(input.sellPrice)}원`} />
              <Row label="− 공급가" value={`${fmt(input.supplyPrice)}원`} />
              <Row label="− 판매자 부담 배송비" value={`${fmt(input.sellerShipping)}원`} />
              <Row label="− 포장비" value={`${fmt(input.packaging)}원`} />
              <Row label="− 광고비" value={`${fmt(input.adCost)}원`} />
              <Row label="− 쿠폰/할인액" value={`${fmt(input.coupon)}원`} />
              <Row
                label={`− 플랫폼비용 (총매출 × ${input.feeRate}%)`}
                value={`${fmt(r.platformFee)}원`}
              />
              <Row label="= 건당 순이익" value={`${fmt(r.unitProfit)}원`} strong negative={r.unitProfit < 0} />
              <Row
                label={`− 반품 기대손실 (${input.returnRate}% × ${fmt(input.returnLoss)}원)`}
                value={`${fmt(r.expectedReturnLoss)}원`}
              />
              <Row
                label="= 최종 기대 순이익"
                value={`${fmt(r.finalProfit)}원`}
                strong
                negative={r.finalProfit < 0}
              />
            </div>
          </details>
        </section>
      </div>
    </div>
  )
}
