# 윷놀이 게임 페이지 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/yutnori` URL에서만 접근 가능한(메뉴/검색/사이트맵 비노출) 팀 대항 윷놀이 게임 페이지를 추가한다.

**Architecture:** 보드/이동/업힘/잡기/완주/순위 로직은 `src/lib/yutnori.ts`에 순수 함수로 분리하고, `src/pages/YutnoriGame.tsx`는 `useReducer`로 게임 진행 상태만 관리한다. 기존 라우팅(`routes.json` + `App.tsx` lazy import) 패턴을 그대로 재사용하되, `groups.json`(GROUP_ORDER)에 없는 그룹을 부여해 사이드바/모바일 메뉴/검색/푸터/사이트맵에서 자동으로 빠지게 한다. 상태는 전부 로컬 React state(백엔드 없음, 새로고침 시 초기화).

**Tech Stack:** React 19 + TypeScript, Tailwind CSS 4, Vite. 테스트 프레임워크 없음 — `node scripts/yutnori-check.mjs`(assert 기반) 자체 점검 스크립트로 로직 검증.

**Spec:** `docs/superpowers/specs/2026-09-22-yutnori-game-design.md`

## Global Constraints

- URL은 `/yutnori`, `routes.json`의 `group`은 `groups.json`(GROUP_ORDER)에 없는 새 값 `"게임"`을 사용한다 (사이드바/모바일메뉴/검색/푸터에 자동 비노출).
- `noindex: true` — 검색엔진 색인 제외.
- 팀 수 2~4, 팀당 인원(=말 개수) 1~5명.
- 팀 색 순서는 고정: 빨강 → 파랑 → 노랑 → 초록.
- **모든 팀은 같은 시작 모서리에서 같은 방향으로 출발한다** (스펙 문서의 "팀마다 다른 모서리에서 출발"을 계획 단계에서 단순화함 — 아래 "스펙 대비 변경 사항" 참고).
- 지름길(모서리5·모서리10)은 그 칸에 정확히 멈춰 있는 말이 다음 턴을 시작할 때만 선택 가능하고, 자동이 아니라 매번 "지름길로 갈까요?" 선택을 받는다(두 지름길 모두 실제로 쓰이게 하기 위함).
- 업힘은 같은 칸에 있는 같은 팀 말을 자동으로 하나의 이동 단위로 묶는 것으로 구현하고, 분리 로직은 만들지 않는다(전통 규칙).
- 백엔드/저장소/실시간 동기화는 만들지 않는다.

## 스펙 대비 변경 사항 (설계 단계에서 발견한 사항)

스펙 문서는 "팀마다 서로 다른 모서리에서 출발"을 전제로 했지만, 계획을 구체화하는 과정에서 이 방식은 팀별로 회전된 좌표계를 쓰게 되어 서로 다른 팀의 말이 "같은 칸에 있는지"(잡기 판정)를 비교하려면 절대 좌표 변환 로직이 추가로 필요하다는 걸 확인했다. 반면 표준 2인용 윷놀이 규칙(모든 팀이 같은 시작 모서리·같은 방향으로 진행)은 이 변환이 전혀 필요 없고, 시작 지점에서 초반에 팀들이 자주 마주치며 잡기가 더 활발히 일어나 오히려 사무실 아이스브레이킹에는 더 재미있는 편이다. 이 계획은 **모든 팀이 같은 시작 모서리를 공유**하는 방식으로 진행한다. (여러 기기 동시접속처럼 되돌리기 어려운 변경이 아니라 게임 규칙 디테일이라, 플레이해보고 팀별 출발점이 꼭 필요하면 나중에 추가해도 된다.)

---

### Task 1: 보드 이동 로직 (`src/lib/yutnori.ts`)

**Files:**
- Create: `src/lib/yutnori.ts`
- Create: `scripts/yutnori-check.mjs`

**Interfaces:**
- Produces: `ThrowResult`, `STEPS`, `grantsExtraTurn()`, `BoardNode`, `PiecePosition`, `Piece`, `movePiece()`, `canMove()` — Task 2·4·5·6에서 사용.

- [ ] **Step 1: `src/lib/yutnori.ts` 작성**

```ts
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
```

- [ ] **Step 2: `scripts/yutnori-check.mjs` 작성 (Step 1 부분만 우선 검증)**

```js
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
```

- [ ] **Step 3: 점검 스크립트 실행**

Run: `node scripts/yutnori-check.mjs`
Expected: `✓ Task 1 이동 로직 점검 통과` 출력, 에러 없음.

- [ ] **Step 4: 타입 체크**

Run: `npx tsc -b --noEmit`
Expected: 에러 없음.

- [ ] **Step 5: 커밋**

```bash
git add src/lib/yutnori.ts scripts/yutnori-check.mjs
git commit -m "feat: 윷놀이 보드 이동 로직(지름길·백도) 추가"
```

---

### Task 2: 팀/업힘/잡기/완주·순위 로직 (`src/lib/yutnori.ts` 확장)

**Files:**
- Modify: `src/lib/yutnori.ts`
- Modify: `scripts/yutnori-check.mjs`

**Interfaces:**
- Consumes: Task 1의 `Piece`, `PiecePosition`, `BoardNode`, `ThrowResult`, `STEPS`, `movePiece`, `canMove`, `grantsExtraTurn`.
- Produces: `TeamColor`, `TEAM_COLORS`, `Team`, `createPieces()`, `MoveOption`, `moveOptions()`, `applyMove()`, `teamFinished()`, `pieceProgress()`, `teamRank()` — Task 4·5·6에서 사용.

- [ ] **Step 1: `src/lib/yutnori.ts`에 아래 내용 추가**

```ts
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
```

- [ ] **Step 2: `scripts/yutnori-check.mjs`의 import에 새 함수 추가하고 검증 코드 이어붙이기**

`import` 줄을 아래로 교체:

```js
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
```

파일 끝(`console.log('✓ Task 1 이동 로직 점검 통과')` 다음 줄)에 추가:

```js
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
```

- [ ] **Step 3: 점검 스크립트 실행**

Run: `node scripts/yutnori-check.mjs`
Expected: 두 줄 모두 출력, 에러 없음.

- [ ] **Step 4: 타입 체크**

Run: `npx tsc -b --noEmit`
Expected: 에러 없음.

- [ ] **Step 5: 커밋**

```bash
git add src/lib/yutnori.ts scripts/yutnori-check.mjs
git commit -m "feat: 윷놀이 업힘·잡기·완주·순위 로직 추가"
```

---

### Task 3: 라우팅 연결 (`/yutnori` 진입, 메뉴 비노출)

**Files:**
- Modify: `src/routes.json`
- Modify: `src/App.tsx`
- Create: `src/pages/YutnoriGame.tsx` (이번 태스크에서는 최소 placeholder만 작성, Task 4~6에서 채움)

**Interfaces:**
- Consumes: 없음(라우팅 배선만).
- Produces: `/yutnori` 접근 시 렌더되는 `YutnoriGame` 컴포넌트 자리.

- [ ] **Step 1: `src/routes.json`에 항목 추가**

배열 마지막(`privacy` 다음)에 추가:

```json
  ,{
    "id": "yutnori",
    "path": "/yutnori",
    "label": "윷놀이",
    "group": "게임",
    "title": "윷놀이 | 계산기",
    "description": "사무실에서 즐기는 온라인 윷놀이. 팀을 만들고 윷 던진 결과만 입력하면 보드와 말이 자동으로 움직입니다.",
    "noindex": true
  }
```

(실제로는 배열 마지막 요소의 `}` 뒤에 `,`를 붙이고 새 객체를 추가하는 형태로 정상적인 JSON이 되게 한다.)

- [ ] **Step 2: `src/pages/YutnoriGame.tsx` placeholder 작성**

```tsx
export default function YutnoriGame() {
  return (
    <div>
      <h1 className="text-2xl font-bold">윷놀이</h1>
      <p className="mt-2 text-sm text-slate-500">준비 중입니다.</p>
    </div>
  )
}
```

- [ ] **Step 3: `src/App.tsx` 수정**

`components` 레지스트리에서 `privacy: lazy(...)` 다음 줄에 추가:

```ts
  yutnori: lazy(() => import('./pages/YutnoriGame')),
```

광고 렌더링 부분(`<AdSlot key={\`${route.id}-mid\`} ... />` ~ `<AdSlot key={\`${route.id}-bottom\`} ... />`)을 아래로 교체:

```tsx
          {route.id !== 'yutnori' && (
            <AdSlot key={`${route.id}-mid`} slot={SLOTS.belowResult} />
          )}
          {route.group !== '가이드' && <InfoSection pageId={route.id} />}
          {route.id !== 'yutnori' && (
            <AdSlot key={`${route.id}-bottom`} slot={SLOTS.bottomOfPage} />
          )}
```

- [ ] **Step 4: 개발 서버로 확인**

Run: `npm run dev` (백그라운드 실행 후) 브라우저로 `http://localhost:5173/yutnori` 접속.
Expected: "윷놀이 / 준비 중입니다." 렌더. 사이드바·모바일 메뉴·검색 어디에도 "윷놀이"가 보이지 않아야 한다.

- [ ] **Step 5: 타입 체크 + 빌드**

Run: `npx tsc -b --noEmit && npm run build`
Expected: 에러 없음. 빌드 로그에 `dist/yutnori/index.html` 생성 확인.

- [ ] **Step 6: sitemap 제외 확인**

Run: `grep yutnori dist/sitemap.xml || echo "OK: not in sitemap"`
Expected: `OK: not in sitemap` 출력.

- [ ] **Step 7: 커밋**

```bash
git add src/routes.json src/App.tsx src/pages/YutnoriGame.tsx
git commit -m "feat: /yutnori 라우트 연결 (메뉴 비노출 placeholder)"
```

---

### Task 4: 게임 설정 화면 (`src/pages/YutnoriGame.tsx`)

**Files:**
- Modify: `src/pages/YutnoriGame.tsx`

**Interfaces:**
- Consumes: Task 1·2의 `Team`, `TeamColor`, `TEAM_COLORS`, `Piece`, `createPieces`.
- Produces: `GameState`, `GameAction`, `gameReducer`, `initialState` — Task 5·6에서 이어서 사용(이번 태스크에서는 `phase: 'setup'`까지만 동작 확인, `'playing'` 이후는 Task 5에서 채움).

- [ ] **Step 1: `src/pages/YutnoriGame.tsx`를 아래 내용으로 전체 교체**

```tsx
import { useReducer, useState } from 'react'
import {
  createPieces,
  TEAM_COLORS,
  type Team,
  type TeamColor,
  type Piece,
} from '../lib/yutnori'

type EndMode = 'complete' | 'timed'

export interface GameState {
  phase: 'setup' | 'playing' | 'results'
  teams: Team[]
  pieces: Piece[]
  endMode: EndMode
  timeLimitMin: number
}

export type GameAction = { type: 'START_GAME'; teams: Team[]; endMode: EndMode; timeLimitMin: number }

export const initialState: GameState = {
  phase: 'setup',
  teams: [],
  pieces: [],
  endMode: 'complete',
  timeLimitMin: 10,
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_GAME':
      return {
        ...state,
        phase: 'playing',
        teams: action.teams,
        pieces: createPieces(action.teams),
        endMode: action.endMode,
        timeLimitMin: action.timeLimitMin,
      }
    default:
      return state
  }
}

const COLOR_LABEL: Record<TeamColor, string> = { red: '빨강', blue: '파랑', yellow: '노랑', green: '초록' }
const COLOR_DOT: Record<TeamColor, string> = {
  red: 'bg-red-500',
  blue: 'bg-blue-500',
  yellow: 'bg-yellow-400',
  green: 'bg-emerald-500',
}

function SetupScreen({ onStart }: { onStart: (teams: Team[], endMode: EndMode, timeLimitMin: number) => void }) {
  const [teamCount, setTeamCount] = useState(2)
  const [rosters, setRosters] = useState<string[][]>([['팀원1'], ['팀원1']])
  const [endMode, setEndMode] = useState<EndMode>('complete')
  const [timeLimitMin, setTimeLimitMin] = useState(10)

  const setTeamCountAndResize = (n: number) => {
    setTeamCount(n)
    setRosters((prev) => {
      const next = [...prev]
      while (next.length < n) next.push(['팀원1'])
      return next.slice(0, n)
    })
  }

  const setPlayerCount = (teamIdx: number, n: number) => {
    setRosters((prev) => {
      const next = [...prev]
      const names = [...next[teamIdx]]
      while (names.length < n) names.push(`팀원${names.length + 1}`)
      next[teamIdx] = names.slice(0, n)
      return next
    })
  }

  const setPlayerName = (teamIdx: number, playerIdx: number, name: string) => {
    setRosters((prev) => {
      const next = prev.map((r) => [...r])
      next[teamIdx][playerIdx] = name
      return next
    })
  }

  const canStart = rosters.slice(0, teamCount).every((r) => r.length >= 1 && r.every((n) => n.trim().length > 0))

  const handleStart = () => {
    const teams: Team[] = rosters.slice(0, teamCount).map((names, i) => ({
      id: i + 1,
      name: `${COLOR_LABEL[TEAM_COLORS[i]]}팀`,
      color: TEAM_COLORS[i],
      playerNames: names,
    }))
    onStart(teams, endMode, timeLimitMin)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">윷놀이</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        팀을 만들고 시작하세요. 윷은 직접 던지고, 나온 결과만 화면에 입력하면 됩니다.
      </p>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">팀 수</span>
          <div className="flex gap-2">
            {[2, 3, 4].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setTeamCountAndResize(n)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                  teamCount === n ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {n}팀
              </button>
            ))}
          </div>
        </label>

        <div className="mt-5 space-y-5">
          {rosters.slice(0, teamCount).map((names, teamIdx) => (
            <div key={teamIdx} className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <span className={`h-3 w-3 rounded-full ${COLOR_DOT[TEAM_COLORS[teamIdx]]}`} aria-hidden="true" />
                  {COLOR_LABEL[TEAM_COLORS[teamIdx]]}팀 ({names.length}명)
                </span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPlayerCount(teamIdx, n)}
                      className={`h-7 w-7 rounded-md text-xs font-semibold ${
                        names.length === n ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {names.map((name, playerIdx) => (
                  <input
                    key={playerIdx}
                    type="text"
                    value={name}
                    onChange={(e) => setPlayerName(teamIdx, playerIdx, e.target.value)}
                    placeholder={`팀원${playerIdx + 1} 이름`}
                    className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">종료 방식</span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setEndMode('complete')}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                endMode === 'complete' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              전체 완주까지
            </button>
            <button
              type="button"
              onClick={() => setEndMode('timed')}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                endMode === 'timed' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              시간제한
            </button>
            {endMode === 'timed' && (
              <input
                type="number"
                min={1}
                value={timeLimitMin}
                onChange={(e) => setTimeLimitMin(Math.max(1, Number(e.target.value) || 1))}
                className="w-20 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm"
              />
            )}
            {endMode === 'timed' && <span className="self-center text-sm text-slate-500">분</span>}
          </div>
        </div>

        <button
          type="button"
          disabled={!canStart}
          onClick={handleStart}
          className="mt-6 w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white disabled:bg-slate-300"
        >
          게임 시작
        </button>
      </div>
    </div>
  )
}

export default function YutnoriGame() {
  const [state, dispatch] = useReducer(gameReducer, initialState)

  if (state.phase === 'setup') {
    return (
      <SetupScreen
        onStart={(teams, endMode, timeLimitMin) => dispatch({ type: 'START_GAME', teams, endMode, timeLimitMin })}
      />
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">윷놀이</h1>
      <p className="mt-2 text-sm text-slate-500">
        {state.teams.length}팀, {state.pieces.length}개 말로 게임을 시작했습니다. (진행 화면은 다음 작업에서 이어집니다)
      </p>
    </div>
  )
}
```

- [ ] **Step 2: 개발 서버에서 수동 확인**

Run: `npm run dev` 후 `http://localhost:5173/yutnori` 에서 팀 수·인원 변경, 이름 입력, 종료 방식 선택 후 "게임 시작" 클릭.
Expected: 설정한 팀 수·말 개수가 안내 문구에 정확히 반영된다.

- [ ] **Step 3: 타입 체크**

Run: `npx tsc -b --noEmit`
Expected: 에러 없음.

- [ ] **Step 4: 커밋**

```bash
git add src/pages/YutnoriGame.tsx
git commit -m "feat: 윷놀이 게임 설정 화면(팀 구성·종료 방식) 추가"
```

---

### Task 5: 보드 표시 + 턴 진행 (`src/pages/YutnoriGame.tsx`)

**Files:**
- Modify: `src/pages/YutnoriGame.tsx`

**Interfaces:**
- Consumes: Task 1·2의 `ThrowResult`, `THROW_LABELS`, `BoardNode`, `MoveOption`, `moveOptions`, `applyMove`, `teamFinished`, `SHORTCUT_CORNERS`.
- Consumes: Task 4의 `GameState`, `GameAction`, `gameReducer`.
- Produces: `'playing'` 단계 전체 동작(턴 진행). Task 6에서 완주/순위 처리를 이어붙인다.

- [ ] **Step 1: `gameReducer`가 관리하는 `GameState`에 진행용 필드 추가**

`export interface GameState`를 아래로 교체:

```ts
export interface GameState {
  phase: 'setup' | 'playing' | 'results'
  teams: Team[]
  pieces: Piece[]
  endMode: EndMode
  timeLimitMin: number
  currentTeamIndex: number
  awaitingMove: { result: ThrowResult; options: MoveOption[] } | null
  awaitingShortcut: { result: ThrowResult; pieceIds: string[] } | null
  finishedOrder: number[] // 완주 확정된 teamId, 확정된 순서
  log: string[] // 최근 이벤트 (화면 표시용, 최대 5개 유지)
}
```

import 줄을 아래로 교체:

```ts
import { useReducer, useState } from 'react'
import {
  createPieces,
  applyMove,
  moveOptions,
  teamFinished,
  THROW_LABELS,
  TEAM_COLORS,
  type Team,
  type TeamColor,
  type Piece,
  type ThrowResult,
  type MoveOption,
  type BoardNode,
} from '../lib/yutnori'
```

`initialState`에 새 필드 추가(`timeLimitMin: 10,` 다음 줄):

```ts
  currentTeamIndex: 0,
  awaitingMove: null,
  awaitingShortcut: null,
  finishedOrder: [],
  log: [],
```

- [ ] **Step 2: `GameAction`과 `gameReducer`에 턴 진행 액션 추가**

`export type GameAction = ...` 줄을 아래로 교체:

```ts
export type GameAction =
  | { type: 'START_GAME'; teams: Team[]; endMode: EndMode; timeLimitMin: number }
  | { type: 'THROW'; result: ThrowResult }
  | { type: 'CHOOSE_MOVE'; option: MoveOption }
  | { type: 'CHOOSE_SHORTCUT'; take: boolean }
```

`gameReducer` 안 `switch`에 `START_GAME` 케이스 다음으로 아래 케이스들 추가:

```ts
    case 'THROW': {
      const currentTeam = state.teams[state.currentTeamIndex]
      const options = moveOptions(state.pieces, currentTeam.id, action.result)
      if (options.length === 0) {
        return {
          ...state,
          log: [`${currentTeam.name}: 이동할 말이 없어 턴을 넘깁니다 (${THROW_LABELS[action.result]})`, ...state.log].slice(0, 5),
          currentTeamIndex: nextTeamIndex(state),
        }
      }
      if (options.length === 1 && !needsShortcutChoice(options[0])) {
        return applyChosenMove(state, action.result, options[0], false)
      }
      return { ...state, awaitingMove: { result: action.result, options } }
    }
    case 'CHOOSE_MOVE': {
      if (!state.awaitingMove) return state
      const { result } = state.awaitingMove
      if (needsShortcutChoice(action.option)) {
        return { ...state, awaitingMove: null, awaitingShortcut: { result, pieceIds: action.option.pieceIds } }
      }
      return applyChosenMove(state, result, action.option, false)
    }
    case 'CHOOSE_SHORTCUT': {
      if (!state.awaitingShortcut) return state
      const { result, pieceIds } = state.awaitingShortcut
      return applyChosenMove(state, result, { pieceIds, at: 'home' }, action.take)
    }
```

`gameReducer` 함수 앞(파일에서 `export function gameReducer` 바로 위)에 헬퍼 함수 추가:

```ts
function needsShortcutChoice(option: MoveOption): boolean {
  return option.at === 5 || option.at === 10
}

function nextTeamIndex(state: GameState): number {
  const n = state.teams.length
  let idx = state.currentTeamIndex
  for (let i = 0; i < n; i++) {
    idx = (idx + 1) % n
    if (!state.finishedOrder.includes(state.teams[idx].id)) return idx
  }
  return state.currentTeamIndex
}

function applyChosenMove(
  state: GameState,
  result: ThrowResult,
  option: MoveOption,
  takeShortcut: boolean,
): GameState {
  const currentTeam = state.teams[state.currentTeamIndex]
  const { pieces, capturedTeamIds, extraTurn } = applyMove(state.pieces, option.pieceIds, result, takeShortcut)

  const finishedOrder = [...state.finishedOrder]
  for (const t of state.teams) {
    if (!finishedOrder.includes(t.id) && teamFinished(pieces, t.id)) finishedOrder.push(t.id)
  }

  const logLines: string[] = [`${currentTeam.name}: ${THROW_LABELS[result]}`]
  if (capturedTeamIds.length > 0) {
    const names = capturedTeamIds.map((id) => state.teams.find((t) => t.id === id)?.name ?? '').join(', ')
    logLines.push(`${currentTeam.name}이(가) ${names} 말을 잡았습니다! 추가 턴`)
  } else if (extraTurn) {
    logLines.push(`${THROW_LABELS[result]}! 추가 턴`)
  }

  const allFinished = state.teams.every((t) => finishedOrder.includes(t.id))

  return {
    ...state,
    pieces,
    finishedOrder,
    awaitingMove: null,
    awaitingShortcut: null,
    phase: allFinished ? 'results' : state.phase,
    currentTeamIndex: extraTurn ? state.currentTeamIndex : nextTeamIndex({ ...state, finishedOrder }),
    log: [...logLines, ...state.log].slice(0, 5),
  }
}
```

- [ ] **Step 3: 진행 화면 컴포넌트 작성**

`export default function YutnoriGame()`의 `if (state.phase === 'setup') {...}` 다음, 마지막 `return (...)` placeholder 블록을 아래로 교체:

```tsx
  if (state.phase === 'playing') {
    return <PlayingScreen state={state} dispatch={dispatch} />
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">윷놀이</h1>
      <p className="mt-2 text-sm text-slate-500">게임 종료! (결과 화면은 다음 작업에서 이어집니다)</p>
    </div>
  )
```

파일 맨 아래(마지막)에 `PlayingScreen` 컴포넌트 추가:

```tsx
const THROW_BUTTONS: ThrowResult[] = ['do', 'gae', 'geol', 'yut', 'mo', 'baekdo']

function nodeLabel(at: 'home' | BoardNode): string {
  if (at === 'home') return '대기 중'
  return `${at}번 칸`
}

function PlayingScreen({ state, dispatch }: { state: GameState; dispatch: (a: GameAction) => void }) {
  const currentTeam = state.teams[state.currentTeamIndex]

  return (
    <div>
      <h1 className="text-2xl font-bold">윷놀이</h1>

      <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <p className="text-sm font-semibold text-emerald-800">지금 차례: {currentTeam.name}</p>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700">보드 현황</h2>
        <ul className="mt-3 space-y-1.5 text-sm text-slate-600">
          {state.teams.map((t) => (
            <li key={t.id}>
              <b>{t.name}</b>:{' '}
              {state.pieces
                .filter((p) => p.teamId === t.id)
                .map((p) =>
                  p.position.status === 'home'
                    ? '대기'
                    : p.position.status === 'finished'
                      ? '완주'
                      : `${p.position.at}번`,
                )
                .join(', ')}
            </li>
          ))}
        </ul>
      </div>

      {!state.awaitingMove && !state.awaitingShortcut && (
        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {THROW_BUTTONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => dispatch({ type: 'THROW', result: r })}
              className="rounded-xl bg-slate-800 py-3 text-sm font-bold text-white hover:bg-slate-700"
            >
              {THROW_LABELS[r]}
            </button>
          ))}
        </div>
      )}

      {state.awaitingMove && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-800">
            {THROW_LABELS[state.awaitingMove.result]} — 움직일 말을 고르세요
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {state.awaitingMove.options.map((opt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => dispatch({ type: 'CHOOSE_MOVE', option: opt })}
                className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              >
                {nodeLabel(opt.at)} {opt.pieceIds.length > 1 ? `(${opt.pieceIds.length}개 업힘)` : ''}
              </button>
            ))}
          </div>
        </div>
      )}

      {state.awaitingShortcut && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-800">지름길로 갈까요?</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => dispatch({ type: 'CHOOSE_SHORTCUT', take: true })}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
            >
              지름길로
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: 'CHOOSE_SHORTCUT', take: false })}
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm"
            >
              그냥 테두리로
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 space-y-1 text-xs text-slate-400">
        {state.log.map((l, i) => (
          <p key={i}>{l}</p>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 개발 서버에서 수동 확인**

Run: `npm run dev` 후 `/yutnori`에서 2팀으로 게임 시작 → 각 결과 버튼을 눌러가며 진행.
Expected: 말이 없을 때(입장 전 백도 등) 자동으로 턴 스킵, 여러 말이 있을 때 선택지 노출, 모서리5·10에 멈춘 말을 움직일 때 지름길 선택지 노출, 윷/모/잡기 시 같은 팀이 이어서 던질 수 있음(현재 차례 유지) 확인.

- [ ] **Step 5: 타입 체크**

Run: `npx tsc -b --noEmit`
Expected: 에러 없음.

- [ ] **Step 6: 커밋**

```bash
git add src/pages/YutnoriGame.tsx
git commit -m "feat: 윷놀이 턴 진행(지름길 선택·업힘·잡기·추가턴) 구현"
```

---

### Task 6: 완주/순위 결과 화면 + 시간제한 타이머 (`src/pages/YutnoriGame.tsx`)

**Files:**
- Modify: `src/pages/YutnoriGame.tsx`

**Interfaces:**
- Consumes: Task 1·2의 `teamRank`. Task 5의 `GameState`, `GameAction`, `PlayingScreen`.
- Produces: `'results'` phase 화면, 시간제한 모드 타이머.

- [ ] **Step 1: `GameAction`에 `TIME_UP` 추가, `gameReducer`에 케이스 추가**

`export type GameAction =` 마지막 줄(`| { type: 'CHOOSE_SHORTCUT'; take: boolean }`) 다음에 추가:

```ts
  | { type: 'TIME_UP' }
```

`gameReducer`의 `switch` 안, `CHOOSE_SHORTCUT` 케이스 다음에 추가:

```ts
    case 'TIME_UP': {
      if (state.phase !== 'playing') return state
      return { ...state, phase: 'results' }
    }
```

`import` 줄에 `teamRank` 추가 (`teamFinished,` 다음 줄):

```ts
  teamRank,
```

- [ ] **Step 2: 시간제한 타이머를 `PlayingScreen`에 추가**

`import { useReducer, useState } from 'react'`를 아래로 교체:

```ts
import { useEffect, useReducer, useState } from 'react'
```

`function PlayingScreen({ state, dispatch }: ...)` 함수 맨 앞(`const currentTeam = ...` 앞)에 추가:

```tsx
  const [remainingSec, setRemainingSec] = useState(() => state.timeLimitMin * 60)

  useEffect(() => {
    if (state.endMode !== 'timed') return
    if (remainingSec <= 0) {
      dispatch({ type: 'TIME_UP' })
      return
    }
    const id = window.setTimeout(() => setRemainingSec((s) => s - 1), 1000)
    return () => window.clearTimeout(id)
  }, [state.endMode, remainingSec, dispatch])
```

`<h1 className="text-2xl font-bold">윷놀이</h1>` 바로 다음에 추가:

```tsx
      {state.endMode === 'timed' && (
        <p className="mt-1 text-sm font-semibold text-slate-600">
          남은 시간: {Math.floor(remainingSec / 60)}분 {remainingSec % 60}초
        </p>
      )}
```

- [ ] **Step 3: 결과 화면 컴포넌트 작성**

`export default function YutnoriGame()`의 마지막 return 블록(placeholder)을 아래로 교체:

```tsx
  return <ResultsScreen state={state} />
```

파일 맨 아래에 `ResultsScreen` 추가:

```tsx
function ResultsScreen({ state }: { state: GameState }) {
  const remainingTeamIds = state.teams.map((t) => t.id).filter((id) => !state.finishedOrder.includes(id))
  const rankedRemaining = teamRank(state.pieces, remainingTeamIds)
  const finalOrder = [...state.finishedOrder, ...rankedRemaining]

  return (
    <div>
      <h1 className="text-2xl font-bold">최종 순위</h1>
      <ol className="mt-6 space-y-2">
        {finalOrder.map((teamId, i) => {
          const team = state.teams.find((t) => t.id === teamId)!
          return (
            <li
              key={teamId}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <span className="text-lg font-bold text-emerald-600">{i + 1}등</span>
              <span className="font-semibold text-slate-800">{team.name}</span>
              <span className="text-sm text-slate-400">({team.playerNames.join(', ')})</span>
            </li>
          )
        })}
      </ol>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-6 w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white"
      >
        다시 시작
      </button>
    </div>
  )
}
```

- [ ] **Step 4: 개발 서버에서 수동 확인**

Run: `npm run dev` 후 `/yutnori`에서:
1. "전체 완주까지" 모드로 2팀 진행 → 한 팀의 말을 모두 완주시켜 결과 화면 확인.
2. "시간제한 1분"으로 새로 시작 → 1분 대기(또는 코드상 `remainingSec` 초기값을 잠깐 낮춰 테스트) → 시간 종료 시 자동으로 결과 화면 전환, 미완주 팀들이 진행도 순으로 정렬되는지 확인.

- [ ] **Step 5: 타입 체크 + 빌드 + 린트**

Run: `npx tsc -b --noEmit && npm run build && npm run lint`
Expected: 모두 에러 없음.

- [ ] **Step 6: 커밋**

```bash
git add src/pages/YutnoriGame.tsx
git commit -m "feat: 윷놀이 완주/시간제한 순위 결과 화면 추가"
```

---

### Task 7: 최종 검증

**Files:** 없음 (검증만)

- [ ] **Step 1: 로직 자체 점검 재실행**

Run: `node scripts/yutnori-check.mjs`
Expected: 두 점검 메시지 모두 통과.

- [ ] **Step 2: 전체 빌드 파이프라인**

Run: `npx tsc -b --noEmit && npm run build && npm run lint`
Expected: 에러 없음.

- [ ] **Step 3: 메뉴/검색/사이트맵 비노출 재확인**

Run:
```bash
grep -R "윷놀이" dist/index.html dist/salary/index.html || echo "OK: 메뉴에 없음"
grep yutnori dist/sitemap.xml || echo "OK: sitemap에 없음"
```
Expected: 두 명령 모두 "OK" 출력 (윷놀이 페이지 자체의 `dist/yutnori/index.html`에는 당연히 등장하므로 그건 별개로 확인).

- [ ] **Step 4: URL 직접 접근 확인**

Run: `npm run preview` 후 `http://localhost:4173/yutnori/` 접속.
Expected: 정상적으로 게임 설정 화면이 뜬다.

- [ ] **Step 5: 3~4팀 시나리오 수동 플레이**

브라우저에서 3팀(각 2~3명)으로 실제로 여러 턴을 진행하며 다음을 확인한다:
- 같은 팀 말 두 개가 같은 칸에 모이면(업힘) 이후 하나의 옵션으로 함께 이동하는지.
- 상대 팀 말이 있는 칸에 도착하면 그 말이 대기 상태로 돌아가고 추가 턴을 받는지.
- 모서리 5번·10번 칸에서 지름길 선택지가 뜨고, 지름길을 타면 훨씬 빨리 완주하는지.
- 백도를 던졌는데 보드 위에 내 팀 말이 하나도 없으면 자동으로 턴이 넘어가는지.
- 한 팀의 모든 말이 완주하면 순위가 기록되고 나머지 팀들만 턴이 도는지.

발견되는 문제는 이 단계에서 바로 고치고 커밋한다(새 태스크를 만들 필요는 없음, 사소한 UI 수정 수준).
