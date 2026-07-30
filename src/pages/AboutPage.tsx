import { pageContent } from '../lib/pageContent'
import routes from '../routes.json'

export default function AboutPage() {
  const paras: string[] = pageContent.about.intro
  const groups = [...new Set(routes.filter((r) => r.group !== '정보').map((r) => r.group))]

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold">계산기 소개</h1>
      {paras.map((p, i) => (
        <p key={i} className="mt-4 text-sm leading-relaxed text-slate-600">
          {p}
        </p>
      ))}

      <h2 className="mt-8 text-lg font-bold">제공하는 계산기</h2>
      <div className="mt-3 space-y-3">
        {groups.map((g) => (
          <p key={g} className="text-sm leading-relaxed text-slate-600">
            <b className="text-slate-800">{g}</b> —{' '}
            {routes
              .filter((r) => r.group === g)
              .map((r) => r.label)
              .join(', ')}
          </p>
        ))}
      </div>

      <h2 className="mt-8 text-lg font-bold">이 사이트는 어떻게 만들어지나요</h2>
      <p className="mt-4 text-sm leading-relaxed text-slate-600">
        각 계산기의 세율·기준값·산정 방식은 국세청, 위택스, 고용노동부 등 관련 공공기관이
        공개한 공식 자료를 참고해 작성합니다. 법령이나 세율이 개정되면 확인 후 계산기
        내용을 갱신하며, 각 페이지 하단의 "참고 자료" 섹션에서 관련 공식 출처를 확인할 수
        있습니다.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        다만 이 사이트의 모든 결과는 참고용 추정치이며, 개인 상황(공제 항목, 지자체
        조례, 특례 적용 여부 등)에 따라 실제 금액과 차이가 날 수 있습니다. 정확한
        세무·법률·의료 판단은 관할 기관이나 전문가 확인이 필요합니다.
      </p>
      <p className="mt-3 text-xs text-slate-400">최근 업데이트: 2026년 7월</p>

      <p className="mt-8 text-sm text-slate-500">
        문의: <a href="mailto:hwang177@gmail.com" className="text-emerald-700 underline">hwang177@gmail.com</a>
      </p>
    </div>
  )
}
