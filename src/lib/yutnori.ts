/**
 * 윷놀이 보드/이동 로직.
 * 좌표는 "출발점부터 이동한 상대 칸 수"로 표현한다 (팀마다 같은 시작 모서리를 공유하므로
 * 절대좌표 변환이 필요 없다). 바깥 테두리 19칸(1~19) + 지름길 A(모서리5→모서리15,
 * a1~a3 경유) + 지름길 B(모서리10→도착, b1~b2 경유)로 구성된 정통 윷놀이판이다.
 */

export type ThrowResult = 'do' | 'gae' | 'geol' | 'yut' | 'mo' | 'baekdo'

export const STEPS: Record<ThrowResult, number> = {
  do: 1,
  gae: 2,
  geol: 3,
  yut: 4,
  mo: 5,
  baekdo: -1,
}

export const THROW_LABELS: Record<ThrowResult, string> = {
  do: '도',
  gae: '개',
  geol: '걸',
  yut: '윷',
  mo: '모',
  baekdo: '백도',
}

export function grantsExtraTurn(result: ThrowResult): boolean {
  return result === 'yut' || result === 'mo'
}

export type OuterNode = number // 1~19
export type DiagNode = 'a1' | 'a2' | 'a3' | 'b1' | 'b2'
export type BoardNode = OuterNode | DiagNode

export type PiecePosition =
  | { status: 'home' }
  | { status: 'onBoard'; at: BoardNode }
  | { status: 'finished' }

export interface Piece {
  id: string // `${teamId}-${pieceIndex}`
  teamId: number
  position: PiecePosition
}

type WalkNode = BoardNode | 'start'

/** 한 칸 전진. takeShortcut은 지금 막 모서리5·10을 "출발하는" 그 한 걸음에만 의미가 있다. */
function stepOnce(node: WalkNode, takeShortcut: boolean): BoardNode | 'finished' {
  if (node === 'start') return 1
  if (typeof node === 'number') {
    if (node === 19) return 'finished'
    if (node === 5 && takeShortcut) return 'a1'
    if (node === 10 && takeShortcut) return 'b1'
    return node + 1
  }
  switch (node) {
    case 'a1':
      return 'a2'
    case 'a2':
      return 'a3'
    case 'a3':
      return 15
    case 'b1':
      return 'b2'
    case 'b2':
      return 'finished'
  }
}

/**
 * 백도(한 칸 후진)용. 지름길 위에 있던 말이 후진하면 그 지름길이 갈라진 모서리로 되돌아가고,
 * 지름길을 거쳐 15번 칸에 합류한 말은(도착 지점만 보면 바깥길로 온 말과 구별할 수 없으므로)
 * 바깥길 14번 칸으로 후진한다 — 아주 드문 경계 케이스라 이렇게 단순화했다.
 * ponytail: 지름길 경유 여부를 기억해 15번 칸에서 후진 방향을 구분하려면 Piece에 path 이력을
 * 추가해야 함. 실제로 문제가 되면(플레이 중 부자연스럽다는 얘기가 나오면) 그때 추가.
 */
function prevNode(node: BoardNode): BoardNode {
  if (typeof node === 'number') return node === 1 ? 1 : node - 1
  switch (node) {
    case 'a1':
      return 5
    case 'a2':
      return 'a1'
    case 'a3':
      return 'a2'
    case 'b1':
      return 10
    case 'b2':
      return 'b1'
  }
}

/** 이 말이 이 던지기 결과로 움직일 수 있는지. 백도는 보드 위(onBoard) 말만 가능하다. */
export function canMove(piece: Piece, result: ThrowResult): boolean {
  if (piece.position.status === 'finished') return false
  if (result === 'baekdo') return piece.position.status === 'onBoard'
  return true
}

/**
 * 말 하나를 이동시킨다. takeShortcut은 piece가 지금 모서리5·10에 멈춰 있을 때만 적용되고,
 * 그 외에는 무시된다(여러 칸을 가는 도중에 모서리를 "지나치는" 것만으로는 지름길이 열리지 않음
 * — 정확히 그 칸에서 멈췄다가 다음 턴을 시작할 때만 선택 가능한 전통 규칙).
 */
export function movePiece(piece: Piece, result: ThrowResult, takeShortcut: boolean): Piece {
  if (piece.position.status === 'finished') {
    throw new Error('완주한 말은 움직일 수 없습니다')
  }
  const steps = STEPS[result]

  if (steps < 0) {
    if (piece.position.status === 'home') return piece
    return { ...piece, position: { status: 'onBoard', at: prevNode(piece.position.at) } }
  }

  let cur: WalkNode = piece.position.status === 'home' ? 'start' : piece.position.at
  const shortcutAtStart =
    piece.position.status === 'onBoard' &&
    (piece.position.at === 5 || piece.position.at === 10)

  for (let i = 0; i < steps; i++) {
    const useShortcut = i === 0 && shortcutAtStart && takeShortcut
    const next = stepOnce(cur, useShortcut)
    if (next === 'finished') return { ...piece, position: { status: 'finished' } }
    cur = next
  }
  return { ...piece, position: { status: 'onBoard', at: cur as BoardNode } }
}
