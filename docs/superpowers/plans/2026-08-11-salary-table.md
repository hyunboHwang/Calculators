# 연봉 실수령액표 (Salary Table) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 연봉 구간별(2,000만원~2억원) 실수령액을 1인~4인 가구 기준으로 미리 계산해 보여주는 새 레퍼런스 페이지 `/salary-table`을 추가한다.

**Architecture:** 기존에 검증된 `calcSalary()`(`src/lib/salary.ts`)를 그대로 재사용하는 새 함수 `buildSalaryTable()`을 같은 파일에 추가하고, 이를 React 페이지(`SalaryTableCalculator.tsx`)와 빌드 후처리 스크립트(`scripts/postbuild.mjs`)가 각각 import해서 동일한 데이터로 화면용 표와 크롤러용 정적 HTML 표를 만든다. 새 계산 로직은 만들지 않는다.

**Tech Stack:** React 19 + TypeScript(기존 패턴 그대로), Tailwind CSS 유틸리티 클래스, Node 24 네이티브 TypeScript 실행(postbuild.mjs가 `.ts` 파일을 직접 import).

## Global Constraints

- Vitest 등 테스트 프레임워크는 도입하지 않는다 — 검증은 수동 실행 스크립트와 `npx tsc -b --noEmit && npm run build && npm run lint`로 한다.
- 계산 가정: 비과세 월액 0원, 8~20세 자녀 0명, 원천징수비율 100%. 가구원 수(1~4인)만 변수로 둔다.
- 연봉 구간: 2,000만원~1억원은 100만원 단위(81행), 1억500만원~2억원은 500만원 단위(20행). 총 101행.
- 새 라우트는 `group: "직장인"`으로 등록해 사이드바에 자동 노출되게 한다(`groups.json` 수정 불필요).
- 기존 코드 스타일을 그대로 따른다: `fmt()` 로 숫자 포맷, Tailwind 클래스는 기존 계산기 페이지들과 통일된 톤(`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm` 카드 패턴).

---

### Task 1: `buildSalaryTable()` 데이터 함수

**Files:**
- Modify: `src/lib/salary.ts` (파일 끝에 추가)

**Interfaces:**
- Consumes: 기존 `calcSalary(i: SalaryInput)` — 시그니처 변경 없음.
- Produces: `export interface SalaryTableRow { annualSalary: number; monthlyGross: number; net: [number, number, number, number] }` 와 `export function buildSalaryTable(): SalaryTableRow[]` — Task 2(페이지)와 Task 4(postbuild)가 이 두 심볼을 import해서 쓴다.

- [ ] **Step 1: `src/lib/salary.ts` 파일 끝에 다음 코드를 추가한다**

```ts
/* ---------- 연봉 실수령액표 (레퍼런스 페이지용) ---------- */

export interface SalaryTableRow {
  annualSalary: number
  monthlyGross: number
  net: [number, number, number, number] // 1인·2인·3인·4인 가구 월 실수령액
}

/**
 * 연봉 구간별 실수령액표를 생성한다.
 * 2,000만원~1억원: 100만원 단위(81행), 1억500만원~2억원: 500만원 단위(20행).
 * 계산 가정: 비과세 0원, 8~20세 자녀 0명, 원천징수비율 100%.
 */
export function buildSalaryTable(): SalaryTableRow[] {
  const salaries: number[] = []
  for (let s = 20_000_000; s <= 100_000_000; s += 1_000_000) salaries.push(s)
  for (let s = 105_000_000; s <= 200_000_000; s += 5_000_000) salaries.push(s)

  return salaries.map((annualSalary) => {
    const net = [1, 2, 3, 4].map(
      (dependents) =>
        calcSalary({
          annualSalary,
          nonTaxableMonthly: 0,
          dependents,
          children: 0,
          withholdingRatio: 100,
        }).monthlyNet,
    ) as [number, number, number, number]
    return {
      annualSalary,
      monthlyGross: Math.round(annualSalary / 12),
      net,
    }
  })
}
```

- [ ] **Step 2: 행 개수와 경계값을 수동 스크립트로 검증한다**

작업 디렉터리에서 실행 (Node 24는 `.ts` 파일을 별도 빌드 없이 바로 import할 수 있다):

```bash
node --input-type=module -e "
import { buildSalaryTable } from '/Users/hwanghyeonbo/persnal_project/calculator/src/lib/salary.ts'
const rows = buildSalaryTable()
console.log('총 행 수:', rows.length, '(기대값 101)')
console.log('첫 행:', rows[0])
console.log('1억원 행:', rows.find(r => r.annualSalary === 100_000_000))
console.log('1억500만원 행:', rows.find(r => r.annualSalary === 105_000_000))
console.log('마지막 행:', rows[rows.length - 1])
"
```

기대 결과: 총 행 수 101, 첫 행 `annualSalary: 20000000`, 마지막 행 `annualSalary: 200000000`, 1억원과 1억500만원 행이 모두 존재(구간 전환이 끊기지 않았는지 확인).

- [ ] **Step 3: `net` 배열이 가구원 수가 늘수록 실수령액도 늘어나는지(단조 증가) 확인한다**

```bash
node --input-type=module -e "
import { buildSalaryTable } from '/Users/hwanghyeonbo/persnal_project/calculator/src/lib/salary.ts'
const rows = buildSalaryTable()
const bad = rows.filter(r => !(r.net[0] <= r.net[1] && r.net[1] <= r.net[2] && r.net[2] <= r.net[3]))
console.log('가구원 수 증가에도 실수령액이 늘지 않는 행 개수:', bad.length, '(기대값 0)')
"
```

가구원 수가 늘면 간이세액표상 공제(가족 수 기준 특별소득공제, `specialDeduction()`)가 커져 원천징수 소득세가 줄어들므로, 실수령액은 항상 1인 ≤ 2인 ≤ 3인 ≤ 4인이어야 한다. `bad.length`가 0이 아니면 Step 1의 구현을 다시 확인한다.

- [ ] **Step 4: `npx tsc -b --noEmit`로 타입 오류 없는지 확인**

```bash
cd /Users/hwanghyeonbo/persnal_project/calculator && npx tsc -b --noEmit
```

- [ ] **Step 5: 커밋**

```bash
git add src/lib/salary.ts
git commit -m "feat: 연봉 실수령액표 데이터 함수 buildSalaryTable 추가"
```

---

### Task 2: 페이지 컴포넌트 + 라우팅 등록

**Files:**
- Create: `src/pages/SalaryTableCalculator.tsx`
- Modify: `src/routes.json` (salary 항목 바로 뒤에 새 항목 삽입)
- Modify: `src/App.tsx` (lazy import 레지스트리에 한 줄 추가)

**Interfaces:**
- Consumes: Task 1의 `buildSalaryTable`, `SalaryTableRow` (from `../lib/salary`), 기존 `fmt` (from `../components/ui`).
- Produces: 라우트 `id: "salaryTable"`, `path: "/salary-table"` — Task 3(콘텐츠)이 `pageContent.js`에서 이 id로 항목을 찾는다.

- [ ] **Step 1: `src/routes.json`에서 `"id": "salary"` 항목을 찾아 바로 뒤에 다음 객체를 삽입한다** (배열 안의 한 원소이므로 앞 항목 뒤에 콤마로 구분)

```json
  {
    "id": "salaryTable",
    "path": "/salary-table",
    "label": "연봉 실수령액표",
    "group": "직장인",
    "title": "2026 연봉 실수령액표 — 2,000만원부터 2억원까지 한눈에 | 계산기",
    "description": "연봉 2,000만원부터 2억원까지 100만~500만원 단위로 1인~4인 가구 월 실수령액을 미리 계산한 표입니다. 내 연봉과 가까운 구간을 바로 찾아보세요."
  },
```

- [ ] **Step 2: `src/App.tsx`의 lazy import 레지스트리에서 `salary: lazy(...)` 줄 바로 아래에 추가**

```ts
  salaryTable: lazy(() => import('./pages/SalaryTableCalculator')),
```

- [ ] **Step 3: `src/pages/SalaryTableCalculator.tsx` 새 파일 작성**

```tsx
import { useMemo } from 'react'
import { buildSalaryTable } from '../lib/salary'
import { fmt } from '../components/ui'

export default function SalaryTableCalculator() {
  const rows = useMemo(() => buildSalaryTable(), [])

  return (
    <div>
      <h1 className="text-2xl font-bold">연봉 실수령액표</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        연봉 2,000만원부터 2억원까지 가구원 수별 월 실수령액을 미리 계산했습니다. 내 연봉과
        가까운 행을 찾아보세요.
      </p>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800">
        <b>계산 기준</b>: 비과세 월액 0원 · 8~20세 자녀 0명 · 원천징수비율 100% 기준입니다.
        식대 등 비과세 항목이 있거나 자녀가 있다면 실제 실수령액은 표보다 더 많습니다. 내
        조건에 맞춘 정확한 계산은{' '}
        <a
          href="/salary/"
          className="font-semibold underline decoration-amber-400 underline-offset-2"
        >
          연봉 실수령액 계산기
        </a>
        를 이용하세요.
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[640px] text-right text-sm tabular-nums">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr className="border-b border-slate-200">
              <th className="py-2 pl-4 pr-2 text-left font-medium">연봉</th>
              <th className="px-2 py-2 font-medium">월급(세전)</th>
              <th className="px-2 py-2 font-medium">1인 가구</th>
              <th className="px-2 py-2 font-medium">2인 가구</th>
              <th className="px-2 py-2 font-medium">3인 가구</th>
              <th className="py-2 pl-2 pr-4 font-medium">4인 가구+</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.annualSalary} className="border-b border-slate-50 even:bg-slate-50/60">
                <td className="py-1.5 pl-4 pr-2 text-left font-semibold text-slate-700">
                  {fmt(r.annualSalary)}
                </td>
                <td className="px-2 py-1.5 text-slate-500">{fmt(r.monthlyGross)}</td>
                <td className="px-2 py-1.5">{fmt(r.net[0])}</td>
                <td className="px-2 py-1.5">{fmt(r.net[1])}</td>
                <td className="px-2 py-1.5">{fmt(r.net[2])}</td>
                <td className="py-1.5 pl-2 pr-4 font-medium text-emerald-700">{fmt(r.net[3])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-slate-400">단위: 원(월 실수령액). 가구원 수는 본인을 포함한 부양가족 수입니다.</p>
    </div>
  )
}
```

- [ ] **Step 4: 개발 서버로 렌더링 확인**

```bash
cd /Users/hwanghyeonbo/persnal_project/calculator && npm run build 2>&1 | tail -20
```
`✓ /salary-table/index.html`가 출력되는지 확인한다.

- [ ] **Step 5: `npx tsc -b --noEmit && npm run lint`로 타입·린트 오류 없는지 확인**

```bash
npx tsc -b --noEmit && npm run lint
```

- [ ] **Step 6: 커밋**

```bash
git add src/pages/SalaryTableCalculator.tsx src/routes.json src/App.tsx
git commit -m "feat: 연봉 실수령액표 페이지(/salary-table) 추가"
```

---

### Task 3: 콘텐츠(pageContent.js) + 계산기 간 상호 링크

**Files:**
- Modify: `src/lib/pageContent.js` (`salary` 항목 바로 뒤에 `salaryTable` 새 항목 추가)
- Modify: `src/pages/SalaryCalculator.tsx` (표로 가는 링크 추가)

**Interfaces:**
- Consumes: `pageContent.salaryTable`는 `App.tsx`가 자동으로 렌더링하는 `<InfoSection pageId={route.id} />`(`route.id === "salaryTable"`)가 읽는다 — 별도 코드 수정 없이 자동 연결됨.

- [ ] **Step 1: `src/lib/pageContent.js`에서 `salary:` 항목을 찾아 그 객체가 끝나는 지점(다음 항목 시작 전) 바로 뒤에 삽입**

```js
  salaryTable: {
    intro: [
      '이 표는 연봉 2,000만원부터 2억원까지, 가구원 수(본인 포함 부양가족 수) 1인~4인 기준으로 월 실수령액을 미리 계산해 정리한 것입니다. 계산은 비과세 월액 0원, 8~20세 자녀 0명, 원천징수비율 100%를 가정합니다.',
      '가구원 수가 많을수록 실수령액이 늘어나는 이유는 근로소득 간이세액표의 공제대상 가족 수에 따른 특별소득공제가 커져 매월 원천징수되는 소득세가 줄어들기 때문입니다. 실제 원천징수액은 최종 연말정산에서 정산되므로 연간 총 세금은 가족 수와 무관하게 실제 소득공제·세액공제 내역에 따라 확정됩니다.',
      '식대 등 비과세 항목이 있거나 8~20세 자녀가 있다면 실제 실수령액은 이 표보다 더 많습니다. 내 조건에 정확히 맞춘 계산은 연봉 실수령액 계산기를 이용하세요.',
    ],
    faqs: [
      { q: '표의 실수령액이 제 월급과 다른 이유는 무엇인가요?', a: '이 표는 비과세 월액 0원, 8~20세 자녀 0명, 원천징수비율 100%를 가정한 기준치입니다. 식대 등 비과세 항목이 있거나 자녀가 있다면, 회사의 원천징수 비율(80/100/120%)이 다르다면 실제 실수령액은 표와 달라집니다. 정확한 개인별 계산은 연봉 실수령액 계산기를 이용하세요.' },
      { q: '가구원 수는 어떻게 세나요?', a: '본인을 포함해 소득세 계산상 공제대상으로 인정되는 부양가족 수입니다. 배우자, 자녀, 함께 사는 부모 등이 소득·연령 요건을 충족하면 포함됩니다.' },
      { q: '연봉 1억원을 넘으면 왜 표의 간격이 500만원 단위로 넓어지나요?', a: '고액 연봉 구간은 개인별 비과세·공제 구성 차이가 상대적으로 커서 촘촘한 표의 실효성이 낮아지므로, 큰 흐름을 보여주는 데 집중해 간격을 넓혔습니다.' },
      { q: '이 표의 기준은 몇 년도인가요?', a: '2026년 기준 국민연금 근로자 부담률 4.75%, 건강보험 3.595%, 장기요양보험(건강보험료의 13.14%), 고용보험 0.9%와 근로소득 간이세액표 산출방식을 반영했습니다. 요율이 개정되면 이 표도 함께 갱신됩니다.' },
    ],
  },
```

- [ ] **Step 2: `src/pages/SalaryCalculator.tsx`의 안내 카드(파일 끝 `<div className="rounded-2xl border border-amber-200...">` 블록) 바로 뒤, `</div>\n    </div>\n  )` 앞에 표로 가는 링크 카드 추가**

`</section>` 바로 앞(171~177번 줄의 amber 안내 카드 다음)에 아래 블록을 삽입:

```tsx
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
            <a
              href="/salary-table/"
              className="font-medium text-emerald-700 underline decoration-emerald-300 underline-offset-2 hover:text-emerald-800"
            >
              연봉 2,000만원~2억원 구간별 실수령액표 보기 →
            </a>
          </div>
```

- [ ] **Step 3: `npx tsc -b --noEmit && npm run build 2>&1 | tail -10`으로 빌드 확인**

```bash
cd /Users/hwanghyeonbo/persnal_project/calculator
npx tsc -b --noEmit && npm run build 2>&1 | tail -10
```

- [ ] **Step 4: 빌드된 `/salary-table/index.html`에 FAQ 텍스트가 프리렌더링됐는지 확인** (postbuild.mjs가 `pageContent[route.id].faqs`를 이미 자동으로 렌더링하므로 Task 4 이전에도 FAQ는 보여야 함)

```bash
grep -o "표의 실수령액이 제 월급과 다른 이유는 무엇인가요" dist/salary-table/index.html
```
출력이 있으면 정상.

- [ ] **Step 5: 커밋**

```bash
git add src/lib/pageContent.js src/pages/SalaryCalculator.tsx
git commit -m "docs: 연봉 실수령액표 콘텐츠(intro/FAQ) 및 계산기 상호 링크 추가"
```

---

### Task 4: postbuild.mjs 크롤러용 표 프리렌더링 + 최종 검증

**Files:**
- Modify: `scripts/postbuild.mjs`

**Interfaces:**
- Consumes: Task 1의 `buildSalaryTable` (from `../src/lib/salary.ts`).

- [ ] **Step 1: `scripts/postbuild.mjs` 상단 import에 한 줄 추가** (기존 `import { pageContent } from '../src/lib/pageContent.js'` 바로 아래)

```js
import { buildSalaryTable } from '../src/lib/salary.ts'
```

- [ ] **Step 2: `prerenderBody()` 함수 안, `if (route.id === 'guidesIndex') { ... }` 블록 바로 다음(105번째 줄 "내부 링크" 주석 전)에 아래 블록 추가**

```js
  if (route.id === 'salaryTable') {
    const rows = buildSalaryTable()
    html += `<h2 class="mt-6 text-lg font-bold text-slate-900">연봉대별 월 실수령액표</h2>`
    html += `<table class="mt-2 w-full text-sm"><thead><tr>`
    html += `<th>연봉</th><th>월급(세전)</th><th>1인 가구</th><th>2인 가구</th><th>3인 가구</th><th>4인 가구+</th>`
    html += `</tr></thead><tbody>`
    html += rows
      .map(
        (r) =>
          `<tr><td>${r.annualSalary.toLocaleString('ko-KR')}</td><td>${r.monthlyGross.toLocaleString('ko-KR')}</td><td>${r.net[0].toLocaleString('ko-KR')}</td><td>${r.net[1].toLocaleString('ko-KR')}</td><td>${r.net[2].toLocaleString('ko-KR')}</td><td>${r.net[3].toLocaleString('ko-KR')}</td></tr>`,
      )
      .join('')
    html += `</tbody></table>`
  }

```

- [ ] **Step 3: 빌드 후 정적 HTML에 101행이 모두 포함됐는지 확인**

```bash
cd /Users/hwanghyeonbo/persnal_project/calculator
npm run build 2>&1 | tail -5
node -e "
const fs = require('fs');
const html = fs.readFileSync('dist/salary-table/index.html', 'utf8');
const rowCount = (html.match(/<tr>/g) || []).length - 1; // -1은 헤더 tr
console.log('본문 tr 개수(헤더 제외):', rowCount, '(기대값 101)');
const text = html.replace(/<script[\s\S]*?<\/script>/g,'').replace(/<style[\s\S]*?<\/style>/g,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
console.log('텍스트 길이:', text.length);
"
```

기대 결과: `rowCount` 101, 텍스트 길이가 다른 계산기 페이지 평균(약 3,200자) 이상.

- [ ] **Step 4: 전체 검증 스위트 실행**

```bash
cd /Users/hwanghyeonbo/persnal_project/calculator
npx tsc -b --noEmit && npm run build 2>&1 | tail -15 && npm run lint
```

모두 통과해야 하며, `npm run lint` 결과에 새 파일 관련 오류가 없어야 한다(기존 파일들의 `only-export-components` warning은 무관하므로 무시).

- [ ] **Step 5: sitemap.xml에 새 라우트가 포함됐는지 확인**

```bash
grep -c "salary-table" dist/sitemap.xml
```
1 이상이면 정상(routes.json 기반으로 자동 생성되므로 별도 코드 수정 불필요).

- [ ] **Step 6: 최종 커밋**

```bash
git add scripts/postbuild.mjs
git commit -m "feat: 연봉 실수령액표 크롤러용 정적 프리렌더링 추가"
```
