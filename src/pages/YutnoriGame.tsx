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
