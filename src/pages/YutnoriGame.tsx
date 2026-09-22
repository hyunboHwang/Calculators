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

type EndMode = 'complete' | 'timed'

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

export type GameAction =
  | { type: 'START_GAME'; teams: Team[]; endMode: EndMode; timeLimitMin: number }
  | { type: 'THROW'; result: ThrowResult }
  | { type: 'CHOOSE_MOVE'; option: MoveOption }
  | { type: 'CHOOSE_SHORTCUT'; take: boolean }

export const initialState: GameState = {
  phase: 'setup',
  teams: [],
  pieces: [],
  endMode: 'complete',
  timeLimitMin: 10,
  currentTeamIndex: 0,
  awaitingMove: null,
  awaitingShortcut: null,
  finishedOrder: [],
  log: [],
}

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

  if (state.phase === 'playing') {
    return <PlayingScreen state={state} dispatch={dispatch} />
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">윷놀이</h1>
      <p className="mt-2 text-sm text-slate-500">게임 종료! (결과 화면은 다음 작업에서 이어집니다)</p>
    </div>
  )
}

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
