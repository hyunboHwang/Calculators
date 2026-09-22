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

export type TeamColor = 'red' | 'blue' | 'yellow' | 'green'
export const TEAM_COLORS: TeamColor[] = ['red', 'blue', 'yellow', 'green']

export interface Team {
  id: number
  name: string
  color: TeamColor
  playerNames: string[] // 인원 수 = 이 팀의 말 개수
}

/** 팀 구성으로 초기 말 목록을 만든다. 모든 말은 대기(home) 상태로 시작한다. */
export function createPieces(teams: Team[]): Piece[] {
  return teams.flatMap((t) =>
    t.playerNames.map((_, i) => ({
      id: `${t.id}-${i}`,
      teamId: t.id,
      position: { status: 'home' } as PiecePosition,
    })),
  )
}

export interface MoveOption {
  pieceIds: string[] // 이동할 말들 (업힌 그룹이면 2개 이상, 보통은 1개)
  at: 'home' | BoardNode
}

/**
 * 이번 던지기 결과로 이 팀이 고를 수 있는 이동 옵션 목록.
 * 보드 위의 같은 칸에 모인 같은 팀 말은 하나의 그룹(업힘)으로 묶여 한 옵션이 된다.
 */
export function moveOptions(pieces: Piece[], teamId: number, result: ThrowResult): MoveOption[] {
  const movable = pieces.filter((p) => p.teamId === teamId && canMove(p, result))

  const grouped = new Map<BoardNode, string[]>()
  for (const p of movable) {
    if (p.position.status !== 'onBoard') continue
    const key = p.position.at
    const list = grouped.get(key) ?? []
    list.push(p.id)
    grouped.set(key, list)
  }
  const onBoardOptions: MoveOption[] = [...grouped.entries()].map(([at, pieceIds]) => ({
    pieceIds,
    at,
  }))

  const homeOptions: MoveOption[] =
    result === 'baekdo'
      ? []
      : movable
          .filter((p) => p.position.status === 'home')
          .map((p) => ({ pieceIds: [p.id], at: 'home' as const }))

  return [...onBoardOptions, ...homeOptions]
}

export interface ApplyMoveResult {
  pieces: Piece[]
  capturedTeamIds: number[]
  extraTurn: boolean
}

/**
 * 선택한 말(들)을 이동시키고 업힘/잡기를 반영한다.
 * 업힘은 별도 자료구조 없이 "같은 칸에 있으면 그룹"으로 취급하므로, 이동 후 그 칸에
 * 이미 있던 같은 팀 말은 자동으로 다음 선택에서 같은 그룹으로 묶인다(moveOptions 참고).
 */
export function applyMove(
  pieces: Piece[],
  pieceIds: string[],
  result: ThrowResult,
  takeShortcut: boolean,
): ApplyMoveResult {
  const moved = pieces.map((p) => (pieceIds.includes(p.id) ? movePiece(p, result, takeShortcut) : p))

  const landed = moved.find((p) => p.id === pieceIds[0])!
  if (landed.position.status !== 'onBoard') {
    return { pieces: moved, capturedTeamIds: [], extraTurn: grantsExtraTurn(result) }
  }
  const at = landed.position.at
  const opponents = moved.filter(
    (p) => !pieceIds.includes(p.id) && p.position.status === 'onBoard' && p.position.at === at && p.teamId !== landed.teamId,
  )
  if (opponents.length === 0) {
    return { pieces: moved, capturedTeamIds: [], extraTurn: grantsExtraTurn(result) }
  }

  const capturedIds = new Set(opponents.map((p) => p.id))
  const pieces2 = moved.map((p) =>
    capturedIds.has(p.id) ? { ...p, position: { status: 'home' } as PiecePosition } : p,
  )
  return {
    pieces: pieces2,
    capturedTeamIds: [...new Set(opponents.map((o) => o.teamId))],
    extraTurn: true, // 윷/모가 아니어도 잡으면 추가 턴
  }
}

export function teamFinished(pieces: Piece[], teamId: number): boolean {
  const teamPieces = pieces.filter((p) => p.teamId === teamId)
  return teamPieces.length > 0 && teamPieces.every((p) => p.position.status === 'finished')
}

/** 시간제한 모드 순위용 대략적인 진행도(0~20). 완주=20, 대기=0. */
export function pieceProgress(position: PiecePosition): number {
  if (position.status === 'home') return 0
  if (position.status === 'finished') return 20
  const at = position.at
  if (typeof at === 'number') return at
  const diagProgress: Record<DiagNode, number> = { a1: 6, a2: 7, a3: 8, b1: 11, b2: 12 }
  return diagProgress[at]
}

/**
 * teamIds를 순위(1등부터) 순서로 정렬해 반환한다.
 * 완주 말 수 내림차순 → 동률이면 팀 전체 진행도 합산 내림차순.
 */
export function teamRank(pieces: Piece[], teamIds: number[]): number[] {
  const score = (teamId: number) => {
    const teamPieces = pieces.filter((p) => p.teamId === teamId)
    const finished = teamPieces.filter((p) => p.position.status === 'finished').length
    const progress = teamPieces.reduce((sum, p) => sum + pieceProgress(p.position), 0)
    return { finished, progress }
  }
  return [...teamIds].sort((a, b) => {
    const sa = score(a)
    const sb = score(b)
    if (sa.finished !== sb.finished) return sb.finished - sa.finished
    return sb.progress - sa.progress
  })
}
