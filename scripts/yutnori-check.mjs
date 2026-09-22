import assert from 'node:assert/strict'
import { movePiece, canMove, grantsExtraTurn } from '../src/lib/yutnori.ts'

function piece(teamId, id, position) {
  return { id, teamId, position }
}

// 입장: 도(1)~모(5)는 정확히 1~5번 칸에 입장한다
for (const [result, expected] of [
  ['do', 1],
  ['gae', 2],
  ['geol', 3],
  ['yut', 4],
  ['mo', 5],
]) {
  const moved = movePiece(piece(1, 't', { status: 'home' }), result, false)
  assert.equal(moved.position.status, 'onBoard')
  assert.equal(moved.position.at, expected)
}

// 5번 칸에서 지름길을 타면 대각선을 거쳐 4칸 만에 15번 칸에 도착한다
{
  let p = piece(1, 't', { status: 'onBoard', at: 5 })
  p = movePiece(p, 'yut', true) // 4칸: a1→a2→a3까지
  assert.equal(p.position.at, 'a3')
  p = movePiece(p, 'do', true) // 1칸 더: 15번 칸 합류 (takeShortcut은 이제 무의미)
  assert.equal(p.position.at, 15)
}

// 5번 칸에서 지름길을 타지 않으면 바깥 테두리를 그대로 돈다
{
  const p = movePiece(piece(1, 't', { status: 'onBoard', at: 5 }), 'do', false)
  assert.equal(p.position.at, 6)
}

// 10번 칸에서 지름길을 타면 3칸 만에 완주한다
{
  const p = movePiece(piece(1, 't', { status: 'onBoard', at: 10 }), 'geol', true)
  assert.equal(p.position.status, 'finished')
}

// 19번 칸에서 한 칸 더 가면 완주한다
{
  const p = movePiece(piece(1, 't', { status: 'onBoard', at: 19 }), 'do', false)
  assert.equal(p.position.status, 'finished')
}

// 백도: 보드 위 말은 한 칸 후진, 1번 칸보다 더 뒤로는 가지 않는다. 대기 중인 말은 못 움직인다.
{
  assert.equal(movePiece(piece(1, 't', { status: 'onBoard', at: 3 }), 'baekdo', false).position.at, 2)
  assert.equal(movePiece(piece(1, 't', { status: 'onBoard', at: 1 }), 'baekdo', false).position.at, 1)
  const home = piece(1, 't', { status: 'home' })
  assert.equal(movePiece(home, 'baekdo', false).position.status, 'home')
  assert.equal(canMove(home, 'baekdo'), false)
  assert.equal(canMove(piece(1, 't', { status: 'onBoard', at: 3 }), 'baekdo'), true)
}

// 윷/모만 추가 턴
assert.equal(grantsExtraTurn('yut'), true)
assert.equal(grantsExtraTurn('mo'), true)
assert.equal(grantsExtraTurn('do'), false)
assert.equal(grantsExtraTurn('baekdo'), false)

console.log('✓ Task 1 이동 로직 점검 통과')
