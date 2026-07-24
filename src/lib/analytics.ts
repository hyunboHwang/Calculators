/**
 * Google Analytics 4 (GA4) 설정
 *
 * 사용 순서
 * 1. https://analytics.google.com 에서 속성 생성 → 데이터 스트림(웹) 추가
 * 2. 스트림에서 발급되는 측정 ID(G-XXXXXXXXXX)를 아래 GA_MEASUREMENT_ID에 입력
 *
 * ID가 비어 있으면 스크립트를 아예 로드하지 않으므로 설정 전에 배포해도 안전합니다.
 * SPA라 스크립트의 자동 page_view는 끄고, 라우트 변경 시 trackPageView로 직접 전송합니다.
 */

export const GA_MEASUREMENT_ID = 'G-1H6ZV0487Y'

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

let loaded = false

/** GA4 스크립트 1회 주입 */
export function loadAnalytics() {
  if (loaded || !GA_MEASUREMENT_ID || typeof document === 'undefined') return
  loaded = true

  const s = document.createElement('script')
  s.async = true
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`
  document.head.appendChild(s)

  window.dataLayer = window.dataLayer || []
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer!.push(args)
  }
  window.gtag('js', new Date())
  window.gtag('config', GA_MEASUREMENT_ID, { send_page_view: false })
}

/** SPA 라우트 변경 시 페이지뷰 수동 전송 (히스토리 pushState는 자동 감지되지 않으므로 필요) */
export function trackPageView(path: string, title: string) {
  if (!GA_MEASUREMENT_ID || typeof window === 'undefined' || !window.gtag) return
  window.gtag('event', 'page_view', {
    page_path: path,
    page_title: title,
    page_location: window.location.href,
  })
}
