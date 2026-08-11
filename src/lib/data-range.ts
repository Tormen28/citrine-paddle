export interface DataRange {
  id: "1sem" | "1mes" | "3meses" | "1anio" | "todo"
  label: string
  limit: number | null
}

export const RANGE_OPTIONS: DataRange[] = [
  { id: "1sem", label: "1 sem", limit: 2016 },
  { id: "1mes", label: "1 mes", limit: 8000 },
  { id: "3meses", label: "3 meses", limit: 24000 },
  { id: "1anio", label: "1 año", limit: 50000 },
  { id: "todo", label: "Todo", limit: null },
]

export const DEFAULT_RANGE: DataRange = RANGE_OPTIONS[1]
