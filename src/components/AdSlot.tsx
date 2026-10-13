import { useEffect, useRef, useState } from 'react'
import { ADSENSE_CLIENT, loadAdsense } from '../lib/ads'

declare global {
  interface Window {
    adsbygoogle?: unknown[]
  }
}

/**
 * 수동 광고 단위. client/slot이 설정된 경우에만 렌더링됩니다.
 * 페이지(라우트)별로 key를 다르게 주면 이동 시 새 광고가 요청됩니다.
 * 광고가 늦게 채워질 때 본문이 밀리지 않도록 min-h로 공간을 예약하고(CLS 방지),
 * 광고가 채워지지 않으면(unfilled) 빈 공간을 접습니다.
 */
export default function AdSlot({
  slot,
  className = 'mt-8 min-h-[280px]',
}: {
  slot: string
  className?: string
}) {
  const enabled = Boolean(ADSENSE_CLIENT && slot)
  const pushed = useRef(false)
  const insRef = useRef<HTMLModElement>(null)
  const [unfilled, setUnfilled] = useState(false)

  useEffect(() => {
    // StrictMode(dev)의 effect 이중 실행 시 같은 ins에 두 번 push되는 것 방지
    if (!enabled || pushed.current) return
    pushed.current = true
    loadAdsense()
    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch {
      // 광고 차단기 등으로 실패해도 무시
    }
  }, [enabled])

  useEffect(() => {
    const ins = insRef.current
    if (!ins) return
    const check = () => setUnfilled(ins.getAttribute('data-ad-status') === 'unfilled')
    const mo = new MutationObserver(check)
    mo.observe(ins, { attributes: true, attributeFilter: ['data-ad-status'] })
    return () => mo.disconnect()
  }, [enabled])

  if (!enabled || unfilled) return null

  return (
    <div className={className}>
      <ins
        ref={insRef}
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
