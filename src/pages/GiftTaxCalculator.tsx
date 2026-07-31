import { useMemo, useState } from 'react'
import { calcGiftTax, type GiftRelation } from '../lib/giftTax'
import { Field, Row, fmt } from '../components/ui'

const RELATION_LABELS: Record<GiftRelation, string> = {
  spouse: '배우자',
  ancestorToDescendant: '직계존속 → 직계비속 (부모·조부모가 자녀·손자녀에게)',
  descendantToAncestor: '직계비속 → 직계존속 (자녀가 부모에게)',
  otherRelative: '기타친족',
  stranger: '타인',
}

export default function GiftTaxCalculator() {
  const [giftValue, setGiftValue] = useState(100_000_000)
  const [relation, setRelation] = useState<GiftRelation>('ancestorToDescendant')
  const [isMinor, setIsMinor] = useState(false)
  const [isGenerationSkip, setIsGenerationSkip] = useState(false)
  const [priorGiftSum, setPriorGiftSum] = useState(0)
  const [priorGiftPaidTax, setPriorGiftPaidTax] = useState(0)
  const [marriageOrBirthDeduction, setMarriageOrBirthDeduction] = useState(false)

  const r = useMemo(
    () =>
      calcGiftTax({
        giftValue,
        relation,
        isMinor,
        isGenerationSkip,
        priorGiftSum,
        priorGiftPaidTax,
        marriageOrBirthDeduction,
      }),
    [giftValue, relation, isMinor, isGenerationSkip, priorGiftSum, priorGiftPaidTax, marriageOrBirthDeduction],
  )

  return (
    <div>
      <h1 className="text-2xl font-bold">증여세 계산기</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        증여재산가액과 증여자·수증자 관계로 증여세를 추정합니다. 최근 10년 내 동일인 증여
        합산과세를 반영합니다.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold">증여 정보</h2>
          <div className="space-y-4">
            <Field label="증여재산가액" value={giftValue} onChange={setGiftValue} step={10_000_000} />
            <div>
              <span className="mb-1.5 block text-sm font-medium text-slate-700">증여자와의 관계</span>
              <select
                value={relation}
                onChange={(e) => {
                  const next = e.target.value as GiftRelation
                  setRelation(next)
                  if (next !== 'ancestorToDescendant') {
                    setIsMinor(false)
                    setMarriageOrBirthDeduction(false)
                    setIsGenerationSkip(false)
                  }
                }}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
              >
                {(Object.keys(RELATION_LABELS) as GiftRelation[]).map((key) => (
                  <option key={key} value={key}>
                    {RELATION_LABELS[key]}
                  </option>
                ))}
              </select>
            </div>
            {relation === 'ancestorToDescendant' && (
              <div className="space-y-3 rounded-xl bg-slate-50 p-3">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={isMinor}
                    onChange={(e) => setIsMinor(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
                  />
                  수증자 미성년 (공제 5,000만원 → 2,000만원)
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={marriageOrBirthDeduction}
                    onChange={(e) => setMarriageOrBirthDeduction(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
                  />
                  혼인·출산 증여재산공제 해당 (추가 1억원, 2024-01-01 이후 증여분부터)
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={isGenerationSkip}
                    onChange={(e) => setIsGenerationSkip(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
                  />
                  세대생략 증여 (조부모 → 손자녀 등, 30~40% 할증)
                </label>
              </div>
            )}
            <Field
              label="최근 10년 내 동일인 증여 합산액"
              value={priorGiftSum}
              onChange={setPriorGiftSum}
              step={1_000_000}
              hint="같은 사람에게 10년 이내 받은 다른 증여재산가액"
            />
            <Field
              label="이전 증여 시 이미 납부한 증여세액"
              value={priorGiftPaidTax}
              onChange={setPriorGiftPaidTax}
              step={100_000}
              hint="위 합산액에 대해 10년 이내 이미 신고·납부한 증여세(기납부세액공제)"
            />
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-sm text-slate-500">예상 납부세액</p>
            <p className="text-3xl font-extrabold tabular-nums text-emerald-700">{fmt(r.finalTax)}원</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-base font-semibold">상세 내역</h2>
            <div className="divide-y divide-slate-100">
              <Row label="과세가액 (10년 합산 포함)" value={`${fmt(r.taxableValue)}원`} />
              <Row label="증여재산공제" value={`${fmt(r.deduction)}원`} />
              <Row label="과세표준" value={`${fmt(r.taxBase)}원`} />
              <Row label="산출세액" value={`${fmt(r.calculatedTax)}원`} strong />
              <Row label="납부세액 (할증·신고세액공제 반영)" value={`${fmt(r.finalTax)}원`} strong />
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800">
            <b>이 계산은 예상치입니다.</b> 재산평가 특례(감정평가 등)는 반영하지 않았습니다. 정확한
            세액은 세무사 상담 또는 국세청 홈택스에서 확인하세요.
          </div>
        </section>
      </div>
    </div>
  )
}
