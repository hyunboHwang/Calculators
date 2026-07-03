import { useEffect } from 'react'
import { ADSENSE_CLIENT, loadAdsense } from '../lib/ads'

declare global {
  interface Window {
    adsbygoogle?: unknown[]
  }
}

/**
 * 수동 광고 단위. client/slot이 설정된 경우에만 렌더링됩니다.
 * 페이지(라우트)별로 key를 다르게 주면 이동 시 새 광고가 요청됩니다.
 */
export default function AdSlot({ slot }: { slot: string }) {
  const enabled = Boolean(ADSENSE_CLIENT && slot)

  useEffect(() => {
    if (!enabled) return
    loadAdsense()
    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch {
      // 광고 차단기 등으로 실패해도 무시
    }
  }, [enabled])

  if (!enabled) return null

  return (
    <div className="mt-8 min-h-[100px]">
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  )
}
