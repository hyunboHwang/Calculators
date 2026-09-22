import assert from 'node:assert/strict'
import {
  movePiece,
  canMove,
  grantsExtraTurn,
  createPieces,
  moveOptions,
  applyMove,
  teamFinished,
  pieceProgress,
  teamRank,
  TEAM_COLORS,
} from '../src/lib/yutnori.ts'

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
  const p = movePiece(piece(1, 't', { status: 'onBoard', at: 5 }), 'yut', true) // 4칸: a1→a2→a3→15
  assert.equal(p.position.at, 15)
}

// 대각선 위 칸(a3)에 멈춘 말도 남은 걸음 수만큼 정확히 더 나아간다 (지름길 합류 이후 걸음이 사라지지 않는지 확인)
{
  assert.equal(movePiece(piece(1, 't', { status: 'onBoard', at: 'a3' }), 'do', false).position.at, 15)
  assert.equal(movePiece(piece(1, 't', { status: 'onBoard', at: 'a3' }), 'gae', false).position.at, 16)
  assert.equal(movePiece(piece(1, 't', { status: 'onBoard', at: 'a3' }), 'mo', false).position.at, 19)
}

// 5번 칸 지름길에서 모(5칸)를 던지면 15번 칸을 지나 16번 칸까지 간다 (윷과 결과가 달라야 함)
{
  const viaYut = movePiece(piece(1, 't', { status: 'onBoard', at: 5 }), 'yut', true)
  const viaMo = movePiece(piece(1, 't', { status: 'onBoard', at: 5 }), 'mo', true)
  assert.equal(viaYut.position.at, 15)
  assert.equal(viaMo.position.at, 16)
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

// 업힘: 같은 칸에 있는 같은 팀 말은 하나의 이동 옵션으로 묶인다
{
  const pieces = [
    piece(1, '1-0', { status: 'onBoard', at: 3 }),
    piece(1, '1-1', { status: 'onBoard', at: 3 }),
  ]
  const options = moveOptions(pieces, 1, 'do')
  assert.equal(options.length, 1)
  assert.deepEqual(options[0].pieceIds.sort(), ['1-0', '1-1'])
}

// 잡기: 상대 팀 말이 있는 칸에 도착하면 그 말은 집으로 돌아가고 추가 턴을 받는다
{
  const pieces = [
    piece(1, '1-0', { status: 'onBoard', at: 2 }),
    piece(2, '2-0', { status: 'onBoard', at: 3 }),
  ]
  const result = applyMove(pieces, ['1-0'], 'do', false)
  const mine = result.pieces.find((p) => p.id === '1-0')
  const theirs = result.pieces.find((p) => p.id === '2-0')
  assert.equal(mine.position.at, 3)
  assert.equal(theirs.position.status, 'home')
  assert.equal(result.extraTurn, true)
  assert.deepEqual(result.capturedTeamIds, [2])
}

// 잡지 않고 도/개/걸만 던졌으면 추가 턴이 없다
{
  const pieces = [piece(1, '1-0', { status: 'onBoard', at: 2 })]
  const result = applyMove(pieces, ['1-0'], 'do', false)
  assert.equal(result.extraTurn, false)
}

// 완주 판정과 순위
{
  const teams = [
    { id: 1, name: 'A', color: TEAM_COLORS[0], playerNames: ['철수'] },
    { id: 2, name: 'B', color: TEAM_COLORS[1], playerNames: ['영희'] },
  ]
  let pieces = createPieces(teams)
  assert.equal(pieces.length, 2)
  assert.equal(teamFinished(pieces, 1), false)
  pieces = pieces.map((p) => (p.teamId === 1 ? { ...p, position: { status: 'finished' } } : p))
  assert.equal(teamFinished(pieces, 1), true)
  assert.equal(pieceProgress({ status: 'onBoard', at: 10 }), 10)
  assert.equal(pieceProgress({ status: 'finished' }), 20)
  const ranked = teamRank(pieces, [2, 1])
  assert.deepEqual(ranked, [1, 2]) // 완주한 팀(1)이 먼저
}

console.log('✓ Task 2 팀/업힘/잡기/순위 로직 점검 통과')
