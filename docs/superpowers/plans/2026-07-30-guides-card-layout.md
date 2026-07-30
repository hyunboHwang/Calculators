# 가이드 카드뉴스 레이아웃 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/guides` 가이드 8편에 "핵심만 먼저 보여주는" 카드뉴스 레이어(하이라이트 카드 4개 + 절차 요약 칩)를 추가해 읽기 쉽게 만든다.

**Architecture:** `src/components/InfoSection.tsx`의 `PageInfo`에 선택 필드 `highlights`/`stepChips`를 추가하고, 값이 있을 때만 렌더링한다(기존 `sources`/`examples`와 동일한 컨벤션). 계산기 37개·정보 페이지 2개는 이 필드를 채우지 않으므로 시각적으로 전혀 바뀌지 않는다.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4. 새 의존성 없음.

## Global Constraints

- 테스트 프레임워크 없음 — 검증은 `npx tsc -b --noEmit`, `npm run build`, `npm run lint` + 수동/스크립트 확인.
- `highlights`는 가이드마다 정확히 4개(2×2 그리드 고정).
- `stepChips`는 해당 가이드의 `formula.steps`와 배열 길이가 정확히 같아야 한다(1:1 대응).
- 계산기 콘텐츠에는 `highlights`/`stepChips`를 채우지 않는다 — 필드가 없으면 섹션이 렌더링되지 않는 기존 패턴을 그대로 따른다.
- 새 색상 팔레트·애니메이션 라이브러리 도입 금지. 하이라이트 카드는 기존 `examples`/`sources` 카드와 같은 톤(`rounded-xl border border-slate-200 bg-white`), 스텝 칩은 `rounded-lg bg-slate-800 text-white`.
- 아래 8개 가이드의 `highlights`/`stepChips` 콘텐츠는 각 가이드 서브에이전트가 **이미 검증된 기존 intro/formula/faqs를 요약**해 작성한 것이다 — 새 사실 추가 없이 이 계획에 적힌 그대로 verbatim 사용한다.

---

## Task 1: `InfoSection.tsx` — `highlights`/`stepChips` 스키마 + 렌더링

**Files:**
- Modify: `src/components/InfoSection.tsx` (전체 교체)

**Interfaces:**
- Produces: `PageInfo`에 `highlights?: { icon: string; label: string; text: string }[]`, `stepChips?: { icon: string; label: string }[]` 추가 — Task 2~9(8개 콘텐츠 태스크)가 이 필드 형태로 `pageContent.js`를 채운다.

- [ ] **Step 1: `InfoSection.tsx` 전체를 아래 내용으로 교체**

```tsx
import { pageContent } from '../lib/pageContent'
import AdSlot from './AdSlot'
import { SLOTS } from '../lib/ads'

interface PageInfo {
  intro: string[]
  faqs: { q: string; a: string }[]
  formula?: { title: string; steps: string[] }
  glossary?: { term: string; definition: string }[]
  examples?: { title: string; result: string }[]
  sources?: { label: string; url: string }[]
  highlights?: { icon: string; label: string; text: string }[]
  stepChips?: { icon: string; label: string }[]
  hidden?: boolean
}

const content = pageContent as Record<string, PageInfo>

const stripStepNumber = (s: string) => s.replace(/^\d+\.\s+/, '')

/**
 * 페이지 하단 설명 + FAQ 섹션.
 * FAQ는 구글 리치 결과용 FAQPage JSON-LD로, formula는 HowTo JSON-LD로도 출력됩니다.
 */
export default function InfoSection({ pageId }: { pageId: string }) {
  const c = content[pageId]
  if (!c || c.hidden) return null

  const faqJsonLd =
    c.faqs.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: c.faqs.map((f) => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a },
          })),
        }
      : null

  const howToJsonLd = c.formula
    ? {
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        name: c.formula.title,
        step: c.formula.steps.map((s) => ({
          '@type': 'HowToStep',
          text: stripStepNumber(s),
        })),
      }
    : null

  return (
    <div className="mt-14 border-t border-slate-200 pt-8">
      {c.highlights && c.highlights.length > 0 && (
        <section className="mb-8 grid grid-cols-2 gap-3">
          {c.highlights.map((h, i) => (
            <div key={i} className="rounded-xl border border-slate-200 bg-white p-3">
              <span className="text-base" aria-hidden="true">
                {h.icon}
              </span>
              <p className="mt-1 text-xs font-bold text-slate-800">{h.label}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{h.text}</p>
            </div>
          ))}
        </section>
      )}

      <section>
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <span className="h-4 w-1 rounded-full bg-emerald-500" aria-hidden="true" />
          알아두면 좋은 것
        </h2>
        {c.intro.map((p, i) => (
          <p key={i} className="mt-3 text-sm leading-relaxed text-slate-600">
            {p}
          </p>
        ))}
      </section>

      {c.formula && (
        <section className="mt-8">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <span className="h-4 w-1 rounded-full bg-emerald-500" aria-hidden="true" />
            {c.formula.title}
          </h2>
          {c.stepChips && c.stepChips.length > 0 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {c.stepChips.map((chip, i) => (
                <span
                  key={i}
                  className="shrink-0 whitespace-nowrap rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  {chip.icon} {chip.label}
                </span>
              ))}
            </div>
          )}
          <ol className={c.stepChips && c.stepChips.length > 0 ? 'mt-4 space-y-2' : 'mt-3 space-y-2'}>
            {c.formula.steps.map((step, i) => (
              <li key={i} className="flex gap-2 text-sm leading-relaxed text-slate-600">
                <span className="shrink-0 font-semibold text-emerald-600">{i + 1}.</span>
                <span>{stripStepNumber(step)}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <AdSlot key={`${pageId}-article`} slot={SLOTS.inArticle} className="my-8" />

      {c.glossary && c.glossary.length > 0 && (
        <section className="mt-8">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <span className="h-4 w-1 rounded-full bg-emerald-500" aria-hidden="true" />
            용어 설명
          </h2>
          <dl className="mt-3 space-y-3">
            {c.glossary.map((g) => (
              <div key={g.term}>
                <dt className="text-sm font-semibold text-slate-800">{g.term}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-slate-600">{g.definition}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {c.examples && c.examples.length > 0 && (
        <section className="mt-8">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <span className="h-4 w-1 rounded-full bg-emerald-500" aria-hidden="true" />
            숫자로 보는 예시
          </h2>
          <div className="mt-3 space-y-2">
            {c.examples.map((ex, i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-800">{ex.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{ex.result}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {c.faqs.length > 0 && (
        <section className="mt-8">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <span className="h-4 w-1 rounded-full bg-emerald-500" aria-hidden="true" />
            자주 묻는 질문
          </h2>
          <div className="mt-3 space-y-2">
            {c.faqs.map((f) => (
              <details
                key={f.q}
                className="group rounded-xl border border-slate-200 bg-white p-4 transition-colors open:border-emerald-200 open:bg-emerald-50/30"
              >
                <summary className="flex cursor-pointer list-none items-start justify-between gap-3 text-sm font-semibold text-slate-800 marker:content-none">
                  <span>
                    <span className="mr-1.5 text-emerald-600">Q.</span>
                    {f.q}
                  </span>
                  <svg
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                    className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.23 7.21a.75.75 0 011.06.02L10 11.148l3.71-3.918a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                      clipRule="evenodd"
                    />
                  </svg>
                </summary>
                <p className="mt-2 pl-6 text-sm leading-relaxed text-slate-600">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      {c.sources && c.sources.length > 0 && (
        <section className="mt-8">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <span className="h-4 w-1 rounded-full bg-emerald-500" aria-hidden="true" />
            참고 자료
          </h2>
          <ul className="mt-3 space-y-1">
            {c.sources.map((s) => (
              <li key={s.url}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-emerald-700 underline decoration-emerald-300 underline-offset-2 hover:text-emerald-800"
                >
                  {s.label} ↗
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {howToJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }}
        />
      )}
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: 타입 검증 + 빌드**

Run: `npx tsc -b --noEmit && npm run build`
Expected: 성공. 아직 어떤 콘텐츠에도 `highlights`/`stepChips`가 없으므로(Task 2~9 이전), 모든 페이지가 지금과 완전히 동일하게 렌더링되는 것이 정상.

- [ ] **Step 3: 커밋**

```bash
git add src/components/InfoSection.tsx
git commit -m "feat: InfoSection에 하이라이트 카드/스텝 칩 렌더링 추가"
```

---

## Task 2: 연말정산 가이드 하이라이트/칩 추가

**Files:**
- Modify: `src/lib/pageContent.js`

**Interfaces:**
- Consumes: Task 1의 `highlights`/`stepChips` 필드 형태
- Produces: 없음

- [ ] **Step 1: `pageContent.js`의 `yearEndTaxProcedureGuide` 항목에 아래 두 필드 추가** (기존 `intro`/`formula`/`glossary`/`faqs`/`sources`는 그대로 두고, `formula` 필드 뒤 또는 `sources` 필드 앞 어디든 삽입)

```js
highlights: [
  { icon: '📅', label: '1월~2월', text: '1월 15일부터 이용 가능하며, 결과는 2월 급여에 반영됩니다.' },
  { icon: '📋', label: '추가항목', text: '안경, 교복, 월세 등은 직접 영수증을 준비해 제출해야 합니다.' },
  { icon: '💰', label: '2월환급', text: '정산 결과는 대부분 2월분 급여에 환급액 또는 추가납부액으로 반영됩니다.' },
  { icon: '🔄', label: '구제수단', text: '5월 신고나 경정청구로 최대 5년 이내 추가 환급을 받을 수 있습니다.' },
],
stepChips: [
  { icon: '📥', label: '자료조회' },
  { icon: '📋', label: '자료준비' },
  { icon: '✍️', label: '신고작성' },
  { icon: '🔢', label: '세액확정' },
  { icon: '💵', label: '급여지급' },
  { icon: '🔄', label: '보정청구' },
],
```

(`stepChips` 6개는 이 가이드의 `formula.steps` 6개와 순서대로 1:1 대응한다.)

- [ ] **Step 2: 검증**

Run: `npx tsc -b --noEmit && npm run build`

```bash
node --input-type=module -e "
import { pageContent } from './src/lib/pageContent.js'
const g = pageContent.yearEndTaxProcedureGuide
console.log('highlights:', g.highlights.length, '/ stepChips:', g.stepChips.length, '/ formula.steps:', g.formula.steps.length)
"
```
Expected: `highlights: 4 / stepChips: 6 / formula.steps: 6`.

- [ ] **Step 3: 커밋**

```bash
git add src/lib/pageContent.js
git commit -m "content: 연말정산 가이드에 하이라이트/스텝칩 추가"
```

---

## Task 3: 전세보증금 가이드 하이라이트/칩 추가

**Files:**
- Modify: `src/lib/pageContent.js`

**Interfaces:**
- Consumes: Task 1의 `highlights`/`stepChips` 필드 형태
- Produces: 없음

- [ ] **Step 1: `pageContent.js`의 `jeonseDepositRecoveryGuide` 항목에 아래 두 필드 추가**

```js
highlights: [
  { icon: '⚠️', label: '이사 전 필수', text: '임차권등기명령을 먼저 등기해야 대항력이 유지됩니다.' },
  { icon: '📬', label: '내용증명', text: '반환을 요구하는 사실을 명확히 기록으로 남겨야 합니다.' },
  { icon: '🛡️', label: '권리보전', text: '대항력과 우선변제권을 지키려면 이사 전에 등기해야 합니다.' },
  { icon: '📞', label: '무료상담', text: '법률구조공단에서 무료로 법률상담을 받을 수 있습니다.' },
],
stepChips: [
  { icon: '📬', label: '내용증명' },
  { icon: '🏛️', label: '등기신청' },
  { icon: '🏦', label: '보증청구' },
  { icon: '⚖️', label: '법정청구' },
  { icon: '🔨', label: '강제경매' },
  { icon: '🆘', label: '법률지원' },
],
```

(`stepChips` 6개는 이 가이드의 `formula.steps` 6개와 순서대로 1:1 대응한다 — 6번째는 "법률구조공단 안내" 문장에 대응.)

- [ ] **Step 2: 검증**

Run: `npx tsc -b --noEmit && npm run build`

```bash
node --input-type=module -e "
import { pageContent } from './src/lib/pageContent.js'
const g = pageContent.jeonseDepositRecoveryGuide
console.log('highlights:', g.highlights.length, '/ stepChips:', g.stepChips.length, '/ formula.steps:', g.formula.steps.length)
"
```
Expected: `highlights: 4 / stepChips: 6 / formula.steps: 6`.

- [ ] **Step 3: 커밋**

```bash
git add src/lib/pageContent.js
git commit -m "content: 전세보증금 가이드에 하이라이트/스텝칩 추가"
```

---

## Task 4: 퇴직금 중간정산 가이드 하이라이트/칩 추가

**Files:**
- Modify: `src/lib/pageContent.js`

**Interfaces:**
- Consumes: Task 1의 `highlights`/`stepChips` 필드 형태
- Produces: 없음

- [ ] **Step 1: `pageContent.js`의 `severanceInterimGuide` 항목에 아래 두 필드 추가**

```js
highlights: [
  { icon: '🚫', label: '원칙 금지', text: '법정 사유에만 예외적으로 허용됩니다.' },
  { icon: '💼', label: '회사 승낙', text: '회사가 반드시 승인해야 하는 의무는 없습니다.' },
  { icon: '🔀', label: '연금 유형', text: 'DB형과 DC형은 제도가 다릅니다.' },
  { icon: '📊', label: '근속 재산정', text: '정산 후 근무기간만 새로 계산됩니다.' },
],
stepChips: [
  { icon: '🏠', label: '주택 구입' },
  { icon: '🔑', label: '전세금 부담' },
  { icon: '🏥', label: '요양 비용' },
  { icon: '⚖️', label: '파산 선고' },
  { icon: '🔄', label: '개인회생' },
  { icon: '📉', label: '임금 피크' },
  { icon: '⏰', label: '근로 단축' },
  { icon: '📋', label: '법정 단축' },
  { icon: '🌪️', label: '재난 피해' },
],
```

(`stepChips` 9개는 이 가이드의 `formula.steps` 9개(법정 사유 ①~⑨)와 순서대로 1:1 대응한다.)

- [ ] **Step 2: 검증**

Run: `npx tsc -b --noEmit && npm run build`

```bash
node --input-type=module -e "
import { pageContent } from './src/lib/pageContent.js'
const g = pageContent.severanceInterimGuide
console.log('highlights:', g.highlights.length, '/ stepChips:', g.stepChips.length, '/ formula.steps:', g.formula.steps.length)
"
```
Expected: `highlights: 4 / stepChips: 9 / formula.steps: 9`.

- [ ] **Step 3: 커밋**

```bash
git add src/lib/pageContent.js
git commit -m "content: 퇴직금 중간정산 가이드에 하이라이트/스텝칩 추가"
```

---

## Task 5: 실업급여 가이드 하이라이트/칩 추가

**Files:**
- Modify: `src/lib/pageContent.js`

**Interfaces:**
- Consumes: Task 1의 `highlights`/`stepChips` 필드 형태
- Produces: 없음

- [ ] **Step 1: `pageContent.js`의 `unemploymentApplicationGuide` 항목에 아래 두 필드 추가**

```js
highlights: [
  { icon: '📋', label: '5단계절차', text: '정해진 5단계를 순서대로 밟아야 지급이 시작됩니다.' },
  { icon: '⏰', label: '12개월기한', text: '이직일 다음 날부터 12개월 내에 신청해야 합니다.' },
  { icon: '💻', label: '온라인교육', text: '약 1시간, 신청 후 7일 내 완료 필수입니다.' },
  { icon: '✅', label: '무제출대응', text: '회사 미제출 시 고용센터에 설명하고 신청 진행 가능합니다.' },
],
stepChips: [
  { icon: '📋', label: '처리확인' },
  { icon: '📝', label: '구직등록' },
  { icon: '💻', label: '온라인교육' },
  { icon: '🏢', label: '센터방문' },
  { icon: '🎖️', label: '자격인정' },
  { icon: '💰', label: '활동보고' },
],
```

(`stepChips` 6개는 이 가이드의 `formula.steps` 6개와 순서대로 1:1 대응한다.)

- [ ] **Step 2: 검증**

Run: `npx tsc -b --noEmit && npm run build`

```bash
node --input-type=module -e "
import { pageContent } from './src/lib/pageContent.js'
const g = pageContent.unemploymentApplicationGuide
console.log('highlights:', g.highlights.length, '/ stepChips:', g.stepChips.length, '/ formula.steps:', g.formula.steps.length)
"
```
Expected: `highlights: 4 / stepChips: 6 / formula.steps: 6`.

- [ ] **Step 3: 커밋**

```bash
git add src/lib/pageContent.js
git commit -m "content: 실업급여 가이드에 하이라이트/스텝칩 추가"
```

---

## Task 6: 청년월세 지원 가이드 하이라이트/칩 추가

**Files:**
- Modify: `src/lib/pageContent.js`

**Interfaces:**
- Consumes: Task 1의 `highlights`/`stepChips` 필드 형태
- Produces: 없음

- [ ] **Step 1: `pageContent.js`의 `youthRentSubsidyGuide` 항목에 아래 두 필드 추가**

```js
highlights: [
  { icon: '📅', label: '접수마감', text: '2026년 1차 신청 마감, 결과 9월 14일 발표' },
  { icon: '💰', label: '최대지원', text: '실제 월세 기준으로 월 최대 20만원 지원' },
  { icon: '👥', label: '기본자격', text: '만 19~34세, 부모와 분리 거주, 무주택' },
  { icon: '📊', label: '소득기준', text: '본인소득 60%, 부모포함 100% 중위소득 이하' },
],
stepChips: [
  { icon: '🔍', label: '자격확인' },
  { icon: '💰', label: '소득확인' },
  { icon: '⏰', label: '일정확인' },
  { icon: '📋', label: '서류준비' },
  { icon: '📝', label: '신청하기' },
  { icon: '📢', label: '심사발표' },
],
```

(`stepChips` 6개는 이 가이드의 `formula.steps` 6개와 순서대로 1:1 대응한다. "접수마감" 하이라이트는 2026년 1차 신청이 이미 마감됐다는, 이 가이드의 핵심 사실을 그대로 반영한 것이므로 문구를 바꾸지 않는다.)

- [ ] **Step 2: 검증**

Run: `npx tsc -b --noEmit && npm run build`

```bash
node --input-type=module -e "
import { pageContent } from './src/lib/pageContent.js'
const g = pageContent.youthRentSubsidyGuide
console.log('highlights:', g.highlights.length, '/ stepChips:', g.stepChips.length, '/ formula.steps:', g.formula.steps.length)
"
```
Expected: `highlights: 4 / stepChips: 6 / formula.steps: 6`.

- [ ] **Step 3: 커밋**

```bash
git add src/lib/pageContent.js
git commit -m "content: 청년월세 지원 가이드에 하이라이트/스텝칩 추가"
```

---

## Task 7: 청년도약계좌 가이드 하이라이트/칩 추가

**Files:**
- Modify: `src/lib/pageContent.js`

**Interfaces:**
- Consumes: Task 1의 `highlights`/`stepChips` 필드 형태
- Produces: 없음

- [ ] **Step 1: `pageContent.js`의 `youthLeapAccountGuide` 항목에 아래 두 필드 추가**

```js
highlights: [
  { icon: '🚪', label: '가입 종료', text: '신규가입은 2025년 12월 5일 마감되었습니다.' },
  { icon: '✅', label: '기존 가입자', text: '이미 가입한 사람은 5년 만기까지 혜택이 유지됩니다.' },
  { icon: '🆕', label: '후속 상품', text: '2026년 6월 청년미래적금이 출시되었습니다(월 50만원, 3년).' },
  { icon: '📋', label: '공식 확인', text: '서민금융진흥원과 금융위원회 공식 발표로 확인하세요.' },
],
stepChips: [
  { icon: '🚪', label: '가입 여부' },
  { icon: '✅', label: '계좌 유지' },
  { icon: '📋', label: '자격 조건' },
  { icon: '🆕', label: '후속 상품' },
  { icon: '🔄', label: '상품 전환' },
  { icon: '📞', label: '공식 확인' },
],
```

(`stepChips` 6개는 이 가이드의 `formula.steps` 6개와 순서대로 1:1 대응한다. "가입 종료" 하이라이트는 이 가이드의 가장 중요한 사실 — 신규가입이 이미 끝났다는 것 — 을 그대로 반영한 것이므로 문구를 바꾸지 않는다.)

- [ ] **Step 2: 검증**

Run: `npx tsc -b --noEmit && npm run build`

```bash
node --input-type=module -e "
import { pageContent } from './src/lib/pageContent.js'
const g = pageContent.youthLeapAccountGuide
console.log('highlights:', g.highlights.length, '/ stepChips:', g.stepChips.length, '/ formula.steps:', g.formula.steps.length)
"
```
Expected: `highlights: 4 / stepChips: 6 / formula.steps: 6`.

- [ ] **Step 3: 커밋**

```bash
git add src/lib/pageContent.js
git commit -m "content: 청년도약계좌 가이드에 하이라이트/스텝칩 추가"
```

---

## Task 8: 청년 버팀목전세대출 가이드 하이라이트/칩 추가

**Files:**
- Modify: `src/lib/pageContent.js`

**Interfaces:**
- Consumes: Task 1의 `highlights`/`stepChips` 필드 형태
- Produces: 없음

- [ ] **Step 1: `pageContent.js`의 `youthJeonseLoanGuide` 항목에 아래 두 필드 추가**

```js
highlights: [
  { icon: '👤', label: '연령기준', text: '만 19세 이상 34세 이하 신청 가능' },
  { icon: '💰', label: '대출한도', text: '최대 1억 5,000만원(25세 미만 1억 2,000만원)' },
  { icon: '📊', label: '금리범위', text: '연 2.2~3.3% 소득별 변동금리' },
  { icon: '⏰', label: '신청기한', text: '이사일로부터 3개월 이내 신청' },
],
stepChips: [
  { icon: '👤', label: '자격확인' },
  { icon: '📝', label: '신청접수' },
  { icon: '🔍', label: '자산심사' },
  { icon: '📱', label: '결과통보' },
  { icon: '📄', label: '서류제출' },
  { icon: '✅', label: '대출실행' },
],
```

(`stepChips` 6개는 이 가이드의 `formula.steps` 6개와 순서대로 1:1 대응한다. 대출한도는 1.5억/1.2억이며 일부 2차 출처의 "2억" 수치와 다르니 그대로 유지한다 — 이 가이드는 이미 공식 페이지 기준으로 검증됐다.)

- [ ] **Step 2: 검증**

Run: `npx tsc -b --noEmit && npm run build`

```bash
node --input-type=module -e "
import { pageContent } from './src/lib/pageContent.js'
const g = pageContent.youthJeonseLoanGuide
console.log('highlights:', g.highlights.length, '/ stepChips:', g.stepChips.length, '/ formula.steps:', g.formula.steps.length)
"
```
Expected: `highlights: 4 / stepChips: 6 / formula.steps: 6`.

- [ ] **Step 3: 커밋**

```bash
git add src/lib/pageContent.js
git commit -m "content: 청년 버팀목전세대출 가이드에 하이라이트/스텝칩 추가"
```

---

## Task 9: 국민취업지원제도 가이드 하이라이트/칩 추가

**Files:**
- Modify: `src/lib/pageContent.js`

**Interfaces:**
- Consumes: Task 1의 `highlights`/`stepChips` 필드 형태
- Produces: 없음

- [ ] **Step 1: `pageContent.js`의 `nationalEmploymentSupportGuide` 항목에 아래 두 필드 추가**

```js
highlights: [
  { icon: '💰', label: 'I형·II형', text: 'I형은 현금수당, II형은 훈련비용' },
  { icon: '📋', label: '신청자격', text: '소득·재산 기준 충족 시 신청 가능' },
  { icon: '💵', label: '수당금액', text: '월 60만원(확인 시점 기준)' },
  { icon: '🎓', label: '청년특례', text: '만 34세 이하면 취업경험 무관' },
],
stepChips: [
  { icon: '📝', label: '회원가입' },
  { icon: '📋', label: '구직등록' },
  { icon: '📤', label: '신청서제출' },
  { icon: '🔍', label: '자격심사' },
  { icon: '📑', label: '계획수립' },
  { icon: '✔️', label: '활동이행' },
],
```

(`stepChips` 6개는 이 가이드의 `formula.steps` 6개와 순서대로 1:1 대응한다. "수당금액" 하이라이트는 본문의 헤지 표현("확인 시점 기준")을 그대로 유지한다 — 확정된 금액처럼 단정하지 않는다.)

- [ ] **Step 2: 검증**

Run: `npx tsc -b --noEmit && npm run build`

```bash
node --input-type=module -e "
import { pageContent } from './src/lib/pageContent.js'
const g = pageContent.nationalEmploymentSupportGuide
console.log('highlights:', g.highlights.length, '/ stepChips:', g.stepChips.length, '/ formula.steps:', g.formula.steps.length)
"
```
Expected: `highlights: 4 / stepChips: 6 / formula.steps: 6`.

- [ ] **Step 3: 커밋**

```bash
git add src/lib/pageContent.js
git commit -m "content: 국민취업지원제도 가이드에 하이라이트/스텝칩 추가"
```

---

## Task 10: 최종 검증

**Files:**
- 없음 (검증 전용 태스크, 코드 변경 없음)

**Interfaces:**
- 없음

- [ ] **Step 1: 타입 체크 + 빌드 + 린트**

Run: `npx tsc -b --noEmit && npm run build && npm run lint`
Expected: 모두 성공.

- [ ] **Step 2: 8개 가이드 전부 highlights=4, stepChips.length===formula.steps.length 확인**

```bash
node --input-type=module -e "
import { pageContent } from './src/lib/pageContent.js'
const ids = ['yearEndTaxProcedureGuide','jeonseDepositRecoveryGuide','severanceInterimGuide','unemploymentApplicationGuide','youthRentSubsidyGuide','youthLeapAccountGuide','youthJeonseLoanGuide','nationalEmploymentSupportGuide']
for (const id of ids) {
  const g = pageContent[id]
  const ok = g.highlights?.length === 4 && g.stepChips?.length === g.formula.steps.length
  console.log(id, '→ highlights:', g.highlights?.length, '/ stepChips:', g.stepChips?.length, '/ formula.steps:', g.formula.steps.length, ok ? 'OK' : '❌ MISMATCH')
}
"
```
Expected: 8개 전부 `OK`, `highlights: 4`.

- [ ] **Step 3: 계산기 페이지 회귀 확인 (하이라이트/칩 없는 페이지는 기존과 동일해야 함)**

```bash
grep -c "grid-cols-2 gap-3" dist/salary/index.html || true
```
Expected: `0` (계산기 페이지엔 `highlights`가 없으므로 하이라이트 그리드 자체가 렌더링되지 않아야 함 — 참고로 이 grep은 정적 프리렌더 HTML 기준이라 클라이언트 렌더링과 별개로 참고용).

- [ ] **Step 4: 가이드 페이지 표본 확인**

```bash
grep -c "1월~2월\|추가항목" dist/guides/yearend-tax-procedure/index.html || echo "0 (클라이언트 전용 렌더링이면 정적 HTML엔 안 보일 수 있음 — 아래 소스 확인으로 대체)"
grep -c "highlights" src/lib/pageContent.js
```
Expected: `pageContent.js`에 `highlights` 문자열이 8번 이상(가이드 8개) 등장.

- [ ] **Step 5: 수동 스팟체크 (가능하면 브라우저, 불가능하면 코드 검사로 대체)**

`npm run dev` 후 `/guides/yearend-tax-procedure` 등 아무 가이드나 열어: (a) `<h1>` 바로 아래에 2×2 하이라이트 카드 4개가 보이는지, (b) "이렇게 진행됩니다" 절차 섹션 제목 아래 가로 스크롤 칩이 보이고 그 아래 기존 번호 리스트가 그대로 있는지, (c) 계산기 페이지(`/salary` 등)는 이번 변경 전과 완전히 동일하게 보이는지.

Expected: 모두 정상.

- [ ] **Step 6: 최종 커밋**

```bash
git add -A
git commit -m "docs: 가이드 카드뉴스 레이아웃 최종 검증 완료" --allow-empty
```
