/**
 * 환율 프록시 — USD/KRW
 * 1차: frankfurter.app, 2차: open.er-api.com (API 키 불필요)
 */
import type { IncomingMessage, ServerResponse } from 'node:http'

function deny(res: ServerResponse, msg = '인증이 필요합니다.', status = 401) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify({ error: msg }))
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  // 대시보드 비밀번호 검증
  const requiredPassword = process.env.STOCK_PASSWORD
  if (requiredPassword) {
    const token = req.headers['x-dashboard-token']
    if (!token || token !== requiredPassword) return deny(res)
  }

  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'public, max-age=300') // 5분 캐시

  // 1차: frankfurter.app
  try {
    const r = await fetch('https://api.frankfurter.app/latest?from=USD&to=KRW')
    if (r.ok) {
      const data = await r.json()
      const rate = Number(data.rates?.KRW)
      if (rate) {
        res.statusCode = 200
        res.end(JSON.stringify({ rate, date: data.date, source: 'frankfurter' }))
        return
      }
    }
  } catch { /* 다음 소스 시도 */ }

  // 2차: open.er-api.com
  try {
    const r = await fetch('https://open.er-api.com/v6/latest/USD')
    if (r.ok) {
      const data = await r.json()
      const rate = Number(data.rates?.KRW)
      if (rate) {
        res.statusCode = 200
        res.end(JSON.stringify({ rate, date: data.time_last_update_utc, source: 'er-api' }))
        return
      }
    }
  } catch { /* 모두 실패 */ }

  res.statusCode = 503
  res.end(JSON.stringify({ error: '환율 정보를 가져올 수 없습니다.' }))
}
