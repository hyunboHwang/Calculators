/** 페이지 하단 설명 영역(InfoSection)과 프리렌더(postbuild)가 함께 쓰는 표 데이터 */
export interface InfoTable {
  title: string
  /** 표 아래 한 줄 설명(기준 시점·출처 등) */
  note?: string
  headers: string[]
  rows: (string | number)[][]
}
