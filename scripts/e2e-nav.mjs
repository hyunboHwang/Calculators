// 내비·도구 패널 상호작용 점검. 사용: node scripts/e2e-nav.mjs [baseUrl] (먼저 npm run build && npm run preview)
// 환경변수: PLAYWRIGHT_MODULE=playwright가 설치된 node_modules 경로(끝 슬래시 포함), CHROMIUM_PATH=chromium 실행 파일, SHOTS_DIR=스크린샷 폴더
import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { homedir } from 'node:os'
import { join } from 'node:path'

const require = createRequire(process.env.PLAYWRIGHT_MODULE ?? join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/'))
const { chromium } = require('playwright')
const base = (process.argv[2] ?? 'http://localhost:4173').replace(/\/$/, '')
const shots = process.env.SHOTS_DIR
if (shots) mkdirSync(shots, { recursive: true })

// 번들 브라우저 리비전이 설치본과 다를 수 있어 CHROMIUM_PATH로 지정 가능
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH })
try {
  // 데스크톱
  let page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  await page.goto(base + '/')
  const tools = page.getByRole('button', { name: /도구/ })
  await tools.click()
  const salaryLink = page.locator('#tools-panel-desktop').getByRole('link', { name: '연봉 실수령액', exact: true })
  await salaryLink.waitFor({ state: 'visible' })
  if (shots) await page.screenshot({ path: `${shots}/home-1280-panel.png` })
  await page.keyboard.press('Escape')
  await salaryLink.waitFor({ state: 'hidden' })
  assert.equal(await tools.getAttribute('aria-expanded'), 'false')
  assert.ok(await tools.evaluate((el) => el === document.activeElement), 'Esc 후 트리거로 포커스 복귀')
  await tools.click()
  await page.getByPlaceholder('계산기 검색').fill('퇴직')
  await page.locator('#tools-panel-desktop').getByRole('link', { name: '퇴직금', exact: true }).first().waitFor({ state: 'visible' })
  await page.mouse.click(10, 700) // 바깥 클릭
  await page.getByPlaceholder('계산기 검색').waitFor({ state: 'hidden' })
  await page.getByRole('navigation', { name: '주 메뉴' }).getByRole('link', { name: '세금' }).click()
  await page.waitForURL(/\/topics\/tax\/?$/, { waitUntil: 'commit' })
  const active = page.getByRole('navigation', { name: '주 메뉴' }).getByRole('link', { name: '세금' })
  assert.equal(await active.getAttribute('aria-current'), 'page')
  assert.match(await active.getAttribute('class'), /border-accent/)
  await page.waitForTimeout(800)
  if (shots) await page.screenshot({ path: `${shots}/tax-1280.png` })
  await page.goto(base + '/salary/')
  await page.waitForTimeout(800)
  if (shots) await page.screenshot({ path: `${shots}/salary-1280.png` })
  await page.close()

  // 모바일 360
  page = await browser.newPage({ viewport: { width: 360, height: 740 } })
  for (const p of ['/', '/topics/tax/', '/salary/']) {
    await page.goto(base + p)
    const w = await page.evaluate(() => document.documentElement.scrollWidth)
    assert.ok(w <= 360, `${p} scrollWidth ${w} > 360`)
    await page.waitForTimeout(800)
    if (shots) await page.screenshot({ path: `${shots}/${p.replace(/\//g, '_')}360.png` })
  }
  await page.goto(base + '/')
  await page.getByRole('button', { name: '메뉴' }).click()
  const menu = page.getByRole('navigation', { name: '모바일 메뉴' })
  await menu.getByRole('link', { name: '홈', exact: true }).waitFor({ state: 'visible' })
  for (const t of ['월급·직장', '세금', '부동산', '정부지원·청년', '대출·금융'])
    await menu.getByRole('link', { name: t }).waitFor({ state: 'visible' })
  await menu.getByRole('button', { name: /도구/ }).click()
  await menu.getByRole('link', { name: '연봉 실수령액', exact: true }).waitFor({ state: 'visible' })
  assert.ok((await page.evaluate(() => document.documentElement.scrollWidth)) <= 360, '메뉴 열림 상태 가로 스크롤')
  if (shots) await page.screenshot({ path: `${shots}/menu-360.png` })
  console.log('OK — e2e-nav 통과')
} finally {
  await browser.close()
}
