import { useEffect, useState } from 'react'
import { todayStr } from '../lib/age'

/** 오늘 날짜(YYYY-MM-DD). 자정이 지나거나 탭이 다시 활성화되면 갱신 */
export function useToday(): string {
  const [t, setT] = useState(todayStr)
  useEffect(() => {
    const tick = () => setT(todayStr())
    const id = setInterval(tick, 60_000)
    document.addEventListener('visibilitychange', tick)
    window.addEventListener('focus', tick)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
      window.removeEventListener('focus', tick)
    }
  }, [])
  return t
}
