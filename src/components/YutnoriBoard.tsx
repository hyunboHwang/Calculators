import type { Piece, Team, TeamColor } from '../lib/yutnori'

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
  a1: [33.3, 66.6],
  a2: [50, 50],
  a3: [66.6, 33.3],
  b1: [33.3, 33.3],
  b2: [66.6, 66.6],
  start: [100, 100],
}

/**
 * 대각선은 모서리↔중앙 사이에 칸이 2개씩 있어야 참고 이미지와 같은 밀도가 된다.
 * a1/a3/b1/b2는 실제 지름길 정지 칸(게임 로직과 연결), af1/af2/bf1/bf2는 그 사이를 메우는
 * 순수 장식용 칸(말이 멈추지 않음)이다.
 */
const DECOR_COORDS: Record<string, [top: number, left: number]> = {
  af1: [16.6, 83.3],
  af2: [83.3, 16.6],
  bf1: [16.6, 16.6],
  bf2: [83.3, 83.3],
}
const ALL_COORDS = { ...NODE_COORDS, ...DECOR_COORDS }

// 실제 말이 지나가는 경로를 따라 선을 잇는다 (테두리 고리 + 대각선 지름길 2개, 중앙에서 교차).
const OUTER_PATH = ['start', ...Array.from({ length: 19 }, (_, i) => String(i + 1)), 'start']
const DIAG_A_PATH = ['5', 'af1', 'a1', 'a2', 'a3', 'af2', '15']
const DIAG_B_PATH = ['10', 'bf1', 'b1', 'a2', 'b2', 'bf2', 'start']

function segments(path: string[]): [string, string][] {
  return path.slice(1).map((node, i) => [path[i], node])
}
const LINE_SEGMENTS = [...segments(OUTER_PATH), ...segments(DIAG_A_PATH), ...segments(DIAG_B_PATH)]

const CENTER_NODE = 'a2'
// 장식용 강조색 — 팀 색과 무관하게 모서리/중앙을 시각적으로 구분하기 위한 표시일 뿐이다.
const CORNER_COLOR: Record<string, string> = {
  '10': 'bg-blue-500',
  '5': 'bg-yellow-400',
  '15': 'bg-red-500',
  start: 'bg-emerald-500',
}

const COLOR_BG: Record<TeamColor, string> = {
  red: 'bg-red-500',
  blue: 'bg-blue-500',
  yellow: 'bg-yellow-400',
  green: 'bg-emerald-500',
}

export default function YutnoriBoard({ pieces, teams }: { pieces: Piece[]; teams: Team[] }) {
  const colorOf = (teamId: number): TeamColor => teams.find((t) => t.id === teamId)?.color ?? 'red'

  const grouped = new Map<string, Piece[]>()
  for (const p of pieces) {
    if (p.position.status !== 'onBoard') continue
    const key = String(p.position.at)
    grouped.set(key, [...(grouped.get(key) ?? []), p])
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="relative mx-auto aspect-square w-full max-w-xs">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {LINE_SEGMENTS.map(([from, to], i) => {
            const [t1, l1] = ALL_COORDS[from]
            const [t2, l2] = ALL_COORDS[to]
            return <line key={i} x1={l1} y1={t1} x2={l2} y2={t2} stroke="#cbd5e1" strokeWidth="1" />
          })}
        </svg>

        {Object.entries(ALL_COORDS).map(([node, [top, left]]) => {
          const cornerColor = CORNER_COLOR[node]
          const isCenter = node === CENTER_NODE
          const nodeClass =
            cornerColor || isCenter
              ? `h-5 w-5 border-2 border-white shadow ${cornerColor ?? 'bg-violet-500'}`
              : 'h-3 w-3 border border-slate-300 bg-white'
          return (
            <div
              key={node}
              className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full ${nodeClass}`}
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
              className="absolute flex w-8 -translate-x-1/2 -translate-y-1/2 flex-wrap items-center justify-center gap-0.5"
              style={{ top: `${top}%`, left: `${left}%` }}
            >
              {group.map((p) => (
                <span
                  key={p.id}
                  className={`h-3.5 w-3.5 rounded-full border-2 border-white shadow ${COLOR_BG[colorOf(p.teamId)]}`}
                  title={p.id}
                />
              ))}
            </div>
          )
        })}
      </div>

      <ul className="mt-4 space-y-1.5 text-sm text-slate-600">
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
  )
}
