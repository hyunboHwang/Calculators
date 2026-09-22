import type { BoardNode, Piece, Team, TeamColor } from '../lib/yutnori'

/**
 * 보드 노드 → 화면 좌표(%) 매핑. 게임 로직(yutnori.ts)과는 완전히 분리된 순수 표시용 테이블.
 * 바깥 테두리 20칸(1~19 + 출발/도착점)을 정사각형 둘레에, 지름길 A(5→15)·B(10→도착)를
 * 대각선으로 배치한다.
 */
const NODE_COORDS: Record<string, [top: number, left: number]> = {
  '1': [80, 100],
  '2': [60, 100],
  '3': [40, 100],
  '4': [20, 100],
  '5': [0, 100],
  '6': [0, 80],
  '7': [0, 60],
  '8': [0, 40],
  '9': [0, 20],
  '10': [0, 0],
  '11': [20, 0],
  '12': [40, 0],
  '13': [60, 0],
  '14': [80, 0],
  '15': [100, 0],
  '16': [100, 20],
  '17': [100, 40],
  '18': [100, 60],
  '19': [100, 80],
  // 지름길 A(5↔15)·B(10↔출발) 각각 모서리-중앙 사이에 칸 2개씩, 중앙(c)은 두 지름길이
  // 실제로 만나는 교차점이다 (중앙에 멈춘 말은 다음 턴에 어느 지름길로 갈지 다시 고른다).
  a1: [16.67, 83.33],
  a2: [33.33, 66.67],
  c: [50, 50],
  a3: [66.67, 33.33],
  a4: [83.33, 16.67],
  b1: [16.67, 16.67],
  b2: [33.33, 33.33],
  b3: [66.67, 66.67],
  b4: [83.33, 83.33],
  start: [100, 100],
}

// 실제 말이 지나가는 경로를 따라 선을 잇는다 (테두리 고리 + 대각선 지름길 2개, 중앙에서 교차).
const OUTER_PATH = ['start', ...Array.from({ length: 19 }, (_, i) => String(i + 1)), 'start']
const DIAG_A_PATH = ['5', 'a1', 'a2', 'c', 'a3', 'a4', '15']
const DIAG_B_PATH = ['10', 'b1', 'b2', 'c', 'b3', 'b4', 'start']

function segments(path: string[]): [string, string][] {
  return path.slice(1).map((node, i) => [path[i], node])
}
const LINE_SEGMENTS = [...segments(OUTER_PATH), ...segments(DIAG_A_PATH), ...segments(DIAG_B_PATH)]

const COLOR_BG: Record<TeamColor, string> = {
  red: 'bg-red-500',
  blue: 'bg-blue-500',
  yellow: 'bg-yellow-400',
  green: 'bg-emerald-500',
}
// 말 마커는 흰 보드 위에서 더 진하고 또렷하게 보이도록 범례보다 채도/명도를 살짝 높인 색을 쓴다.
const PIECE_COLOR_BG: Record<TeamColor, string> = {
  red: 'bg-red-600',
  blue: 'bg-blue-600',
  yellow: 'bg-yellow-500',
  green: 'bg-emerald-600',
}
const COLOR_BORDER: Record<TeamColor, string> = {
  red: 'border-red-500',
  blue: 'border-blue-500',
  yellow: 'border-yellow-400',
  green: 'border-emerald-500',
}

export default function YutnoriBoard({
  pieces,
  teams,
  previewAt,
  previewTeamId,
}: {
  pieces: Piece[]
  teams: Team[]
  previewAt?: BoardNode | null
  previewTeamId?: number
}) {
  const colorOf = (teamId: number): TeamColor => teams.find((t) => t.id === teamId)?.color ?? 'red'
  const nameOf = (p: Piece): string => {
    const idx = Number(p.id.split('-')[1])
    return teams.find((t) => t.id === p.teamId)?.playerNames[idx] ?? p.id
  }

  const grouped = new Map<string, Piece[]>()
  for (const p of pieces) {
    if (p.position.status !== 'onBoard') continue
    const key = String(p.position.at)
    grouped.set(key, [...(grouped.get(key) ?? []), p])
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <div className="relative mx-auto aspect-square w-full max-w-2xl">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {LINE_SEGMENTS.map(([from, to], i) => {
            const [t1, l1] = NODE_COORDS[from]
            const [t2, l2] = NODE_COORDS[to]
            return <line key={i} x1={l1} y1={t1} x2={l2} y2={t2} stroke="#cbd5e1" strokeWidth="1" />
          })}
        </svg>

        {Object.entries(NODE_COORDS).map(([node, [top, left]]) => {
          return (
            <div
              key={node}
              className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-300 bg-white shadow"
              style={{ top: `${top}%`, left: `${left}%` }}
              aria-hidden="true"
            />
          )
        })}

        {[...grouped.entries()].map(([node, group]) => {
          const coords = NODE_COORDS[node]
          if (!coords) return null
          const [top, left] = coords
          return (
            <div
              key={node}
              className="absolute flex w-12 -translate-x-1/2 -translate-y-1/2 flex-wrap items-center justify-center gap-1"
              style={{ top: `${top}%`, left: `${left}%` }}
            >
              {group.map((p) => (
                <span
                  key={p.id}
                  className={`h-7 w-7 rounded-full border-[3px] border-white shadow-md ring-1 ring-black/10 ${PIECE_COLOR_BG[colorOf(p.teamId)]}`}
                  title={nameOf(p)}
                />
              ))}
            </div>
          )
        })}

        {previewAt != null &&
          previewTeamId != null &&
          (() => {
            const coords = NODE_COORDS[String(previewAt)]
            if (!coords) return null
            const [top, left] = coords
            return (
              <div
                className={`pointer-events-none absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full border-2 bg-white/40 ${COLOR_BORDER[colorOf(previewTeamId)]}`}
                style={{ top: `${top}%`, left: `${left}%` }}
                aria-hidden="true"
              />
            )
          })()}
      </div>

      <ul className="flex shrink-0 flex-col gap-1.5 text-sm text-slate-600 lg:w-44">
        {teams.map((t) => {
          const teamPieces = pieces.filter((p) => p.teamId === t.id)
          const home = teamPieces.filter((p) => p.position.status === 'home').length
          const finished = teamPieces.filter((p) => p.position.status === 'finished').length
          return (
            <li key={t.id} className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${COLOR_BG[t.color]}`} aria-hidden="true" />
              <b className="shrink-0">{t.name}</b>
              <span className="text-slate-400">
                대기 {home} · 완주 {finished}
              </span>
            </li>
          )
        })}
      </ul>
      </div>
    </div>
  )
}
