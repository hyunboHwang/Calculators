/**
 * Google AdSense 설정
 *
 * 사용 순서
 * 1. 사이트 배포 + 도메인 연결 후 https://adsense.google.com 에서 사이트 등록
 * 2. 승인되면 발급받은 게시자 ID를 아래에 입력 (예: 'ca-pub-1234567890123456')
 * 3. public/ads.txt 의 pub-0000000000000000 도 같은 ID로 교체
 * 4. (선택) 광고 단위를 만들었으면 슬롯 ID를 SLOTS에 입력
 *    — 비워두면 자동 광고(Auto ads)만 동작합니다.
 *
 * ID가 비어 있으면 광고 스크립트를 아예 로드하지 않으므로
 * 승인 전에 배포해도 안전합니다.
 */

export const ADSENSE_CLIENT = 'ca-pub-9428641211250390'

/**
 * 수동 광고 단위 슬롯 ID (선택)
 * 애드센스에서 "디스플레이 광고" 단위를 만들고 data-ad-slot 숫자를 붙여넣으세요.
 * 비워두면 해당 자리는 렌더링되지 않습니다.
 */
export const SLOTS = {
  belowResult: '7070646666', // 계산 결과 아래, 설명/FAQ 위
  inArticle: '5757564992', // 설명(인트로) 아래, FAQ 위 — 체류시간이 긴 본문 중간 자리
  bottomOfPage: '8650607631', // FAQ 아래 (페이지 최하단)
  sidebar: '7337525966', // 데스크톱 사이드바 하단
}

let loaded = false

/** AdSense 스크립트 1회 주입 */
export function loadAdsense() {
  if (loaded || !ADSENSE_CLIENT || typeof document === 'undefined') return
  loaded = true
  // index.html에 정적 스크립트가 이미 있으면 중복 로드하지 않음
  if (document.querySelector('script[src*="adsbygoogle.js"]')) return
  const s = document.createElement('script')
  s.async = true
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`
  s.crossOrigin = 'anonymous'
  document.head.appendChild(s)
}
