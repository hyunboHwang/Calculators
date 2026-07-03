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

export const ADSENSE_CLIENT = '' // TODO: 승인 후 'ca-pub-...' 입력

/** 수동 광고 단위 슬롯 ID (선택) */
export const SLOTS = {
  belowResult: '', // 계산 결과 아래
}

let loaded = false

/** AdSense 스크립트 1회 주입 */
export function loadAdsense() {
  if (loaded || !ADSENSE_CLIENT || typeof document === 'undefined') return
  loaded = true
  const s = document.createElement('script')
  s.async = true
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`
  s.crossOrigin = 'anonymous'
  document.head.appendChild(s)
}
