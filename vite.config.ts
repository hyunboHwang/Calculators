import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import type { IncomingMessage, ServerResponse } from 'node:http'

const UPSTREAM = 'https://openapi.tossinvest.com'

const ALLOWED_PATHS = [
  '/oauth2/token',
  '/api/v1/accounts',
  '/api/v1/holdings',
  '/api/v1/buying-power',
  '/api/v1/orders',
  '/api/v1/prices',
  '/api/v1/stocks',
  '/api/v1/exchange-rate',
  '/api/v1/commissions',
  '/api/v1/sellable-quantity',
]

/**
 * 개발 서버용 토스증권 프록시 미들웨어
 * loadEnv(mode, cwd, '') 로 .env.local 의 모든 변수를 읽습니다.
 * (VITE_ 접두사 없는 변수도 포함)
 */
function tossinvestDevProxy(): Plugin {
  // config 훅에서 채워질 환경변수
  let clientId     = ''
  let clientSecret = ''
  let stockPassword = ''

  return {
    name: 'tossinvest-dev-proxy',

    // Vite가 .env.local 을 로드한 뒤 이 훅이 호출됩니다.
    config(_cfg, { mode }) {
      // 빈 접두사('')로 모든 env 변수 로드 (TOSS_CLIENT_ID 등 포함)
      const env = loadEnv(mode, process.cwd(), '')
      clientId     = env.TOSS_CLIENT_ID     || ''
      clientSecret = env.TOSS_CLIENT_SECRET || ''
      stockPassword = env.STOCK_PASSWORD    || ''
    },

    configureServer(server) {
      server.middlewares.use('/api/toss', async (
        req: IncomingMessage,
        res: ServerResponse,
        _next: () => void,
      ) => {
        const deny = (message: string, status = 401) => {
          res.statusCode = status
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: { code: 'unauthorized', message } }))
        }

        // ── 1. 대시보드 비밀번호 검증 ──────────────────────────────
        if (stockPassword) {
          const token = req.headers['x-dashboard-token']
          if (!token || token !== stockPassword) return deny('인증이 필요합니다.')
        }

        // ── 2. 경로 계산 + 화이트리스트 검증 ─────────────────────
        const upstreamPath = req.url ?? '/'
        const basePath = upstreamPath.split('?')[0]

        if (!ALLOWED_PATHS.some(p => basePath.startsWith(p))) {
          return deny('허용되지 않는 경로입니다.', 403)
        }

        // ── 3. 헤더 복사 ──────────────────────────────────────────
        const forwardHeaders: Record<string, string> = {}
        const SKIP = new Set(['host', 'x-dashboard-token', 'x-forwarded-for', 'x-real-ip'])
        for (const [key, value] of Object.entries(req.headers)) {
          if (SKIP.has(key)) continue
          if (typeof value === 'string') forwardHeaders[key] = value
          else if (Array.isArray(value)) forwardHeaders[key] = value.join(', ')
        }

        // ── 4. 바디 읽기 ──────────────────────────────────────────
        let body: Buffer | undefined
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          body = await new Promise<Buffer>((resolve, reject) => {
            const chunks: Buffer[] = []
            req.on('data', (c: Buffer) => chunks.push(c))
            req.on('end', () => resolve(Buffer.concat(chunks)))
            req.on('error', reject)
          })
        }

        // ── 5. 주문 검증 ──────────────────────────────────────────
        if (basePath === '/api/v1/orders' && req.method === 'POST' && body) {
          try {
            const orderBody = JSON.parse(body.toString())
            const qty = Number(orderBody.quantity ?? 0)
            const price = Number(orderBody.price ?? 0)
            if (qty <= 0) return deny('주문 수량은 0보다 커야 합니다.', 400)
            const amount = price > 0 ? qty * price : 0
            if (amount >= 100_000_000 && orderBody.confirmHighValueOrder !== true) {
              return deny('1억원 이상 주문은 confirmHighValueOrder: true 가 필요합니다.', 400)
            }
          } catch {
            return deny('잘못된 주문 요청 형식입니다.', 400)
          }
        }

        // ── 6. 토큰 요청 — 서버 키 주입 ──────────────────────────
        if (basePath === '/oauth2/token' && req.method === 'POST') {
          if (!clientId || !clientSecret) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({
              error: {
                code: 'config-error',
                message: '.env.local에 TOSS_CLIENT_ID와 TOSS_CLIENT_SECRET을 설정하세요.',
              },
            }))
            return
          }

          body = Buffer.from(
            new URLSearchParams({
              grant_type:    'client_credentials',
              client_id:     clientId,
              client_secret: clientSecret,
            }).toString(),
          )
          forwardHeaders['content-type']   = 'application/x-www-form-urlencoded'
          forwardHeaders['content-length'] = String(body.length)
        }

        // ── 7. 업스트림 요청 ──────────────────────────────────────
        // accept-encoding: identity → 압축 없이 받아서 JSON 잘림 방지
        forwardHeaders['accept-encoding'] = 'identity'

        try {
          const upstream = await fetch(`${UPSTREAM}${upstreamPath}`, {
            method:  req.method ?? 'GET',
            headers: forwardHeaders,
            body:    body && body.length > 0 ? body : undefined,
          })

          res.statusCode = upstream.status
          upstream.headers.forEach((value, key) => {
            // 압축/청크 관련 헤더는 제거 (body는 이미 버퍼로 완성)
            if (key === 'content-encoding' || key === 'transfer-encoding') return
            res.setHeader(key, value)
          })

          res.end(Buffer.from(await upstream.arrayBuffer()))
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err)
          res.statusCode = 502
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: { code: 'proxy-error', message } }))
        }
      })
    },
  }
}

function exchangeRateDevProxy(): Plugin {
  let stockPassword = ''
  return {
    name: 'exchange-rate-dev-proxy',
    config(_cfg, { mode }) {
      const env = loadEnv(mode, process.cwd(), '')
      stockPassword = env.STOCK_PASSWORD || ''
    },
    configureServer(server) {
      server.middlewares.use('/api/exchange-rate', async (
        req: IncomingMessage,
        res: ServerResponse,
        _next: () => void,
      ) => {
        if (stockPassword) {
          const token = req.headers['x-dashboard-token']
          if (!token || token !== stockPassword) {
            res.statusCode = 401
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: '인증이 필요합니다.' }))
            return
          }
        }

        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Cache-Control', 'public, max-age=300')

        // 1차: frankfurter.app
        try {
          const r = await fetch('https://api.frankfurter.app/latest?from=USD&to=KRW')
          if (r.ok) {
            const data = await r.json() as { rates?: { KRW?: number }; date?: string }
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
            const data = await r.json() as { rates?: { KRW?: number }; time_last_update_utc?: string }
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
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), tossinvestDevProxy(), exchangeRateDevProxy()],
})
