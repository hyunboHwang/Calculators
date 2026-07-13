/**
 * Vercel Serverless Proxy — 토스증권 Open API
 *
 * 브라우저는 API 키를 전혀 모릅니다.
 * - /oauth2/token 요청: 브라우저 body를 무시하고 서버 환경변수 키로 교체
 * - 그 외 요청: Bearer 토큰을 그대로 업스트림으로 전달
 * - 모든 요청: X-Dashboard-Token 헤더로 접근 제한
 *
 * 필요한 환경변수 (Vercel 대시보드 → Settings → Environment Variables):
 *   STOCK_PASSWORD    — 대시보드 접근 비밀번호
 *   TOSS_CLIENT_ID    — 토스증권 API Key (tsck_live_...)
 *   TOSS_CLIENT_SECRET — 토스증권 Secret Key (tssk_live_...)
 */

import type { IncomingMessage, ServerResponse } from 'node:http';

const UPSTREAM = 'https://openapi.tossinvest.com';

// 허용된 토스증권 API 경로 화이트리스트
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
];

function deny(res: ServerResponse, message: string, status = 401) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ error: { code: 'unauthorized', message } }));
}

export default async function handler(
  req: IncomingMessage & { url?: string },
  res: ServerResponse,
) {
  // ── 1. 대시보드 비밀번호 검증 ────────────────────────────────
  const requiredPassword = process.env.STOCK_PASSWORD;
  if (requiredPassword) {
    const token = req.headers['x-dashboard-token'];
    if (!token || token !== requiredPassword) {
      return deny(res, '인증이 필요합니다.');
    }
  }

  // ── 2. 업스트림 경로 계산 + 화이트리스트 검증 ───────────────
  const upstreamPath = (req.url ?? '/').replace(/^\/api\/toss/, '') || '/';
  const basePath = upstreamPath.split('?')[0]; // 쿼리스트링 제거 후 경로만 비교

  if (!ALLOWED_PATHS.some(p => basePath.startsWith(p))) {
    return deny(res, '허용되지 않는 경로입니다.', 403);
  }

  const targetUrl = `${UPSTREAM}${upstreamPath}`;

  // ── 3. 헤더 복사 (보안상 제거할 헤더 제외) ───────────────────
  const forwardHeaders: Record<string, string> = {};
  const SKIP_HEADERS = new Set(['host', 'x-dashboard-token', 'x-forwarded-for', 'x-real-ip']);
  for (const [key, value] of Object.entries(req.headers)) {
    if (SKIP_HEADERS.has(key)) continue;
    if (typeof value === 'string') forwardHeaders[key] = value;
    else if (Array.isArray(value)) forwardHeaders[key] = value.join(', ');
  }

  // ── 4. 바디 읽기 ─────────────────────────────────────────────
  let body: Buffer | undefined;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    body = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', () => resolve(Buffer.concat(chunks)));
      req.on('error', reject);
    });
  }

  // ── 5a. 주문 요청 — 서버 측 기본 검증 ──────────────────────
  if (basePath === '/api/v1/orders' && req.method === 'POST' && body) {
    try {
      const orderBody = JSON.parse(body.toString());
      const qty = Number(orderBody.quantity ?? 0);
      const price = Number(orderBody.price ?? 0);

      // 수량 검증: 0 이하 거부
      if (qty <= 0) {
        return deny(res, '주문 수량은 0보다 커야 합니다.', 400);
      }
      // 고액 주문: 1억원 이상이면 confirmHighValueOrder 필수
      const estimatedAmount = price > 0 ? qty * price : 0;
      if (estimatedAmount >= 100_000_000 && orderBody.confirmHighValueOrder !== true) {
        return deny(res, '1억원 이상 주문은 confirmHighValueOrder: true 가 필요합니다.', 400);
      }
    } catch {
      return deny(res, '잘못된 주문 요청 형식입니다.', 400);
    }
  }

  // ── 5. 토큰 발급 요청 — 서버 키로 교체 ──────────────────────
  // 브라우저가 보낸 body(client_id, client_secret)를 완전히 무시하고
  // 서버 환경변수의 키로 교체합니다.
  if (upstreamPath === '/oauth2/token' && req.method === 'POST') {
    const clientId     = process.env.TOSS_CLIENT_ID;
    const clientSecret = process.env.TOSS_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return deny(res, 'API 키가 서버에 설정되지 않았습니다. Vercel 환경변수를 확인하세요.', 500);
    }

    body = Buffer.from(
      new URLSearchParams({
        grant_type:    'client_credentials',
        client_id:     clientId,
        client_secret: clientSecret,
      }).toString(),
    );
    forwardHeaders['content-type']   = 'application/x-www-form-urlencoded';
    forwardHeaders['content-length'] = String(body.length);
  }

  // ── 6. 업스트림 요청 ─────────────────────────────────────────
  // accept-encoding: identity → 압축 없이 받아서 JSON 잘림 방지
  forwardHeaders['accept-encoding'] = 'identity';

  try {
    const upstream = await fetch(targetUrl, {
      method: req.method ?? 'GET',
      headers: forwardHeaders,
      body: body && body.length > 0 ? body : undefined,
    });

    res.statusCode = upstream.status;
    upstream.headers.forEach((value, key) => {
      if (key === 'content-encoding' || key === 'transfer-encoding') return;
      res.setHeader(key, value);
    });

    const responseBody = await upstream.arrayBuffer();
    res.end(Buffer.from(responseBody));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: { code: 'proxy-error', message } }));
  }
}
