# 계산기 페이지 콘텐츠 심화 — 설계 문서

## Context

사이트가 AdSense 심사에서 콘텐츠 품질 정책 위반으로 반려됐다 — 최소 콘텐츠 요건 미달, "고유 콘텐츠와 우수한 사용자 환경" 미충족, 빈약한 콘텐츠(thin content) 사유. 현재 37개 계산기 페이지는 대부분 입력폼 + 결과 + 짧은 설명(인트로 2문단 + FAQ 3~4개, `src/lib/pageContent.js`, 계산기당 평균 22줄)뿐이라, 구글이 이를 템플릿화된 저가치 콘텐츠로 판단한 것으로 보인다.

이 스펙은 재승인을 위한 두 개의 하위 프로젝트 중 첫 번째다: **기존 37개 계산기 페이지의 콘텐츠 심화**. 두 번째(별도 가이드/블로그 섹션 신설)는 이 스펙과 별개로 이후 브레인스토밍한다.

## 데이터 모델 (`src/lib/pageContent.js`)

각 계산기 항목에 필드 4개 추가. `intro`는 유지, `faqs`는 확장(3~4개 → 6~8개).

```js
acquisitionTax: {
  intro: [...],                          // 기존 유지

  formula: {                             // 신규 — "계산 방법" 섹션 + HowTo JSON-LD
    title: '취득세는 이렇게 계산됩니다',
    steps: [
      '1. 취득가액에서 주택 수·조정대상지역 여부에 따른 세율을 결정합니다.',
      '2. 취득가액 × 세율 = 취득세 산출',
      '3. 지방교육세, 농어촌특별세(전용면적 85㎡ 초과 시)를 더해 총 납부액을 계산합니다.',
    ],
  },

  glossary: [                            // 신규 — "용어 설명" 섹션
    { term: '조정대상지역', definition: '...' },
    { term: '농어촌특별세', definition: '...' },
  ],

  examples: [                            // 신규 — "숫자로 보는 예시" 섹션
    { title: '5억원 · 1주택 · 비조정 · 85㎡ 이하', result: '취득세 550만원 (세율 1.1%)' },
    { title: '10억원 · 2주택 · 조정대상지역 · 85㎡ 이하', result: '취득세 8,400만원 (세율 8%)' },
  ],

  sources: [                             // 신규 — "참고 자료" 섹션
    { label: '위택스', url: 'https://www.wetax.go.kr' },
  ],

  faqs: [ /* 6~8개로 확장 */ ],
}
```

`formula`/`glossary`/`examples`/`sources`는 계산기별로 내용량이 다를 수 있으므로 optional로 두되(빈 배열/undefined 시 해당 섹션 미출력), 37개 전체를 이번 계획에서 채운다.

## 렌더링 순서 (`src/components/InfoSection.tsx`)

```
인트로
계산 방법 (formula — 신규)
광고(inArticle, 기존 위치 유지)
용어 설명 (glossary — 신규)
숫자로 보는 예시 (examples — 신규)
자주 묻는 질문 (faqs — 기존, 확장)
참고 자료 (sources — 신규, 최하단)
```

각 섹션은 해당 필드가 없거나 빈 배열이면 렌더링하지 않는다(기존 `faqs.length > 0` 가드와 동일한 패턴).

## SEO 구조화 데이터

기존 FAQPage JSON-LD에 더해, `formula.steps`를 **HowTo** JSON-LD로 함께 출력한다:

```js
{
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: formula.title,
  step: formula.steps.map((s) => ({ '@type': 'HowToStep', text: s })),
}
```

## 크롤러용 정적 HTML (`scripts/postbuild.mjs`)

`prerenderBody`가 현재 `intro`+`faqs`만 정적 HTML에 포함한다. JS 없이 콘텐츠를 읽는 크롤러(및 심사 봇)에게 심화 콘텐츠가 보이지 않으면 개선 효과가 반감되므로, `formula`(순서 있는 리스트)·`glossary`(정의 목록)·`examples`·`sources`도 `InfoSection.tsx`와 동일한 순서로 정적 HTML에 포함하도록 수정한다.

## `AboutPage.tsx` 신뢰도 보강

"이 사이트는 어떻게 만들어지나요" 섹션을 새로 추가한다:
- 계산 근거는 국세청·관련 공공기관의 공식 자료를 참고해 작성하며, 세율·법령 개정 시 갱신한다는 설명
- 최종 업데이트 표시 (예: "최근 업데이트: 2026년 7월")
- 기존 문의 이메일(`hwang177@gmail.com`)은 유지

## 출처 각주 (`sources` 필드)

계산기 도메인별로 이미 잘 알려진 공식 기관의 **최상위 홈페이지 URL만** 사용한다(딥링크는 페이지 구조 변경으로 깨지기 쉬우므로 제외). 예: 국세청 홈택스(`hometax.go.kr`), 위택스(`wetax.go.kr`), 정부24(`gov.kr`), 고용보험(`ei.go.kr`), 국민연금공단(`nps.or.kr`), 국토교통부 실거래가 공개시스템(`rt.molit.go.kr`) 등. `InfoSection.tsx`에서 `target="_blank" rel="noopener noreferrer"`로 새 탭 렌더링.

계획 작성/구현 단계에서 각 URL이 실제로 존재하는 공식 기관 최상위 도메인인지 재확인한다 — 불확실한 딥링크나 추측성 URL은 사용하지 않는다.

## 검증 계획

37개 도메인(세금/대출/주식/날짜/자동차/건강 등)에 걸친 대량 콘텐츠 추가라 사실 오류 위험이 가장 크다:

- `formula.steps`는 반드시 해당 `src/lib/*.ts`의 실제 계산 로직과 일치해야 한다 (구현 코드 대조 필수).
- `examples`의 숫자는 실제 계산 함수를 손으로 검증한 값이어야 한다 (기존 계산기 추가 작업의 컨벤션과 동일).
- `sources`의 URL은 실제 존재하는 공식 기관 도메인이어야 한다.
- 최종 전체 리뷰 단계에서 세무·법률·건강 관련 진술의 사실관계를 별도로 점검한다.
- `npm run build` (tsc + vite + postbuild) 성공, `npm run lint` 통과.
- 수동 확인: 계산기 페이지 하나를 열어 5개 신규 섹션이 올바른 순서로 렌더링되는지, `view-source:` 또는 `curl`로 정적 HTML에 신규 섹션 텍스트가 포함되는지, HowTo/FAQPage JSON-LD가 유효한 JSON인지.

## 범위 밖 (Out of scope)

- 별도 가이드/블로그 섹션 신설 (2번 하위 프로젝트, 이후 별도 브레인스토밍)
- 계산기 간 연관 링크 섹션
- 모바일 레이아웃 변경 (기존 `InfoSection`은 모바일에서도 그대로 사용됨 — 구조 변경 없음)
- 펼침 상태의 localStorage 등 추가 상태 저장
