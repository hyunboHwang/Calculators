# 셀러 계산기

셀러와 직장인을 위한 생활 계산기 모음. Vite + React + TypeScript + Tailwind CSS.

## 계산기 목록 (13개)

| 그룹 | 계산기 | 경로 |
|---|---|---|
| 셀러 | 위탁판매 마진 계산기 | `/` |
| 셀러 | 셀러 세금 (부가세·종소세) | `/seller-tax/` |
| 직장인 | 연봉 실수령액 (2026) | `/salary/` |
| 직장인 | 연봉 인상 비교 | `/raise/` |
| 직장인 | 퇴직금 | `/severance/` |
| 나이 | 나이 계산기 (만/연/세는) | `/age/` |
| 나이 | 환갑·칠순·팔순 | `/celebration/` |
| 나이 | 보험나이 (상령일) | `/insurance-age/` |
| 나이 | 국민연금 수령나이 | `/pension-age/` |
| 대출 | 대출 상환 (3방식 비교) | `/loan/` |
| 대출 | DSR | `/dsr/` |
| 대출 | 중도상환수수료 | `/prepayment/` |
| 대출 | 대출 갈아타기 | `/refinance/` |

## 개발

```bash
npm install
npm run dev      # 개발 서버
npm run build    # 빌드 + SEO 정적 페이지/sitemap 생성
npm run preview  # 빌드 결과 미리보기
```

## 구조

- `src/routes.json` — 라우트·메뉴·SEO 메타 정의. **계산기 추가 시 여기에 한 줄 추가**하고 `src/App.tsx`의 `components`에 컴포넌트를 연결하면 메뉴/SEO/sitemap에 자동 반영
- `src/pages/` — 계산기 페이지 (1페이지 1파일)
- `src/lib/` — 계산 로직 (순수 함수, UI와 분리)
- `src/components/ui.tsx` — 공용 입력/출력 컴포넌트
- `scripts/postbuild.mjs` — 빌드 후 라우트별 정적 HTML + `sitemap.xml` + `robots.txt` 생성

## 배포

1. GitHub push 후 Vercel(또는 Cloudflare Pages/Netlify)에서 import — 빌드 설정 자동 인식
2. 도메인 확정 시 `scripts/postbuild.mjs`의 `SITE_URL` 변경 후 재배포
3. [구글 서치 콘솔](https://search.google.com/search-console)과 [네이버 서치어드바이저](https://searchadvisor.naver.com)에 사이트 등록 + `sitemap.xml` 제출

## 기준값 메모 (2026)

- 국민연금 근로자 4.75% (기준소득월액 41만~659만, 2026.7~2027.6)
- 건강보험 3.595% / 장기요양 = 건강보험료의 13.14% / 고용보험 0.9%
- 소득세: 근로소득 간이세액표 산출방식(별표2) 근사 — `src/lib/salary.ts`
- 간이과세 기준 1억 400만, 부가가치율(소매·통신판매) 15%

모든 계산 결과는 참고용 추정치입니다.
